import type { MoonState } from '../astro/moon';
import type { LunisolarDate } from '../astro/lunisolar';
import type { SexagenaryDay } from '../astro/sexagenary';
import type { currentSolarTerm } from '../astro/solarterms';

export type Task =
  | 'sow_leaf' | 'sow_root' | 'sow_fruit' | 'sow_flower'
  | 'transplant' | 'prune' | 'graft' | 'weed_pest' | 'harvest_store' | 'soil_compost' | 'water_feed';

export const TASKS: Array<{ id: Task; label: string; short: string; icon: string }> = [
  { id: 'sow_leaf', label: 'Sow leaf crops', short: 'Leaf', icon: '🥬' },
  { id: 'sow_root', label: 'Sow root crops', short: 'Root', icon: '🥕' },
  { id: 'sow_fruit', label: 'Sow fruit & seed crops', short: 'Fruit', icon: '🍅' },
  { id: 'sow_flower', label: 'Sow flowers', short: 'Flower', icon: '🌸' },
  { id: 'transplant', label: 'Transplant / plant out', short: 'Plant out', icon: '🪴' },
  { id: 'prune', label: 'Prune & cut back', short: 'Prune', icon: '✂️' },
  { id: 'graft', label: 'Graft & take cuttings', short: 'Graft', icon: '🌿' },
  { id: 'weed_pest', label: 'Weed & control pests', short: 'Weed', icon: '🐛' },
  { id: 'harvest_store', label: 'Harvest for storage', short: 'Harvest', icon: '🧺' },
  { id: 'soil_compost', label: 'Work soil, compost, manure', short: 'Soil', icon: '🪱' },
  { id: 'water_feed', label: 'Water & feed', short: 'Water', icon: '💧' }
];

export interface DayContext {
  ymd: string;
  tz: string;
  lat: number; lon: number;
  hemisphere: 'N' | 'S';
  noon: Date;
  moon: MoonState;
  lunarDay: number;
  term: ReturnType<typeof currentSolarTerm>;
  /** seasonal index: term index shifted by 6 months in the southern hemisphere */
  seasonalTermIndex: number;
  /** actual (unshifted) term index, 0 = 立春 */
  seasonalTermIndexRaw(): number;
  koLunar: LunisolarDate;
  zhLunar: LunisolarDate;
  sexDay: SexagenaryDay;      // for the civil date in China Standard Time
  sexDayKo: SexagenaryDay;    // for the civil date in Korea Standard Time
  year: number;
  easter: string;
  lastFrost: string;          // this year's expected last spring frost (ymd)
  firstFrost: string;         // this year's expected first autumn frost (ymd)
  daysFromLastFrost: number;
  daysToFirstFrost: number;
}

export interface TraditionDay {
  scores: Partial<Record<Task, number>>;      // -2 … +2
  reasons: Partial<Record<Task, string[]>>;
  notes: string[];                             // festivals, proverbs, warnings
  headline: string;                            // one line summary for the day
  blocked?: string;                            // whole-day "do not garden" reason
}

export interface Tradition {
  id: string;
  name: string;
  region: string;
  flag: string;
  summary: string;
  basis: string[];           // what sky/calendar facts it reads
  sources: string[];
  evaluate(ctx: DayContext): TraditionDay;
}

export function mk(): TraditionDay { return { scores: {}, reasons: {}, notes: [], headline: '' }; }
export function add(d: TraditionDay, task: Task, score: number, why: string) {
  d.scores[task] = Math.max(-2, Math.min(2, (d.scores[task] ?? 0) + score));
  (d.reasons[task] ??= []).push(why);
}
export function addAll(d: TraditionDay, tasks: Task[], score: number, why: string) { for (const t of tasks) add(d, t, score, why); }
export const SOW_ALL: Task[] = ['sow_leaf', 'sow_root', 'sow_fruit', 'sow_flower'];
export const ALL_TASKS: Task[] = TASKS.map(t => t.id);
export function md(ymd: string) { return ymd.slice(5); }
