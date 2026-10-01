import { useSyncExternalStore } from 'react';
import type { SoilType } from '../data/plants';
import { DEFAULT_ENABLED } from '../traditions';

export interface Bed { id: string; x: number; y: number; w: number; h: number; label: string; plants: string[]; heightCm?: number; planted?: Record<string, string>; notes?: string; }
export type FeatureKind = 'house' | 'tree' | 'fence' | 'shed' | 'path' | 'wall' | 'greenhouse';
/** A shadow caster or ground feature placed on the plan. x,y,w,h in metres (plan coords), heightM above ground. */
export interface Feature { id: string; kind: FeatureKind; x: number; y: number; w: number; h: number; heightM: number; label?: string; }
export const FEATURE_DEFAULTS: Record<FeatureKind, { heightM: number; w: number; h: number; label: string; casts: boolean }> = {
  house: { heightM: 6, w: 10, h: 8, label: 'House', casts: true },
  shed: { heightM: 2.5, w: 3, h: 2.5, label: 'Shed', casts: true },
  greenhouse: { heightM: 2.5, w: 4, h: 3, label: 'Greenhouse', casts: true },
  tree: { heightM: 7, w: 5, h: 5, label: 'Tree', casts: true },
  fence: { heightM: 1.8, w: 8, h: 0.2, label: 'Fence', casts: true },
  wall: { heightM: 2.5, w: 8, h: 0.3, label: 'Wall', casts: true },
  path: { heightM: 0, w: 1, h: 6, label: 'Path', casts: false }
};
export interface SiteConfig {
  id: string; name: string; lat: number; lon: number; tz: string; elevationM: number;
  lastFrost: string; firstFrost: string;          // MM-DD
  soil: SoilType; soilPh?: number; climateId: string;
  windDeg: number;                                // prevailing wind FROM this bearing
  shadeSide: 'N' | 'S' | 'E' | 'W' | 'none';      // side with house / tall shade
  widthM: number; depthM: number; units: 'ft' | 'm';
  beds: Bed[];
  features: Feature[];
  /** Compass bearing of the plan's "up" edge (0 = up is north, 90 = up is east). */
  rotationDeg: number;
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
  theme?: 'auto' | 'dark' | 'light';
  onboarded?: boolean;
}

export const TULSA: SiteConfig = {
  id: 'tulsa', name: 'Tulsa, OK', lat: 36.15, lon: -95.99, tz: 'America/Chicago', elevationM: 220,
  lastFrost: '04-15', firstFrost: '11-01', soil: 'clay', soilPh: 6.5, climateId: 'humid_subtropical',
  windDeg: 180, shadeSide: 'S', widthM: 30.5, depthM: 9.1, units: 'ft', beds: [], features: [], rotationDeg: 0, slope: 'flat', slopeFacing: 'S'
};

/** Older saved sites lack features/rotation; derive a house from shadeSide once. */
export function migrateSite(x: SiteConfig): SiteConfig {
  if (x.features && typeof x.rotationDeg === 'number') return x;
  const features: Feature[] = x.features ?? [];
  if (!x.features && x.shadeSide && x.shadeSide !== 'none') {
    const W = x.widthM, D = x.depthM, hw = Math.min(W, 10), hd = 8;
    const pos = { N: { x: (W - hw) / 2, y: -hd - 1, w: hw, h: hd }, S: { x: (W - hw) / 2, y: D + 1, w: hw, h: hd }, E: { x: W + 1, y: (D - hw) / 2, w: hd, h: hw }, W: { x: -hd - 1, y: (D - hw) / 2, w: hd, h: hw } }[x.shadeSide];
    features.push({ id: 'house_auto', kind: 'house', ...pos, heightM: 6, label: 'House' });
  }
  return { ...x, features, rotationDeg: x.rotationDeg ?? 0, beds: (x.beds ?? []).map(b => ({ ...b, heightCm: b.heightCm ?? 0 })) };
}

const KEY = 'phlant:settings';
function load(): Settings {
  try { const s = localStorage.getItem(KEY); if (s) { const p = JSON.parse(s); if (p.version === 1) return { ...p, sites: (p.sites as SiteConfig[]).map(migrateSite) }; } } catch { /* fresh */ }
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
