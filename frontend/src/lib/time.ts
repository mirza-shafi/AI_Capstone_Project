// Backend timestamps are always UTC (datetime.now(timezone.utc)) but the naive SQLite
// DateTime column round-trips them without an explicit offset — parse defensively so
// the browser doesn't misinterpret them as local time.
export function parseUtc(iso: string): Date {
  const hasTz = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso)
  return new Date(hasTz ? iso : `${iso}Z`)
}

export function timeAgo(iso: string): string {
  const diffSec = Math.round((Date.now() - parseUtc(iso).getTime()) / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.round(diffHour / 24)
  return `${diffDay}d ago`
}
