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
