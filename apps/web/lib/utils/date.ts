import { formatDistanceToNowStrict, format, isToday, isYesterday } from "date-fns";

export function relativeTime(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function shortDate(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

export function dateWithYear(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  return format(date, "MMM d, yyyy");
}

export function timeOnly(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  return format(date, "h:mm a");
}

export function dueLabel(dueIso: string) {
  const d = new Date(dueIso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < -1) return `${-days} days overdue`;
  if (days === -1) return "1 day overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 7) return `Due in ${days} days`;
  return `Due ${format(d, "MMM d")}`;
}

export function dueIsOverdue(dueIso: string) {
  return new Date(dueIso).getTime() < new Date().setHours(0, 0, 0, 0);
}
