export interface VerifiedFacebookUser {
  id: string;
  name: string;
}

export interface IFacebookAuthService {
  verifyUserAccessToken(accessToken: string): Promise<VerifiedFacebookUser>;
}

export const FACEBOOK_AUTH_SERVICE = Symbol('FACEBOOK_AUTH_SERVICE');
