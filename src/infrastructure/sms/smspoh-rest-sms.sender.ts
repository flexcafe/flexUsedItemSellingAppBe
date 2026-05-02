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

type RestTestPayload = 'boolean' | 'number' | 'omit';

/**
 * SMSPoh v3 `/api/rest/send` and `/api/http/send` are inconsistent in the wild: some accounts
 * return `Test must be a number` for JSON booleans, JSON numbers, omitted `test`, or HTTP query
 * `test=…` (query values are always strings). We try a short ladder of shapes, then throw the
 * last upstream message.
 */
@Injectable()
export class SMSPohRestSmsSender implements ISmsSender {
  private readonly logger = new Logger(SMSPohRestSmsSender.name);
  private readonly bearerToken: string;
  private readonly from: string;
  private readonly isTestMode: boolean;
  /** When true, only the legacy REST path (no ladder). */
  private readonly useRestJsonSendOnly: boolean;
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
    this.useRestJsonSendOnly = SMSPohRestSmsSender.parseEnvFlag(
      this.configService.get<string>('SMSPOH_USE_REST_JSON_SEND', 'false'),
    );

    if (configuredApiBase.includes('/api/http')) {
      this.httpQueryBaseUrl = configuredApiBase;
      this.restBaseUrl = 'https://v3.smspoh.com/api/rest';
      this.logger.warn(
        'SMSPOH_API_BASE_URL points at the HTTP API (/api/http). Using that as HTTP-query base; REST uses https://v3.smspoh.com/api/rest.',
      );
    } else {
      this.restBaseUrl = configuredApiBase;
      this.httpQueryBaseUrl = this.configService
        .get<string>('SMSPOH_HTTP_BASE_URL', 'https://v3.smspoh.com/api/http')
        .replace(/\/$/, '');
    }

    this.logger.log(
      `SMSPoh client: mode=${this.useRestJsonSendOnly ? 'rest-only' : 'ladder'}, restBase=${this.restBaseUrl}, httpBase=${this.httpQueryBaseUrl}`,
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
    if (this.useRestJsonSendOnly) {
      await this.sendViaRestJsonLegacy(options);
      return;
    }

    const restAttempts: Array<{
      label: string;
      auth: 'bearer' | 'basic';
      test: RestTestPayload;
    }> = [
      { label: 'rest+bearer+test:boolean', auth: 'bearer', test: 'boolean' },
      { label: 'rest+bearer+test:number', auth: 'bearer', test: 'number' },
      { label: 'rest+bearer+test:omit', auth: 'bearer', test: 'omit' },
      { label: 'rest+basic+test:boolean', auth: 'basic', test: 'boolean' },
    ];

    let lastTestShapeError: BadGatewayException | null = null;

    for (const attempt of restAttempts) {
      try {
        await this.sendViaRestJsonWithShape(
          options,
          attempt.auth,
          attempt.test,
        );
        return;
      } catch (err) {
        if (!(err instanceof BadGatewayException)) {
          throw err;
        }
        if (!SMSPohRestSmsSender.isTestMustBeNumberMessage(err.message)) {
          throw err;
        }
        lastTestShapeError = err;
        this.logger.warn(
          `SMSPoh ${attempt.label} failed (${err.message}); trying next strategy.`,
        );
      }
    }

    if (lastTestShapeError) {
      this.logger.warn(
        `All REST /send variants failed with test validation; trying HTTP-query without test. Last: ${lastTestShapeError.message}`,
      );
    }

    await this.sendViaHttpQuery(options);
  }

  private static isTestMustBeNumberMessage(
    msg: string | object | undefined,
  ): boolean {
    if (typeof msg !== 'string') {
      return false;
    }
    return msg.toLowerCase().includes('test must be a number');
  }

  private buildRestBody(
    options: SendSmsOptions,
    test: RestTestPayload,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      to: options.to,
      message: options.message,
      from: this.from,
    };
    if (options.clientReference) {
      body.clientReference = options.clientReference;
    }
    if (test === 'boolean') {
      body.test = this.isTestMode;
    } else if (test === 'number') {
      body.test = this.isTestMode ? 1 : 0;
    }
    return body;
  }

  private authHeader(kind: 'bearer' | 'basic'): string {
    // Per SMSPoh docs, Bearer token is base64(apiKey:apiSecret); Basic uses the same encoding.
    return kind === 'bearer'
      ? `Bearer ${this.bearerToken}`
      : `Basic ${this.bearerToken}`;
  }

  private async sendViaRestJsonWithShape(
    options: SendSmsOptions,
    auth: 'bearer' | 'basic',
    test: RestTestPayload,
  ): Promise<void> {
    const url = `${this.restBaseUrl}/send`;
    const body = this.buildRestBody(options, test);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader(auth),
      },
      body: JSON.stringify(body),
    });
    await this.assertSmspohSuccess(
      response,
      `rest-json(${auth},test=${test})`,
      options.to,
    );
  }

  /** Legacy: REST omit `test`, then HTTP-query if SMSPoh only complains about `test`. */
  private async sendViaRestJsonLegacy(options: SendSmsOptions): Promise<void> {
    try {
      await this.sendViaRestJsonWithShape(options, 'bearer', 'omit');
    } catch (err) {
      if (
        err instanceof BadGatewayException &&
        SMSPohRestSmsSender.isTestMustBeNumberMessage(err.message)
      ) {
        this.logger.warn(
          'SMSPoh REST omit-test failed; falling back to HTTP-query /send once.',
        );
        await this.sendViaHttpQuery(options);
        return;
      }
      throw err;
    }
  }

  /**
   * HTTP query send — no `test` param (string query values break their validator).
   */
  private async sendViaHttpQuery(options: SendSmsOptions): Promise<void> {
    if (this.isTestMode) {
      this.logger.warn(
        'SMSPOH_TEST is true; HTTP-query send cannot pass a reliable `test` flag. Prefer SMSPoh dashboard sandbox or set SMSPOH_TEST=false for live sends.',
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
