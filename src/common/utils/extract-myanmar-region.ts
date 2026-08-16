import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface RegionBox {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

type Adm1Polygon = {
  outer: number[][];
  holes: number[][][];
};

type Adm1Region = {
  name: string;
  bbox: [number, number, number, number];
  polygons: Adm1Polygon[];
};

type Adm1Dataset = {
  source: string;
  regions: Adm1Region[];
};

let myanmarAdm1: Adm1Dataset | null = null;

function loadMyanmarAdm1(): Adm1Dataset {
  if (myanmarAdm1) {
    return myanmarAdm1;
  }
  const filePath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../geo/myanmar-adm1.json',
  );
  myanmarAdm1 = JSON.parse(readFileSync(filePath, 'utf8')) as Adm1Dataset;
  return myanmarAdm1;
}

function pointInRing(
  longitude: number,
  latitude: number,
  ring: number[][],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInRegion(
  latitude: number,
  longitude: number,
  region: Adm1Region,
): boolean {
  const [minLng, minLat, maxLng, maxLat] = region.bbox;
  if (
    longitude < minLng ||
    longitude > maxLng ||
    latitude < minLat ||
    latitude > maxLat
  ) {
    return false;
  }
  for (const polygon of region.polygons) {
    if (!pointInRing(longitude, latitude, polygon.outer)) {
      continue;
    }
    const inHole = polygon.holes.some((hole) =>
      pointInRing(longitude, latitude, hole),
    );
    if (!inHole) {
      return true;
    }
  }
  return false;
}

/**
 * Exact Myanmar state/region from ADM1 polygons (geoBoundaries + Naypyidaw).
 * Not bounding boxes — those overlap and mislabel Bago/Hpa-an.
 */
export function extractMyanmarRegion(
  latitude: number,
  longitude: number,
): string | null {
  for (const region of loadMyanmarAdm1().regions) {
    if (pointInRegion(latitude, longitude, region)) {
      return region.name;
    }
  }
  return null;
}

const GEOCODE_TIMEOUT_MS = 2500;
const GEOCODE_USER_AGENT =
  'FlexCafeBackend/1.0.9 (used-item marketplace reverse-geocode)';

/**
 * Smaller countries first so nested/overlapping boxes do not steal the match.
 * Used only when live reverse-geocode APIs are blocked or down after deploy.
 */
const COUNTRY_BOXES: RegionBox[] = [
  { name: 'Singapore', minLat: 1.15, maxLat: 1.48, minLng: 103.6, maxLng: 104.1 },
  { name: 'Brunei', minLat: 4.0, maxLat: 5.1, minLng: 114.0, maxLng: 115.4 },
  { name: 'Qatar', minLat: 24.4, maxLat: 26.2, minLng: 50.7, maxLng: 51.7 },
  { name: 'Kuwait', minLat: 28.5, maxLat: 30.1, minLng: 46.5, maxLng: 48.5 },
  { name: 'Bahrain', minLat: 25.7, maxLat: 26.4, minLng: 50.3, maxLng: 50.8 },
  { name: 'Lebanon', minLat: 33.0, maxLat: 34.7, minLng: 35.1, maxLng: 36.7 },
  { name: 'Taiwan', minLat: 21.9, maxLat: 25.4, minLng: 119.9, maxLng: 122.1 },
  { name: 'Sri Lanka', minLat: 5.8, maxLat: 9.9, minLng: 79.5, maxLng: 82.1 },
  { name: 'South Korea', minLat: 33.0, maxLat: 38.7, minLng: 124.5, maxLng: 132.0 },
  { name: 'North Korea', minLat: 37.6, maxLat: 43.1, minLng: 124.1, maxLng: 130.8 },
  { name: 'Cambodia', minLat: 10.3, maxLat: 14.7, minLng: 102.3, maxLng: 107.7 },
  { name: 'Laos', minLat: 13.9, maxLat: 22.6, minLng: 100.0, maxLng: 107.8 },
  { name: 'Vietnam', minLat: 8.3, maxLat: 23.5, minLng: 102.1, maxLng: 109.6 },
  { name: 'Malaysia', minLat: 0.8, maxLat: 7.5, minLng: 99.5, maxLng: 119.4 },
  { name: 'Thailand', minLat: 5.6, maxLat: 20.5, minLng: 97.3, maxLng: 105.7 },
  { name: 'Bangladesh', minLat: 20.6, maxLat: 26.7, minLng: 88.0, maxLng: 92.8 },
  { name: 'Nepal', minLat: 26.3, maxLat: 30.5, minLng: 80.0, maxLng: 88.3 },
  { name: 'United Arab Emirates', minLat: 22.6, maxLat: 26.1, minLng: 51.5, maxLng: 56.5 },
  { name: 'Jordan', minLat: 29.1, maxLat: 33.4, minLng: 34.9, maxLng: 39.4 },
  { name: 'Israel', minLat: 29.4, maxLat: 33.4, minLng: 34.2, maxLng: 35.9 },
  { name: 'Philippines', minLat: 4.6, maxLat: 21.2, minLng: 116.9, maxLng: 126.7 },
  { name: 'Japan', minLat: 24.0, maxLat: 45.6, minLng: 122.9, maxLng: 146.0 },
  { name: 'United Kingdom', minLat: 49.8, maxLat: 58.8, minLng: -8.7, maxLng: 1.8 },
  { name: 'Italy', minLat: 36.6, maxLat: 47.1, minLng: 6.6, maxLng: 18.6 },
  { name: 'Germany', minLat: 47.2, maxLat: 55.1, minLng: 5.8, maxLng: 15.1 },
  { name: 'France', minLat: 41.3, maxLat: 51.2, minLng: -5.2, maxLng: 9.6 },
  { name: 'Spain', minLat: 35.9, maxLat: 43.8, minLng: -9.4, maxLng: 4.4 },
  { name: 'Turkey', minLat: 35.8, maxLat: 42.2, minLng: 25.6, maxLng: 44.9 },
  { name: 'Pakistan', minLat: 23.6, maxLat: 37.1, minLng: 60.8, maxLng: 77.9 },
  { name: 'Iran', minLat: 25.0, maxLat: 39.8, minLng: 44.0, maxLng: 63.4 },
  { name: 'Egypt', minLat: 22.0, maxLat: 31.8, minLng: 24.6, maxLng: 37.0 },
  { name: 'Saudi Arabia', minLat: 16.3, maxLat: 32.3, minLng: 34.5, maxLng: 55.7 },
  { name: 'Indonesia', minLat: -11.1, maxLat: 6.2, minLng: 95.0, maxLng: 141.1 },
  { name: 'Mexico', minLat: 14.5, maxLat: 32.8, minLng: -118.5, maxLng: -86.7 },
  { name: 'India', minLat: 6.7, maxLat: 35.6, minLng: 68.1, maxLng: 97.5 },
  { name: 'Australia', minLat: -43.8, maxLat: -10.0, minLng: 112.9, maxLng: 154.0 },
  { name: 'Canada', minLat: 41.6, maxLat: 83.2, minLng: -141.1, maxLng: -52.6 },
  { name: 'United States', minLat: 24.5, maxLat: 49.4, minLng: -125.0, maxLng: -66.9 },
  { name: 'China', minLat: 18.1, maxLat: 53.6, minLng: 73.5, maxLng: 135.1 },
  { name: 'Brazil', minLat: -33.8, maxLat: 5.3, minLng: -74.0, maxLng: -34.7 },
  { name: 'Russia', minLat: 41.1, maxLat: 81.9, minLng: 19.6, maxLng: 180.0 },
  { name: 'South Africa', minLat: -35.0, maxLat: -22.1, minLng: 16.4, maxLng: 33.0 },
  { name: 'Nigeria', minLat: 4.2, maxLat: 13.9, minLng: 2.6, maxLng: 14.7 },
  { name: 'Kenya', minLat: -4.8, maxLat: 5.1, minLng: 33.9, maxLng: 42.0 },
  { name: 'Argentina', minLat: -55.1, maxLat: -21.7, minLng: -73.6, maxLng: -53.6 },
];

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  country?: string;
};

type NominatimReverseResponse = {
  address?: NominatimAddress;
};

type BigDataCloudResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
};

const MYANMAR_ADMIN_ALIASES: Array<{ match: RegExp; name: string }> = [
  { match: /nay\s*pyi\s*taw|naypyidaw|naypyitaw/i, name: 'Naypyidaw Union Territory' },
  { match: /yangon|rangoon/i, name: 'Yangon Region' },
  { match: /mandalay/i, name: 'Mandalay Region' },
  { match: /kachin/i, name: 'Kachin State' },
  { match: /\bchin\b/i, name: 'Chin State' },
  { match: /kayah|karenni/i, name: 'Kayah State' },
  { match: /kayin|\bkaren\b/i, name: 'Kayin State' },
  { match: /tanintharyi|tenasserim/i, name: 'Tanintharyi Region' },
  { match: /ayeyarwadd?y|irrawaddy/i, name: 'Ayeyarwady Region' },
  { match: /magway|magwe/i, name: 'Magway Region' },
  { match: /bago|\bpegu\b/i, name: 'Bago Region' },
  { match: /rakhine|arakan/i, name: 'Rakhine State' },
  { match: /\bshan\b/i, name: 'Shan State' },
  { match: /sagaing/i, name: 'Sagaing Region' },
  { match: /\bmon\b/i, name: 'Mon State' },
];

function isMyanmarCountry(country?: string): boolean {
  const value = country?.trim().toLowerCase() ?? '';
  return (
    value === 'mm' ||
    value.includes('myanmar') ||
    value.includes('burma')
  );
}

export function canonicalizeMyanmarAdminName(
  ...parts: Array<string | undefined>
): string | null {
  const haystack = parts.filter(Boolean).join(' ');
  if (!haystack) {
    return null;
  }
  for (const alias of MYANMAR_ADMIN_ALIASES) {
    if (alias.match.test(haystack)) {
      return alias.name;
    }
  }
  return null;
}

function matchBox(
  boxes: RegionBox[],
  latitude: number,
  longitude: number,
): string | null {
  for (const box of boxes) {
    if (
      latitude >= box.minLat &&
      latitude <= box.maxLat &&
      longitude >= box.minLng &&
      longitude <= box.maxLng
    ) {
      return box.name;
    }
  }
  return null;
}

export function extractCountryFromCoordinates(
  latitude: number,
  longitude: number,
): string | null {
  return matchBox(COUNTRY_BOXES, latitude, longitude);
}

function joinUniqueParts(parts: Array<string | undefined>): string | null {
  const unique: string[] = [];
  for (const part of parts) {
    const value = part?.trim();
    if (value && !unique.includes(value)) {
      unique.push(value);
    }
  }
  return unique.length > 0 ? unique.join(', ') : null;
}

function formatNominatimAddress(address: NominatimAddress): string | null {
  return joinUniqueParts([
    address.city ?? address.town ?? address.village ?? address.municipality,
    address.state ?? address.region ?? address.county,
    address.country,
  ]);
}

function formatBigDataCloudAddress(body: BigDataCloudResponse): string | null {
  return joinUniqueParts([
    body.city || body.locality,
    body.principalSubdivision,
    body.countryName,
  ]);
}

async function fetchJson(
  url: string,
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': GEOCODE_USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function reverseGeocodeBigDataCloud(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const url = new URL(
    'https://api.bigdatacloud.net/data/reverse-geocode-client',
  );
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('localityLanguage', 'en');

  const body = (await fetchJson(url.toString())) as BigDataCloudResponse | null;
  if (!body) {
    return null;
  }
  if (isMyanmarCountry(body.countryName)) {
    return canonicalizeMyanmarAdminName(
      body.principalSubdivision,
      body.city,
      body.locality,
      body.countryName,
    );
  }
  return formatBigDataCloudAddress(body);
}

async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('zoom', '10');
  url.searchParams.set('addressdetails', '1');

  const body = (await fetchJson(url.toString())) as NominatimReverseResponse | null;
  if (!body?.address) {
    return null;
  }
  if (isMyanmarCountry(body.address.country)) {
    return canonicalizeMyanmarAdminName(
      body.address.state,
      body.address.region,
      body.address.county,
      body.address.city,
      body.address.country,
    );
  }
  return formatNominatimAddress(body.address);
}

async function reverseGeocodeGlobalRegion(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const fromBigDataCloud = await reverseGeocodeBigDataCloud(
    latitude,
    longitude,
  );
  if (fromBigDataCloud) {
    return fromBigDataCloud;
  }

  const fromNominatim = await reverseGeocodeNominatim(latitude, longitude);
  if (fromNominatim) {
    return fromNominatim;
  }

  return extractCountryFromCoordinates(latitude, longitude);
}

/**
 * Resolves a display region from GPS.
 * Myanmar uses ADM1 polygons first (exact state/region borders).
 * Outside Myanmar, live reverse-geocode is used, then country boxes.
 */
export async function extractRegionFromCoordinates(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const myanmar = extractMyanmarRegion(latitude, longitude);
    if (myanmar) {
      return myanmar;
    }
    return await reverseGeocodeGlobalRegion(latitude, longitude);
  } catch {
    return (
      extractMyanmarRegion(latitude, longitude) ??
      extractCountryFromCoordinates(latitude, longitude)
    );
  }
}

export function resolveLocationFromCoordinates(params: {
  locationText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): string | null {
  const label = params.locationText?.trim();
  if (label) {
    return label;
  }

  if (params.latitude == null || params.longitude == null) {
    return null;
  }

  return extractMyanmarRegion(params.latitude, params.longitude);
}

export async function resolveRegionFromCoordinates(params: {
  locationText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<string | null> {
  const label = params.locationText?.trim();
  if (label) {
    return label;
  }

  if (params.latitude == null || params.longitude == null) {
    return null;
  }

  return extractRegionFromCoordinates(params.latitude, params.longitude);
}
