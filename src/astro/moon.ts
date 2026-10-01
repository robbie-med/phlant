import * as A from 'astronomy-engine';

export const TROPICAL_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] as const;
export type Sign = typeof TROPICAL_SIGNS[number];
export const SIGN_GLYPH: Record<Sign, string> = { Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓' };
export type Element = 'earth' | 'water' | 'air' | 'fire';
export const SIGN_ELEMENT: Record<Sign, Element> = {
  Aries: 'fire', Taurus: 'earth', Gemini: 'air', Cancer: 'water', Leo: 'fire', Virgo: 'earth',
  Libra: 'air', Scorpio: 'water', Sagittarius: 'fire', Capricorn: 'earth', Aquarius: 'air', Pisces: 'water'
};
/** Biodynamic element → plant part worked that day. */
export const ELEMENT_PART: Record<Element, 'root' | 'leaf' | 'flower' | 'fruit'> = { earth: 'root', water: 'leaf', air: 'flower', fire: 'fruit' };

/**
 * Where the official IAU constellation boundaries cross the ecliptic (J2000 longitudes, to 0.01°),
 * derived from astronomy-engine's Constellation() boundary tables (see astro.test.ts, which re-derives them).
 * These are the unequal "sidereal constellations" that biodynamic (Thun) and French Rustica calendars use.
 * Ophiuchus (247.64°–266.24°) is folded into Scorpio as those calendars do.
 */
export const SIDEREAL_BOUNDS: Array<[number, Sign]> = [
  [28.69, 'Aries'], [53.42, 'Taurus'], [90.15, 'Gemini'], [117.99, 'Cancer'], [138.04, 'Leo'],
  [173.86, 'Virgo'], [217.82, 'Libra'], [241.05, 'Scorpio'], [266.24, 'Sagittarius'],
  [299.66, 'Capricorn'], [327.49, 'Aquarius'], [351.66, 'Pisces']
];

/** Precession-corrected (J2000) ecliptic longitude of the Moon for comparing with SIDEREAL_BOUNDS. */
export function siderealLon(lonOfDate: number, date: Date): number {
  const years = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86_400_000);
  return ((lonOfDate - years * 0.013969) % 360 + 360) % 360;
}

export interface Ingress { time: Date; kind: 'tropical' | 'sidereal'; from: Sign; to: Sign; }

/** Exact instants (to ~1 min) when the Moon changes tropical sign or sidereal constellation between two dates. */
export function signIngresses(start: Date, end: Date): Ingress[] {
  const out: Ingress[] = [];
  const stateAt = (d: Date) => { const e = A.Ecliptic(A.GeoVector(A.Body.Moon, d, true)); return { trop: tropicalSign(e.elon), sid: siderealConstellation(e.elon, d) }; };
  const step = 3 * 3_600_000;
  let t = start.getTime(), prev = stateAt(start);
  while (t < end.getTime()) {
    const t2 = Math.min(t + step, end.getTime());
    const cur = stateAt(new Date(t2));
    for (const kind of ['tropical', 'sidereal'] as const) {
      const key = kind === 'tropical' ? 'trop' : 'sid';
      if (cur[key] !== prev[key]) {
        let lo = t, hi = t2;
        while (hi - lo > 30_000) { const mid = (lo + hi) / 2; if (stateAt(new Date(mid))[key] === prev[key]) lo = mid; else hi = mid; }
        out.push({ time: new Date(hi), kind, from: prev[key], to: cur[key] });
      }
    }
    prev = cur; t = t2;
  }
  return out.sort((a, b) => a.time.getTime() - b.time.getTime());
}

export function tropicalSign(lon: number): Sign { return TROPICAL_SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)]; }

export function siderealConstellation(lonOfDate: number, date: Date): Sign {
  const lon = siderealLon(lonOfDate, date);
  let sign: Sign = 'Pisces';
  for (const [start, s] of SIDEREAL_BOUNDS) if (lon >= start) sign = s;
  return sign;
}

export interface MoonState {
  date: Date;
  phaseAngle: number;           // 0 new … 180 full … 360
  illumination: number;         // 0..1
  ageDays: number;
  waxing: boolean;
  quarter: 1 | 2 | 3 | 4;        // 1: new→first quarter, 2: →full, 3: →last quarter, 4: →new
  isNewMoonDay: boolean;        // within ±12 h of exact new moon
  isFullMoonDay: boolean;
  hoursToNewMoon: number;       // signed distance to nearest new moon (negative = past)
  hoursToFullMoon: number;
  eclLon: number; eclLat: number;
  tropical: Sign; sidereal: Sign;
  declination: number;
  ascending: boolean;           // declination increasing (northern convention)
  distanceKm: number;
  nearestApsis: { kind: 'perigee' | 'apogee'; time: Date; hours: number };
  nearestNode: { kind: 'ascending' | 'descending'; time: Date; hours: number };
  saturnOpposition: boolean;    // Moon within 6° of opposition to Saturn
  pairLonSaturn: number;
}

/** Most recent instant the Moon had phase angle `target` strictly before `d`. */
export function lastPhaseBefore(target: number, d: Date): A.AstroTime {
  let t = A.SearchMoonPhase(target, new Date(d.getTime() - 32 * 86_400_000), 33)!;
  while (true) {
    const nx = A.SearchMoonPhase(target, new Date(t.date.getTime() + 86_400_000), 32);
    if (!nx || nx.date >= d) return t;
    t = nx;
  }
}

function nearestEvent<T>(before: T, after: T, time: (t: T) => Date, d: Date) {
  const hb = (d.getTime() - time(before).getTime()) / 3_600_000;
  const ha = (time(after).getTime() - d.getTime()) / 3_600_000;
  return hb <= ha ? { ev: before, hours: -hb } : { ev: after, hours: ha };
}

export function moonState(d: Date, observer?: A.Observer): MoonState {
  const phaseAngle = A.MoonPhase(d);
  const illumination = A.Illumination(A.Body.Moon, d).phase_fraction;
  const ecl = A.Ecliptic(A.GeoVector(A.Body.Moon, d, true));
  const obs = observer ?? new A.Observer(0, 0, 0);
  const eq1 = A.Equator(A.Body.Moon, d, obs, true, true);
  const eq2 = A.Equator(A.Body.Moon, new Date(d.getTime() + 3_600_000), obs, true, true);
  const back = new Date(d.getTime() - 16 * 86_400_000);

  // phases
  const prevNew = lastPhaseBefore(0, d);
  const nextNew = A.SearchMoonPhase(0, d, 32)!;
  const prevFull = lastPhaseBefore(180, d);
  const nextFull = A.SearchMoonPhase(180, d, 32)!;
  const nn = nearestEvent(prevNew, nextNew, t => t.date, d);
  const nf = nearestEvent(prevFull, nextFull, t => t.date, d);

  // apsides
  let ap = A.SearchLunarApsis(back);
  while (ap.time.date < d) { const nx = A.NextLunarApsis(ap); if (nx.time.date >= d) { const r = nearestEvent(ap, nx, a => a.time.date, d); ap = r.ev; (ap as any).__hours = r.hours; break; } ap = nx; }
  // nodes
  let nd = A.SearchMoonNode(back);
  let ndHours = 0;
  while (true) { const nx = A.NextMoonNode(nd); if (nx.time.date >= d) { const r = nearestEvent(nd, nx, n => n.time.date, d); nd = r.ev; ndHours = r.hours; break; } nd = nx; }

  const pairLonSaturn = A.PairLongitude(A.Body.Moon, A.Body.Saturn, d);
  const quarter = (Math.floor(phaseAngle / 90) + 1) as 1 | 2 | 3 | 4;
  return {
    date: d, phaseAngle, illumination, ageDays: phaseAngle / 360 * 29.530589, waxing: phaseAngle < 180, quarter,
    isNewMoonDay: Math.abs(nn.hours) <= 12, isFullMoonDay: Math.abs(nf.hours) <= 12,
    hoursToNewMoon: nn.hours, hoursToFullMoon: nf.hours,
    eclLon: ecl.elon, eclLat: ecl.elat,
    tropical: tropicalSign(ecl.elon), sidereal: siderealConstellation(ecl.elon, d),
    declination: eq1.dec, ascending: eq2.dec > eq1.dec,
    distanceKm: A.GeoVector(A.Body.Moon, d, false).Length() * A.KM_PER_AU,
    nearestApsis: { kind: ap.kind === 0 ? 'perigee' : 'apogee', time: ap.time.date, hours: (ap as any).__hours ?? (ap.time.date.getTime() - d.getTime()) / 3_600_000 },
    nearestNode: { kind: nd.kind === 1 ? 'ascending' : 'descending', time: nd.time.date, hours: ndHours },
    saturnOpposition: Math.abs(pairLonSaturn - 180) <= 6, pairLonSaturn
  };
}

/** Moonrise instants between two instants for an observer (inclusive of start, exclusive of end). */
export function moonrisesBetween(observer: A.Observer, start: Date, end: Date): Date[] {
  const out: Date[] = [];
  let t = start;
  while (t < end) {
    const r = A.SearchRiseSet(A.Body.Moon, observer, +1, t, 3);
    if (!r || r.date >= end) break;
    out.push(r.date);
    t = new Date(r.date.getTime() + 60_000);
  }
  return out;
}

/**
 * Russian-style lunar day (лунные сутки): day 1 begins at the new moon; each later
 * lunar day begins at a moonrise. Computed for the observer's horizon.
 */
export function lunarDay(d: Date, observer: A.Observer): number {
  const nm = lastPhaseBefore(0, d).date;
  return 1 + moonrisesBetween(observer, nm, d).length;
}

export function moonRiseSet(d: Date, observer: A.Observer, dayStart: Date): { rise?: Date; set?: Date } {
  const end = new Date(dayStart.getTime() + 86_400_000);
  const r = A.SearchRiseSet(A.Body.Moon, observer, +1, dayStart, 1);
  const s = A.SearchRiseSet(A.Body.Moon, observer, -1, dayStart, 1);
  return { rise: r && r.date < end ? r.date : undefined, set: s && s.date < end ? s.date : undefined };
}

export function nextQuarters(d: Date, n = 4): Array<{ quarter: number; time: Date }> {
  const out: Array<{ quarter: number; time: Date }> = [];
  let q = A.SearchMoonQuarter(d);
  for (let i = 0; i < n; i++) { out.push({ quarter: q.quarter, time: q.time.date }); q = A.NextMoonQuarter(q); }
  return out;
}
