import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ISmsSender,
  SendSmsOptions,
} from '../../domain/services/sms-sender.interface.js';

interface SmspohSendResponse {
  messages?: Array<{ status?: string; message?: string }>;
  name?: string;
  message?: string;
  status?: number;
}

@Injectable()
export class SMSPohRestSmsSender implements ISmsSender {
  private readonly logger = new Logger(SMSPohRestSmsSender.name);
  private readonly baseUrl: string;
  private readonly bearerToken: string;
  private readonly from: string;
  /** Sandbox / no-charge sends when enabled via SMSPOH_TEST. */
  private readonly isTestMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('SMSPOH_API_KEY');
    const apiSecret =
      this.configService.getOrThrow<string>('SMSPOH_API_SECRET');
    this.from = this.configService.getOrThrow<string>('SMSPOH_SENDER_ID');
    this.baseUrl = this.configService.get<string>(
      'SMSPOH_API_BASE_URL',
      'https://v3.smspoh.com/api/rest',
    );
    this.bearerToken = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString(
      'base64',
    );
    this.isTestMode = SMSPohRestSmsSender.parseEnvFlag(
      this.configService.get<string>('SMSPOH_TEST', 'false'),
    );
  }

  /**
   * SMSPoh v3 `/send` validates `test` as a numeric flag (same style as `encrypt: 1` in their docs).
   * Omitting `test` or sending JSON booleans can yield: "Test must be a number."
   */
  private static parseEnvFlag(raw: string | undefined): boolean {
    if (raw == null || raw === '') {
      return false;
    }
    const v = raw.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
  }

  async send(options: SendSmsOptions): Promise<void> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/send`;
    const body: Record<string, unknown> = {
      to: options.to,
      message: options.message,
      from: this.from,
      test: this.isTestMode ? 1 : 0,
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
      this.logger.warn(`SMSPoh send failed: ${msg}`);
      throw new BadGatewayException(msg);
    }

    const first = parsed?.messages?.[0];
    if (first?.status && first.status !== 'Accepted') {
      this.logger.warn(
        `SMSPoh returned non-Accepted status: ${first.status ?? 'unknown'}`,
      );
    }

    this.logger.log(`SMS queued for delivery (to: ${this.maskTo(options.to)})`);
  }

  private maskTo(to: string): string {
    const digits = to.replace(/\D/g, '');
    if (digits.length < 4) {
      return '***';
    }
    return `***${digits.slice(-4)}`;
  }
}
