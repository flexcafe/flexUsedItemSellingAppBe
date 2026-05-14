import { describe, expect, it } from '@jest/globals';
import { formatPublicListingCreatedLabel } from './format-public-listing-created-label.js';

describe(formatPublicListingCreatedLabel.name, () => {
  const tz = 'UTC';

  it('returns minutes under 1 hour', () => {
    const now = new Date('2026-05-14T12:00:00.000Z');
    const created = new Date('2026-05-14T11:30:00.000Z');
    expect(
      formatPublicListingCreatedLabel(created, { now, timeZone: tz }),
    ).toBe('30 min ago');
  });

  it('returns hours under 24 hours', () => {
    const now = new Date('2026-05-14T12:00:00.000Z');
    const created = new Date('2026-05-14T02:00:00.000Z');
    expect(
      formatPublicListingCreatedLabel(created, { now, timeZone: tz }),
    ).toBe('10 h ago');
  });

  it('returns weekday between 24 hours and 7 days', () => {
    const now = new Date('2026-05-14T12:00:00.000Z');
    const created = new Date('2026-05-10T12:00:00.000Z');
    expect(
      formatPublicListingCreatedLabel(created, { now, timeZone: tz }),
    ).toBe('Sunday');
  });

  it('returns calendar date at or after 7 days', () => {
    const now = new Date('2026-05-14T12:00:00.000Z');
    const created = new Date('2026-05-06T12:00:00.000Z');
    expect(
      formatPublicListingCreatedLabel(created, { now, timeZone: tz }),
    ).toBe('May 6, 2026');
  });
});
