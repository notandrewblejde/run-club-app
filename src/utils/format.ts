// Display helpers for run-related quantities.

export function formatMiles(miles?: number | null): string {
  if (miles === undefined || miles === null) return '—';
  return `${Number(miles).toFixed(2)} mi`;
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatPace(secsPerMile?: number | null): string {
  if (!secsPerMile) return '—';
  const m = Math.floor(secsPerMile / 60);
  const s = secsPerMile % 60;
  return `${m}:${String(s).padStart(2, '0')} /mi`;
}

/** Format a unix epoch (seconds) as "Apr 12, 6:42 PM" or similar. */
export function formatDateFromUnix(epoch?: number | null): string {
  if (!epoch) return '';
  const d = new Date(epoch * 1000);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Format a unix epoch (seconds) as a relative string like "3h ago". */
export function formatRelativeFromUnix(epoch?: number | null): string {
  if (!epoch) return '';
  const ms = epoch * 1000;
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

export function formatElevation(ft?: number | null): string {
  if (ft === undefined || ft === null) return '—';
  return `${Math.round(Number(ft))} ft`;
}
