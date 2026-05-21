import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function splitCsv(input) {
  if (!input) {
    return [];
  }
  return input
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export function pickOne(values) {
  if (!values || values.length === 0) {
    return null;
  }
  const idx = Math.floor(Math.random() * values.length);
  return values[idx];
}

export function authHeadersFromToken(token) {
  if (!token) {
    return { 'Content-Type': 'application/json' };
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function expect2xx(response, label) {
  return check(response, {
    [`${label} status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
}

export function parseJsonSafe(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

export function mustHaveEnv(name) {
  const value = __ENV[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
