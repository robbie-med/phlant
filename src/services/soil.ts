import type { SoilType } from '../data/plants';

export interface SoilHorizon { name: string; topCm: number; bottomCm: number; sand?: number; silt?: number; clay?: number; ph?: number; om?: number; awc?: number; ksat?: number; texture?: string; }
export interface SoilComponent { mukey: string; mapUnit: string; name: string; percent: number; order?: string; subgroup?: string; drainage?: string; hydGroup?: string; slope?: number; hydric?: string; capability?: string; horizons: SoilHorizon[]; }
export interface SoilReport { source: 'USDA-NRCS SSURGO' | 'ISRIC SoilGrids 250m' | 'manual'; fetchedAt: string; components: SoilComponent[]; summary: { type: SoilType; ph?: number; clay?: number; sand?: number; silt?: number; drainage?: string; label: string }; }

/** USDA soil texture triangle → gardener's soil type. */
export function textureClass(sand: number, silt: number, clay: number): SoilType {
  if (clay >= 35) return 'clay';
  if (sand >= 70 && clay < 15) return 'sand';
  if (silt >= 50 && clay < 27) return 'silt';
  if (clay >= 27 && clay < 35) return 'clay';
  return 'loam';
}

const SDA = 'https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest';

export async function fetchSSURGO(lat: number, lon: number, signal?: AbortSignal): Promise<SoilReport | null> {
  const d = 0.004; // ~400 m box so an "Urban land" pin still shows the neighbouring natural soils
  const wkt = `polygon((${lon - d} ${lat - d}, ${lon + d} ${lat - d}, ${lon + d} ${lat + d}, ${lon - d} ${lat + d}, ${lon - d} ${lat - d}))`;
  const query = `SELECT mu.mukey, mu.muname, c.compname, c.comppct_r, c.taxorder, c.taxsubgrp, c.drainagecl, c.hydgrp, c.slope_r, c.hydricrating, c.nirrcapcl, ch.hzname, ch.hzdept_r, ch.hzdepb_r, ch.sandtotal_r, ch.silttotal_r, ch.claytotal_r, ch.ph1to1h2o_r, ch.om_r, ch.awc_r, ch.ksat_r, ct.texdesc FROM mapunit mu INNER JOIN component c ON c.mukey=mu.mukey LEFT JOIN chorizon ch ON ch.cokey=c.cokey LEFT JOIN chtexturegrp ct ON ct.chkey=ch.chkey AND ct.rvindicator='Yes' WHERE mu.mukey IN (SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${wkt}')) AND c.majcompflag='Yes' ORDER BY c.comppct_r DESC, ch.hzdept_r`;
  const res = await fetch(SDA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: 'JSON+COLUMNNAME', query }), signal });
  if (!res.ok) throw new Error(`SDA ${res.status}`);
  const text = await res.text();
  if (text.startsWith('<')) throw new Error('SDA maintenance window — try again in a few minutes');
  const rows: string[][] = JSON.parse(text).Table ?? [];
  if (rows.length < 2) return null;
  const col = Object.fromEntries(rows[0].map((c, i) => [c, i]));
  const num = (r: string[], k: string) => r[col[k]] == null ? undefined : +r[col[k]];
  const comps = new Map<string, SoilComponent>();
  for (const r of rows.slice(1)) {
    const key = `${r[col.mukey]}|${r[col.compname]}`;
    let c = comps.get(key);
    if (!c) { c = { mukey: r[col.mukey], mapUnit: r[col.muname], name: r[col.compname], percent: num(r, 'comppct_r') ?? 0, order: r[col.taxorder] ?? undefined, subgroup: r[col.taxsubgrp] ?? undefined, drainage: r[col.drainagecl] ?? undefined, hydGroup: r[col.hydgrp] ?? undefined, slope: num(r, 'slope_r'), hydric: r[col.hydricrating] ?? undefined, capability: r[col.nirrcapcl] ?? undefined, horizons: [] }; comps.set(key, c); }
    if (r[col.hzname] != null || r[col.hzdept_r] != null) c.horizons.push({ name: r[col.hzname] ?? '', topCm: num(r, 'hzdept_r') ?? 0, bottomCm: num(r, 'hzdepb_r') ?? 0, sand: num(r, 'sandtotal_r'), silt: num(r, 'silttotal_r'), clay: num(r, 'claytotal_r'), ph: num(r, 'ph1to1h2o_r'), om: num(r, 'om_r'), awc: num(r, 'awc_r'), ksat: num(r, 'ksat_r'), texture: r[col.texdesc] ?? undefined });
  }
  const components = [...comps.values()].sort((a, b) => b.percent - a.percent);
  return { source: 'USDA-NRCS SSURGO', fetchedAt: new Date().toISOString(), components, summary: summarize(components) };
}

export function summarize(components: SoilComponent[]): SoilReport['summary'] {
  // first component with real topsoil data (skip Urban land / Water)
  const c = components.find(c => c.horizons.some(h => h.clay != null && h.topCm < 30)) ?? components[0];
  if (!c || !c.horizons.some(h => h.clay != null)) return { type: 'loam', label: `${c ? c.name + ' — ' : ''}no texture data in the survey here (urban/water); keep your own soil type and do a jar test` };
  const top = c.horizons.filter(h => h.clay != null && h.topCm < 30);
  const w = top.reduce((s, h) => s + (h.bottomCm - h.topCm), 0) || 1;
  const avg = (k: 'sand' | 'silt' | 'clay' | 'ph') => top.length ? top.reduce((s, h) => s + (h[k] ?? 0) * (h.bottomCm - h.topCm), 0) / w : undefined;
  const sand = avg('sand'), silt = avg('silt'), clay = avg('clay'), ph = avg('ph');
  const type = sand != null && silt != null && clay != null ? textureClass(sand, silt, clay) : 'loam';
  const tex = top[0]?.texture ?? type;
  return { type, ph: ph ? +ph.toFixed(1) : undefined, clay: clay ? Math.round(clay) : undefined, sand: sand ? Math.round(sand) : undefined, silt: silt ? Math.round(silt) : undefined, drainage: c.drainage, label: `${c.name} (${c.mapUnit}) — ${tex} topsoil, ${c.drainage ?? 'drainage n/a'}` };
}

export async function fetchSoilGrids(lat: number, lon: number, signal?: AbortSignal): Promise<SoilReport | null> {
  const u = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=clay&property=sand&property=silt&property=phh2o&property=soc&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean`;
  const res = await fetch(u, { signal });
  if (!res.ok) throw new Error(`SoilGrids ${res.status}`);
  const j = await res.json();
  const layers: any[] = j.properties?.layers ?? [];
  const get = (name: string) => { const l = layers.find((x: any) => x.name === name); if (!l) return undefined; const vals = l.depths.map((d: any) => d.values.mean).filter((v: any) => v != null); if (!vals.length) return undefined; return vals.reduce((a: number, b: number) => a + b, 0) / vals.length / l.unit_measure.d_factor; };
  const sand = get('sand'), silt = get('silt'), clay = get('clay'), ph = get('phh2o'), soc = get('soc');
  if (sand == null && clay == null) return null;
  const type = textureClass(sand ?? 33, silt ?? 33, clay ?? 33);
  const comp: SoilComponent = { mukey: 'soilgrids', mapUnit: 'SoilGrids 250 m grid cell', name: `${type} (modelled)`, percent: 100, horizons: [{ name: '0–30 cm', topCm: 0, bottomCm: 30, sand, silt, clay, ph, om: soc != null ? soc * 1.72 / 10 : undefined }] };
  return { source: 'ISRIC SoilGrids 250m', fetchedAt: new Date().toISOString(), components: [comp], summary: { type, ph: ph ? +ph.toFixed(1) : undefined, clay: clay ? Math.round(clay) : undefined, sand: sand ? Math.round(sand) : undefined, silt: silt ? Math.round(silt) : undefined, label: `Modelled ${type} topsoil (SoilGrids) — verify with a jar test` } };
}

export async function fetchSoil(lat: number, lon: number, signal?: AbortSignal): Promise<SoilReport | null> {
  const inUS = lat > 17 && lat < 72 && lon > -180 && lon < -64;
  if (inUS) { try { const r = await fetchSSURGO(lat, lon, signal); if (r && r.components.length) return r; } catch (e) { console.warn('SSURGO failed', e); } }
  return fetchSoilGrids(lat, lon, signal);
}

/* ---------- soil map polygons for an acreage box around a point ---------- */
export interface SoilPolygon { mukey: string; name: string; rings: Array<Array<[number, number]>>; /* [lat, lon] rings (outer first) */ areaShare: number; texture?: string; drainage?: string; type?: SoilType; hydGroup?: string; capability?: string; }
export interface SoilMap { acres: number; bbox: [number, number, number, number]; /* south, west, north, east */ polygons: SoilPolygon[]; fetchedAt: string; }

export function acreBox(lat: number, lon: number, acres: number): [number, number, number, number] {
  const side = Math.sqrt(acres * 4046.8564);
  const dLat = side / 2 / 111_320, dLon = side / 2 / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [lat - dLat, lon - dLon, lat + dLat, lon + dLon];
}

/** WKT parser for POLYGON / MULTIPOLYGON / GEOMETRYCOLLECTION (lon lat order) → polygons, each a list of [lat, lon] rings (outer first). */
export function wktToRings(wkt: string): Array<Array<Array<[number, number]>>> {
  type Node = string | Node[];
  // tokenise parentheses into a nested structure of coordinate strings
  const parse = (str: string, i: { p: number }): Node[] => { const out: Node[] = []; let buf = ''; while (i.p < str.length) { const c = str[i.p++]; if (c === '(') { out.push(parse(str, i)); } else if (c === ')') { if (buf.trim()) out.push(buf.trim()); return out; } else buf += c; } if (buf.trim()) out.push(buf.trim()); return out; };
  const ring = (s: string): Array<[number, number]> => s.split(',').map(pt => { const [x, y] = pt.trim().split(/\s+/).map(Number); return [y, x] as [number, number]; }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
  const polys: Array<Array<Array<[number, number]>>> = [];
  const walk = (node: Node, kind: string) => {
    if (typeof node === 'string') return;
    if (kind === 'POLYGON') { const rings = node.filter((r): r is Node[] => Array.isArray(r)).map(r => ring(r[0] as string)).filter(r => r.length >= 3); if (rings.length) polys.push(rings); }
    else if (kind === 'MULTIPOLYGON') { for (const p of node) if (Array.isArray(p)) walk(p, 'POLYGON'); }
  };
  // split top-level geometries (handles GEOMETRYCOLLECTION by scanning keywords)
  const re = /(MULTIPOLYGON|POLYGON)\s*\(/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(wkt))) { const i = { p: m.index + m[0].length - 1 }; const node = parse(wkt, { p: i.p + 1 }); walk(node, m[1].toUpperCase()); re.lastIndex = m.index + m[0].length; }
  return polys;
}

/** Planar area of a ring in m² (good enough at garden scale). */
function ringArea(r: Array<[number, number]>, lat0: number): number {
  const kx = 111_320 * Math.cos((lat0 * Math.PI) / 180), ky = 111_320; let a = 0;
  for (let i = 0; i < r.length; i++) { const [y1, x1] = r[i], [y2, x2] = r[(i + 1) % r.length]; a += (x1 * kx) * (y2 * ky) - (x2 * kx) * (y1 * ky); }
  return Math.abs(a) / 2;
}

/** USDA SSURGO map-unit polygons clipped to an acreage box, with each unit's share and a one-line description. */
export async function fetchSoilMap(lat: number, lon: number, acres: number, signal?: AbortSignal): Promise<SoilMap> {
  const [s, w, n, e] = acreBox(lat, lon, acres);
  const poly = `POLYGON((${w} ${s}, ${e} ${s}, ${e} ${n}, ${w} ${n}, ${w} ${s}))`;
  const g = `geometry::STGeomFromText('${poly}', 4326)`;
  const query = `SELECT p.mukey, m.muname, p.mupolygongeo.STIntersection(${g}).STAsText() AS geom FROM mupolygon p INNER JOIN mapunit m ON m.mukey=p.mukey WHERE p.mupolygongeo.STIntersects(${g}) = 1`;
  const res = await fetch(SDA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: 'JSON+COLUMNNAME', query }), signal });
  if (!res.ok) throw new Error(`SDA ${res.status}`);
  const text = await res.text(); if (text.startsWith('<')) throw new Error('SDA maintenance window — try again in a few minutes');
  const rows: string[][] = JSON.parse(text).Table ?? [];
  const byMukey = new Map<string, SoilPolygon>();
  let total = 0;
  for (const r of rows.slice(1)) {
    const [mukey, name, wkt] = r; if (!wkt) continue;
    const polys = wktToRings(wkt);
    let rec = byMukey.get(mukey); if (!rec) { rec = { mukey, name, rings: [], areaShare: 0 }; byMukey.set(mukey, rec); }
    for (const rings of polys) { rec.rings.push(...rings); const a = ringArea(rings[0], lat) - rings.slice(1).reduce((x, h) => x + ringArea(h, lat), 0); rec.areaShare += a; total += a; }
  }
  const polygons = [...byMukey.values()].map(p => ({ ...p, areaShare: total ? p.areaShare / total : 0 })).sort((a, b) => b.areaShare - a.areaShare);
  // attributes: dominant component texture & drainage per mukey
  if (polygons.length) {
    const keys = polygons.map(p => `'${p.mukey}'`).join(',');
    const q2 = `SELECT c.mukey, c.compname, c.comppct_r, c.drainagecl, c.hydgrp, c.nirrcapcl, ch.sandtotal_r, ch.silttotal_r, ch.claytotal_r, ct.texdesc FROM component c LEFT JOIN chorizon ch ON ch.cokey=c.cokey AND ch.hzdept_r=0 LEFT JOIN chtexturegrp ct ON ct.chkey=ch.chkey AND ct.rvindicator='Yes' WHERE c.mukey IN (${keys}) AND c.majcompflag='Yes' ORDER BY c.mukey, c.comppct_r DESC`;
    try {
      const r2 = await fetch(SDA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: 'JSON+COLUMNNAME', query: q2 }), signal });
      const t2 = await r2.text(); const rows2: string[][] = t2.startsWith('<') ? [] : (JSON.parse(t2).Table ?? []);
      const seen = new Set<string>();
      for (const r of rows2.slice(1)) { const [mukey, , , drainage, hyd, cap, sand, silt, clay, tex] = r; if (seen.has(mukey)) continue; seen.add(mukey); const p = polygons.find(x => x.mukey === mukey); if (!p) continue; p.drainage = drainage ?? undefined; p.hydGroup = hyd ?? undefined; p.capability = cap ?? undefined; p.texture = tex ?? undefined; if (sand != null && clay != null) p.type = textureClass(+sand, +(silt ?? 0), +clay); }
    } catch { /* attributes optional */ }
  }
  return { acres, bbox: [s, w, n, e], polygons, fetchedAt: new Date().toISOString() };
}

/** Parse "36.15, -95.99", "36.15 -95.99", "36°09'00\"N 95°59'24\"W", "36.15N 95.99W". */
export function parseCoords(text: string): { lat: number; lon: number } | null {
  const t = text.trim();
  const dec = t.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (dec) { const lat = +dec[1], lon = +dec[2]; if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon }; }
  const dms = /(\d+(?:\.\d+)?)[°\s:]+(?:(\d+(?:\.\d+)?)['′\s:]+)?(?:(\d+(?:\.\d+)?)["″\s]*)?\s*([NSEW])/gi;
  const parts: Array<{ v: number; h: string }> = []; let m: RegExpExecArray | null;
  while ((m = dms.exec(t))) { const v = +m[1] + (m[2] ? +m[2] / 60 : 0) + (m[3] ? +m[3] / 3600 : 0); parts.push({ v: /[SW]/i.test(m[4]) ? -v : v, h: m[4].toUpperCase() }); }
  if (parts.length === 2) { const lat = parts.find(p => /[NS]/.test(p.h)), lon = parts.find(p => /[EW]/.test(p.h)); if (lat && lon) return { lat: lat.v, lon: lon.v }; }
  return null;
}
