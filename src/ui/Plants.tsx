import React, { useMemo, useState } from 'react';
import { PLANTS, PLANT_BY_ID, SOIL_INFO, type Part, type Plant } from '../data/plants';
import { companionsOf } from '../data/companions';
import { useSettings, useSite, setState } from '../state/store';
import { buildContext, evaluateDay } from '../traditions';
import type { Task } from '../traditions/types';
import { addDays } from '../astro/dates';
import { fmtYMD, scoreColor, todayYmd } from './common';

const PART_TASK: Record<Part, Task> = { leaf: 'sow_leaf', root: 'sow_root', fruit: 'sow_fruit', flower: 'sow_flower' };
const PART_ICON: Record<Part, string> = { leaf: '🥬', root: '🥕', fruit: '🍅', flower: '🌸' };

export function windows(p: Plant, year: number, lastFrost: string, firstFrost: string) {
  const lf = `${year}-${lastFrost}`, ff = `${year}-${firstFrost}`;
  const out: Array<{ label: string; start: string; end: string; kind: 'indoor' | 'spring' | 'fall' }> = [];
  if (p.indoorWeeks) out.push({ label: 'Start indoors', start: addDays(lf, -p.indoorWeeks * 7), end: addDays(lf, -(p.indoorWeeks - 2) * 7), kind: 'indoor' });
  out.push({ label: p.indoorWeeks ? 'Plant out / direct sow' : 'Direct sow', start: addDays(lf, p.outdoor[0] * 7), end: addDays(lf, p.outdoor[1] * 7), kind: 'spring' });
  if (p.fall) out.push({ label: 'Autumn sowing', start: addDays(ff, -p.fall[0] * 7), end: addDays(ff, -p.fall[1] * 7), kind: 'fall' });
  return out;
}

export default function Plants() {
  const s = useSettings(); const site = useSite();
  const today = s.selectedDate ?? todayYmd(site.tz);
  const year = +today.slice(0, 4);
  const [q, setQ] = useState(''); const [part, setPart] = useState<Part | 'all'>('all'); const [onlyNow, setOnlyNow] = useState(false); const [onlySoil, setOnlySoil] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const list = PLANTS.filter(p => {
    if (part !== 'all' && p.part !== part) return false;
    if (q && !`${p.name} ${p.ko ?? ''} ${p.zh ?? ''} ${p.family}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (onlySoil && !p.soil.good.includes(site.soil) && !p.soil.ok.includes(site.soil)) return false;
    if (onlyNow && !windows(p, year, site.lastFrost, site.firstFrost).some(w => today >= w.start && today <= w.end)) return false;
    return true;
  });
  const plant = sel ? PLANT_BY_ID[sel] : null;
  return (
    <div className="grid">
      <div className="card wide">
        <h2>Plants <small>{PLANTS.length} crops · windows computed from {site.name}'s frost dates</small></h2>
        <div className="row">
          <input placeholder="Search name, 한국어, 中文, family…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 300 }} />
          <div className="chips">{(['all', 'leaf', 'root', 'fruit', 'flower'] as const).map(x => <button key={x} className={`chip ${part === x ? 'on' : ''}`} onClick={() => setPart(x)}>{x === 'all' ? 'all' : `${PART_ICON[x]} ${x}`}</button>)}</div>
          <label className="row" style={{ fontSize: 13 }}><input type="checkbox" style={{ width: 'auto' }} checked={onlyNow} onChange={e => setOnlyNow(e.target.checked)} />sow / plant now</label>
          <label className="row" style={{ fontSize: 13 }}><input type="checkbox" style={{ width: 'auto' }} checked={onlySoil} onChange={e => setOnlySoil(e.target.checked)} />suits my {SOIL_INFO[site.soil].name.toLowerCase()}</label>
        </div>
      </div>
      {plant && <PlantDetail p={plant} today={today} onClose={() => setSel(null)} />}
      {list.map(p => {
        const ws = windows(p, year, site.lastFrost, site.firstFrost); const now = ws.find(w => today >= w.start && today <= w.end);
        const fit = p.soil.good.includes(site.soil) ? 'loves' : p.soil.ok.includes(site.soil) ? 'tolerates' : 'dislikes';
        return (
          <div key={p.id} className="card plantcard" onClick={() => setSel(p.id)} style={{ borderColor: sel === p.id ? 'var(--accent)' : undefined }}>
            <h3>{PART_ICON[p.part]} {p.name} <small>{p.ko} {p.zh}</small></h3>
            <div className="chips"><span className="chip">{p.family}</span><span className="chip">{p.kind}</span><span className={`chip ${fit === 'loves' ? 'good' : fit === 'dislikes' ? 'bad' : ''}`}>{fit} {site.soil}</span>{now && <span className="chip good">{now.label} now</span>}<span className="chip">{p.dtm} days</span></div>
            <div className="sr" style={{ marginTop: 6 }}>{ws.map(w => `${w.label}: ${fmtYMD(w.start, { month: 'short', day: 'numeric' })}–${fmtYMD(w.end, { month: 'short', day: 'numeric' })}`).join(' · ')}</div>
          </div>
        );
      })}
    </div>
  );
}

function PlantDetail({ p, today, onClose }: { p: Plant; today: string; onClose: () => void }) {
  const s = useSettings(); const site = useSite();
  const year = +today.slice(0, 4);
  const ws = windows(p, year, site.lastFrost, site.firstFrost);
  const task = PART_TASK[p.part];
  // best days in the next 45 days inside a window, by consensus for this plant part
  const best = useMemo(() => {
    const out: Array<{ ymd: string; v: number; inWindow: boolean }> = [];
    for (let i = 0; i < 45; i++) { const ymd = addDays(today, i); const ctx = buildContext(ymd, site); const ev = evaluateDay(ctx, s.enabled); const v = ev.consensus.mean[task] ?? 0; out.push({ ymd, v, inWindow: ws.some(w => w.kind !== 'indoor' && ymd >= w.start && ymd <= w.end) }); }
    return out;
  }, [today, site, s.enabled, task, ws]);
  const top = [...best].filter(b => b.inWindow).sort((a, b) => b.v - a.v).slice(0, 5).sort((a, b) => a.ymd.localeCompare(b.ymd));
  const comps = companionsOf(p.id);
  const dayX = (ymd: string) => { const d = Math.round((Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8)) - Date.UTC(year, 0, 1)) / 86_400_000); return 40 + d * (700 / 365); };
  return (
    <div className="card wide">
      <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ margin: 0 }}>{PART_ICON[p.part]} {p.name} <small>{p.ko} {p.zh} · {p.family}</small></h2><button className="ghost" onClick={onClose}>✕</button></div>
      <svg viewBox="0 0 760 70" width="100%" style={{ marginTop: 6 }}>
        {Array.from({ length: 12 }, (_, i) => <text key={i} x={dayX(`${year}-${String(i + 1).padStart(2, '0')}-01`)} y={10} fontSize={9} fill="var(--muted)">{'JFMAMJJASOND'[i]}</text>)}
        <rect x={dayX(`${year}-${site.lastFrost}`)} y={14} width={dayX(`${year}-${site.firstFrost}`) - dayX(`${year}-${site.lastFrost}`)} height={40} fill="var(--accent)" opacity={.12} />
        {ws.map((w, i) => <g key={i}><rect x={dayX(w.start)} y={18 + i * 12} width={Math.max(3, dayX(w.end) - dayX(w.start))} height={9} rx={3} fill={w.kind === 'indoor' ? 'var(--warn)' : w.kind === 'spring' ? 'var(--accent)' : '#5aa0d9'} /><text x={dayX(w.end) + 4} y={26 + i * 12} fontSize={9} fill="var(--fg)">{w.label}</text></g>)}
        {ws.filter(w => w.kind !== 'indoor').map((w, i) => <text key={'h' + i} x={dayX(addDays(w.end, p.dtm))} y={62} fontSize={9} fill="var(--muted)">harvest ≈ {fmtYMD(addDays(w.start, p.dtm), { month: 'short', day: 'numeric' })}–{fmtYMD(addDays(w.end, p.dtm), { month: 'short', day: 'numeric' })}</text>)}
        <line x1={dayX(today)} x2={dayX(today)} y1={12} y2={58} stroke="var(--accent2)" strokeWidth={2} />
      </svg>
      <div className="grid">
        <div>
          <h3>Best days in the next 45 <small>consensus of {s.enabled.length} traditions for {p.part} crops, inside the sowing window</small></h3>
          {top.length ? <div className="chips">{top.map(b => <button key={b.ymd} className="chip" style={{ borderColor: scoreColor(b.v) }} onClick={() => setState({ selectedDate: b.ymd, tab: 'today' })}>{fmtYMD(b.ymd)} · {b.v.toFixed(1)}</button>)}</div> : <p className="sr">No sowing window for {p.name} in the next 45 days at {site.name}. Windows: {ws.map(w => `${w.label} ${fmtYMD(w.start, { month: 'short', day: 'numeric' })}–${fmtYMD(w.end, { month: 'short', day: 'numeric' })}`).join('; ')}.</p>}
          <svg viewBox="0 0 450 40" width="100%" style={{ marginTop: 6 }}>{best.map((b, i) => <rect key={b.ymd} x={i * 10} y={b.inWindow ? 4 : 14} width={9} height={b.inWindow ? 30 : 12} fill={scoreColor(b.v)} opacity={b.inWindow ? 1 : .35} onClick={() => setState({ selectedDate: b.ymd, tab: 'today' })} style={{ cursor: 'pointer' }}><title>{b.ymd}: {b.v.toFixed(1)}</title></rect>)}</svg>
          <h3 style={{ marginTop: 10 }}>Growing</h3>
          <table className="t"><tbody>
            <tr><th>Soil</th><td>loves {p.soil.good.join(', ')} · tolerates {p.soil.ok.join(', ')} · pH {p.soil.ph[0]}–{p.soil.ph[1]} {site.soilPh && (site.soilPh < p.soil.ph[0] || site.soilPh > p.soil.ph[1]) ? <span className="chip bad">your pH {site.soilPh} is outside</span> : null}</td></tr>
            <tr><th>Germination</th><td>soil ≥ {p.minSoilC} °C · {p.frostHardy ? 'frost hardy' : 'frost tender'} · {p.sun} sun</td></tr>
            <tr><th>Size</th><td>{p.heightCm} cm tall · {p.spacingCm} cm apart · {p.dtm} days to maturity</td></tr>
            <tr><th>Pests</th><td>{p.pests}</td></tr>
          </tbody></table>
        </div>
        <div>
          <h3>Companions</h3>
          <ul className="notes">{comps.map((c, i) => <li key={i}><span className={`chip ${c.good ? 'good' : 'bad'}`}>{c.good ? '✓' : '✗'} {PLANT_BY_ID[c.other]?.name ?? c.other}</span> {c.why} <span className="muted">{c.origin}</span></li>)}{!comps.length && <li className="muted">No recorded pairings.</li>}</ul>
          <h3 style={{ marginTop: 10 }}>What the traditions say</h3>
          <ul className="notes">{p.lore.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
