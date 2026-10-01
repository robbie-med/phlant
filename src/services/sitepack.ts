/**
 * A "site pack" is everything the app needs for one location, fetched once and kept on-device
 * so the app runs fully offline afterwards. Ephemeris is computed locally and never needs network.
 */
import { fetchSoil, type SoilReport } from './soil';
import { fetchGauges, type Gauge } from './water';
import { fetchFrostStats, fetchElevation, fetchWindRose, type FrostStats } from './climate';

export interface SitePack {
  version: 1;
  siteId: string;
  builtAt: string;
  lat: number; lon: number; elevationM?: number;
  soil?: SoilReport | null;
  gauges?: Gauge[];
  climate?: FrostStats;
  wind?: { sectors: number[]; dominantDeg: number; growingSeasonDominantDeg: number };
  errors: string[];
}

export type PackProgress = (step: string, done: number, total: number) => void;

export async function buildSitePack(siteId: string, lat: number, lon: number, onProgress?: PackProgress): Promise<SitePack> {
  const pack: SitePack = { version: 1, siteId, builtAt: new Date().toISOString(), lat, lon, errors: [] };
  const steps: Array<[string, () => Promise<void>]> = [
    ['Elevation', async () => { pack.elevationM = await fetchElevation(lat, lon); }],
    ['Ten years of temperature history → frost dates & zone', async () => { pack.climate = await fetchFrostStats(lat, lon); }],
    ['Prevailing wind (one year of daily data)', async () => { pack.wind = await fetchWindRose(lat, lon); }],
    ['Soil survey (USDA SSURGO / SoilGrids)', async () => { pack.soil = await fetchSoil(lat, lon); }],
    ['Nearby USGS stream & groundwater gauges', async () => { const inUS = lat > 17 && lat < 72 && lon > -180 && lon < -64; pack.gauges = inUS ? await fetchGauges(lat, lon) : []; }]
  ];
  let i = 0;
  for (const [label, fn] of steps) {
    onProgress?.(label, i, steps.length);
    try { await fn(); } catch (e: any) { pack.errors.push(`${label}: ${e?.message ?? e}`); }
    i++;
  }
  onProgress?.('Done', steps.length, steps.length);
  return pack;
}

// ---- IndexedDB storage (falls back to localStorage) ----
const DB = 'phlant', STORE = 'sitepacks';
function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}
export async function savePack(pack: SitePack) {
  const db = await openDb();
  if (!db) { try { localStorage.setItem(`pack:${pack.siteId}`, JSON.stringify(pack)); } catch { /* full */ } return; }
  await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(pack, pack.siteId); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
export async function loadPack(siteId: string): Promise<SitePack | undefined> {
  const db = await openDb();
  if (!db) { try { const s = localStorage.getItem(`pack:${siteId}`); return s ? JSON.parse(s) : undefined; } catch { return undefined; } }
  return new Promise(res => { const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).get(siteId); r.onsuccess = () => res(r.result ?? undefined); r.onerror = () => res(undefined); });
}
export async function loadAllPacks(): Promise<SitePack[]> {
  const db = await openDb();
  if (!db) { const out: SitePack[] = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith('pack:')) { try { out.push(JSON.parse(localStorage.getItem(k)!)); } catch { /* skip */ } } } return out; }
  return new Promise(res => { const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).getAll(); r.onsuccess = () => res(r.result ?? []); r.onerror = () => res([]); });
}
export async function deletePack(siteId: string) {
  const db = await openDb();
  if (!db) { localStorage.removeItem(`pack:${siteId}`); return; }
  await new Promise<void>(res => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(siteId); tx.oncomplete = () => res(); tx.onerror = () => res(); });
}
export function exportPacks(packs: SitePack[], sites: unknown) {
  const blob = new Blob([JSON.stringify({ phlant: 1, exportedAt: new Date().toISOString(), sites, packs }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `phlant-sites-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
