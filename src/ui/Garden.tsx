import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { updateSite, useSite, useSettings, type Bed, type Feature, type FeatureKind, FEATURE_DEFAULTS, type SiteConfig } from '../state/store';
import { PLANTS, PLANT_BY_ID } from '../data/plants';
import { relation } from '../data/companions';
import { sunSamples, bedSunHours, sunDirPlan, bearingToDir, sunAt, type Box } from '../garden/sun';
import { tzOffsetHours, noonAtOffset, addDays, fmtTime } from '../astro/dates';
import { todayYmd, fmtYMD } from './common';
import { loadPack, type SitePack } from '../services/sitepack';
import { WindRose, isClimatology } from './WindRose';
import { Section, Seg } from './kit';

const Garden3D = React.lazy(() => import('./Garden3D'));

type Sel = { type: 'bed' | 'feature'; id: string } | null;
const FEATURE_ICON: Record<FeatureKind, string> = { house: '🏠', shed: '🛖', greenhouse: '🏡', tree: '🌳', fence: '🪵', wall: '🧱', path: '🪨' };
const FEATURE_COLOR: Record<FeatureKind, string> = { house: '#6e6a63', shed: '#7a6f5a', greenhouse: '#8fb7c9', tree: '#3f7d3a', fence: '#a67c52', wall: '#8a8a8a', path: '#b9b2a0' };
export const TEMPLATES: Array<{ name: string; desc: string; beds: Array<Omit<Bed, 'id'>> }> = [
  { name: 'Three Sisters block', desc: 'Corn, pole beans and squash in one mound bed (Haudenosaunee).', beds: [{ x: 0, y: 0, w: 3, h: 3, label: 'Three Sisters', plants: ['corn', 'bean_bush', 'winter_squash'], heightCm: 20 }] },
  { name: 'Korean 김장 bed', desc: 'Napa, daikon, scallion and garlic rows for autumn kimchi.', beds: [{ x: 0, y: 0, w: 4, h: 1.2, label: '배추·무', plants: ['napa', 'daikon'], heightCm: 15 }, { x: 0, y: 1.6, w: 4, h: 0.8, label: '쪽파·마늘', plants: ['scallion', 'garlic'], heightCm: 15 }] },
  { name: 'Salad succession', desc: 'Three short beds sown two weeks apart.', beds: [0, 1, 2].map(i => ({ x: i * 1.4, y: 0, w: 1.2, h: 2.4, label: `Salad ${i + 1}`, plants: ['lettuce', 'radish', 'spinach'], heightCm: 10 })) },
  { name: 'Potager pair', desc: 'Carrot with leek, tomato with basil and marigold (French companions).', beds: [{ x: 0, y: 0, w: 2.4, h: 1.2, label: 'Poireau–carotte', plants: ['carrot', 'leek'], heightCm: 15 }, { x: 0, y: 1.6, w: 2.4, h: 1.2, label: 'Tomate–basilic', plants: ['tomato', 'basil', 'marigold'], heightCm: 15 }] }
];

export default function Garden() {
  const site = useSite(); const s = useSettings();
  const [preview, setPreview] = useState<string | null>(null);
  const date = preview ?? s.selectedDate ?? todayYmd(site.tz);
  const [sel, setSel] = useState<Sel>(null);
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [hour, setHour] = useState(14);
  const [showShadows, setShowShadows] = useState(true);
  const [analysisDate, setAnalysisDate] = useState<'today' | 'jun' | 'dec'>('today');
  const [panel, setPanel] = useState<'selected' | 'sun' | 'wind' | 'advice'>('advice');
  const [showControls, setShowControls] = useState(false);
  const [pack, setPack] = useState<SitePack | undefined>();
  useEffect(() => { let on = true; loadPack(site.id).then(p => { if (on) setPack(p); }); return () => { on = false; }; }, [site.id]);
  const windClim = isClimatology(pack?.wind) ? pack!.wind as import('../services/climate').WindClimatology : null;
  const planMonth = +date.slice(5, 7) - 1;
  const windDeg = windClim ? windClim.monthlyDominantDeg[planMonth] : site.windDeg;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ type: 'bed' | 'feature'; id: string; dx: number; dy: number; mode: 'move' | 'resize'; moved: boolean } | null>(null);
  const undo = useRef<Array<{ beds: Bed[]; features: Feature[] }>>([]);
  const beds = site.beds, features = site.features ?? [];
  const W = site.widthM, D = site.depthM;
  const margin = Math.max(6, Math.min(W, D) * 0.4);
  const scale = 760 / (W + 2 * margin), H = (D + 2 * margin) * scale;
  const ft = site.units === 'ft';
  const u = (m: number) => ft ? `${(m / 0.3048).toFixed(0)} ft` : `${m.toFixed(1)} m`;
  const snap = ft ? 0.3048 / 2 : 0.25;
  const sn = (v: number) => Math.round(v / snap) * snap;
  const off = tzOffsetHours(site.tz, noonAtOffset(date, 0));
  const north = site.lat >= 0;

  const push = () => { undo.current.push({ beds: JSON.parse(JSON.stringify(beds)), features: JSON.parse(JSON.stringify(features)) }); if (undo.current.length > 40) undo.current.shift(); };
  const setBeds = (b: Bed[]) => updateSite(site.id, { beds: b });
  const setFeatures = (f: Feature[]) => updateSite(site.id, { features: f });
  const doUndo = () => { const p = undo.current.pop(); if (p) updateSite(site.id, p); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doUndo(); } if ((e.key === 'Delete' || e.key === 'Backspace') && sel && (e.target as HTMLElement).tagName !== 'INPUT') { e.preventDefault(); remove(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); });

  /** First free spot (plan coords) for a w×h rectangle, scanning the plot in snap steps with a small gap; falls back to the centre. */
  const freeSpot = (w: number, h: number, extra: Array<{ x: number; y: number; w: number; h: number }> = []) => {
    const gap = 0.3; const occ = [...beds, ...features, ...extra];
    const hits = (x: number, y: number) => occ.some(o => x < o.x + o.w + gap && x + w + gap > o.x && y < o.y + o.h + gap && y + h + gap > o.y);
    const step = Math.max(snap, 0.5);
    for (let y = 0; y + h <= D + 1e-6; y += step) for (let x = 0; x + w <= W + 1e-6; x += step) if (!hits(x, y)) return { x: sn(x), y: sn(y) };
    return { x: sn((W - w) / 2), y: sn((D - h) / 2) };
  };
  const addBed = (partial?: Partial<Bed>) => { push(); const id = 'bed_' + Math.random().toString(36).slice(2, 7); const w = partial?.w ?? Math.min(W / 3, 2.4), h = partial?.h ?? Math.min(D / 3, 1.2); const spot = freeSpot(w, h); setBeds([...beds, { id, ...spot, w, h, label: `Bed ${beds.length + 1}`, plants: [], heightCm: 15, ...partial }]); setSel({ type: 'bed', id }); };
  const addFeature = (kind: FeatureKind) => { push(); const d = FEATURE_DEFAULTS[kind]; const id = 'f_' + Math.random().toString(36).slice(2, 7); const place = kind === 'house' ? { x: sn((W - d.w) / 2), y: sn(D + 1.5) } : kind === 'tree' ? { x: sn(-d.w - 1), y: sn(-d.h / 2) } : { x: sn((W - d.w) / 2), y: sn(-d.h - 0.5) }; setFeatures([...features, { id, kind, ...place, w: Math.min(d.w, W), h: d.h, heightM: d.heightM, label: d.label }]); setSel({ type: 'feature', id }); };
  const addTemplate = (t: typeof TEMPLATES[number]) => { push(); const base = beds.length; const tw = Math.max(...t.beds.map(b => b.x + b.w)), th = Math.max(...t.beds.map(b => b.y + b.h)); const o = freeSpot(tw, th); setBeds([...beds, ...t.beds.map((b, i) => ({ ...b, id: 'bed_' + Math.random().toString(36).slice(2, 7), x: o.x + b.x, y: o.y + b.y, label: b.label || `Bed ${base + i + 1}` }))]); };
  const remove = () => { if (!sel) return; push(); if (sel.type === 'bed') setBeds(beds.filter(b => b.id !== sel.id)); else setFeatures(features.filter(f => f.id !== sel.id)); setSel(null); };
  const duplicate = () => { if (!sel) return; push(); if (sel.type === 'bed') { const b = beds.find(x => x.id === sel.id)!; const id = 'bed_' + Math.random().toString(36).slice(2, 7); setBeds([...beds, { ...b, id, x: b.x + b.w + snap * 2, label: b.label + ' copy' }]); setSel({ type: 'bed', id }); } else { const f = features.find(x => x.id === sel.id)!; const id = 'f_' + Math.random().toString(36).slice(2, 7); setFeatures([...features, { ...f, id, x: f.x + f.w + 1 }]); setSel({ type: 'feature', id }); } };

  const toM = (e: React.PointerEvent) => { const r = svgRef.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * (W + 2 * margin) - margin, y: (e.clientY - r.top) / r.height * (D + 2 * margin) - margin }; };
  const down = (e: React.PointerEvent, type: 'bed' | 'feature', o: { id: string; x: number; y: number; w: number; h: number }, mode: 'move' | 'resize') => { e.stopPropagation(); setSel({ type, id: o.id }); push(); const p = toM(e); drag.current = { type, id: o.id, dx: p.x - (mode === 'move' ? o.x : o.x + o.w), dy: p.y - (mode === 'move' ? o.y : o.y + o.h), mode, moved: false }; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return; const p = toM(e); d.moved = true;
    const upd = <T extends { id: string; x: number; y: number; w: number; h: number }>(list: T[]): T[] => list.map(o => { if (o.id !== d.id) return o; if (d.mode === 'move') return { ...o, x: sn(Math.max(-margin, Math.min(W + margin - o.w, p.x - d.dx))), y: sn(Math.max(-margin, Math.min(D + margin - o.h, p.y - d.dy))) }; return { ...o, w: Math.max(snap, sn(p.x - d.dx)), h: Math.max(snap, sn(p.y - d.dy)) }; });
    if (d.type === 'bed') setBeds(upd(beds)); else setFeatures(upd(features));
  };
  const up = () => { if (drag.current && !drag.current.moved) undo.current.pop(); drag.current = null; };

  // ----- sun & shade -----
  const analysisYmd = analysisDate === 'today' ? date : `${date.slice(0, 4)}-${analysisDate === 'jun' ? '06-21' : '12-21'}`;
  const samples = useMemo(() => sunSamples(analysisYmd, site.lat, site.lon, site.elevationM, tzOffsetHours(site.tz, noonAtOffset(analysisYmd, 0)), 15), [analysisYmd, site.lat, site.lon, site.elevationM, site.tz]);
  const casters: Box[] = useMemo(() => [
    ...features.filter(f => FEATURE_DEFAULTS[f.kind].casts && f.heightM > 0).map(f => ({ id: f.id, x: f.x, y: f.y, w: f.w, h: f.h, heightM: f.heightM })),
    ...beds.filter(b => b.plants.length).map(b => ({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h, heightM: (b.heightCm ?? 0) / 100 + Math.max(...b.plants.map(p => PLANT_BY_ID[p]?.heightCm ?? 0)) / 100 }))
  ], [features, beds]);
  const sunByBed = useMemo(() => Object.fromEntries(beds.map(b => [b.id, bedSunHours({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h, heightM: (b.heightCm ?? 0) / 100 }, casters, samples, site.rotationDeg)])), [beds, casters, samples, site.rotationDeg]);
  const sunNow = useMemo(() => sunAt(new Date(noonAtOffset(date, off).getTime() + (hour - 12) * 3_600_000), site.lat, site.lon, site.elevationM), [date, off, hour, site]);
  const shadowPoly = (b: Box) => { if (sunNow.altitude <= 0) return null; const [dx, dy] = sunDirPlan(sunNow.azimuth, site.rotationDeg); const L = Math.min(60, b.heightM / Math.tan(sunNow.altitude * Math.PI / 180)); const sx = -dx * L, sy = -dy * L; const c = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]]; const pts = [...c, ...c.map(([x, y]) => [x + sx, y + sy])]; return hull(pts as Array<[number, number]>); };
  const sunrise = samples[0]?.time, sunset = samples[samples.length - 1]?.time;

  const nameOf = (id: string) => features.find(f => f.id === id)?.label ?? beds.find(b => b.id === id)?.label ?? id;
  // ----- advice -----
  const findings = useMemo(() => {
    const out: Array<{ level: 'bad' | 'warn' | 'good'; text: string }> = [];
    const near = (a: Bed, b: Bed) => { const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)); const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)); return Math.hypot(dx, dy) < 1.0; };
    const [wx, wy] = sunDirPlan(windDeg, site.rotationDeg); // direction toward where wind comes FROM
    for (const a of beds) {
      const sun = sunByBed[a.id];
      if (sun) {
        const fullSun = a.plants.filter(p => PLANT_BY_ID[p].sun === 'full');
        if (sun.sunHours < 4 && a.plants.length) out.push({ level: fullSun.length ? 'bad' : 'warn', text: `${a.label}: only ${sun.sunHours} h of sun on ${fmtYMD(analysisYmd)} (${Object.entries(sun.shadedBy).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k, v]) => `${nameOf(k)} ${v} h`).join(', ')}). ${fullSun.length ? `${fullSun.map(p => PLANT_BY_ID[p].name).join(', ')} need 6+. ` : ''}Shade crops that cope: lettuce, spinach, chard, 부추, mint, rhubarb.` });
        else if (sun.sunHours < 6 && fullSun.length) out.push({ level: 'warn', text: `${a.label}: ${sun.sunHours} h of sun — ${fullSun.map(p => PLANT_BY_ID[p].name).join(', ')} will be leggy with less than 6. Leaf and root crops are fine here.` });
        if (sun.sunHours >= 6 && sun.morningFrac > 0.8 && sun.afternoonFrac < 0.5 && a.plants.length) out.push({ level: 'good', text: `${a.label} gets morning sun and afternoon shade — ideal in a hot summer for lettuce, cilantro, peppers and 들깨.` });
      }
      for (let i = 0; i < a.plants.length; i++) for (let j = i + 1; j < a.plants.length; j++) { const r = relation(a.plants[i], a.plants[j]); if (r) out.push({ level: r.good ? 'good' : 'bad', text: `${a.label}: ${PLANT_BY_ID[a.plants[i]].name} + ${PLANT_BY_ID[a.plants[j]].name} — ${r.why} ${r.origin}` }); }
      for (const b of beds) if (a.id < b.id && near(a, b)) for (const pa of a.plants) for (const pb of b.plants) { const r = relation(pa, pb); if (r && !r.good) out.push({ level: 'warn', text: `${a.label} ↔ ${b.label} (adjacent): ${PLANT_BY_ID[pa].name} near ${PLANT_BY_ID[pb].name} — ${r.why}` }); }
      const tender = a.plants.map(p => PLANT_BY_ID[p]).filter(p => !p.frostHardy && p.heightCm >= 90);
      const windward = (a.x + a.w / 2 - W / 2) * wx + (a.y + a.h / 2 - D / 2) * wy > Math.max(W, D) * 0.25 && !features.some(f => f.heightM >= 1.5 && (f.x + f.w / 2 - (a.x + a.w / 2)) * wx + (f.y + f.h / 2 - (a.y + a.h / 2)) * wy > 0 && Math.abs((f.x + f.w / 2 - (a.x + a.w / 2)) * -wy + (f.y + f.h / 2 - (a.y + a.h / 2)) * wx) < Math.max(f.w, f.h));
      if (windward && tender.length) out.push({ level: 'warn', text: `${a.label} is on the ${bearingToDir(windDeg)} (windward) edge with nothing upwind: ${tender.map(t => t.name).join(', ')} will be battered. Stake hard, or add a fence/hedge feature or a row of sunflower/corn upwind.` });
      if (windward && a.plants.some(p => ['sunflower', 'corn'].includes(p))) out.push({ level: 'good', text: `${a.label}: ${a.plants.filter(p => ['sunflower', 'corn'].includes(p)).map(p => PLANT_BY_ID[p].name).join('/')} on the windward edge is a living windbreak for everything downwind.` });
      if ((a.heightCm ?? 0) >= 15 && site.soil === 'clay') out.push({ level: 'good', text: `${a.label}: raised ${a.heightCm} cm — the right answer to clay (roots get out of the saturated layer).` });
    }
    if (site.slope !== 'flat') out.push({ level: 'warn', text: `${site.slope} slope facing ${site.slopeFacing}: ${site.slopeFacing === (north ? 'S' : 'N') ? 'warms early — a week ahead of flat ground in spring; run beds across the slope to hold water.' : 'cold and slow in spring; frost drains downhill, so the bottom edge is the frost pocket — keep tender crops uphill.'}` });
    if (site.soil === 'clay' && beds.some(b => (b.heightCm ?? 0) < 10)) out.push({ level: 'warn', text: 'Clay: raise beds 15–20 cm so roots get out of the saturated zone; never work it wet (when a ball of soil crumbles when dropped from hip height, dig).' });
    if (!features.length) out.push({ level: 'warn', text: 'No shadow casters yet — add your house, trees and fences (toolbar) so the sun-hours per bed mean something.' });
    if (!beds.length) out.push({ level: 'good', text: 'Add beds, then click one to assign plants. Drag to move, drag the corner to resize. Ctrl+Z undoes.' });
    return out;
  }, [beds, features, site, W, D, north, sunByBed, analysisYmd, windDeg]);

  useEffect(() => { if (sel) setPanel('selected'); }, [sel?.id]);
  const selected = sel?.type === 'bed' ? beds.find(b => b.id === sel.id) : undefined;
  const selFeature = sel?.type === 'feature' ? features.find(f => f.id === sel.id) : undefined;
  const [nx, ny] = sunDirPlan(0, site.rotationDeg);
  const P = (x: number, y: number) => [(x + margin) * scale, (y + margin) * scale];

  return (
    <div className="grid">
      <Section wide title="Garden plan" sub={`${u(W)} × ${u(D)} · top of plan faces ${bearingToDir(site.rotationDeg)} · wind from ${bearingToDir(windDeg)}${windClim ? ` in ${fmtYMD(date, { month: 'long' })}` : ''} · sun for ${fmtYMD(date)}`} right={<Seg value={view} options={[['2d', 'Plan'], ['3d', '3D']]} onChange={setView} />}>
        <div className="toolbar">
          <button className="primary" onClick={() => addBed()}>+ Bed</button>
          <select onChange={e => { if (e.target.value) addFeature(e.target.value as FeatureKind); e.target.value = ''; }} defaultValue="" style={{ width: 'auto' }} aria-label="Add a shadow caster"><option value="" disabled>+ Shade caster…</option>{(Object.keys(FEATURE_DEFAULTS) as FeatureKind[]).map(k => <option key={k} value={k}>{FEATURE_ICON[k]} {FEATURE_DEFAULTS[k].label}</option>)}</select>
          <select onChange={e => { const t = TEMPLATES[+e.target.value]; if (t) addTemplate(t); e.target.value = ''; }} defaultValue="" style={{ width: 'auto' }} aria-label="Templates"><option value="" disabled>Templates…</option>{TEMPLATES.map((t, i) => <option key={t.name} value={i}>{t.name}</option>)}</select>
          <span className="sep" />
          {sel ? <><button onClick={duplicate}>Duplicate</button><button onClick={remove} style={{ color: 'var(--bad)' }}>Delete</button></> : <span className="sr">Select a bed or caster to edit it</span>}
          <button className="ghost" onClick={doUndo} title="Ctrl+Z">↶ Undo</button>
          <span className="sep" />
          <label className="row" style={{ fontSize: 13 }}><input type="checkbox" checked={showShadows} onChange={e => setShowShadows(e.target.checked)} />shadows</label>
          <button className="ghost" onClick={() => setShowControls(!showControls)}>{showControls ? 'Hide' : 'Sun, orientation & season'} {showControls ? '▴' : '▾'}</button>
        </div>
        {showControls && <div className="row" style={{ marginTop: 10, gap: 18 }}>
          <label className="f" style={{ minWidth: 240 }}><span>Top of plan faces {bearingToDir(site.rotationDeg)} ({site.rotationDeg}°)</span><input type="range" min={0} max={359} value={site.rotationDeg} onChange={e => updateSite(site.id, { rotationDeg: +e.target.value })} /></label>
          <label className="f" style={{ minWidth: 240 }}><span>Hour {String(hour).padStart(2, '0')}:00 — {sunNow.altitude > 0 ? `sun ${sunNow.altitude.toFixed(0)}° high in the ${bearingToDir(sunNow.azimuth)}` : 'sun below horizon'} · rises {sunrise ? fmtTime(sunrise, site.tz) : '—'}, sets {sunset ? fmtTime(sunset, site.tz) : '—'}</span><input type="range" min={0} max={23} value={hour} onChange={e => setHour(+e.target.value)} /></label>
          <label className="f"><span>Preview another season {preview ? <span style={{ color: 'var(--gold)' }}>(previewing {fmtYMD(preview)}; the top bar stays on {fmtYMD(s.selectedDate ?? todayYmd(site.tz))})</span> : '(leaves the top-bar date alone)'}</span><div className="chips">
            {([['Top-bar date', null], ['Mar 20', `${date.slice(0, 4)}-03-20`], ['Jun 21', `${date.slice(0, 4)}-06-21`], ['Sep 22', `${date.slice(0, 4)}-09-22`], ['Dec 21', `${date.slice(0, 4)}-12-21`]] as Array<[string, string | null]>).map(([l, d]) => <button key={l} className={`chip ${preview === d ? 'on' : ''}`} onClick={() => setPreview(d)}>{l}</button>)}</div></label>
        </div>}
        {view === '2d' ? (
          <svg ref={svgRef} className="garden" viewBox={`0 0 760 ${H}`} style={{ marginTop: 8 }} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerDown={() => setSel(null)}>
            <defs><pattern id="g" width={scale} height={scale} patternUnits="userSpaceOnUse" x={margin * scale} y={margin * scale}><path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="var(--line)" strokeWidth={.5} /></pattern><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#5aa0d9" /></marker><marker id="arrN" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent2)" /></marker></defs>
            <rect x={0} y={0} width={760} height={H} fill="var(--bg2)" />
            <rect x={margin * scale} y={margin * scale} width={W * scale} height={D * scale} fill="url(#g)" stroke="var(--fg)" />
            {/* shadows */}
            {showShadows && sunNow.altitude > 0 && casters.map(c => { const poly = shadowPoly(c); return poly ? <polygon key={'sh' + c.id} points={poly.map(([x, y]) => P(x, y).join(',')).join(' ')} fill="#000" opacity={.28} /> : null; })}
            {/* features */}
            {features.map(f => { const [x, y] = P(f.x, f.y); const on = sel?.type === 'feature' && sel.id === f.id; return (
              <g key={f.id} onPointerDown={e => down(e, 'feature', f, 'move')} style={{ cursor: 'move' }} clipPath={`url(#clip_${f.id})`}>
                <clipPath id={`clip_${f.id}`}><rect x={x - 2} y={y - 2} width={f.w * scale + 4} height={f.h * scale + 4} /></clipPath>
                <rect x={x} y={y} width={f.w * scale} height={f.h * scale} rx={f.kind === 'tree' ? f.w * scale / 2 : 3} fill={FEATURE_COLOR[f.kind]} opacity={f.kind === 'greenhouse' ? .6 : .9} stroke={on ? 'var(--accent2)' : 'var(--bg)'} strokeWidth={on ? 2.5 : 1} />
                <text x={x + 4} y={y + 12} fontSize={10} fill="#fff">{FEATURE_ICON[f.kind]} {f.label} {f.heightM ? `${f.heightM} m` : ''}</text>
                <rect x={x + f.w * scale - 8} y={y + f.h * scale - 8} width={8} height={8} fill="var(--accent2)" style={{ cursor: 'nwse-resize' }} onPointerDown={e => down(e, 'feature', f, 'resize')} />
              </g>); })}
            {/* beds */}
            {beds.map(b => { const [x, y] = P(b.x, b.y); const on = sel?.type === 'bed' && sel.id === b.id; const sun = sunByBed[b.id]; const bad = findings.some(f => f.level === 'bad' && f.text.startsWith(b.label + ':')); return (
              <g key={b.id} onPointerDown={e => down(e, 'bed', b, 'move')} style={{ cursor: 'move' }} clipPath={`url(#clip_${b.id})`}>
                <clipPath id={`clip_${b.id}`}><rect x={x - 2} y={y - 2} width={b.w * scale + 4} height={b.h * scale + 4} /></clipPath>
                <rect x={x} y={y} width={b.w * scale} height={b.h * scale} rx={4} fill={on ? '#3a2a1a' : '#2e2217'} stroke={bad ? 'var(--bad)' : on ? 'var(--accent)' : (b.heightCm ?? 0) > 0 ? '#a67c52' : 'var(--line)'} strokeWidth={on ? 2.5 : (b.heightCm ?? 0) > 0 ? 2 : 1} />
                <text x={x + 5} y={y + 13} fontSize={11} fontWeight={600} fill="var(--fg)">{b.label}</text>
                <text x={x + 5} y={y + 25} fontSize={9} fill="var(--muted)">{u(b.w)} × {u(b.h)}{(b.heightCm ?? 0) > 0 ? ` · ↑${b.heightCm} cm` : ''}{sun ? ` · ☀ ${sun.sunHours} h` : ''}</text>
                {b.plants.slice(0, 6).map((p, i) => <text key={p} x={x + 5 + (i % 3) * (b.w * scale / 3)} y={y + 39 + Math.floor(i / 3) * 12} fontSize={9} fill="var(--fg)">{iconFor(p)} {PLANT_BY_ID[p].name.split(' ')[0]}</text>)}
                <rect x={x + b.w * scale - 8} y={y + b.h * scale - 8} width={8} height={8} fill="var(--accent)" style={{ cursor: 'nwse-resize' }} onPointerDown={e => down(e, 'bed', b, 'resize')} />
              </g>); })}
            {/* compass */}
            {(() => { const cx = 40, cy = 40, L = 22; return <g><circle cx={cx} cy={cy} r={26} fill="var(--card)" stroke="var(--line)" /><line x1={cx - nx * L} y1={cy - ny * L} x2={cx + nx * L} y2={cy + ny * L} stroke="var(--accent2)" strokeWidth={2} markerEnd="url(#arrN)" /><text x={cx + nx * 34} y={cy + ny * 34 + 4} fontSize={11} fontWeight={700} textAnchor="middle" fill="var(--accent2)">N</text></g>; })()}
            {/* sun marker on the edge */}
            {sunNow.altitude > 0 && (() => { const [dx, dy] = sunDirPlan(sunNow.azimuth, site.rotationDeg); const cx = 380, cy = H / 2; const R = Math.min(370, H / 2 - 10); return <g><circle cx={cx + dx * R} cy={cy + dy * R} r={10} fill="#f3c969" /><text x={cx + dx * R} y={cy + dy * R + 4} textAnchor="middle" fontSize={10} fill="#0f1a13">☀</text></g>; })()}
            {/* wind arrow */}
            {(() => { const [wx, wy] = sunDirPlan(windDeg, site.rotationDeg); const cx = 380, cy = H / 2; const R = Math.min(330, H / 2 - 30); const x1 = cx + wx * R, y1 = cy + wy * R; return <g><line x1={x1} y1={y1} x2={x1 - wx * 40} y2={y1 - wy * 40} stroke="#5aa0d9" strokeWidth={3} markerEnd="url(#arr)" /><text x={x1} y={y1 - 8} fontSize={10} fill="#5aa0d9" textAnchor="middle">wind {bearingToDir(windDeg)}</text></g>; })()}
          </svg>
        ) : (
          <Suspense fallback={<div className="muted" style={{ padding: 40 }}>Loading 3D…</div>}>
            <Garden3D site={{ ...site, windDeg }} date={date} hour={hour} selectedId={sel?.id ?? null} onSelect={(type, id) => setSel(id ? { type, id } : null)} samples={samples} />
          </Suspense>
        )}
        <p className="sr">Drag to move, drag the corner square to resize. Shadows come from the real Sun for the chosen date and hour; each bed shows its sun hours.</p>
      </Section>

      <Section wide>
        <div className="panel-tabs"><Seg value={panel} options={[['selected', sel ? (selected ? `✎ ${selected.label}` : `✎ ${selFeature?.label ?? 'feature'}`) : 'Selected'], ['sun', 'Sun hours'], ['wind', 'Wind'], ['advice', `Advice${findings.filter(f => f.level === 'bad').length ? ` (${findings.filter(f => f.level === 'bad').length})` : ''}`]]} onChange={setPanel} /></div>

      {panel === 'selected' && !sel && <p className="muted">Click a bed or a caster on the plan to edit its size, height, plants and notes.</p>}
      {panel === 'selected' && selected && <BedPanel bed={selected} site={site} sun={sunByBed[selected.id]} onChange={(patch) => { setBeds(beds.map(b => b.id === selected.id ? { ...b, ...patch } : b)); }} onPush={push} />}
      {panel === 'selected' && selFeature && (
        <div>
          <h3>{FEATURE_ICON[selFeature.kind]} {selFeature.label} <small>{u(selFeature.w)} × {u(selFeature.h)}</small></h3>
          <div className="two">
            <label className="f"><span>Label</span><input value={selFeature.label ?? ''} onChange={e => setFeatures(features.map(f => f.id === selFeature.id ? { ...f, label: e.target.value } : f))} /></label>
            <label className="f"><span>Kind</span><select value={selFeature.kind} onChange={e => setFeatures(features.map(f => f.id === selFeature.id ? { ...f, kind: e.target.value as FeatureKind } : f))}>{(Object.keys(FEATURE_DEFAULTS) as FeatureKind[]).map(k => <option key={k} value={k}>{FEATURE_DEFAULTS[k].label}</option>)}</select></label>
            <label className="f"><span>Height (m) — eaves/canopy top</span><input type="number" step="0.5" value={selFeature.heightM} onChange={e => setFeatures(features.map(f => f.id === selFeature.id ? { ...f, heightM: +e.target.value } : f))} /></label>
            <label className="f"><span>Footprint ({site.units})</span><div className="row"><input type="number" step="0.5" value={+(ft ? selFeature.w / 0.3048 : selFeature.w).toFixed(1)} onChange={e => setFeatures(features.map(f => f.id === selFeature.id ? { ...f, w: ft ? +e.target.value * 0.3048 : +e.target.value } : f))} /><span>×</span><input type="number" step="0.5" value={+(ft ? selFeature.h / 0.3048 : selFeature.h).toFixed(1)} onChange={e => setFeatures(features.map(f => f.id === selFeature.id ? { ...f, h: ft ? +e.target.value * 0.3048 : +e.target.value } : f))} /></div></label>
          </div>
          <p className="sr">{selFeature.kind === 'tree' ? 'Height is the canopy top; the footprint is the canopy spread. Deciduous trees cast little shade in winter — lower the height in a copy of the plan if you want the leafless case.' : selFeature.kind === 'house' ? 'Use the eaves height for a single storey (≈ 3–4 m) or ridge height for a two-storey house (≈ 7–9 m).' : 'Everything with height casts shadow in the plan and 3D views and counts against the sun hours.'}</p>
        </div>
      )}

      {panel === 'wind' && <div>
        <h3>Wind at {site.name} <small>{windClim ? `plan uses ${fmtYMD(date, { month: 'long' })}'s dominant direction` : 'download the site pack for a real wind rose'}</small></h3>
        {windClim ? <div className="row" style={{ alignItems: 'flex-start' }}>
          <WindRose wind={windClim} month={planMonth} rotationDeg={site.rotationDeg} title={`${fmtYMD(date, { month: 'long' })} · rotated to the plan`} />
          <WindRose wind={windClim} rotationDeg={site.rotationDeg} size={160} title="all year" />
          <div className="sr" style={{ flex: 1, minWidth: 160 }}>Wedge length = share of the month's wind energy (speed-weighted hours) from that direction. {bearingToDir(windClim.monthlyDominantDeg[planMonth])} dominates in {fmtYMD(date, { month: 'long' })} at {windClim.monthlyMeanSpeed[planMonth]} km/h mean, calm {(windClim.monthlyCalm[planMonth] * 100).toFixed(0)}% of hours. {windClim.monthlyDominantDeg[planMonth] !== windClim.dominantDeg ? `Year-round the dominant wind is ${bearingToDir(windClim.dominantDeg)} — the seasons swing it.` : ''} Put windbreaks and tall tender crops with this in mind; the full month-by-direction heatmap is on the Site page.</div>
        </div> : <p className="sr">Using the manual setting ({bearingToDir(site.windDeg)}). On the Site page, download the data pack to replace it with three years of hourly measurements.</p>}
        {windClim && <p className="sr">Source: {windClim.source}.</p>}
      </div>}
      {panel === 'sun' && <div>
        <h3>Sun hours per bed <small>from the real solar path and your casters</small></h3>
        <div className="chips" style={{ marginBottom: 8 }}>{([['today', fmtYMD(date)], ['jun', 'Jun 21 (longest day)'], ['dec', 'Dec 21 (shortest)']] as const).map(([k, l]) => <button key={k} className={`chip ${analysisDate === k ? 'on' : ''}`} onClick={() => setAnalysisDate(k)}>{l}</button>)}</div>
        {beds.length ? <div className="tscroll"><table className="t"><thead><tr><th>Bed</th><th>Sun</th><th>of {samples.length ? (samples.length * 15 / 60).toFixed(1) : '0'} h</th><th>Morning / afternoon</th><th>Shaded by</th></tr></thead><tbody>
          {beds.map(b => { const su = sunByBed[b.id]; return <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => setSel({ type: 'bed', id: b.id })}><td>{b.label}</td><td><b style={{ color: su.sunHours >= 6 ? 'var(--good)' : su.sunHours >= 4 ? 'var(--warn)' : 'var(--bad)' }}>{su.sunHours} h</b></td><td><div className="bar" style={{ width: 90 }}><i style={{ left: 0, width: `${su.fraction * 100}%`, background: su.sunHours >= 6 ? 'var(--good)' : su.sunHours >= 4 ? 'var(--warn)' : 'var(--bad)' }} /></div></td><td>{Math.round(su.morningFrac * 100)}% / {Math.round(su.afternoonFrac * 100)}%</td><td>{Object.entries(su.shadedBy).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${nameOf(k)} ${v} h`).join(', ') || '—'}</td></tr>; })}
        </tbody></table></div> : <p className="sr">No beds yet.</p>}
        <p className="sr">Full-sun crops want 6+ hours; 4–6 suits leaf and root crops; under 4 is a shade bed. Tall crops in a bed count as casters for the beds beside them.</p>
      </div>}

      {panel === 'advice' && <div>
        <h3>Layout advice <small>sun, companions, wind, soil, slope</small></h3>
        <ul className="notes">{findings.map((f, i) => <li key={i}><span className={`chip ${f.level === 'bad' ? 'bad' : f.level === 'good' ? 'good' : ''}`}>{f.level === 'bad' ? '✗' : f.level === 'good' ? '✓' : '!'}</span> {f.text}</li>)}</ul>
        <div className="row" style={{ marginTop: 8 }}>
          <button onClick={() => { const blob = new Blob([JSON.stringify({ phlantPlan: 1, site: site.name, widthM: W, depthM: D, rotationDeg: site.rotationDeg, beds, features }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `phlant-plan-${site.name.replace(/\W+/g, '_')}.json`; a.click(); }}>Export plan</button>
          <label className="chip" style={{ cursor: 'pointer' }}>Import plan<input type="file" accept="application/json" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { const j = JSON.parse(await f.text()); if (j.phlantPlan !== 1) throw 0; push(); updateSite(site.id, { beds: j.beds, features: j.features ?? [], rotationDeg: j.rotationDeg ?? 0, widthM: j.widthM ?? W, depthM: j.depthM ?? D }); } catch { alert('Not a Phlant plan file.'); } }} /></label>
          <button onClick={() => window.print()}>Print</button>
        </div>
      </div>}
      </Section>
    </div>
  );
}

function BedPanel({ bed, site, sun, onChange, onPush }: { bed: Bed; site: SiteConfig; sun?: ReturnType<typeof bedSunHours>; onChange: (p: Partial<Bed>) => void; onPush: () => void }) {
  const ft = site.units === 'ft';
  const u = (m: number) => ft ? `${(m / 0.3048).toFixed(1)} ft` : `${m.toFixed(2)} m`;
  const [q, setQ] = useState('');
  const list = PLANTS.filter(p => !q || `${p.name} ${p.ko ?? ''} ${p.zh ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const count = (id: string) => { const p = PLANT_BY_ID[id]; const share = 1 / Math.max(1, bed.plants.length); return Math.max(1, Math.floor(bed.w * 100 / p.spacingCm) * Math.floor(bed.h * 100 / p.spacingCm) * share); };
  return (
    <div>
      <h3>{bed.label} <small>{u(bed.w)} × {u(bed.h)} · {(bed.w * bed.h).toFixed(1)} m²{sun ? ` · ☀ ${sun.sunHours} h` : ''}</small></h3>
      <div className="two">
        <label className="f"><span>Label</span><input value={bed.label} onChange={e => onChange({ label: e.target.value })} /></label>
        <label className="f"><span>Raised height (cm)</span><input type="number" step="5" value={bed.heightCm ?? 0} onChange={e => onChange({ heightCm: +e.target.value })} /></label>
        <label className="f"><span>Size ({site.units})</span><div className="row"><input type="number" step="0.5" value={+(ft ? bed.w / 0.3048 : bed.w).toFixed(1)} onChange={e => { onPush(); onChange({ w: ft ? +e.target.value * 0.3048 : +e.target.value }); }} /><span>×</span><input type="number" step="0.5" value={+(ft ? bed.h / 0.3048 : bed.h).toFixed(1)} onChange={e => { onPush(); onChange({ h: ft ? +e.target.value * 0.3048 : +e.target.value }); }} /></div></label>
        <label className="f"><span>Notes</span><input value={bed.notes ?? ''} onChange={e => onChange({ notes: e.target.value })} placeholder="e.g. compost added Mar 2026" /></label>
      </div>
      <h3 style={{ marginTop: 10 }}>Plants in this bed</h3>
      {bed.plants.length > 0 && <table className="t"><tbody>{bed.plants.map(id => { const p = PLANT_BY_ID[id]; const planted = bed.planted?.[id]; return <tr key={id}><td>{iconFor(id)} {p.name}</td><td>≈ {count(id)} plants</td><td><input type="date" value={planted ?? ''} onChange={e => onChange({ planted: { ...(bed.planted ?? {}), [id]: e.target.value } })} style={{ width: 'auto' }} title="Planting date" /></td><td className="sr">{planted ? `harvest ≈ ${fmtYMD(addDays(planted, p.dtm))}` : `${p.dtm} d to maturity`}</td><td><button className="ghost" onClick={() => { onPush(); onChange({ plants: bed.plants.filter(x => x !== id) }); }}>✕</button></td></tr>; })}</tbody></table>}
      <input placeholder="Filter plants…" value={q} onChange={e => setQ(e.target.value)} style={{ marginTop: 8 }} />
      <div className="chips" style={{ marginTop: 6, maxHeight: 180, overflowY: 'auto' }}>{list.map(p => { const on = bed.plants.includes(p.id); const fit = p.soil.good.includes(site.soil) || p.soil.ok.includes(site.soil); const sunOk = !sun || p.sun === 'part' || sun.sunHours >= 6; return <button key={p.id} className={`chip ${on ? 'on' : ''}`} title={`${fit ? '' : `dislikes ${site.soil}. `}${sunOk ? '' : 'needs more sun than this bed gets.'}`} style={{ opacity: fit && sunOk ? 1 : .55 }} onClick={() => { onPush(); onChange({ plants: on ? bed.plants.filter(x => x !== p.id) : [...bed.plants, p.id] }); }}>{iconFor(p.id)} {p.name}</button>; })}</div>
    </div>
  );
}

function hull(pts: Array<[number, number]>): Array<[number, number]> {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Array<[number, number]> = []; for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  const upper: Array<[number, number]> = []; for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
export function iconFor(id: string) { const p = PLANT_BY_ID[id]; return ({ leaf: '🥬', root: '🥕', fruit: '🍅', flower: '🌸' } as any)[p?.part ?? 'leaf']; }
