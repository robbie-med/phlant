import React, { useMemo, useState } from 'react';
import { buildContext, evaluateDay, TRADITIONS } from '../traditions';
import { TASKS, type Task } from '../traditions/types';
import { useSettings, useSite, setState } from '../state/store';
import { MoonDisc, phaseName, scoreColor, scoreWord, fmtYMD, todayYmd } from './common';
import { SIGN_GLYPH, nextQuarters, moonRiseSet } from '../astro/moon';
import { fmtTime, addDays, midnightAtOffset, tzOffsetHours, noonAtOffset, fmtDateTime } from '../astro/dates';
import * as A from 'astronomy-engine';
import { PLANTS } from '../data/plants';

export default function Today() {
  const s = useSettings();
  const site = useSite();
  const ymd = s.selectedDate ?? todayYmd(site.tz);
  const [open, setOpen] = useState<string | null>(null);
  const ctx = useMemo(() => buildContext(ymd, site), [ymd, site]);
  const { results, consensus } = useMemo(() => evaluateDay(ctx, s.enabled), [ctx, s.enabled]);
  const off = tzOffsetHours(site.tz, ctx.noon);
  const observer = useMemo(() => new A.Observer(site.lat, site.lon, site.elevationM), [site]);
  const rs = useMemo(() => moonRiseSet(ctx.noon, observer, midnightAtOffset(ymd, off)), [ctx, observer, ymd, off]);
  const sun = useMemo(() => { const d0 = midnightAtOffset(ymd, off); const r = A.SearchRiseSet(A.Body.Sun, observer, +1, d0, 1); const st = A.SearchRiseSet(A.Body.Sun, observer, -1, d0, 1); return { rise: r?.date, set: st?.date }; }, [ymd, off, observer]);
  const quarters = useMemo(() => nextQuarters(ctx.noon, 4), [ctx]);
  const m = ctx.moon;
  const isToday = ymd === todayYmd(site.tz);
  const beginner = s.mode === 'beginner';

  const best = consensus.best, worst = consensus.worst;
  const seasonPlants = PLANTS.filter(p => {
    const wk = ctx.daysFromLastFrost / 7, wkF = ctx.daysToFirstFrost / 7;
    const spring = wk >= p.outdoor[0] && wk <= p.outdoor[1];
    const fall = p.fall ? (wkF <= p.fall[0] && wkF >= p.fall[1]) : false;
    return spring || fall;
  });
  const partTask: Record<string, Task> = { leaf: 'sow_leaf', root: 'sow_root', fruit: 'sow_fruit', flower: 'sow_flower' };
  const sowNow = seasonPlants.filter(p => (consensus.mean[partTask[p.part]] ?? 0) > 0.3 && p.soil.good.concat(p.soil.ok).includes(site.soil)).slice(0, 8);

  return (
    <div className="grid">
      <div className="card wide">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <button onClick={() => setState({ selectedDate: addDays(ymd, -1) })} aria-label="Previous day">‹</button>
            <div className="big">{fmtYMD(ymd, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <button onClick={() => setState({ selectedDate: addDays(ymd, 1) })} aria-label="Next day">›</button>
            {!isToday && <button className="ghost" onClick={() => setState({ selectedDate: undefined })}>Today</button>}
          </div>
          <span className="muted">{site.name} · {site.tz}</span>
        </div>
        <div className="hero" style={{ marginTop: 12 }}>
          <MoonDisc phase={m.phaseAngle} size={170} lat={site.lat} />
          <div>
            <div className="big" style={{ fontSize: 22 }}>{phaseName(m)} · {Math.round(m.illumination * 100)}% lit · day {m.ageDays.toFixed(1)}</div>
            <div className="chips" style={{ marginTop: 8 }}>
              <span className="chip">{m.waxing ? 'Waxing' : 'Waning'}</span>
              <span className="chip">{(ctx.hemisphere === 'N' ? m.ascending : !m.ascending) ? '↗ ascending (sap rising)' : '↘ descending (sap sinking)'}</span>
              <span className="chip" title="Tropical zodiac sign (astrological, used by Russian & American almanacs)">Tropical {SIGN_GLYPH[m.tropical]} {m.tropical}</span>
              <span className="chip" title="Real sidereal constellation (used by biodynamic & French calendars)">Sidereal {SIGN_GLYPH[m.sidereal]} {m.sidereal}</span>
              <span className="chip">{Math.round(m.distanceKm).toLocaleString()} km · {m.nearestApsis.kind} {Math.abs(m.nearestApsis.hours) < 24 ? 'today' : `in ${Math.round(Math.abs(m.nearestApsis.hours) / 24)} d`}</span>
              <span className="chip">{ctx.term.term.def.ko} {ctx.term.term.def.zh} · day {Math.floor(ctx.term.daysIn) + 1}</span>
              <span className="chip">음력 {ctx.koLunar.leap ? '윤' : ''}{ctx.koLunar.month}/{ctx.koLunar.day}</span>
              <span className="chip">{ctx.sexDay.hanzi}日</span>
              {m.saturnOpposition && <span className="chip good">Moon ☍ Saturn</span>}
              {Math.abs(m.nearestNode.hours) <= 12 && <span className="chip bad">Lunar node</span>}
            </div>
            <div className="sr" style={{ marginTop: 8 }}>
              ☀ {sun.rise ? fmtTime(sun.rise, site.tz) : '—'} → {sun.set ? fmtTime(sun.set, site.tz) : '—'} &nbsp; 🌙 rise {rs.rise ? fmtTime(rs.rise, site.tz) : '—'} · set {rs.set ? fmtTime(rs.set, site.tz) : '—'}
              &nbsp; · next: {quarters.slice(0, 2).map(q => `${['New', 'First quarter', 'Full', 'Last quarter'][q.quarter]} ${fmtDateTime(q.time, site.tz)}`).join(' · ')}
            </div>
          </div>
        </div>
      </div>

      <div className="card wide">
        <h2>What the traditions agree on <small>({results.length} traditions · {beginner ? 'plain language' : 'all rules'})</small></h2>
        {beginner && (
          <div className="tip">
            {best.length ? <>Good day to <b>{best.map(t => TASKS.find(x => x.id === t)!.label.toLowerCase()).join(', ')}</b>.</> : <>No strong agreement on favourable work today.</>}
            {worst.length ? <> Hold off on <b>{worst.map(t => TASKS.find(x => x.id === t)!.label.toLowerCase()).join(', ')}</b>.</> : null}
            {results.filter(r => r.r.blocked).length > 0 && <> {results.filter(r => r.r.blocked).length} of {results.length} traditions call this a rest day.</>}
          </div>
        )}
        <div className="tasks">
          {TASKS.map(t => {
            const v = consensus.mean[t.id]; const ag = consensus.agreement[t.id] ?? 0; const vt = consensus.votes[t.id];
            return (
              <div className="task" key={t.id} onClick={() => setOpen(open === t.id ? null : t.id)} style={{ cursor: 'pointer', borderColor: open === t.id ? 'var(--accent)' : undefined }}>
                <div className="t">{t.icon} {t.short} <span className="muted" style={{ fontWeight: 400 }}>· {scoreWord(v)}</span></div>
                <div className="bar"><i style={{ left: '50%', width: `${Math.abs(v ?? 0) / 2 * 50}%`, transform: (v ?? 0) < 0 ? 'translateX(-100%)' : undefined, background: scoreColor(v) }} /></div>
                <div className="pips" title="One dot per tradition">{results.map(r => <span key={r.t.id} className="pip" title={`${r.t.name}: ${scoreWord(r.r.scores[t.id])}`} style={{ background: scoreColor(r.r.scores[t.id]) }} />)}</div>
                {!beginner && vt && <div className="sr">{vt.pro} for · {vt.con} against · agreement {Math.round(ag * 100)}%</div>}
                {open === t.id && <ul className="notes">{results.map(r => (r.r.reasons[t.id] ?? []).map((why, i) => <li key={r.t.id + i}><b>{r.t.flag}</b> {why}</li>))}</ul>}
              </div>
            );
          })}
        </div>
        {sowNow.length > 0 && <div style={{ marginTop: 12 }}><b>In season at {site.name} and favoured today:</b> <span className="chips" style={{ display: 'inline-flex' }}>{sowNow.map(p => <span className="chip good" key={p.id}>{p.name}{p.ko ? ` ${p.ko}` : ''}</span>)}</span></div>}
      </div>

      {results.map(({ t, r }) => (
        <div className="card" key={t.id}>
          <h3>{t.flag} {t.name} <small>· {t.region}</small></h3>
          <div style={{ fontWeight: 600 }}>{r.headline}</div>
          {r.blocked && <div className="tip" style={{ borderColor: 'var(--bad)' }}>⛔ {r.blocked}</div>}
          <div className="chips" style={{ margin: '8px 0' }}>
            {TASKS.filter(x => (r.scores[x.id] ?? 0) >= 1).map(x => <span className="chip good" key={x.id}>{x.icon} {x.short}</span>)}
            {TASKS.filter(x => (r.scores[x.id] ?? 0) <= -1).map(x => <span className="chip bad" key={x.id}>{x.icon} {x.short}</span>)}
          </div>
          {r.notes.length > 0 && <ul className="notes">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
          {!beginner && <details><summary>Every rule applied today</summary><ul className="notes">{TASKS.flatMap(x => (r.reasons[x.id] ?? []).map((why, i) => <li key={x.id + i}><b>{x.short}:</b> {why}</li>))}</ul></details>}
          <details><summary>About this tradition</summary><p className="sr">{t.summary}</p><p className="sr"><b>Reads:</b> {t.basis.join(' · ')}</p><p className="sr"><b>Sources:</b> {t.sources.join('; ')}</p></details>
        </div>
      ))}
      {results.length < TRADITIONS.length && <div className="card muted">Enable more traditions under <a href="#" onClick={e => { e.preventDefault(); setState({ tab: 'site' }); }}>Site &amp; data</a>.</div>}
    </div>
  );
}
