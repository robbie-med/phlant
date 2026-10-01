// Calendar helpers that do not need the ephemeris.

/** Civil date in a fixed UTC offset (hours), as YYYY-MM-DD. */
export function civilDateAtOffset(d: Date, offsetHours: number): string {
  const shifted = new Date(d.getTime() + offsetHours * 3600_000);
  return shifted.toISOString().slice(0, 10);
}

/** Local noon (UTC instant) for a civil date in a given UTC offset. */
export function noonAtOffset(ymd: string, offsetHours: number): Date {
  const [y, m, dd] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd, 12, 0, 0) - offsetHours * 3600_000);
}

/** Midnight (start of day) UTC instant for civil date in offset. */
export function midnightAtOffset(ymd: string, offsetHours: number): Date {
  const [y, m, dd] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd, 0, 0, 0) - offsetHours * 3600_000);
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Julian Day Number for a civil (Gregorian) date. */
export function jdn(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** Gregorian Easter Sunday (Meeus/Jones/Butcher). */
export function easter(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** UTC offset in hours for an IANA time zone at an instant. */
export function tzOffsetHours(tz: string, at: Date): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const parts = Object.fromEntries(fmt.formatToParts(at).map(p => [p.type, p.value]));
    const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    return Math.round(((asUTC - at.getTime()) / 3600_000) * 4) / 4;
  } catch {
    return 0;
  }
}

export function ymdOf(d: Date, tz: string): string {
  return civilDateAtOffset(d, tzOffsetHours(tz, d));
}

export function fmtTime(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(d);
  } catch { return d.toISOString().slice(11, 16) + 'Z'; }
}

export function fmtDateTime(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: tz, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
  } catch { return d.toISOString().slice(0, 16) + 'Z'; }
}
