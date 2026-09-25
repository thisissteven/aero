export interface RelativeTimeLocale {
  now: string;
  justNow: string;
  ago: string;
  year: (n: number) => string;
  month: (n: number) => string;
  week: (n: number) => string;
  day: (n: number) => string;
  hour: (n: number) => string;
  minute: (n: number) => string;
}

const defaultRelativeTimeLocale: RelativeTimeLocale = {
  now: 'now',
  justNow: 'Just now',
  ago: ' ago',
  year: (n) => `${n}y`,
  month: (n) => `${n}mo`,
  week: (n) => `${n}w`,
  day: (n) => `${n}d`,
  hour: (n) => `${n}h`,
  minute: (n) => `${n}m`,
};

export function formatCompactRelativeTime(
  value: DateValue,
  withAgo?: boolean,
  locale: RelativeTimeLocale = defaultRelativeTimeLocale,
): string {
  const date = parseDate(value);

  if (!date) {
    return '';
  }

  const diff = Date.now() - date.getTime();

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const suffix = withAgo ? locale.ago : '';

  if (years > 0) return `${locale.year(years)}${suffix}`;
  if (months > 0) return `${locale.month(months)}${suffix}`;
  if (weeks > 0) return `${locale.week(weeks)}${suffix}`;
  if (days > 0) return `${locale.day(days)}${suffix}`;
  if (hours > 0) return `${locale.hour(hours)}${suffix}`;
  if (minutes > 0) return `${locale.minute(minutes)}${suffix}`;

  return withAgo ? locale.justNow : locale.now;
}

export function formatDateTimeFull(value: DateValue): string {
  const date = parseDate(value);

  if (!date) {
    throw new Error('Invalid date value');
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export type DateValue = Date | string | number | null | undefined;

export function parseDate(value: DateValue): Date | null {
  if (value == null) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // 1. Handle stringified Unix timestamps ("1788199985164")
    const numericValue = Number(trimmed);
    if (!isNaN(numericValue)) {
      const date = new Date(numericValue);
      return isNaN(date.getTime()) ? null : date;
    }

    // 2. Handle standard parsing
    const isoString = trimmed.includes(' ')
      ? trimmed.replace(' ', 'T')
      : trimmed;
    let date = new Date(isoString);

    if (!isNaN(date.getTime())) {
      return date;
    }

    // 3. Fallback: Fix strings missing a year (e.g., "Sep 1, 2:13 AM")
    const currentYear = new Date().getFullYear();
    const dateWithYear = `${trimmed}, ${currentYear}`;
    date = new Date(dateWithYear);

    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}
export function formatDateTime(value: DateValue): string {
  const date = parseDate(value);

  if (!date) {
    throw new Error(`Invalid date value: ${value}`);
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
