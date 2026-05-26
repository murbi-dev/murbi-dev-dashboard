const dayInMs = 24 * 60 * 60 * 1000;

export type DueDateTone = "default" | "soon" | "overdue";

function parseDateOnly(date: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    return undefined;
  }

  const [, year, month, day] = match;

  return new Date(Number(year), Number(month) - 1, Number(day));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDueDateTone(dueDate: string, now: Date = new Date()): DueDateTone {
  const due = parseDateOnly(dueDate);

  if (!due) {
    return "default";
  }

  const diffDays = Math.round((due.getTime() - startOfDay(now).getTime()) / dayInMs);

  if (diffDays < 0) {
    return "overdue";
  }

  return diffDays <= 1 ? "soon" : "default";
}

export function formatDueDate(dueDate: string): string {
  const due = parseDateOnly(dueDate);

  if (!due) {
    return dueDate;
  }

  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(due);

  return `${formattedDate} (${formatDueDateDistance(due)})`;
}

function formatDueDateDistance(due: Date, now: Date = new Date()): string {
  const diffDays = Math.round((due.getTime() - startOfDay(now).getTime()) / dayInMs);

  if (diffDays === 0) {
    return "hoje";
  }

  if (diffDays === 1) {
    return "amanhã";
  }

  if (diffDays === -1) {
    return "ontem";
  }

  if (diffDays > 1) {
    return `em ${diffDays} dias`;
  }

  return `há ${Math.abs(diffDays)} dias`;
}
