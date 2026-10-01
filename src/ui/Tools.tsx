import React, { useMemo, useState } from 'react';
import { useSite, useSettings } from '../state/store';
import { PLANTS, PLANT_BY_ID } from '../data/plants';
import { addDays, daysBetween } from '../astro/dates';
import { fmtYMD, todayYmd } from './common';
import { windows } from './Plants';
import { buildContext, evaluateDay } from '../traditions';
import type { Task } from '../traditions/types';

export default function Tools() {
  const site = useSite(); const s = useSettings();
  const today = todayYmd(site.tz); const year = +today.slice(0, 4);
  const lf = `${year}-${site.lastFrost}`, ff = `${year}-${site.firstFrost}`;
  const toLF = daysBetween(today, lf), toFF = daysBetween(today, ff);
  const ftIn = site.units === 'ft';
  const [soilT, setSoilT] = useState(15);
  const [bedW, setBedW] = useState(4), [bedL, setBedL] = useState(8), [spPlant, setSpPlant] = useState('lettuce');
  const [sowDate, setSowDate] = useState(today), [sowPlant, setSowPlant] = useState('tomato'), [interval, setInterval_] = useState(14), [rounds, setRounds] = useState(4);
  const ready = PLANTS.filter(p => soilT >= p.minSoilC && windows(p, year, site.lastFrost, site.firstFrost).some(w => w.kind !== 'indoor' && today >= addDays(w.start, -10) && today <= addDays(w.end, 10)));
  const sp = PLANT_BY_ID[spPlant]; const toCm = (v: number) => ftIn ? v * 30.48 : v * 100;
  const perRow = Math.floor(toCm(bedW) / sp.spacingCm), rows = Math.floor(toCm(bedL) / sp.spacingCm);
  const succession = useMemo(() => { const p = PLANT_BY_ID[sowPlant]; const partTask: Record<string, Task> = { leaf: 'sow_leaf', root: 'sow_root', fruit: 'sow_fruit', flower: 'sow_flower' }; return Array.from({ length: rounds }, (_, i) => { const d = addDays(sowDate, i * interval); let best = d, bv = -9; for (let k = -3; k <= 3; k++) { const dd = addDays(d, k); const v = evaluateDay(buildContext(dd, site), s.enabled).consensus.mean[partTask[p.part]] ?? 0; if (v > bv) { bv = v; best = dd; } } return { planned: d, best, bv, harvest: addDays(best, p.dtm), frost: addDays(best, p.dtm) > ff }; }); }, [sowDate, sowPlant, interval, rounds, site, s.enabled, ff]);
  return (
    <div className="grid">
      <div className="card">
        <h2>Season countdown <small>{site.name}</small></h2>
        <div className="big">{toLF > 0 ? `${toLF} days to last frost` : toFF > 0 ? `${toFF} days of season left` : `${-toFF} days since first frost`}</div>
        <p className="sr">Average last spring frost {fmtYMD(lf)} · first autumn frost {fmtYMD(ff)} · {daysBetween(lf, ff)}-day frost-free season. Half the years frost comes later than the average — keep covers handy for two weeks after.</p>
        <p className="sr"><b>Rule of thumb for a last autumn sowing:</b> days to maturity + 14 days "fall factor" must fit before {fmtYMD(ff)}. Today that means crops of ≤ {Math.max(0, toFF - 14)} days.</p>
      </div>
      <div className="card">
        <h2>Soil temperature → what will germinate</h2>
        <label className="f"><span>Soil temperature at 5–10 cm, mid-morning: {soilT} °C ({Math.round(soilT * 9 / 5 + 32)} °F)</span><input type="range" min={0} max={35} value={soilT} onChange={e => setSoilT(+e.target.value)} /></label>
        <p className="sr">Push a kitchen thermometer 7 cm into the bed three mornings running. Seeds read soil, not air — this is the test the traditions were approximating with "when the oak leaves are the size of a squirrel's ear" or 곡우.</p>
        <div className="chips">{ready.map(p => <span key={p.id} className="chip good">{p.name}</span>)}{!ready.length && <span className="muted">Nothing in window will germinate at this temperature.</span>}</div>
        <p className="sr" style={{ marginTop: 6 }}>Too cold for now: {PLANTS.filter(p => soilT < p.minSoilC).slice(0, 12).map(p => `${p.name} (${p.minSoilC}°)`).join(', ')}</p>
      </div>
      <div className="card">
        <h2>Spacing & seed count</h2>
        <div className="two">
          <label className="f"><span>Bed width ({site.units})</span><input type="number" value={bedW} onChange={e => setBedW(+e.target.value)} /></label>
          <label className="f"><span>Bed length ({site.units})</span><input type="number" value={bedL} onChange={e => setBedL(+e.target.value)} /></label>
          <label className="f"><span>Plant</span><select value={spPlant} onChange={e => setSpPlant(e.target.value)}>{PLANTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        </div>
        <div className="big" style={{ marginTop: 8 }}>{perRow * rows} plants</div>
        <p className="sr">{perRow} across × {rows} along at {sp.spacingCm} cm. Sow 1.5–2× that many seeds and thin. Height {sp.heightCm} cm — put it on the {site.lat >= 0 ? 'north' : 'south'} side of shorter crops.</p>
      </div>
      <div className="card wide">
        <h2>Succession planner <small>picks the best consensus day within ±3 days of each planned sowing</small></h2>
        <div className="row">
          <label className="f"><span>Plant</span><select value={sowPlant} onChange={e => setSowPlant(e.target.value)} style={{ width: 'auto' }}>{PLANTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="f"><span>First sowing</span><input type="date" value={sowDate} onChange={e => setSowDate(e.target.value)} style={{ width: 'auto' }} /></label>
          <label className="f"><span>Every N days</span><input type="number" value={interval} onChange={e => setInterval_(+e.target.value)} style={{ width: 90 }} /></label>
          <label className="f"><span>Rounds</span><input type="number" value={rounds} min={1} max={10} onChange={e => setRounds(+e.target.value)} style={{ width: 70 }} /></label>
        </div>
        <table className="t" style={{ marginTop: 8 }}><thead><tr><th>#</th><th>Planned</th><th>Best nearby day</th><th>Consensus</th><th>Harvest ≈</th><th></th></tr></thead>
          <tbody>{succession.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{fmtYMD(r.planned)}</td><td>{fmtYMD(r.best)}</td><td>{r.bv.toFixed(1)}</td><td>{fmtYMD(r.harvest)}</td><td>{r.frost ? <span className="chip bad">after first frost</span> : ''}</td></tr>)}</tbody></table>
      </div>
      <div className="card wide">
        <h2>Unit crib</h2>
        <p className="sr">1 ft = 30.48 cm · 1 in = 2.54 cm · °F = °C × 1.8 + 32 · 1 acre = 4047 m² · 1 평 (pyeong) = 3.3 m² · 1 亩 (mu) = 667 m² · 1 сотка = 100 m² · 1 are = 100 m² · a Korean 마지기 of paddy ≈ 660 m² (varies by region).</p>
      </div>
    </div>
  );
}
