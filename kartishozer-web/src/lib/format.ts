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

// An open-date event's startsAt is a fixed sentinel, not a real showtime
// (see OPEN_DATE_SENTINEL in lib/types) — every place that would
// otherwise print that date/time should show this instead.
export function fmtEventDate(event: { startsAt: string; isOpenDate: boolean }): string {
  return event.isOpenDate ? "תאריך פתוח" : fmtDate(event.startsAt);
}

export function fmtEventDateLong(event: { startsAt: string; isOpenDate: boolean }): string {
  return event.isOpenDate ? "תאריך פתוח" : fmtDateLong(event.startsAt);
}
