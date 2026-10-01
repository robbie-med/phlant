import * as A from 'astronomy-engine';
import { civilDateAtOffset, daysBetween, addDays } from './dates';
import { solarTermsCached } from './solarterms';

export interface LunisolarDate {
  year: number;        // lunisolar year number (year of the Chinese/Korean new year it follows)
  month: number;       // 1..12
  leap: boolean;       // 闰月 / 윤달
  day: number;         // 1..30
  monthLength: number; // 29 or 30
  monthStart: string;  // civil date (in offset) of the new moon day
}

interface MonthRec { start: string; month: number; leap: boolean; }

const cache = new Map<string, MonthRec[]>();

/** Civil dates (in offset) of all new moons from `from` to `to` inclusive. */
function newMoonDates(from: string, to: string, off: number): string[] {
  const out: string[] = [];
  let t = new Date(Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10)) - 86_400_000 * 2);
  const end = new Date(Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10)) + 86_400_000 * 2);
  while (t < end) {
    const nm = A.SearchMoonPhase(0, t, 40);
    if (!nm || nm.date > end) break;
    out.push(civilDateAtOffset(nm.date, off));
    t = new Date(nm.date.getTime() + 86_400_000);
  }
  return out;
}

/** 中气 civil dates between two civil dates. */
function zhongqiDates(from: string, to: string, off: number): string[] {
  const y1 = +from.slice(0, 4), y2 = +to.slice(0, 4);
  const evs: ReturnType<typeof solarTermsCached> = [];
  for (let y = y1 - 1; y <= y2; y++) evs.push(...solarTermsCached(y));
  const s = new Set<string>();
  for (const e of evs) if (e.def.zhongqi) { const d = civilDateAtOffset(e.time, off); if (d >= from && d <= to) s.add(d); }
  return [...s].sort();
}

/**
 * Build the lunisolar months of the "sui" that runs from the month containing the winter
 * solstice of `year-1` to the month containing the solstice of `year`. Standard rule:
 * month containing 冬至 is month 11; if 13 months lie between two 11ths, the first one
 * with no 中气 is the leap month.
 */
function buildSui(year: number, off: number): MonthRec[] {
  const key = `${year}:${off}`;
  const hit = cache.get(key); if (hit) return hit;
  const ws1 = civilDateAtOffset(solarTermsCached(year - 1).find(e => e.def.i === 21)!.time, off);
  const ws2 = civilDateAtOffset(solarTermsCached(year).find(e => e.def.i === 21)!.time, off);
  const nms = newMoonDates(addDays(ws1, -30), addDays(ws2, 1), off);
  const m11a = [...nms].reverse().find(d => d <= ws1)!;
  const m11b = [...nms].reverse().find(d => d <= ws2)!;
  const starts = nms.filter(d => d >= m11a && d <= m11b); // month starts, inclusive of both 11ths
  const months: MonthRec[] = [];
  const leapYear = starts.length - 1 === 13;
  let leapUsed = false;
  let num = 11;
  const zq = zhongqiDates(m11a, addDays(m11b, 35), off);
  for (let i = 0; i < starts.length - 1; i++) {
    const s = starts[i], e = starts[i + 1];
    const hasZq = zq.some(d => d >= s && d < e);
    if (i > 0 && leapYear && !leapUsed && !hasZq) {
      months.push({ start: s, month: num, leap: true }); // leap month repeats previous number
      leapUsed = true;
      continue;
    }
    if (i > 0) num = num % 12 + 1;
    months.push({ start: s, month: num, leap: false });
  }
  months.push({ start: m11b, month: 11, leap: false });
  cache.set(key, months);
  return months;
}

/** Lunisolar date for a civil date (already expressed in the tradition's offset). */
export function lunisolarDate(ymd: string, off: number): LunisolarDate {
  const y = +ymd.slice(0, 4);
  const recs = [...buildSui(y, off), ...buildSui(y + 1, off)];
  let idx = 0;
  for (let i = 0; i < recs.length; i++) if (recs[i].start <= ymd) idx = i;
  const rec = recs[idx];
  const next = recs[idx + 1];
  const monthLength = next ? daysBetween(rec.start, next.start) : 30;
  // lunisolar year = Gregorian year of the most recent 正月 start (months 11/12 before a new year belong to the previous lunar year).
  let lunarYear = y;
  let back = idx; while (back >= 0 && !(recs[back].month === 1 && !recs[back].leap)) back--;
  if (back >= 0) lunarYear = +recs[back].start.slice(0, 4);
  else { let fwd = idx; while (fwd < recs.length && recs[fwd].month !== 1) fwd++; lunarYear = +recs[fwd].start.slice(0, 4) - 1; }
  return { year: lunarYear, month: rec.month, leap: rec.leap, day: daysBetween(rec.start, ymd) + 1, monthLength, monthStart: rec.start };
}

export const KO_MONTHS = ['정월', '이월', '삼월', '사월', '오월', '유월', '칠월', '팔월', '구월', '시월', '십일월', '섣달'];
export const ZH_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '腊月'];
export function zhDay(d: number): string {
  const tens = ['初', '十', '廿', '三'];
  const ones = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (d === 10) return '初十'; if (d === 20) return '二十'; if (d === 30) return '三十';
  return tens[Math.floor((d - 1) / 10)] + ones[d % 10 === 0 ? 10 : d % 10];
}
