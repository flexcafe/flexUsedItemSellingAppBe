import { jest } from '@jest/globals';
import {
  canonicalizeMyanmarAdminName,
  extractMyanmarRegion,
  extractRegionFromCoordinates,
  resolveLocationFromCoordinates,
  resolveRegionFromCoordinates,
} from './extract-myanmar-region.js';

describe('canonicalizeMyanmarAdminName', () => {
  it('maps common aliases to canonical admin names', () => {
    expect(canonicalizeMyanmarAdminName('Yangon', 'Myanmar')).toBe(
      'Yangon Region',
    );
    expect(canonicalizeMyanmarAdminName('Bago Region', 'Myanmar')).toBe(
      'Bago Region',
    );
    expect(canonicalizeMyanmarAdminName('Nay Pyi Taw')).toBe(
      'Naypyidaw Union Territory',
    );
  });
});

describe('extractMyanmarRegion', () => {
  it('extracts Yangon from downtown coordinates', () => {
    expect(extractMyanmarRegion(16.8409, 96.1735)).toBe('Yangon Region');
  });

  it('extracts Mandalay from city coordinates', () => {
    expect(extractMyanmarRegion(21.9588, 96.0891)).toBe('Mandalay Region');
  });

  it('extracts Naypyidaw before surrounding regions', () => {
    expect(extractMyanmarRegion(19.7633, 96.0785)).toBe(
      'Naypyidaw Union Territory',
    );
  });

  it('does not label Bago city as Yangon', () => {
    expect(extractMyanmarRegion(17.3369, 96.4797)).toBe('Bago Region');
  });

  it('does not label Hpa-an as Mon', () => {
    expect(extractMyanmarRegion(16.8896, 97.6348)).toBe('Kayin State');
  });

  it('extracts Mawlamyine as Mon', () => {
    expect(extractMyanmarRegion(16.4906, 97.6281)).toBe('Mon State');
  });

  it('extracts Taunggyi as Shan', () => {
    expect(extractMyanmarRegion(20.7892, 97.0378)).toBe('Shan State');
  });

  it('extracts Myawaddy as Kayin', () => {
    expect(extractMyanmarRegion(16.6891, 98.5089)).toBe('Kayin State');
  });

  it('returns null outside Myanmar', () => {
    expect(extractMyanmarRegion(13.7563, 100.5018)).toBeNull();
  });
});

describe('extractRegionFromCoordinates', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses Myanmar ADM1 polygons without calling reverse geocode', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      extractRegionFromCoordinates(17.3369, 96.4797),
    ).resolves.toBe('Bago Region');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps Myanmar ADM1 result even if a geocoder would disagree', async () => {
    globalThis.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          city: 'Bago',
          principalSubdivision: 'Yangon Region',
          countryName: 'Myanmar',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as unknown as typeof fetch;

    await expect(
      extractRegionFromCoordinates(17.3369, 96.4797),
    ).resolves.toBe('Bago Region');
  });

  it('reverse-geocodes coordinates outside Myanmar', async () => {
    globalThis.fetch = jest.fn(async (input) => {
      const url = String(input);
      if (url.includes('bigdatacloud')) {
        return new Response(
          JSON.stringify({
            city: 'Bangkok',
            principalSubdivision: 'Bangkok',
            countryName: 'Thailand',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('blocked', { status: 403 });
    }) as unknown as typeof fetch;

    await expect(
      extractRegionFromCoordinates(13.7563, 100.5018),
    ).resolves.toBe('Bangkok, Thailand');
  });

  it('falls back to Nominatim when the first geocoder is blocked', async () => {
    globalThis.fetch = jest.fn(async (input) => {
      const url = String(input);
      if (url.includes('bigdatacloud')) {
        return new Response('blocked', { status: 403 });
      }
      return new Response(
        JSON.stringify({
          address: {
            city: 'Bangkok',
            state: 'Bangkok',
            country: 'Thailand',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as unknown as typeof fetch;

    await expect(
      extractRegionFromCoordinates(13.7563, 100.5018),
    ).resolves.toBe('Bangkok, Thailand');
  });

  it('uses offline country when live geocoders fail after deploy', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    await expect(
      extractRegionFromCoordinates(13.7563, 100.5018),
    ).resolves.toBe('Thailand');
  });

  it('returns null when reverse geocode has no usable address', async () => {
    globalThis.fetch = jest.fn(async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    await expect(extractRegionFromCoordinates(0, 0)).resolves.toBeNull();
  });
});

describe('resolveLocationFromCoordinates', () => {
  it('keeps an explicit FE location label', () => {
    expect(
      resolveLocationFromCoordinates({
        locationText: 'Pabedan Township',
        latitude: 16.84,
        longitude: 96.17,
      }),
    ).toBe('Pabedan Township');
  });

  it('extracts region when FE sends coordinates without a label', () => {
    expect(
      resolveLocationFromCoordinates({
        locationText: '  ',
        latitude: 16.84,
        longitude: 96.17,
      }),
    ).toBe('Yangon Region');
  });

  it('returns null when neither label nor coordinates are present', () => {
    expect(resolveLocationFromCoordinates({})).toBeNull();
  });
});

describe('resolveRegionFromCoordinates', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('keeps an explicit FE location label', async () => {
    await expect(
      resolveRegionFromCoordinates({
        locationText: 'Pabedan Township',
        latitude: 16.84,
        longitude: 96.17,
      }),
    ).resolves.toBe('Pabedan Township');
  });

  it('extracts a global region when only coordinates are sent', async () => {
    globalThis.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          city: 'Singapore',
          countryName: 'Singapore',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as unknown as typeof fetch;

    await expect(
      resolveRegionFromCoordinates({
        latitude: 1.3521,
        longitude: 103.8198,
      }),
    ).resolves.toBe('Singapore');
  });
});
