export function formatCompactRelativeTime(
  value: string | number | Date,
  withAgo?: boolean,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diff = Date.now() - date.getTime();

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const suffix = withAgo ? ' ago' : '';

  if (years > 0) return `${years}y` + suffix;
  if (months > 0) return `${months}mo` + suffix;
  if (weeks > 0) return `${weeks}w` + suffix;
  if (days > 0) return `${days}d` + suffix;
  if (hours > 0) return `${hours}h` + suffix;
  if (minutes > 0) return `${minutes}m` + suffix;

  return withAgo ? 'Just now' : 'now';
}

export function formatDateTime(value: string | number | Date): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
