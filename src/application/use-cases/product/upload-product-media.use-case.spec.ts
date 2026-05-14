import { describe, expect, it } from '@jest/globals';
import {
  parseSupabasePublicObjectUrl,
} from './upload-product-media.use-case.js';

describe(parseSupabasePublicObjectUrl.name, () => {
  it('parses standard Supabase public object URL', () => {
    const url =
      'https://lxvasskyohlgfrxcjpys.supabase.co/storage/v1/object/public/listing-images/listings/u1/images/a.jpg';
    expect(parseSupabasePublicObjectUrl(url)).toEqual({
      bucket: 'listing-images',
      objectPath: 'listings/u1/images/a.jpg',
    });
  });

  it('strips query string before parsing', () => {
    const url =
      'https://example.supabase.co/storage/v1/object/public/b/p/x.png?v=1';
    expect(parseSupabasePublicObjectUrl(url)).toEqual({
      bucket: 'b',
      objectPath: 'p/x.png',
    });
  });

  it('returns null for non-Supabase URLs', () => {
    expect(parseSupabasePublicObjectUrl('https://cdn.example.com/a.jpg')).toBe(
      null,
    );
  });
});
