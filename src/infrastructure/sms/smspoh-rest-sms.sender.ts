import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ISmsSender,
  SendSmsOptions,
} from '../../domain/services/sms-sender.interface.js';

interface SmspohSendResponse {
  messages?: Array<{ status?: string; message?: string; to?: string }>;
  name?: string;
  message?: string;
  status?: number;
}

/**
 * SMSPoh v3 exposes two send styles:
 * - REST JSON: `POST https://v3.smspoh.com/api/rest/send` (Bearer auth, JSON body)
 * - HTTP query: `POST https://v3.smspoh.com/api/http/send?...&accessToken=...` (no JSON body)
 *
 * Live deployments have been returning `Test must be a number` on REST JSON and on
 * HTTP-query sends that included `test=0`/`test=1` (query values are strings). Default path
 * is HTTP-query **without** the `test` query parameter.
 */
@Injectable()
export class SMSPohRestSmsSender implements ISmsSender {
  private readonly logger = new Logger(SMSPohRestSmsSender.name);
  private readonly bearerToken: string;
  private readonly from: string;
  private readonly isTestMode: boolean;
  /** When true, use REST JSON send (optional `test` boolean only if SMSPOH_TEST is on). */
  private readonly useRestJsonSend: boolean;
  private readonly restBaseUrl: string;
  private readonly httpQueryBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('SMSPOH_API_KEY');
    const apiSecret =
      this.configService.getOrThrow<string>('SMSPOH_API_SECRET');
    this.from = this.configService.getOrThrow<string>('SMSPOH_SENDER_ID');
    const configuredApiBase = this.configService
      .get<string>('SMSPOH_API_BASE_URL', 'https://v3.smspoh.com/api/rest')
      .replace(/\/$/, '');

    this.bearerToken = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString(
      'base64',
    );
    this.isTestMode = SMSPohRestSmsSender.parseEnvFlag(
      this.configService.get<string>('SMSPOH_TEST', 'false'),
    );
    this.useRestJsonSend = SMSPohRestSmsSender.parseEnvFlag(
      this.configService.get<string>('SMSPOH_USE_REST_JSON_SEND', 'false'),
    );

    if (configuredApiBase.includes('/api/http')) {
      this.httpQueryBaseUrl = configuredApiBase;
      this.restBaseUrl = 'https://v3.smspoh.com/api/rest';
      this.logger.warn(
        'SMSPOH_API_BASE_URL points at the HTTP API (/api/http). Using HTTP query send; set SMSPOH_API_BASE_URL to https://v3.smspoh.com/api/rest if you intended REST JSON.',
      );
    } else {
      this.restBaseUrl = configuredApiBase;
      this.httpQueryBaseUrl = this.configService
        .get<string>('SMSPOH_HTTP_BASE_URL', 'https://v3.smspoh.com/api/http')
        .replace(/\/$/, '');
    }

    this.logger.log(
      `SMSPoh client: transport=${this.useRestJsonSend ? 'rest-json' : 'http-query'}, httpBase=${this.httpQueryBaseUrl}, restBase=${this.restBaseUrl}`,
    );
  }

  private static parseEnvFlag(raw: string | undefined): boolean {
    if (raw == null || raw === '') {
      return false;
    }
    const v = raw.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
  }

  async send(options: SendSmsOptions): Promise<void> {
    if (this.useRestJsonSend) {
      await this.sendViaRestJson(options);
      return;
    }
    await this.sendViaHttpQuery(options);
  }

  /**
   * POST with query string (SMSPoh “Send via HTTP Over Query Parameters”).
   *
   * Do not send `test` in the query string: every query value is a string, and SMSPoh’s live API
   * responds with `Test must be a number` when `test=0` / `test=1` is parsed as a non-number type
   * on their side. Omit the flag; use the SMSPoh dashboard / account for sandbox vs live traffic.
   */
  private async sendViaHttpQuery(options: SendSmsOptions): Promise<void> {
    if (this.isTestMode) {
      this.logger.warn(
        'SMSPOH_TEST is enabled but HTTP-query sends omit the `test` query flag (SMSPoh rejects it). Unset SMSPOH_TEST for normal live sends.',
      );
    }

    const params = new URLSearchParams();
    params.set('accessToken', this.bearerToken);
    params.set('to', options.to);
    params.set('message', options.message);
    params.set('from', this.from);
    if (options.clientReference) {
      params.set('clientReference', options.clientReference);
    }

    const url = `${this.httpQueryBaseUrl}/send?${params.toString()}`;
    const response = await fetch(url, { method: 'POST' });
    await this.assertSmspohSuccess(response, 'http-query', options.to);
  }

  /**
   * Optional: JSON REST send (Laravel channel omits `test` unless explicitly set).
   * If SMSPoh still returns the `test` validation error, callers can leave REST off (default).
   */
  private async sendViaRestJson(options: SendSmsOptions): Promise<void> {
    const url = `${this.restBaseUrl}/send`;
    const body: Record<string, unknown> = {
      to: options.to,
      message: options.message,
      from: this.from,
    };
    if (options.clientReference) {
      body.clientReference = options.clientReference;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.bearerToken}`,
      },
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    let parsed: SmspohSendResponse | null = null;
    try {
      parsed = raw ? (JSON.parse(raw) as SmspohSendResponse) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const msg =
        parsed?.message ??
        parsed?.name ??
        `SMSPoh request failed with HTTP ${response.status}`;
      if (
        typeof msg === 'string' &&
        msg.toLowerCase().includes('test must be a number')
      ) {
        this.logger.warn(
          'SMSPoh REST /send rejected `test`; falling back to HTTP query /send once.',
        );
        await this.sendViaHttpQuery(options);
        return;
      }
      this.logger.warn(`SMSPoh send failed (rest-json): ${msg}`);
      throw new BadGatewayException(msg);
    }

    this.finishSuccessResponse(parsed, 'rest-json', options.to);
  }

  private async assertSmspohSuccess(
    response: Response,
    transport: string,
    destination: string,
  ): Promise<void> {
    const raw = await response.text();
    let parsed: SmspohSendResponse | null = null;
    try {
      parsed = raw ? (JSON.parse(raw) as SmspohSendResponse) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const msg =
        parsed?.message ??
        parsed?.name ??
        `SMSPoh request failed with HTTP ${response.status}`;
      this.logger.warn(
        `SMSPoh send failed (${transport}): ${msg}. Response (truncated): ${raw.slice(0, 500)}`,
      );
      throw new BadGatewayException(msg);
    }

    this.finishSuccessResponse(parsed, transport, destination);
  }

  private finishSuccessResponse(
    parsed: SmspohSendResponse | null,
    transport: string,
    destination: string,
  ): void {
    const first = parsed?.messages?.[0];
    if (first?.status && first.status !== 'Accepted') {
      this.logger.warn(
        `SMSPoh (${transport}) returned non-Accepted status: ${first.status ?? 'unknown'}`,
      );
    }

    const to = first?.to ?? destination;
    this.logger.log(
      `SMS queued for delivery via ${transport} (to: ${this.maskTo(to)})`,
    );
  }

  private maskTo(to: string): string {
    const digits = to.replace(/\D/g, '');
    if (digits.length < 4) {
      return '***';
    }
    return `***${digits.slice(-4)}`;
  }
}
