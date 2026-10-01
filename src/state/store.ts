import { useSyncExternalStore } from 'react';
import type { SoilType } from '../data/plants';
import { DEFAULT_ENABLED } from '../traditions';

export interface Bed { id: string; x: number; y: number; w: number; h: number; label: string; plants: string[]; }
export interface SiteConfig {
  id: string; name: string; lat: number; lon: number; tz: string; elevationM: number;
  lastFrost: string; firstFrost: string;          // MM-DD
  soil: SoilType; soilPh?: number; climateId: string;
  windDeg: number;                                // prevailing wind FROM this bearing
  shadeSide: 'N' | 'S' | 'E' | 'W' | 'none';      // side with house / tall shade
  widthM: number; depthM: number; units: 'ft' | 'm';
  beds: Bed[];
  slope: 'flat' | 'gentle' | 'steep'; slopeFacing: 'N' | 'S' | 'E' | 'W';
}
export interface Settings {
  version: 1;
  siteId: string;
  sites: SiteConfig[];
  enabled: string[];
  mode: 'beginner' | 'expert';
  tab: string;
  selectedDate?: string;
}

export const TULSA: SiteConfig = {
  id: 'tulsa', name: 'Tulsa, OK', lat: 36.15, lon: -95.99, tz: 'America/Chicago', elevationM: 220,
  lastFrost: '04-15', firstFrost: '11-01', soil: 'clay', soilPh: 6.5, climateId: 'humid_subtropical',
  windDeg: 180, shadeSide: 'S', widthM: 30.5, depthM: 9.1, units: 'ft', beds: [], slope: 'flat', slopeFacing: 'S'
};

const KEY = 'phlant:settings';
function load(): Settings {
  try { const s = localStorage.getItem(KEY); if (s) { const p = JSON.parse(s); if (p.version === 1) return p; } } catch { /* fresh */ }
  return { version: 1, siteId: TULSA.id, sites: [TULSA], enabled: [...DEFAULT_ENABLED], mode: 'beginner', tab: 'today' };
}
let state: Settings = load();
const subs = new Set<() => void>();
export function getState() { return state; }
export function setState(patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
  subs.forEach(f => f());
}
export function updateSite(id: string, patch: Partial<SiteConfig>) {
  setState(s => ({ sites: s.sites.map(x => x.id === id ? { ...x, ...patch } : x) }));
}
export function useSettings() { return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, getState, getState); }
export function useSite(): SiteConfig { const s = useSettings(); return s.sites.find(x => x.id === s.siteId) ?? s.sites[0]; }
export function newSiteId() { return 'site_' + Math.random().toString(36).slice(2, 8); }
