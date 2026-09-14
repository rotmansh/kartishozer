export function fmtAgorot(agorot: number): string {
  const shekels = agorot / 100;
  return `₪${shekels.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
}

export function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function fmtDateLong(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
