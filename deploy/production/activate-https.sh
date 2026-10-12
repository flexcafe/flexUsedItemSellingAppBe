#!/usr/bin/env bash
set -euo pipefail
domain=api.flexusedmarket.com
cert=/etc/letsencrypt/live/$domain/fullchain.pem
if [[ ! -s "$cert" ]]; then
  token="flex-origin-$(date +%s)-$RANDOM"
  install -d -m 755 /var/www/letsencrypt/.well-known/acme-challenge
  file="/var/www/letsencrypt/.well-known/acme-challenge/$token"
  printf '%s' "$token" > "$file"
  trap 'rm -f "$file"' EXIT
  observed=$(curl -fsS --max-time 20 "http://$domain/.well-known/acme-challenge/$token" || true)
  if [[ "$observed" != "$token" ]]; then
    echo 'DNS/Cloudflare origin is not reaching this server yet; certificate issuance deferred.'
    exit 0
  fi
  /opt/certbot/bin/certbot certonly --webroot -w /var/www/letsencrypt \
    -d "$domain" --cert-name "$domain" --non-interactive --agree-tos \
    --register-unsafely-without-email --keep-until-expiring
fi
target=/etc/nginx/conf.d/flex-api.conf
cp "$target" "$target.before-https"
install -m 644 /opt/flex/config/nginx-https.conf "$target"
if ! nginx -t; then
  mv "$target.before-https" "$target"
  exit 1
fi
systemctl reload nginx
systemctl disable --now flex-https-activate.timer
echo 'HTTPS is configured on the production origin.'