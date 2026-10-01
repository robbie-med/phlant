import React, { useMemo, useState } from 'react';
import { buildContext, evaluateDay } from '../traditions';
import { TASKS, type Task } from '../traditions/types';
import { setState, useSettings, useSite } from '../state/store';
import { scoreColor, todayYmd, fmtMD } from './common';
import { addDays } from '../astro/dates';
import { solarTermsCached } from '../astro/solarterms';
import { KO_MONTHS } from '../astro/lunisolar';

export default function Calendar() {
  const s = useSettings(); const site = useSite();
  const today = todayYmd(site.tz);
  const [month, setMonth] = useState((s.selectedDate ?? today).slice(0, 7));
  const [task, setTask] = useState<Task>('sow_leaf');
  const [view, setView] = useState<'month' | 'year'>('month');
  const [y, mo] = month.split('-').map(Number);
  const first = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const startDow = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => { const ymd = addDays(first, i); const ctx = buildContext(ymd, site); const ev = evaluateDay(ctx, s.enabled); return { ymd, ctx, ev }; }), [first, daysInMonth, site, s.enabled]);
  const terms = useMemo(() => [...solarTermsCached(y - 1), ...solarTermsCached(y)].map(e => ({ ...e, ymd: new Intl.DateTimeFormat('en-CA', { timeZone: site.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(e.time) })), [y, site.tz]);
  const shift = (n: number) => { const d = new Date(Date.UTC(y, mo - 1 + n, 1)); setMonth(d.toISOString().slice(0, 7)); };

  return (
    <div className="grid">
      <div className="card wide">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <button onClick={() => shift(-1)}>‹</button>
            <div className="big" style={{ fontSize: 22 }}>{new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}</div>
            <button onClick={() => shift(1)}>›</button>
            <button className="ghost" onClick={() => setMonth(today.slice(0, 7))}>This month</button>
          </div>
          <div className="row">
            <button className={view === 'month' ? 'primary' : ''} onClick={() => setView('month')}>Month</button>
            <button className={view === 'year' ? 'primary' : ''} onClick={() => setView('year')}>Year</button>
          </div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <span className="muted">Colour by task:</span>
          <div className="chips">{TASKS.map(t => <button key={t.id} className={`chip ${task === t.id ? 'on' : ''}`} onClick={() => setTask(t.id)}>{t.icon} {t.short}</button>)}</div>
        </div>
        <div className="legend" style={{ marginTop: 8 }}><span><i style={{ background: scoreColor(2) }} />excellent</span><span><i style={{ background: scoreColor(0.8) }} />good</span><span><i style={{ background: scoreColor(0) }} />neutral</span><span><i style={{ background: scoreColor(-0.8) }} />poor</span><span><i style={{ background: scoreColor(-2) }} />avoid</span><span>striped = a tradition calls it a rest day</span><span>● phase · small squares = each tradition</span></div>
      </div>

      {view === 'month' && (
        <div className="card wide">
          <div className="cal">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div className="dow" key={d}>{d}</div>)}
            {Array.from({ length: startDow }).map((_, i) => <div key={'e' + i} />)}
            {days.map(({ ymd, ctx, ev }) => {
              const v = ev.consensus.mean[task];
              const term = terms.find(t => t.ymd === ymd);
              const blocked = ev.results.some(r => r.r.blocked);
              const phaseIcon = ctx.moon.isNewMoonDay ? '🌑' : ctx.moon.isFullMoonDay ? '🌕' : Math.abs(ctx.moon.phaseAngle - 90) < 6.5 ? '🌓' : Math.abs(ctx.moon.phaseAngle - 270) < 6.5 ? '🌗' : '';
              return (
                <div key={ymd} className={`day ${ymd === today ? 'today' : ''} ${s.selectedDate === ymd ? 'sel' : ''} ${blocked ? 'blocked' : ''}`} style={{ borderLeft: `4px solid ${scoreColor(v)}` }} onClick={() => setState({ selectedDate: ymd, tab: 'today' })} title={`${ymd}: ${TASKS.find(t => t.id === task)!.label} — mean ${v?.toFixed(1)}`}>
                  <div className="row" style={{ justifyContent: 'space-between', gap: 2 }}><span className="n">{+ymd.slice(8)}</span><span style={{ fontSize: 11 }}>{phaseIcon}</span></div>
                  {term && <div className="ev">{term.def.ko} {term.def.zh}</div>}
                  {ctx.koLunar.day === 1 && <div className="ev">음력 {ctx.koLunar.leap ? '윤' : ''}{KO_MONTHS[ctx.koLunar.month - 1]}</div>}
                  {ctx.koLunar.day === 15 && <div className="ev">보름</div>}
                  <div className="mini">{ev.results.map(r => <span key={r.t.id} className="sq" title={r.t.name} style={{ background: scoreColor(r.r.scores[task]) }} />)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'year' && <YearView year={y} task={task} />}
    </div>
  );
}

function YearView({ year, task }: { year: number; task: Task }) {
  const s = useSettings(); const site = useSite();
  const rows = useMemo(() => {
    const out: Array<{ ymd: string; v: number | undefined; phase: number; blocked: boolean }> = [];
    let d = `${year}-01-01`;
    while (d.startsWith(String(year))) { const ctx = buildContext(d, site); const ev = evaluateDay(ctx, s.enabled); out.push({ ymd: d, v: ev.consensus.mean[task], phase: ctx.moon.phaseAngle, blocked: ev.results.some(r => r.r.blocked) }); d = addDays(d, 1); }
    return out;
  }, [year, site, s.enabled, task]);
  const months = Array.from({ length: 12 }, (_, i) => rows.filter(r => +r.ymd.slice(5, 7) === i + 1));
  const lf = `${year}-${site.lastFrost}`, ff = `${year}-${site.firstFrost}`;
  return (
    <div className="card wide">
      <h2>{year} — every day coloured by consensus for “{TASKS.find(t => t.id === task)!.label}”</h2>
      <div className="sr">Frost-free season {fmtMD(site.lastFrost)} → {fmtMD(site.firstFrost)} shown as the pale band. Click a day to open it.</div>
      <svg viewBox="0 0 740 300" width="100%" style={{ marginTop: 8 }}>
        {months.map((m, mi) => (
          <g key={mi} transform={`translate(40, ${mi * 24 + 6})`}>
            <text x={-8} y={14} textAnchor="end" fontSize={11} fill="var(--muted)">{new Date(Date.UTC(2001, mi, 1)).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</text>
            {m.map((r, di) => {
              const inSeason = r.ymd >= lf && r.ymd <= ff;
              return <g key={r.ymd} onClick={() => setState({ selectedDate: r.ymd, tab: 'today' })} style={{ cursor: 'pointer' }}>
                <rect x={di * 22} y={0} width={21} height={21} rx={4} fill={scoreColor(r.v)} opacity={inSeason ? 1 : 0.45} stroke={r.blocked ? 'var(--bg)' : 'none'} strokeDasharray={r.blocked ? '2 2' : undefined} />
                {(r.phase < 6.1 || r.phase > 353.9) && <circle cx={di * 22 + 10.5} cy={10.5} r={4} fill="#0f1a13" stroke="#fff" />}
                {Math.abs(r.phase - 180) < 6.1 && <circle cx={di * 22 + 10.5} cy={10.5} r={4} fill="#fff" />}
                <title>{r.ymd}</title>
              </g>;
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
