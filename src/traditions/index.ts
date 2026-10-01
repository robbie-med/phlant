import * as A from 'astronomy-engine';
import { biodynamic } from './biodynamic';
import { almanac } from './almanac';
import { english } from './english';
import { french } from './french';
import { russian } from './russian';
import { korean } from './korean';
import { makeChinese, ZH_REGIONS, type ZhRegion } from './chinese';
import { ALL_TASKS, type DayContext, type Task, type Tradition, type TraditionDay } from './types';
import { moonState, lunarDay } from '../astro/moon';
import { currentSolarTerm } from '../astro/solarterms';
import { lunisolarDate } from '../astro/lunisolar';
import { sexagenaryDay } from '../astro/sexagenary';
import { civilDateAtOffset, daysBetween, easter, noonAtOffset, tzOffsetHours } from '../astro/dates';

export const TRADITIONS: Tradition[] = [
  korean, makeChinese('north'), makeChinese('jiangnan'), makeChinese('lingnan'), makeChinese('northeast'),
  biodynamic, french, english, russian, almanac
];
export const DEFAULT_ENABLED = ['korean', 'chinese_north', 'biodynamic', 'french', 'english', 'russian', 'almanac'];
export { ZH_REGIONS }; export type { ZhRegion };

export interface Site {
  lat: number; lon: number; elevationM: number; tz: string;
  lastFrost: string; // MM-DD
  firstFrost: string; // MM-DD
}

const ctxCache = new Map<string, DayContext>();
export function buildContext(ymd: string, site: Site): DayContext {
  const key = `${ymd}|${site.lat.toFixed(3)}|${site.lon.toFixed(3)}|${site.tz}|${site.lastFrost}|${site.firstFrost}`;
  const hit = ctxCache.get(key); if (hit) return hit;
  const off = tzOffsetHours(site.tz, noonAtOffset(ymd, 0));
  const noon = noonAtOffset(ymd, off);
  const observer = new A.Observer(site.lat, site.lon, site.elevationM);
  const hemisphere = site.lat < 0 ? 'S' : 'N';
  const term = currentSolarTerm(noon);
  const year = +ymd.slice(0, 4);
  const zhYmd = civilDateAtOffset(noon, 8), koYmd = civilDateAtOffset(noon, 9);
  const lastFrost = `${year}-${site.lastFrost}`, firstFrost = `${year}-${site.firstFrost}`;
  const ctx: DayContext = {
    ymd, tz: site.tz, lat: site.lat, lon: site.lon, hemisphere, noon,
    moon: moonState(noon, observer),
    lunarDay: lunarDay(noon, observer),
    term,
    seasonalTermIndex: hemisphere === 'N' ? term.term.def.i : (term.term.def.i + 12) % 24,
    seasonalTermIndexRaw: () => term.term.def.i,
    koLunar: lunisolarDate(koYmd, 9), zhLunar: lunisolarDate(zhYmd, 8),
    sexDay: sexagenaryDay(zhYmd), sexDayKo: sexagenaryDay(koYmd),
    year, easter: easter(year), lastFrost, firstFrost,
    daysFromLastFrost: daysBetween(lastFrost, ymd), daysToFirstFrost: daysBetween(ymd, firstFrost)
  };
  if (ctxCache.size > 800) ctxCache.clear();
  ctxCache.set(key, ctx);
  return ctx;
}

export interface Consensus {
  mean: Partial<Record<Task, number>>;
  agreement: Partial<Record<Task, number>>; // 0..1 (1 = all agree)
  votes: Partial<Record<Task, { pro: number; con: number; n: number }>>;
  best: Task[]; worst: Task[];
}

export function evaluateDay(ctx: DayContext, enabled: string[]): { results: Array<{ t: Tradition; r: TraditionDay }>; consensus: Consensus } {
  const results = TRADITIONS.filter(t => enabled.includes(t.id)).map(t => ({ t, r: t.evaluate(ctx) }));
  const mean: Consensus['mean'] = {}, agreement: Consensus['agreement'] = {}, votes: Consensus['votes'] = {};
  for (const task of ALL_TASKS) {
    const vals = results.map(x => x.r.scores[task]).filter((v): v is number => v !== undefined);
    if (!vals.length) continue;
    const mu = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mu) ** 2, 0) / vals.length);
    mean[task] = mu; agreement[task] = Math.max(0, 1 - sd / 2);
    votes[task] = { pro: vals.filter(v => v > 0).length, con: vals.filter(v => v < 0).length, n: results.length };
  }
  const ranked = (Object.keys(mean) as Task[]).sort((a, b) => (mean[b] ?? 0) - (mean[a] ?? 0));
  return { results, consensus: { mean, agreement, votes, best: ranked.filter(t => (mean[t] ?? 0) > 0.5).slice(0, 3), worst: ranked.filter(t => (mean[t] ?? 0) < -0.5).slice(-3).reverse() } };
}
