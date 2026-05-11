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

export function formatRelativeAge(fromIso: string, to: Date = new Date()): string {
  const from = new Date(fromIso).getTime();
  const diff = Math.max(0, to.getTime() - from);
  const month = 30 * day;
  const week = 7 * day;

  if (diff < hour) {
    const minutes = Math.max(1, Math.floor(diff / minute));
    return `${minutes}m`;
  }

  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}h`;
  }

  if (diff < week) {
    const days = Math.floor(diff / day);
    return days === 1 ? "1 dia" : `${days} dias`;
  }

  if (diff < month) {
    const weeks = Math.floor(diff / week);
    return weeks === 1 ? "1 semana" : `${weeks} semanas`;
  }

  const months = Math.floor(diff / month);
  return months === 1 ? "1 mês" : `${months} meses`;
}

export function getAgeInHours(fromIso: string, to: Date = new Date()): number {
  return Math.max(0, (to.getTime() - new Date(fromIso).getTime()) / hour);
}

export function formatStatusAge(statusLabel: string, fromIso: string): string {
  return `${formatDuration(fromIso)} em ${statusLabel.toLowerCase()}`;
}
