import * as A from 'astronomy-engine';
import { civilDateAtOffset } from './dates';

export interface SolarTermDef {
  i: number;            // 0 = 立春 (sun longitude 315°)
  lon: number;          // apparent solar longitude
  zh: string; pinyin: string; ko: string; hanja: string; en: string;
  zhongqi: boolean;     // 中气 (even index ⇒ odd-numbered "major" term used for lunar month numbering)
}

const RAW: Array<[string, string, string, string]> = [
  ['立春', 'Lìchūn', '입춘', 'Start of Spring'],
  ['雨水', 'Yǔshuǐ', '우수', 'Rain Water'],
  ['惊蛰', 'Jīngzhé', '경칩', 'Insects Awaken'],
  ['春分', 'Chūnfēn', '춘분', 'Spring Equinox'],
  ['清明', 'Qīngmíng', '청명', 'Clear and Bright'],
  ['谷雨', 'Gǔyǔ', '곡우', 'Grain Rain'],
  ['立夏', 'Lìxià', '입하', 'Start of Summer'],
  ['小满', 'Xiǎomǎn', '소만', 'Grain Buds'],
  ['芒种', 'Mángzhòng', '망종', 'Grain in Ear'],
  ['夏至', 'Xiàzhì', '하지', 'Summer Solstice'],
  ['小暑', 'Xiǎoshǔ', '소서', 'Minor Heat'],
  ['大暑', 'Dàshǔ', '대서', 'Major Heat'],
  ['立秋', 'Lìqiū', '입추', 'Start of Autumn'],
  ['处暑', 'Chǔshǔ', '처서', 'End of Heat'],
  ['白露', 'Báilù', '백로', 'White Dew'],
  ['秋分', 'Qiūfēn', '추분', 'Autumn Equinox'],
  ['寒露', 'Hánlù', '한로', 'Cold Dew'],
  ['霜降', 'Shuāngjiàng', '상강', 'Frost Descends'],
  ['立冬', 'Lìdōng', '입동', 'Start of Winter'],
  ['小雪', 'Xiǎoxuě', '소설', 'Minor Snow'],
  ['大雪', 'Dàxuě', '대설', 'Major Snow'],
  ['冬至', 'Dōngzhì', '동지', 'Winter Solstice'],
  ['小寒', 'Xiǎohán', '소한', 'Minor Cold'],
  ['大寒', 'Dàhán', '대한', 'Major Cold']
];
const HANJA = ['立春', '雨水', '驚蟄', '春分', '淸明', '穀雨', '立夏', '小滿', '芒種', '夏至', '小暑', '大暑', '立秋', '處暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];

export const SOLAR_TERMS: SolarTermDef[] = RAW.map(([zh, pinyin, ko, en], i) => ({
  i, lon: (315 + 15 * i) % 360, zh, pinyin, ko, hanja: HANJA[i], en, zhongqi: i % 2 === 1
}));

export interface SolarTermEvent { def: SolarTermDef; time: Date; }

/** Exact instants of all 24 solar terms starting with 立春 of `year`, plus the next 立春. */
export function solarTermsForYear(year: number): SolarTermEvent[] {
  const out: SolarTermEvent[] = [];
  let start = new Date(Date.UTC(year, 0, 25));
  for (let k = 0; k <= 24; k++) {
    const def = SOLAR_TERMS[k % 24];
    const t = A.SearchSunLongitude(def.lon, start, 40);
    if (!t) throw new Error('solar term search failed');
    out.push({ def, time: t.date });
    start = new Date(t.date.getTime() + 10 * 86_400_000);
  }
  return out;
}

const cache = new Map<number, SolarTermEvent[]>();
export function solarTermsCached(year: number): SolarTermEvent[] {
  let v = cache.get(year);
  if (!v) { v = solarTermsForYear(year); cache.set(year, v); }
  return v;
}

/** Current solar term, how many days into it we are, and the pentad (候) index 0..2. */
export function currentSolarTerm(d: Date): { term: SolarTermEvent; next: SolarTermEvent; daysIn: number; pentad: number; sunLon: number } {
  const sunLon = A.SunPosition(d).elon;
  const y = d.getUTCFullYear();
  const all = [...solarTermsCached(y - 1), ...solarTermsCached(y)];
  let idx = 0;
  for (let i = 0; i < all.length; i++) if (all[i].time <= d) idx = i;
  const term = all[idx];
  const next = all[idx + 1] ?? solarTermsCached(y + 1)[0];
  const daysIn = (d.getTime() - term.time.getTime()) / 86_400_000;
  const into = ((sunLon - term.def.lon) % 360 + 360) % 360;
  return { term, next, daysIn, pentad: Math.min(2, Math.floor(into / 5)), sunLon };
}

/** Civil date (in an offset) of a solar term event in a given year, e.g. 冬至 for Sanbok math. */
export function solarTermDate(year: number, termIndex: number, offsetHours: number): string {
  const ev = solarTermsCached(year).find(e => e.def.i === termIndex)!;
  return civilDateAtOffset(ev.time, offsetHours);
}
