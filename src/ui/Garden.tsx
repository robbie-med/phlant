import React, { useMemo, useRef, useState } from 'react';
import { updateSite, useSite, type Bed } from '../state/store';
import { PLANTS, PLANT_BY_ID } from '../data/plants';
import { relation } from '../data/companions';
import { degToDir } from './Site';

/** 2D plan view. North is up. Units on screen are metres internally; labels in the site's units. */
export default function Garden() {
  const site = useSite();
  const beds = site.beds;
  const [sel, setSel] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; mode: 'move' | 'resize' } | null>(null);
  const W = site.widthM, D = site.depthM, scale = 760 / W, H = D * scale;
  const u = (m: number) => site.units === 'ft' ? `${(m / 0.3048).toFixed(0)} ft` : `${m.toFixed(1)} m`;
  const setBeds = (b: Bed[]) => updateSite(site.id, { beds: b });
  const north = site.lat >= 0;

  const addBed = () => { const id = 'bed_' + Math.random().toString(36).slice(2, 7); const w = Math.min(W / 3, 2.4), h = Math.min(D / 3, 1.2); setBeds([...beds, { id, x: (W - w) / 2, y: (D - h) / 2, w, h, label: `Bed ${beds.length + 1}`, plants: [] }]); setSel(id); };
  const toM = (e: React.PointerEvent) => { const r = svgRef.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * D }; };
  const down = (e: React.PointerEvent, b: Bed, mode: 'move' | 'resize') => { e.stopPropagation(); setSel(b.id); const p = toM(e); drag.current = { id: b.id, dx: p.x - (mode === 'move' ? b.x : b.x + b.w), dy: p.y - (mode === 'move' ? b.y : b.y + b.h), mode }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const move = (e: React.PointerEvent) => { const d = drag.current; if (!d) return; const p = toM(e); setBeds(beds.map(b => { if (b.id !== d.id) return b; if (d.mode === 'move') return { ...b, x: Math.max(0, Math.min(W - b.w, p.x - d.dx)), y: Math.max(0, Math.min(D - b.h, p.y - d.dy)) }; return { ...b, w: Math.max(0.3, Math.min(W - b.x, p.x - d.dx)), h: Math.max(0.3, Math.min(D - b.y, p.y - d.dy)) }; })); };
  const up = () => { drag.current = null; };
  const selected = beds.find(b => b.id === sel);

  // ---- advice ----
  const findings = useMemo(() => {
    const out: Array<{ level: 'bad' | 'warn' | 'good'; text: string }> = [];
    const near = (a: Bed, b: Bed) => { const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)); const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)); return Math.hypot(dx, dy) < 1.0; };
    for (const a of beds) {
      for (let i = 0; i < a.plants.length; i++) for (let j = i + 1; j < a.plants.length; j++) { const r = relation(a.plants[i], a.plants[j]); if (r) out.push({ level: r.good ? 'good' : 'bad', text: `${a.label}: ${PLANT_BY_ID[a.plants[i]].name} + ${PLANT_BY_ID[a.plants[j]].name} — ${r.why} ${r.origin}` }); }
      for (const b of beds) if (a.id < b.id && near(a, b)) for (const pa of a.plants) for (const pb of b.plants) { const r = relation(pa, pb); if (r && !r.good) out.push({ level: 'warn', text: `${a.label} ↔ ${b.label} (adjacent): ${PLANT_BY_ID[pa].name} near ${PLANT_BY_ID[pb].name} — ${r.why}` }); }
      // shading: tall plants cast shade poleward (north in N hemisphere)
      const tall = a.plants.map(p => PLANT_BY_ID[p]).filter(p => p.heightCm >= 150);
      if (tall.length) for (const b of beds) { if (b.id === a.id) continue; const poleward = north ? b.y + b.h <= a.y + 0.01 && b.y + b.h > a.y - 2.5 : b.y >= a.y + a.h - 0.01 && b.y < a.y + a.h + 2.5; const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0; if (poleward && overlapX && b.plants.some(p => PLANT_BY_ID[p].sun === 'full')) out.push({ level: 'warn', text: `${tall.map(t => t.name).join('/')} in ${a.label} will shade ${b.label} to the ${north ? 'north' : 'south'} in the afternoon — swap them, or put the tall crop on the ${north ? 'north' : 'south'} edge.` }); }
      // frost-tender in low spot? skip. Wind exposure:
      const windward = windwardEdge(site.windDeg, a, W, D);
      const tender = a.plants.map(p => PLANT_BY_ID[p]).filter(p => !p.frostHardy && p.heightCm >= 90);
      if (windward && tender.length) out.push({ level: 'warn', text: `${a.label} sits on the windward (${degToDir(site.windDeg)}) edge: tall tender crops ${tender.map(t => t.name).join(', ')} will be battered. Stake hard, or plant a windbreak row (sunflower, corn, sorghum) one bed upwind.` });
      if (windward && a.plants.some(p => ['sunflower', 'corn'].includes(p))) out.push({ level: 'good', text: `${a.label}: ${a.plants.filter(p => ['sunflower', 'corn'].includes(p)).map(p => PLANT_BY_ID[p].name).join('/')} on the windward edge works as a living windbreak for everything downwind.` });
    }
    if (site.shadeSide !== 'none') out.push({ level: 'warn', text: `House/tall shade on the ${site.shadeSide}: ${site.shadeSide === (north ? 'S' : 'N') ? 'it blocks the midday sun — keep full-sun crops at least 1.5× its height away from that edge; lettuce, spinach, chard and 부추 enjoy the shade band.' : site.shadeSide === (north ? 'N' : 'S') ? 'it is on the poleward side and shades little; it also shelters from cold winds — a warm pocket for early sowings.' : 'it takes morning or evening sun; the bed beside it gets half-day light, fine for leaf crops.'}` });
    if (site.slope !== 'flat') out.push({ level: 'warn', text: `${site.slope} slope facing ${site.slopeFacing}: ${site.slopeFacing === (north ? 'S' : 'N') ? 'warms early — a week ahead of flat ground in spring; run beds across the slope to hold water.' : 'cold and slow in spring; frost drains downhill, so the bottom edge is the frost pocket — keep tender crops uphill.'}` });
    if (site.soil === 'clay') out.push({ level: 'warn', text: 'Clay: raise beds 15–20 cm so roots get out of the saturated zone; never work it wet (the Russian rule: when a ball of soil crumbles when dropped from hip height, dig).' });
    if (!beds.length) out.push({ level: 'good', text: 'Add beds, then click a bed to assign plants. North is up; the Sun arc is drawn on the equator side.' });
    return out;
  }, [beds, site, W, D, north]);

  return (
    <div className="grid">
      <div className="card wide">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Garden plan <small>· {u(W)} × {u(D)} · north is up · prevailing wind from {degToDir(site.windDeg)}</small></h2>
          <div className="row"><button className="primary" onClick={addBed}>+ Bed</button>{selected && <button onClick={() => { setBeds(beds.filter(b => b.id !== sel)); setSel(null); }} style={{ color: 'var(--bad)' }}>Delete bed</button>}</div>
        </div>
        <svg ref={svgRef} className="garden" viewBox={`-40 -40 ${W * scale + 80} ${H + 80}`} style={{ marginTop: 8 }} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerDown={() => setSel(null)}>
          <defs><pattern id="g" width={scale} height={scale} patternUnits="userSpaceOnUse"><path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="var(--line)" strokeWidth={.5} /></pattern><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#5aa0d9" /></marker></defs>
          <rect x={0} y={0} width={W * scale} height={H} fill="url(#g)" stroke="var(--fg)" />
          <text x={W * scale / 2} y={-26} textAnchor="middle" fontSize={12} fill="var(--fg)">N ↑</text>
          {/* shade side */}
          {site.shadeSide !== 'none' && <rect {...({ N: { x: 0, y: -14, width: W * scale, height: 10 }, S: { x: 0, y: H + 4, width: W * scale, height: 10 }, E: { x: W * scale + 4, y: 0, width: 10, height: H }, W: { x: -14, y: 0, width: 10, height: H } } as any)[site.shadeSide]} fill="var(--muted)" rx={3}><title>House / tall shade</title></rect>}
          {/* sun arc on equator side */}
          <path d={north ? `M ${W * scale * 0.1} ${H + 30} Q ${W * scale / 2} ${H - 10} ${W * scale * 0.9} ${H + 30}` : `M ${W * scale * 0.1} -30 Q ${W * scale / 2} 10 ${W * scale * 0.9} -30`} fill="none" stroke="var(--warn)" strokeDasharray="4 3" />
          <text x={W * scale / 2} y={north ? H + 22 : -16} textAnchor="middle" fontSize={10} fill="var(--warn)">☀ midday sun · tall crops go on the {north ? 'north' : 'south'} side</text>
          {/* wind arrow: blows FROM windDeg toward center */}
          {(() => { const a = (site.windDeg - 90) * Math.PI / 180; const cx = W * scale / 2, cy = H / 2; const L = Math.min(cx, cy) + 20; const x1 = cx + Math.cos(a) * L, y1 = cy + Math.sin(a) * L; const x2 = cx + Math.cos(a) * (L - 40), y2 = cy + Math.sin(a) * (L - 40); return <g><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5aa0d9" strokeWidth={3} markerEnd="url(#arr)" /><text x={x1} y={y1 - 6} fontSize={10} fill="#5aa0d9" textAnchor="middle">wind {degToDir(site.windDeg)}</text></g>; })()}
          {beds.map(b => {
            const windward = windwardEdge(site.windDeg, b, W, D);
            const bad = findings.some(f => f.level === 'bad' && f.text.startsWith(b.label + ':'));
            return (
              <g key={b.id} onPointerDown={e => down(e, b, 'move')} style={{ cursor: 'move' }}>
                <rect x={b.x * scale} y={b.y * scale} width={b.w * scale} height={b.h * scale} rx={4} fill={b.id === sel ? 'var(--card2)' : 'var(--card)'} stroke={bad ? 'var(--bad)' : b.id === sel ? 'var(--accent)' : windward ? '#5aa0d9' : 'var(--line)'} strokeWidth={b.id === sel ? 2.5 : 1.5} />
                <text x={b.x * scale + 5} y={b.y * scale + 13} fontSize={11} fontWeight={600} fill="var(--fg)">{b.label}</text>
                <text x={b.x * scale + 5} y={b.y * scale + 26} fontSize={9} fill="var(--muted)">{u(b.w)} × {u(b.h)}</text>
                {b.plants.slice(0, 6).map((p, i) => <text key={p} x={b.x * scale + 5 + (i % 3) * (b.w * scale / 3)} y={b.y * scale + 40 + Math.floor(i / 3) * 12} fontSize={9} fill="var(--fg)">{iconFor(p)} {PLANT_BY_ID[p].name.split(' ')[0]}</text>)}
                <rect x={(b.x + b.w) * scale - 8} y={(b.y + b.h) * scale - 8} width={8} height={8} fill="var(--accent)" style={{ cursor: 'nwse-resize' }} onPointerDown={e => down(e, b, 'resize')} />
              </g>
            );
          })}
        </svg>
      </div>
      {selected && (
        <div className="card">
          <h2>{selected.label} <small>· {u(selected.w)} × {u(selected.h)} · {(selected.w * selected.h).toFixed(1)} m²</small></h2>
          <label className="f"><span>Label</span><input value={selected.label} onChange={e => setBeds(beds.map(b => b.id === sel ? { ...b, label: e.target.value } : b))} /></label>
          <h3 style={{ marginTop: 10 }}>Plants in this bed</h3>
          <div className="chips">{PLANTS.map(p => { const on = selected.plants.includes(p.id); const fit = p.soil.good.includes(site.soil) || p.soil.ok.includes(site.soil); return <button key={p.id} className={`chip ${on ? 'on' : ''}`} title={fit ? '' : `dislikes ${site.soil}`} style={{ opacity: fit ? 1 : .55 }} onClick={() => setBeds(beds.map(b => b.id === sel ? { ...b, plants: on ? b.plants.filter(x => x !== p.id) : [...b.plants, p.id] } : b))}>{iconFor(p.id)} {p.name}</button>; })}</div>
          {selected.plants.length > 0 && <p className="sr" style={{ marginTop: 8 }}>Capacity: {selected.plants.map(id => { const p = PLANT_BY_ID[id]; const n = Math.floor(selected.w * 100 / p.spacingCm) * Math.floor(selected.h * 100 / p.spacingCm); return `${p.name} ${n}`; }).join(' · ')} (if the bed held only that crop).</p>}
        </div>
      )}
      <div className="card">
        <h2>Layout advice <small>· companions, shade, wind, soil, slope</small></h2>
        <ul className="notes">{findings.map((f, i) => <li key={i}><span className={`chip ${f.level === 'bad' ? 'bad' : f.level === 'good' ? 'good' : ''}`}>{f.level === 'bad' ? '✗' : f.level === 'good' ? '✓' : '!'}</span> {f.text}</li>)}</ul>
        <p className="sr">3D view: not yet — the plan view carries the same information (sun side, wind, shade, spacing). A simple 3D with plant heights is a good later addition once the data pack includes a slope raster.</p>
      </div>
    </div>
  );
}

function windwardEdge(windDeg: number, b: Bed, W: number, D: number) {
  const dir = ((windDeg % 360) + 360) % 360; const m = 0.6;
  if ((dir > 315 || dir <= 45) && b.y < m) return true;        // wind from N, bed at top
  if (dir > 45 && dir <= 135 && b.x + b.w > W - m) return true; // from E
  if (dir > 135 && dir <= 225 && b.y + b.h > D - m) return true; // from S
  if (dir > 225 && dir <= 315 && b.x < m) return true;           // from W
  return false;
}
function iconFor(id: string) { const p = PLANT_BY_ID[id]; return ({ leaf: '🥬', root: '🥕', fruit: '🍅', flower: '🌸' } as any)[p.part]; }
