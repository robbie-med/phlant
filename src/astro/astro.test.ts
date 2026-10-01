import { describe, it, expect } from 'vitest';
import { sexagenaryDay } from './sexagenary';
import { easter, jdn } from './dates';
import { moonState, lunarDay } from './moon';
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
