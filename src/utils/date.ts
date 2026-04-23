function isValidDate(dateString: string): boolean {
  if (!dateString) return false;
  const d = new Date(dateString);
  return !isNaN(d.getTime()) && d.getFullYear() >= 2020 && d.getTime() <= Date.now() + 86400000;
}

/** Maximum job age in milliseconds (60 days) */
const MAX_JOB_AGE_MS = 60 * 24 * 60 * 60 * 1000;

/** Returns true if a job posted_at date is within the last 60 days */
export function isJobFresh(postedAt: string | null | undefined): boolean {
  if (!postedAt) return false;
  const d = new Date(postedAt);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() <= MAX_JOB_AGE_MS;
}

export function formatDate(dateString: string): string {
  if (!isValidDate(dateString)) return 'Recently posted';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelativeTime(dateString: string): string {
  if (!isValidDate(dateString)) return 'Recently';
  const now = Date.now();
  const diff = now - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateString);
}

export function nowISO(): string {
  return new Date().toISOString();
}
