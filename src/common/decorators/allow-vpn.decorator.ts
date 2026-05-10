import { SetMetadata } from '@nestjs/common';

export const ALLOW_VPN_KEY = 'allow-vpn';
export const AllowVpn = () => SetMetadata(ALLOW_VPN_KEY, true);
