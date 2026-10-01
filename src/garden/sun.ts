/**
 * Sun geometry for the garden plan. Plan coordinates: x to the right, y downward (metres), the plan's
 * "up" edge pointing at compass bearing `rotationDeg`. Heights in metres above ground.
 */
import * as A from 'astronomy-engine';

export interface SunSample { time: Date; azimuth: number; altitude: number; }
export interface Box { x: number; y: number; w: number; h: number; heightM: number; id?: string; }

/** Sun position every `stepMin` minutes while above the horizon on a civil date (ymd) at an observer. */
export function sunSamples(ymd: string, lat: number, lon: number, elevM: number, tzOffsetHours: number, stepMin = 15): SunSample[] {
  const obs = new A.Observer(lat, lon, elevM);
  const [y, m, d] = ymd.split('-').map(Number);
  const start = Date.UTC(y, m - 1, d, 0, 0, 0) - tzOffsetHours * 3_600_000;
  const out: SunSample[] = [];
  for (let t = start; t < start + 86_400_000; t += stepMin * 60_000) {
    const date = new Date(t);
    const eq = A.Equator(A.Body.Sun, date, obs, true, true);
    const h = A.Horizon(date, obs, eq.ra, eq.dec, 'normal');
    if (h.altitude > 0) out.push({ time: date, azimuth: h.azimuth, altitude: h.altitude });
  }
  return out;
}

export function sunAt(date: Date, lat: number, lon: number, elevM: number): SunSample {
  const obs = new A.Observer(lat, lon, elevM);
  const eq = A.Equator(A.Body.Sun, date, obs, true, true);
  const h = A.Horizon(date, obs, eq.ra, eq.dec, 'normal');
  return { time: date, azimuth: h.azimuth, altitude: h.altitude };
}

/** Unit direction (plan x, plan y) toward the Sun, given compass azimuth and the plan's rotation. */
export function sunDirPlan(azimuthDeg: number, rotationDeg: number): [number, number] {
  // Plan "up" (−y) points to bearing rotationDeg. A bearing b is at angle (b − rotation) clockwise from up.
  const a = ((azimuthDeg - rotationDeg) * Math.PI) / 180;
  return [Math.sin(a), -Math.cos(a)];
}

/** Is ground point (px,py) in the shadow of box when the Sun is at (azimuth, altitude)? */
export function shadedBy(px: number, py: number, pz: number, box: Box, azimuthDeg: number, altitudeDeg: number, rotationDeg: number): boolean {
  if (altitudeDeg <= 0) return true;
  if (box.heightM <= pz) return false;
  const [dx, dy] = sunDirPlan(azimuthDeg, rotationDeg);
  const tanAlt = Math.tan((altitudeDeg * Math.PI) / 180);
  // Ray P + t·(dx,dy), height pz + t·tanAlt. Slab intersection with the rectangle.
  let tmin = 0, tmax = Infinity;
  for (const [p, d, lo, hi] of [[px, dx, box.x, box.x + box.w], [py, dy, box.y, box.y + box.h]] as Array<[number, number, number, number]>) {
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; continue; }
    let t1 = (lo - p) / d, t2 = (hi - p) / d; if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (tmax < 0) return false;
  const tEnter = Math.max(tmin, 0);
  return pz + tEnter * tanAlt < box.heightM; // ray enters the footprint below the box top ⇒ blocked
}

export interface BedSun { id: string; sunHours: number; dayHours: number; fraction: number; shadedBy: Record<string, number>; morningFrac: number; afternoonFrac: number; }

/** Sun hours received by a bed (rectangle) over the sampled day, averaged over a 3×3 grid of points at bed-top height. */
export function bedSunHours(bed: Box & { id: string }, casters: Box[], samples: SunSample[], rotationDeg: number, stepMin = 15): BedSun {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pts.push([bed.x + bed.w * (0.17 + 0.33 * i), bed.y + bed.h * (0.17 + 0.33 * j)]);
  let lit = 0, morning = 0, mornN = 0, aft = 0, aftN = 0;
  const by: Record<string, number> = {};
  for (const s of samples) {
    let litPts = 0;
    for (const [px, py] of pts) {
      let blocked = false;
      for (const c of casters) { if (c.id === bed.id) continue; if (shadedBy(px, py, bed.heightM, c, s.azimuth, s.altitude, rotationDeg)) { blocked = true; by[c.id ?? '?'] = (by[c.id ?? '?'] ?? 0) + 1; break; } }
      if (!blocked) litPts++;
    }
    const f = litPts / pts.length; lit += f;
    const noonish = s.azimuth < 180; // before solar noon (sun east of meridian)
    if (noonish) { morning += f; mornN++; } else { aft += f; aftN++; }
  }
  const dayHours = samples.length * stepMin / 60;
  const shadedByH: Record<string, number> = {}; for (const k in by) shadedByH[k] = +(by[k] / pts.length * stepMin / 60).toFixed(1);
  return { id: bed.id, sunHours: +(lit * stepMin / 60).toFixed(1), dayHours: +dayHours.toFixed(1), fraction: dayHours ? lit / samples.length : 0, shadedBy: shadedByH, morningFrac: mornN ? morning / mornN : 0, afternoonFrac: aftN ? aft / aftN : 0 };
}

export function bearingToDir(b: number) { return ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round((((b % 360) + 360) % 360) / 22.5) % 16]; }
