import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import type {
  IFacebookAuthService,
  VerifiedFacebookUser,
} from '../../domain/services/facebook-auth.interface.js';

type DebugTokenResponse = {
  data?: {
    app_id?: string;
    user_id?: string;
    is_valid?: boolean;
  };
};

type MeResponse = {
  id?: string;
  name?: string;
};

@Injectable()
export class FacebookGraphAuthService implements IFacebookAuthService {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly graphBaseUrl: string;
  private readonly graphVersion: string;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.getOrThrow<string>('FACEBOOK_APP_ID');
    this.appSecret = this.configService.getOrThrow<string>(
      'FACEBOOK_APP_SECRET',
    );
    this.graphBaseUrl = this.configService
      .get<string>('FACEBOOK_GRAPH_BASE_URL', 'https://graph.facebook.com')
      .replace(/\/$/, '');
    this.graphVersion = this.configService.get<string>(
      'FACEBOOK_GRAPH_VERSION',
      'v22.0',
    );
  }

  async verifyUserAccessToken(
    accessToken: string,
  ): Promise<VerifiedFacebookUser> {
    const sanitizedToken = accessToken.trim();
    if (!sanitizedToken) {
      throw new BadRequestException('Facebook access token is required');
    }

    const debugData = await this.debugToken(sanitizedToken);
    const isValid = debugData.data?.is_valid ?? false;
    const appId = debugData.data?.app_id;
    const userId = debugData.data?.user_id;
    if (!isValid || !appId || !userId) {
      throw new BadRequestException('Invalid Facebook access token');
    }
    if (appId !== this.appId) {
      throw new BadRequestException(
        'Facebook access token does not belong to this app',
      );
    }

    const me = await this.fetchMe(sanitizedToken);
    if (!me.id || !me.name) {
      throw new BadGatewayException(
        'Facebook verification failed: incomplete profile data',
      );
    }
    if (me.id !== userId) {
      throw new BadGatewayException(
        'Facebook verification failed: user mismatch',
      );
    }

    return { id: me.id, name: me.name };
  }

  private async debugToken(accessToken: string): Promise<DebugTokenResponse> {
    const params = new URLSearchParams({
      input_token: accessToken,
      access_token: `${this.appId}|${this.appSecret}`,
    });
    const response = await fetch(
      `${this.basePath()}/debug_token?${params.toString()}`,
      {
        method: 'GET',
      },
    );
    return this.parseJsonOrThrow<DebugTokenResponse>(
      response,
      'Facebook token debug request failed',
    );
  }

  private async fetchMe(accessToken: string): Promise<MeResponse> {
    const params = new URLSearchParams({
      fields: 'id,name',
      access_token: accessToken,
      appsecret_proof: this.appSecretProof(accessToken),
    });
    const response = await fetch(`${this.basePath()}/me?${params.toString()}`, {
      method: 'GET',
    });
    return this.parseJsonOrThrow<MeResponse>(
      response,
      'Facebook profile lookup failed',
    );
  }

  private appSecretProof(accessToken: string): string {
    return createHmac('sha256', this.appSecret)
      .update(accessToken)
      .digest('hex');
  }

  private basePath(): string {
    return `${this.graphBaseUrl}/${this.graphVersion}`;
  }

  private async parseJsonOrThrow<T>(
    response: Response,
    message: string,
  ): Promise<T> {
    const raw = await response.text();
    if (!response.ok) {
      throw new BadRequestException(message);
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new BadGatewayException('Facebook response parse error');
    }
  }
}
