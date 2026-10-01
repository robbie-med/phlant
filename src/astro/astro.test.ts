import { describe, it, expect } from 'vitest';
import { sexagenaryDay } from './sexagenary';
import { easter, jdn } from './dates';
import { moonState, lunarDay, SIDEREAL_BOUNDS, signIngresses, tropicalSign } from './moon';
import { lunisolarDate } from './lunisolar';
import { currentSolarTerm, solarTermDate } from './solarterms';
import * as A from 'astronomy-engine';

describe('sexagenary', () => {
  it('anchors', () => {
    expect(sexagenaryDay('2000-01-01').hanzi).toBe('戊午');
    expect(sexagenaryDay('1949-10-01').hanzi).toBe('甲子');
  });
});
describe('dates', () => {
  it('easter', () => { expect(easter(2026)).toBe('2026-04-05'); expect(easter(2024)).toBe('2024-03-31'); });
  it('jdn', () => expect(jdn('2000-01-01')).toBe(2451545));
});
describe('moon', () => {
  it('full moon 2026-10-26 (~04:12 UTC) is full-moon day and waxing before', () => {
    const s = moonState(new Date('2026-10-26T12:00:00Z'));
    expect(s.isFullMoonDay).toBe(true);
    expect(s.illumination).toBeGreaterThan(0.98);
  });
  it('lunar day is 1 right after new moon', () => {
    const nm = A.SearchMoonPhase(0, new Date('2026-10-05T00:00:00Z'), 30)!.date;
    const obs = new A.Observer(36.15, -95.99, 200);
    expect(lunarDay(new Date(nm.getTime() + 60_000), obs)).toBe(1);
    expect(lunarDay(new Date(nm.getTime() + 20 * 86_400_000), obs)).toBeGreaterThanOrEqual(19);
  });
});
describe('solar terms', () => {
  it('冬至 2026 is Dec 22 KST (Dec 21 20:50 UTC)', () => expect(solarTermDate(2026, 21, 9)).toBe('2026-12-22'));
  it('current term on 2026-10-01 is 秋分', () => expect(currentSolarTerm(new Date('2026-10-01T12:00:00Z')).term.def.zh).toBe('秋分'));
});
describe('lunisolar', () => {
  it('Chinese New Year 2026 = Feb 17', () => {
    const d = lunisolarDate('2026-02-17', 8);
    expect(d.month).toBe(1); expect(d.day).toBe(1); expect(d.leap).toBe(false); expect(d.year).toBe(2026);
    expect(lunisolarDate('2026-02-16', 8).month).toBe(12);
  });
  it('2025 has leap 6th month (闰六月 starts 2025-07-25)', () => {
    const d = lunisolarDate('2025-07-25', 8);
    expect(d.month).toBe(6); expect(d.leap).toBe(true); expect(d.day).toBe(1);
  });
  it('Chuseok 2026 (8/15) = Sept 25 KST', () => {
    const d = lunisolarDate('2026-09-25', 9);
    expect(d.month).toBe(8); expect(d.day).toBe(15); expect(d.year).toBe(2026);
  });
  it('lunar year rolls: 2026-01-10 is still lunar 2025 (month 11)', () => {
    const d = lunisolarDate('2026-01-10', 9);
    expect(d.year).toBe(2025); expect(d.month).toBe(11);
  });
});

describe('zodiac boundaries are the IAU ones', () => {
  it('SIDEREAL_BOUNDS matches constellation changes along the J2000 ecliptic to 0.02°', () => {
    const r = Math.PI / 180, eps = 23.4392911 * r;
    const constAt = (lon: number) => { const l = lon * r; const x = Math.cos(l), y = Math.sin(l) * Math.cos(eps), z = Math.sin(l) * Math.sin(eps); return A.Constellation((((Math.atan2(y, x) / r / 15) % 24) + 24) % 24, Math.asin(z) / r).symbol; };
    const found: number[] = []; let prev = constAt(0);
    for (let i = 1; i <= 36000; i++) { const c = constAt(i / 100); if (c !== prev) { if (c !== 'Oph' && prev !== 'Oph') found.push(i / 100); else if (c === 'Oph') { /* Sco→Oph: not a boundary we keep */ } else found.push(i / 100); prev = c; } }
    // found: all boundaries except Sco→Oph (12 values)
    expect(found.length).toBe(12);
    const ours = SIDEREAL_BOUNDS.map(b => b[0]).sort((a, b) => a - b);
    for (let i = 0; i < 12; i++) expect(Math.abs(ours[i] - found[i])).toBeLessThan(0.02);
  });
  it('tropical sign is a pure 30° slice of the Moon\'s longitude of date', () => {
    expect(tropicalSign(0)).toBe('Aries'); expect(tropicalSign(29.99)).toBe('Aries'); expect(tropicalSign(30)).toBe('Taurus'); expect(tropicalSign(359.9)).toBe('Pisces');
  });
  it('ingress search finds ~13 tropical sign changes a month, each exactly on a 30° boundary', () => {
    const ing = signIngresses(new Date('2026-10-01T00:00:00Z'), new Date('2026-11-01T00:00:00Z')).filter(i => i.kind === 'tropical');
    expect(ing.length).toBeGreaterThanOrEqual(12); expect(ing.length).toBeLessThanOrEqual(14);
    for (const i of ing) { const lon = A.Ecliptic(A.GeoVector(A.Body.Moon, i.time, true)).elon; expect(Math.abs(((lon % 30) + 30) % 30 - 0) < 0.02 || Math.abs(((lon % 30) + 30) % 30 - 30) < 0.02).toBe(true); }
  });
});
