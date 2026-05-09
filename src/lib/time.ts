const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

export function formatDuration(fromIso: string, to: Date = new Date()): string {
  const from = new Date(fromIso).getTime();
  const diff = Math.max(0, to.getTime() - from);

  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))}m`;
  }

  if (diff < day) {
    return `${Math.floor(diff / hour)}h`;
  }

  return `${Math.floor(diff / day)}d`;
}

export function formatRelativeTime(fromIso: string, to: Date = new Date()): string {
  return `há ${formatDuration(fromIso, to)}`;
}

export function getAgeInHours(fromIso: string, to: Date = new Date()): number {
  return Math.max(0, (to.getTime() - new Date(fromIso).getTime()) / hour);
}

export function formatStatusAge(statusLabel: string, fromIso: string): string {
  return `${formatDuration(fromIso)} em ${statusLabel.toLowerCase()}`;
}
