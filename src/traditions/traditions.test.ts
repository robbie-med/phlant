import { describe, it, expect } from 'vitest';
import { buildContext, evaluateDay, TRADITIONS } from './index';
import { ALL_TASKS } from './types';

const tulsa = { lat: 36.15, lon: -95.99, elevationM: 220, tz: 'America/Chicago', lastFrost: '04-15', firstFrost: '11-01' };
describe('traditions', () => {
  it('every tradition evaluates every day of a year without throwing and keeps scores in range', () => {
    for (let i = 0; i < 365; i += 7) {
      const ymd = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      const ctx = buildContext(ymd, tulsa);
      for (const t of TRADITIONS) {
        const r = t.evaluate(ctx);
        expect(r.headline.length).toBeGreaterThan(3);
        for (const k of ALL_TASKS) { const v = r.scores[k]; if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(-2); expect(v).toBeLessThanOrEqual(2); } }
      }
    }
  });
  it('consensus produces means and agreement', () => {
    const ctx = buildContext('2026-10-01', tulsa);
    const { consensus, results } = evaluateDay(ctx, TRADITIONS.map(t => t.id));
    expect(results.length).toBe(TRADITIONS.length);
    expect(Object.keys(consensus.mean).length).toBeGreaterThan(5);
    expect(ctx.term.term.def.ko).toBe('추분');
    expect(ctx.sexDay.hanzi.length).toBe(2);
  });
  it('southern hemisphere shifts seasonal advice', () => {
    const ctx = buildContext('2026-01-15', { ...tulsa, lat: -37.8, lon: 144.9, tz: 'Australia/Melbourne', lastFrost: '10-15', firstFrost: '04-15' });
    expect(ctx.hemisphere).toBe('S');
    expect(ctx.seasonalTermIndex).toBe((ctx.term.term.def.i + 12) % 24);
  });
});
