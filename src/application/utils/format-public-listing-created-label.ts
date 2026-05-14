const MS_MIN = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

function formatCalendarDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Relative / calendar label for public product cards (catalog + public detail).
 *
 * - Under 1 h: "N min ago"
 * - Under 24 h: "N h ago"
 * - Under 7 days (after 24 h rule): weekday name in `timeZone` (e.g. "Wednesday")
 * - From 7 days onward: short calendar date in `timeZone` (e.g. "May 14, 2026")
 */
export function formatPublicListingCreatedLabel(
  createdAt: Date,
  options: { now: Date; timeZone: string },
): string {
  const { now, timeZone } = options;
  const ms = now.getTime() - createdAt.getTime();

  if (ms < 0) {
    return formatCalendarDate(createdAt, timeZone);
  }

  const minutes = Math.floor(ms / MS_MIN);
  const hours = Math.floor(ms / MS_HOUR);

  if (minutes < 1) {
    return 'just now';
  }
  if (hours < 1) {
    return `${minutes} min ago`;
  }
  if (hours < 24) {
    return `${hours} h ago`;
  }
  if (ms < 7 * MS_DAY) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone,
    }).format(createdAt);
  }
  return formatCalendarDate(createdAt, timeZone);
}
