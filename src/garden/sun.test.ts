import { describe, it, expect } from 'vitest';
import { shadedBy, sunDirPlan, sunSamples, bedSunHours } from './sun';

describe('sun geometry', () => {
  it('plan direction toward the Sun', () => {
    expect(sunDirPlan(180, 0).map(v => +v.toFixed(3))).toEqual([0, 1]);   // sun due south → +y (down the plan)
    expect(sunDirPlan(90, 0).map(v => +v.toFixed(3))).toEqual([1, -0]);   // east → +x
    expect(sunDirPlan(180, 180).map(v => +v.toFixed(3))).toEqual([0, -1]); // plan rotated 180: south is up
  });
  it('a wall south of a point shades it at low sun, not at high sun', () => {
    const wall = { x: -10, y: 5, w: 20, h: 0.3, heightM: 2 };
    expect(shadedBy(0, 0, 0, wall, 180, 10, 0)).toBe(true);   // sun 10° high in the south, wall 5 m away, 2 m tall → shadow reaches 11 m
    expect(shadedBy(0, 0, 0, wall, 180, 30, 0)).toBe(false);  // 30°: shadow only 3.5 m
    expect(shadedBy(0, 0, 0, wall, 0, 10, 0)).toBe(false);    // sun in the north: wall is behind
    expect(shadedBy(0, 0, 2.5, wall, 180, 10, 0)).toBe(false); // point above wall top
  });
  it('Tulsa gets about 11.8 h of sun on Oct 1 and the sun crosses the south', () => {
    const s = sunSamples('2026-10-01', 36.15, -95.99, 220, -5, 15);
    expect(s.length * 15 / 60).toBeGreaterThan(11); expect(s.length * 15 / 60).toBeLessThan(12.5);
    const noon = s.reduce((a, b) => (b.altitude > a.altitude ? b : a));
    expect(Math.abs(noon.azimuth - 180)).toBeLessThan(6);
  });
  it('a bed south of a 6 m house loses most of its winter sun, little of its summer sun', () => {
    const house = { id: 'h', x: 0, y: -8, w: 10, h: 8, heightM: 6 };
    const bed = { id: 'b', x: 3, y: 2, w: 4, h: 2, heightM: 0 };
    const winter = bedSunHours(bed, [house], sunSamples('2026-12-21', 36.15, -95.99, 220, -6, 15), 180); // plan rotated: up = south, so the house is SOUTH of the bed
    const summer = bedSunHours(bed, [house], sunSamples('2026-06-21', 36.15, -95.99, 220, -5, 15), 180);
    expect(winter.fraction).toBeLessThan(0.5);
    expect(summer.fraction).toBeGreaterThan(0.8);
    const winterNorthHouse = bedSunHours(bed, [house], sunSamples('2026-12-21', 36.15, -95.99, 220, -6, 15), 0); // house north of bed: no shade
    expect(winterNorthHouse.fraction).toBeGreaterThan(0.95);
  });
});
