import { describe, it, expect } from 'vitest';
import { parseCoords, wktToRings, acreBox, textureClass } from './soil';

describe('coordinates & soil helpers', () => {
  it('parses decimal and DMS coordinates', () => {
    expect(parseCoords('36.15, -95.99')).toEqual({ lat: 36.15, lon: -95.99 });
    expect(parseCoords('36.15 -95.99')).toEqual({ lat: 36.15, lon: -95.99 });
    const d = parseCoords(`36°09'04"N 95°59'33"W`)!; expect(d.lat).toBeCloseTo(36.1511, 3); expect(d.lon).toBeCloseTo(-95.9925, 3);
    expect(parseCoords('hello')).toBeNull(); expect(parseCoords('95, 200')).toBeNull();
  });
  it('parses WKT polygons into [lat, lon] rings', () => {
    const r = wktToRings('POLYGON ((-95.99 36.15, -95.98 36.15, -95.98 36.16, -95.99 36.15))');
    expect(r.length).toBe(1); expect(r[0][0][0]).toEqual([36.15, -95.99]);
    const mp = wktToRings('MULTIPOLYGON (((0 0, 1 0, 1 1, 0 0)), ((2 2, 3 2, 3 3, 2 2), (2.2 2.2, 2.4 2.2, 2.4 2.4, 2.2 2.2)))');
    expect(mp.length).toBe(2); expect(mp[1].length).toBe(2);
  });
  it('7 acres is a ~168 m square', () => { const [s, w, n, e] = acreBox(36.15, -95.99, 7); expect((n - s) * 111_320).toBeCloseTo(168.3, 0); expect(e).toBeGreaterThan(w); });
  it('texture triangle', () => { expect(textureClass(86, 7, 8)).toBe('sand'); expect(textureClass(20, 40, 40)).toBe('clay'); expect(textureClass(40, 40, 20)).toBe('loam'); });
});
