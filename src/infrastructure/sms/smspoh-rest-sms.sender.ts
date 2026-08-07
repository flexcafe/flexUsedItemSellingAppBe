import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ISmsSender,
  SendSmsOptions,
} from '../../domain/services/sms-sender.interface.js';

interface SmsPohMessage {
  messageId?: string;
  message?: string;
  to?: string;
  clientReference?: string | null;
  scheduledAt?: string | null;
  createdAt?: string;
  messageCount?: number;
  from?: string;
  network?: string;
  type?: string;
  status?: string;
  test?: boolean;
}

interface SmsPohSuccessResponse {
  messages: SmsPohMessage[];
}

interface SmsPohErrorResponse {
  name?: string;
  message?: string;
  code?: number;
  status?: number;
}

/**
 * SMSPoh API V3 sender.
 *
 * Authentication is Bearer Base64(API_KEY:API_SECRET). Credentials and the
 * case-sensitive approved Sender ID are read only from server configuration.
 */
@Injectable()
export class SMSPohRestSmsSender implements ISmsSender {
  private readonly logger = new Logger(SMSPohRestSmsSender.name);
  private readonly bearerToken: string;
  private readonly from: string;
  private readonly apiUrl: string;
  private readonly isTestMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.requiredConfig('SMSPOH_API_KEY');
    const apiSecret = this.requiredConfig('SMSPOH_API_SECRET');
    this.from = this.requiredConfig('SMSPOH_SENDER_ID');
    this.apiUrl = this.configService
      .get<string>(
        'SMSPOH_API_URL',
        'https://v3.smspoh.com/api/rest/send',
      )
      .trim();

    this.bearerToken = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString(
      'base64',
    );
    this.isTestMode = this.parseEnvFlag(
      this.configService.get<string>('SMSPOH_TEST', 'false'),
    );

    this.logger.log(
      `SMSPoh V3 client configured (testMode=${this.isTestMode})`,
    );
  }

  async send(options: SendSmsOptions): Promise<void> {
    if (options.clientReference && options.clientReference.length > 50) {
      throw new Error('SMSPoh clientReference must not exceed 50 characters');
    }

    const payload: Record<string, string | number> = {
      to: options.to.trim(),
      message: options.message,
      from: this.from,
    };
    if (options.clientReference) {
      payload.clientReference = options.clientReference;
    }
    if (this.isTestMode) {
      // SMSPoh's live V3 validator currently rejects booleans despite the
      // published interface and requires a numeric test flag.
      payload.test = 1;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });
      const responseText = await response.text();
      const responseData = this.parseResponse(responseText);

      if (!response.ok) {
        const providerMessage =
          typeof responseData === 'string'
            ? responseData
            : 'message' in responseData
              ? responseData.message ?? responseData.name
              : undefined;
        const providerCode =
          typeof responseData !== 'string' && 'code' in responseData
            ? responseData.code
            : undefined;
        this.logger.error(
          `SMSPoh rejected SMS to ${this.maskTo(options.to)} (HTTP ${response.status}, providerCode=${providerCode ?? 'unknown'})`,
        );
        throw new BadGatewayException(
          providerMessage || `SMSPoh request failed with HTTP ${response.status}`,
        );
      }

      if (
        typeof responseData === 'string' ||
        !('messages' in responseData) ||
        !responseData.messages?.length
      ) {
        this.logger.error(
          `SMSPoh returned an invalid success response for ${this.maskTo(options.to)}`,
        );
        throw new BadGatewayException('Invalid success response from SMSPoh');
      }

      const accepted = responseData.messages[0];
      this.logger.log(
        `SMS accepted by SMSPoh (messageId=${accepted.messageId ?? 'unknown'}, status=${accepted.status ?? 'accepted'}, to=${this.maskTo(accepted.to ?? options.to)})`,
      );
    } catch (error: unknown) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Unable to connect to SMSPoh for ${this.maskTo(options.to)}: ${message}`,
      );
      throw new ServiceUnavailableException('Unable to connect to SMS provider');
    }
  }

  private requiredConfig(key: string): string {
    const value = this.configService.getOrThrow<string>(key).trim();
    if (!value) {
      throw new Error(`${key} must not be empty`);
    }
    return value;
  }

  private parseEnvFlag(raw: string | undefined): boolean {
    return ['true', '1', 'yes', 'on'].includes(raw?.trim().toLowerCase() ?? '');
  }

  private parseResponse(
    responseText: string,
  ): SmsPohSuccessResponse | SmsPohErrorResponse | string {
    try {
      return JSON.parse(responseText) as
        | SmsPohSuccessResponse
        | SmsPohErrorResponse;
    } catch {
      return responseText;
    }
  }

  private maskTo(to: string): string {
    const digits = to.replace(/\D/g, '');
    if (digits.length < 4) {
      return '***';
    }
    return `***${digits.slice(-4)}`;
  }
}
