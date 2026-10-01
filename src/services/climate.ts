export interface Place { name: string; admin1?: string; country?: string; lat: number; lon: number; tz: string; elevationM?: number; }
export async function geocode(q: string, signal?: AbortSignal): Promise<Place[]> {
  const u = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
  const res = await fetch(u, { signal }); if (!res.ok) throw new Error(`geocode ${res.status}`);
  const j = await res.json();
  return (j.results ?? []).map((r: any) => ({ name: r.name, admin1: r.admin1, country: r.country, lat: r.latitude, lon: r.longitude, tz: r.timezone, elevationM: r.elevation }));
}

/** Rough Köppen-style preset from the pack statistics (ids match CLIMATES in data/plants.ts). */
export function climatePreset(c: FrostStats, lat: number): string {
  const annual = c.monthlyRain.reduce((a, b) => a + b, 0);
  const summer = lat >= 0 ? c.monthlyRain[5] + c.monthlyRain[6] + c.monthlyRain[7] : c.monthlyRain[11] + c.monthlyRain[0] + c.monthlyRain[1];
  if (annual < 450) return 'semi_arid';
  if (c.frostFreeDays < 110) return 'subarctic';
  if (summer < 0.15 * annual && c.minTempMeanC > -6) return 'mediterranean';
  if (c.minTempMeanC > -3 && c.hottestWeekMaxC < 27) return 'oceanic';
  if (c.minTempMeanC > -2 && annual > 1200 && Math.abs(lat) < 30) return 'subtropical_monsoon';
  if (c.minTempMeanC < -12 || c.hottestWeekMaxC < 30) return 'humid_continental';
  return 'humid_subtropical';
}

export interface FrostStats {
  years: number; source: string; thresholdC: number;
  lastSpring: { median: string; p10: string; p90: string; perYear: Record<string, string | null> }; // MM-DD
  firstFall: { median: string; p10: string; p90: string; perYear: Record<string, string | null> };
  frostFreeDays: number;
  hardinessZone: string; minTempMeanC: number;
  monthlyMin: number[]; monthlyMax: number[]; monthlyRain: number[];
  gdd10: number;                       // mean annual growing degree days base 10 °C
  hottestWeekMaxC: number;
}

function md(s: string) { return s.slice(5); }
function quantile(vals: number[], q: number) { const s = [...vals].sort((a, b) => a - b); if (!s.length) return NaN; const i = (s.length - 1) * q; const lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }
function doyToMD(doy: number, y = 2001) { return new Date(Date.UTC(y, 0, Math.round(doy))).toISOString().slice(5, 10); }
function zoneFromMin(c: number) { const f = c * 9 / 5 + 32; const z = Math.floor((f + 60) / 10) + 1; const half = ((f + 60) % 10) < 5 ? 'a' : 'b'; return `${Math.max(1, Math.min(13, z))}${half}`; }

/** Ten years of ERA5 daily data from Open-Meteo → frost dates, zone, GDD, monthly normals. */
export async function fetchFrostStats(lat: number, lon: number, signal?: AbortSignal, thresholdC = 2): Promise<FrostStats> {
  // 2 °C at 2 m ≈ ground frost; ERA5 also runs warm on clear nights. Checked against NWS Tulsa normals: median Mar 29 / safe Apr 19 / first Oct 30.
  const endY = new Date().getUTCFullYear() - 1, startY = endY - 9;
  const u = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startY}-01-01&end_date=${endY}-12-31&daily=temperature_2m_min,temperature_2m_max,precipitation_sum&timezone=auto`;
  const res = await fetch(u, { signal }); if (!res.ok) throw new Error(`archive ${res.status}`);
  const j = await res.json();
  const time: string[] = j.daily.time, tmin: (number | null)[] = j.daily.temperature_2m_min, tmax: (number | null)[] = j.daily.temperature_2m_max, rain: (number | null)[] = j.daily.precipitation_sum;
  const south = lat < 0;
  const lastSpring: Record<string, number | null> = {}, firstFall: Record<string, number | null> = {}, annualMin: number[] = [], gdd: Record<string, number> = {};
  const mMin = Array(12).fill(0), mMax = Array(12).fill(0), mRain = Array(12).fill(0), mN = Array(12).fill(0);
  let hottest = -99; const win: number[] = [];
  for (let i = 0; i < time.length; i++) {
    const t = tmin[i], x = tmax[i]; if (t == null || x == null) continue;
    const y = time[i].slice(0, 4), mo = +time[i].slice(5, 7) - 1;
    const doy = Math.round((Date.UTC(+y, mo, +time[i].slice(8, 10)) - Date.UTC(+y, 0, 1)) / 86_400_000) + 1;
    mMin[mo] += t; mMax[mo] += x; mRain[mo] += rain[i] ?? 0; mN[mo]++;
    gdd[y] = (gdd[y] ?? 0) + Math.max(0, (t + x) / 2 - 10);
    win.push(x); if (win.length > 7) win.shift(); if (win.length === 7) hottest = Math.max(hottest, win.reduce((a, b) => a + b) / 7);
    // frost season logic: northern: spring = first half, fall = second half. Southern: mirror around Jul 1.
    const seasonDoy = south ? ((doy + 182) % 365) : doy;
    if (t <= thresholdC) {
      if (seasonDoy <= 212) { lastSpring[y] = Math.max(lastSpring[y] ?? -1, seasonDoy); }
      else { firstFall[y] = Math.min(firstFall[y] ?? 999, seasonDoy); }
    }
  }
  const years = Object.keys(gdd);
  for (const y of years) { lastSpring[y] ??= null; firstFall[y] ??= null; }
  // annual minimum per year for hardiness
  const perYearMin: Record<string, number> = {};
  for (let i = 0; i < time.length; i++) { const t = tmin[i]; if (t == null) continue; const y = time[i].slice(0, 4); perYearMin[y] = Math.min(perYearMin[y] ?? 99, t); }
  annualMin.push(...Object.values(perYearMin));
  const ls = Object.values(lastSpring).filter((v): v is number => v != null), ff = Object.values(firstFall).filter((v): v is number => v != null);
  const unshift = (d: number) => south ? ((d - 182 + 365) % 365) : d;
  const toMD = (d: number) => doyToMD(unshift(d));
  const lsMed = ls.length ? quantile(ls, 0.5) : 60, ffMed = ff.length ? quantile(ff, 0.5) : 320;
  const meanMin = annualMin.reduce((a, b) => a + b, 0) / annualMin.length;
  return {
    years: years.length, source: `Open-Meteo ERA5 reanalysis ${startY}–${endY}`, thresholdC,
    lastSpring: { median: toMD(lsMed), p10: toMD(ls.length ? quantile(ls, 0.1) : lsMed), p90: toMD(ls.length ? quantile(ls, 0.9) : lsMed), perYear: Object.fromEntries(Object.entries(lastSpring).map(([y, v]) => [y, v == null ? null : toMD(v)])) },
    firstFall: { median: toMD(ffMed), p10: toMD(ff.length ? quantile(ff, 0.1) : ffMed), p90: toMD(ff.length ? quantile(ff, 0.9) : ffMed), perYear: Object.fromEntries(Object.entries(firstFall).map(([y, v]) => [y, v == null ? null : toMD(v)])) },
    frostFreeDays: Math.round(ffMed - lsMed),
    hardinessZone: zoneFromMin(meanMin), minTempMeanC: +meanMin.toFixed(1),
    monthlyMin: mMin.map((v, i) => +(v / mN[i]).toFixed(1)), monthlyMax: mMax.map((v, i) => +(v / mN[i]).toFixed(1)), monthlyRain: mRain.map((v, i) => +(v / (mN[i] / 30.4)).toFixed(0)),
    gdd10: Math.round(Object.values(gdd).reduce((a, b) => a + b, 0) / years.length), hottestWeekMaxC: +hottest.toFixed(1)
  };
}

export interface Forecast { fetchedAt: string; days: Array<{ date: string; tmin: number; tmax: number; rain: number; windDir: number; windMax: number }>; soilTempC?: number; soilMoisture?: number; }
export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<Forecast> {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,wind_direction_10m_dominant,wind_speed_10m_max&hourly=soil_temperature_6cm,soil_moisture_3_to_9cm&forecast_days=7&timezone=auto`;
  const res = await fetch(u, { signal }); if (!res.ok) throw new Error(`forecast ${res.status}`);
  const j = await res.json();
  const d = j.daily; const h = j.hourly;
  const now = new Date().toISOString().slice(0, 13);
  let idx = h.time.findIndex((t: string) => t >= now); if (idx < 0) idx = 0;
  return { fetchedAt: new Date().toISOString(), days: d.time.map((t: string, i: number) => ({ date: t, tmin: d.temperature_2m_min[i], tmax: d.temperature_2m_max[i], rain: d.precipitation_sum[i], windDir: d.wind_direction_10m_dominant[i], windMax: d.wind_speed_10m_max[i] })), soilTempC: h.soil_temperature_6cm[idx], soilMoisture: h.soil_moisture_3_to_9cm[idx] };
}

export interface WindClimatology {
  years: number; source: string;
  sectors: number[];            // 16 sectors (N, NNE, …), speed-weighted share of all hours, sums to 1
  monthly: number[][];          // [month 0..11][sector 0..15] speed-weighted share within that month
  monthlyCalm: number[];        // fraction of hours < 5 km/h per month
  monthlyMeanSpeed: number[];   // km/h
  monthlyDominantDeg: number[]; // bearing of the strongest sector per month
  dominantDeg: number; growingSeasonDominantDeg: number;
  maxGust?: number;
}

/** Three years of hourly wind (Open-Meteo ERA5) → wind rose by month. */
export async function fetchWindRose(lat: number, lon: number, signal?: AbortSignal): Promise<WindClimatology> {
  const endY = new Date().getUTCFullYear() - 1, startY = endY - 2;
  const u = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startY}-01-01&end_date=${endY}-12-31&hourly=wind_direction_10m,wind_speed_10m&timezone=auto`;
  const res = await fetch(u, { signal }); if (!res.ok) throw new Error(`wind ${res.status}`);
  const j = await res.json();
  const time: string[] = j.hourly.time, dir: (number | null)[] = j.hourly.wind_direction_10m, spd: (number | null)[] = j.hourly.wind_speed_10m;
  const monthly = Array.from({ length: 12 }, () => Array(16).fill(0)), calm = Array(12).fill(0), n = Array(12).fill(0), sumSpd = Array(12).fill(0);
  const sectors = Array(16).fill(0), gs = Array(16).fill(0);
  let total = 0, gsTotal = 0;
  for (let i = 0; i < time.length; i++) {
    const d = dir[i], v = spd[i]; if (d == null || v == null) continue;
    const mo = +time[i].slice(5, 7) - 1; n[mo]++; sumSpd[mo] += v;
    if (v < 5) { calm[mo]++; continue; }
    const sct = Math.round(d / 22.5) % 16;
    monthly[mo][sct] += v; sectors[sct] += v; total += v;
    const south = lat < 0; const inGs = south ? (mo >= 9 || mo <= 3) : (mo >= 3 && mo <= 9);
    if (inGs) { gs[sct] += v; gsTotal += v; }
  }
  const argmax = (a: number[]) => a.indexOf(Math.max(...a)) * 22.5;
  return {
    years: endY - startY + 1, source: `Open-Meteo ERA5 hourly ${startY}–${endY}`,
    sectors: sectors.map(v => v / (total || 1)),
    monthly: monthly.map(row => { const t = row.reduce((a, b) => a + b, 0) || 1; return row.map(v => +(v / t).toFixed(4)); }),
    monthlyCalm: calm.map((c, i) => +(c / (n[i] || 1)).toFixed(3)),
    monthlyMeanSpeed: sumSpd.map((v, i) => +(v / (n[i] || 1)).toFixed(1)),
    monthlyDominantDeg: monthly.map(argmax),
    dominantDeg: argmax(sectors), growingSeasonDominantDeg: gsTotal ? argmax(gs) : argmax(sectors)
  };
}

export async function fetchElevation(lat: number, lon: number, signal?: AbortSignal): Promise<number | undefined> {
  // USGS EPQS answers curl but not browsers (no CORS header on the response), so Open-Meteo's 90 m DEM is used.
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`, { signal }); if (r.ok) { const j = await r.json(); return j.elevation?.[0]; }
  } catch { /* offline */ }
  return undefined;
}
