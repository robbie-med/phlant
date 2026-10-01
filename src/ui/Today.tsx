import React, { useMemo, useState } from 'react';
import { buildContext, evaluateDay } from '../traditions';
import { TASKS, type Task } from '../traditions/types';
import { useSettings, useSite, setState } from '../state/store';
import { MoonDisc, phaseName, scoreColor, scoreWord, fmtYMD, todayYmd } from './common';
import { Section, Acc, Stat } from './kit';
import { SIGN_GLYPH, nextQuarters, moonRiseSet } from '../astro/moon';
import { fmtTime, addDays, midnightAtOffset, tzOffsetHours, fmtDateTime } from '../astro/dates';
import * as A from 'astronomy-engine';
import { PLANTS } from '../data/plants';
import { fetchForecast, type Forecast } from '../services/climate';
import { windows } from './Plants';

function useForecast(siteId: string, lat: number, lon: number) {
  const key = `phlant:forecast:${siteId}`;
  const [fc, setFc] = React.useState<{ f: Forecast; stale: boolean } | null>(() => { try { const j = JSON.parse(localStorage.getItem(key) || 'null'); return j ? { f: j, stale: Date.now() - new Date(j.fetchedAt).getTime() > 3 * 3_600_000 } : null; } catch { return null; } });
  const [err, setErr] = React.useState(false);
  React.useEffect(() => {
    if (fc && !fc.stale) return;
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15000);
    fetchForecast(lat, lon, ac.signal).then(f => { try { localStorage.setItem(key, JSON.stringify(f)); } catch { /* quota */ } setFc({ f, stale: false }); setErr(false); }).catch(() => setErr(true)).finally(() => clearTimeout(t));
    return () => { clearTimeout(t); ac.abort(); };
  }, [siteId, lat, lon]);
  return { fc, err };
}

const PART_TASK: Record<string, Task> = { leaf: 'sow_leaf', root: 'sow_root', fruit: 'sow_fruit', flower: 'sow_flower' };

export default function Today() {
  const s = useSettings();
  const site = useSite();
  const today = todayYmd(site.tz);
  const ymd = s.selectedDate ?? today;
  const beginner = s.mode === 'beginner';
  const [open, setOpen] = useState<string | null>(null);
  const ctx = useMemo(() => buildContext(ymd, site), [ymd, site]);
  const { results, consensus } = useMemo(() => evaluateDay(ctx, s.enabled), [ctx, s.enabled]);
  const off = tzOffsetHours(site.tz, ctx.noon);
  const observer = useMemo(() => new A.Observer(site.lat, site.lon, site.elevationM), [site]);
  const rs = useMemo(() => moonRiseSet(ctx.noon, observer, midnightAtOffset(ymd, off)), [ctx, observer, ymd, off]);
  const sun = useMemo(() => { const d0 = midnightAtOffset(ymd, off); const r = A.SearchRiseSet(A.Body.Sun, observer, +1, d0, 1); const st = A.SearchRiseSet(A.Body.Sun, observer, -1, d0, 1); return { rise: r?.date, set: st?.date }; }, [ymd, off, observer]);
  const quarters = useMemo(() => nextQuarters(ctx.noon, 2), [ctx]);
  const m = ctx.moon;
  const { fc, err } = useForecast(site.id, site.lat, site.lon);
  const label = (t: Task) => TASKS.find(x => x.id === t)!.label.toLowerCase();
  const best = consensus.best, worst = consensus.worst;
  const restCount = results.filter(r => r.r.blocked).length;
  const seasonPlants = PLANTS.filter(p => windows(p, +ymd.slice(0, 4), site.lastFrost, site.firstFrost).some(w => w.kind !== 'indoor' && ymd >= w.start && ymd <= w.end));
  const sowNow = seasonPlants.filter(p => (consensus.mean[PART_TASK[p.part]] ?? 0) > 0.3 && p.soil.good.concat(p.soil.ok).includes(site.soil)).slice(0, 10);

  return (
    <div className="grid">
      <Section wide hero>
        <div className="hero-grid">
          <MoonDisc phase={m.phaseAngle} size={190} lat={site.lat} />
          <div>
            <div className="muted" style={{ fontSize: 13 }}>{fmtYMD(ymd, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {site.name}</div>
            <div className="big" style={{ margin: '2px 0 8px' }}>{phaseName(m)} <span className="muted" style={{ fontSize: 16 }}>· {Math.round(m.illumination * 100)}% lit · day {m.ageDays.toFixed(0)} of 29</span></div>
            <div className="verdict">
              {best.length ? <>Good day to <b>{best.map(label).join(', ')}</b>.</> : <>No strong agreement on favourable work.</>}
              {worst.length ? <> Hold off on <span className="no">{worst.map(label).join(', ')}</span>.</> : null}
            </div>
            {restCount > 0 && <p className="sr" style={{ marginTop: 6 }}>{restCount} of {results.length} traditions call this a rest day{results.filter(r => r.r.blocked).map(r => ` · ${r.t.flag} ${r.r.blocked?.split('—')[0].trim()}`).join('')}.</p>}
            <div className="chips" style={{ marginTop: 10 }}>
              <span className="chip">{m.waxing ? '↑ waxing' : '↓ waning'}</span>
              <span className="chip">{(ctx.hemisphere === 'N' ? m.ascending : !m.ascending) ? '↗ ascending' : '↘ descending'}</span>
              <span className="chip" title="Tropical sign (Russian & American calendars)">{SIGN_GLYPH[m.tropical]} {m.tropical}</span>
              <span className="chip" title="Real constellation (biodynamic & French)">★ {m.sidereal}</span>
              <span className="chip">{ctx.term.term.def.ko} {ctx.term.term.def.zh}</span>
              <span className="chip">음력 {ctx.koLunar.leap ? '윤' : ''}{ctx.koLunar.month}/{ctx.koLunar.day}</span>
              {m.saturnOpposition && <span className="chip good">Moon ☍ Saturn</span>}
              {Math.abs(m.nearestNode.hours) <= 12 && <span className="chip bad">lunar node</span>}
              {m.nearestApsis.kind === 'perigee' && Math.abs(m.nearestApsis.hours) <= 12 && <span className="chip bad">perigee</span>}
            </div>
            <div className="sr" style={{ marginTop: 10 }}>☀ {sun.rise ? fmtTime(sun.rise, site.tz) : '—'}–{sun.set ? fmtTime(sun.set, site.tz) : '—'} · 🌙 rise {rs.rise ? fmtTime(rs.rise, site.tz) : '—'}, set {rs.set ? fmtTime(rs.set, site.tz) : '—'} · next {['new Moon', 'first quarter', 'full Moon', 'last quarter'][quarters[0].quarter]} {fmtDateTime(quarters[0].time, site.tz)}</div>
          </div>
        </div>
      </Section>

      <WeatherStrip fc={fc} err={err} siteName={site.name} ymd={ymd} today={today} site={site} />

      <Section wide title="Garden work" sub={`${results.length} traditions scored · tap a task to see why`}>
        <div className="tasks">
          {TASKS.map(t => {
            const v = consensus.mean[t.id]; const vt = consensus.votes[t.id];
            return (
              <div className="task" key={t.id} onClick={() => setOpen(open === t.id ? null : t.id)} style={{ cursor: 'pointer', borderColor: open === t.id ? 'var(--accent)' : undefined }}>
                <div className="t">{t.icon} {t.short} <span className="muted" style={{ fontWeight: 400 }}>· {scoreWord(v)}</span></div>
                <div className="bar"><i style={{ left: '50%', width: `${Math.abs(v ?? 0) / 2 * 50}%`, transform: (v ?? 0) < 0 ? 'translateX(-100%)' : undefined, background: scoreColor(v) }} /></div>
                <div className="pips" title="One dot per tradition">{results.map(r => <span key={r.t.id} className="pip" title={`${r.t.name}: ${scoreWord(r.r.scores[t.id])}`} style={{ background: scoreColor(r.r.scores[t.id]) }} />)}</div>
                {!beginner && vt && <div className="sr" style={{ marginTop: 4 }}>{vt.pro} for · {vt.con} against</div>}
                {open === t.id && <ul className="notes">{results.map(r => (r.r.reasons[t.id] ?? []).map((why, i) => <li key={r.t.id + i}><b>{r.t.flag}</b> {why}</li>))}</ul>}
              </div>
            );
          })}
        </div>
        {sowNow.length > 0 && <div style={{ marginTop: 12 }} className="row"><span className="muted" style={{ fontSize: 13 }}>In season here and favoured today:</span><div className="chips">{sowNow.map(p => <button className="chip good" key={p.id} onClick={() => setState({ tab: 'plants' })}>{p.name}{p.ko ? ` ${p.ko}` : ''}</button>)}</div></div>}
      </Section>

      <Section wide title="What each tradition says" sub={beginner ? 'Open one to read its reasoning' : 'All rules shown'}>
        {results.map(({ t, r }) => (
          <Acc key={t.id} icon={t.flag} head={t.name} sub={r.headline} open={!beginner}>
            {r.blocked && <div className="tip bad">⛔ {r.blocked}</div>}
            <div className="chips" style={{ margin: '8px 0' }}>
              {TASKS.filter(x => (r.scores[x.id] ?? 0) >= 1).map(x => <span className="chip good" key={x.id}>{x.icon} {x.short}</span>)}
              {TASKS.filter(x => (r.scores[x.id] ?? 0) <= -1).map(x => <span className="chip bad" key={x.id}>{x.icon} {x.short}</span>)}
            </div>
            {r.notes.length > 0 && <ul className="notes">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
            {!beginner && <details style={{ marginTop: 6 }}><summary>Every rule applied</summary><ul className="notes">{TASKS.flatMap(x => (r.reasons[x.id] ?? []).map((why, i) => <li key={x.id + i}><b>{x.short}:</b> {why}</li>))}</ul></details>}
            <details style={{ marginTop: 6 }}><summary>About this tradition</summary><p className="sr">{t.summary}</p><p className="sr"><b>Reads:</b> {t.basis.join(' · ')}</p><p className="sr"><b>Sources:</b> {t.sources.join('; ')}</p></details>
          </Acc>
        ))}
        {results.length === 0 && <p className="muted">No traditions enabled — turn some on under Site &amp; data.</p>}
      </Section>
    </div>
  );
}

function WeatherStrip({ fc, err, siteName, ymd, today, site }: { fc: { f: Forecast; stale: boolean } | null; err: boolean; siteName: string; ymd: string; today: string; site: ReturnType<typeof useSite> }) {
  if (ymd !== today) return null;
  if (!fc) return <Section wide title="Weather" sub={err ? 'Offline — no forecast; everything else works without a connection.' : 'Loading forecast…'}>{!err && <div className="skeleton" style={{ height: 40 }} />}</Section>;
  const f = fc.f; const days = f.days; const low3 = Math.min(...days.slice(0, 3).map(d => d.tmin)); const rain3 = days.slice(0, 3).reduce((a, d) => a + d.rain, 0);
  const soilT = f.soilTempC; const year = +today.slice(0, 4);
  const inWindow = PLANTS.filter(p => windows(p, year, site.lastFrost, site.firstFrost).some(w => w.kind !== 'indoor' && today >= addDays(w.start, -7) && today <= addDays(w.end, 7)));
  const ready = soilT != null ? inWindow.filter(p => soilT >= p.minSoilC) : [];
  const warn: Array<[string, string]> = [];
  if (low3 <= 2) warn.push(['warn', `Frost risk: low of ${low3.toFixed(0)} °C in the next three nights — cover tender crops.`]);
  if (days[0].tmin <= 0) warn.push(['bad', `Hard freeze tonight (${days[0].tmin.toFixed(0)} °C).`]);
  if (rain3 >= 25) warn.push(['warn', `${rain3.toFixed(0)} mm of rain over three days — don't work or sow wet ${site.soil}.`]);
  if (rain3 < 2 && days[0].tmax >= 30) warn.push(['warn', 'Hot and dry: water deeply at dawn.']);
  if (days.some(d => d.windMax >= 45)) warn.push(['warn', `Wind to ${Math.max(...days.map(d => d.windMax)).toFixed(0)} km/h this week — stake tall crops, hold off transplanting.`]);
  const dir = (d: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8];
  return (
    <Section wide title="Weather" sub={<>{siteName} · Open-Meteo{fc.stale ? ` · cached ${Math.round((Date.now() - new Date(f.fetchedAt).getTime()) / 3_600_000)} h ago` : ''}</>}>
      <div className="row">
        <Stat value={`${Math.round(days[0].tmin)}–${Math.round(days[0].tmax)}°`} label="today, °C" />
        {soilT != null && <Stat value={`${soilT.toFixed(0)}°`} label="soil at 6 cm" />}
        {f.soilMoisture != null && <Stat value={`${(f.soilMoisture * 100).toFixed(0)}%`} label="soil moisture" />}
        <Stat value={`${rain3.toFixed(0)} mm`} label="rain, 3 days" />
        <Stat value={dir(days[0].windDir)} label={`wind, ${days[0].windMax.toFixed(0)} km/h max`} />
      </div>
      {warn.map(([lvl, w], i) => <div key={i} className={`tip ${lvl}`}>{w}</div>)}
      <div className="chips" style={{ marginTop: 10 }}>{days.map(d => <span key={d.date} className="chip" title={`wind ${dir(d.windDir)} ${d.windMax} km/h`}>{fmtYMD(d.date, { weekday: 'short' })} {Math.round(d.tmin)}–{Math.round(d.tmax)}°{d.rain >= 1 ? ` 🌧${d.rain.toFixed(0)}` : ''}{d.tmin <= 2 ? ' ❄' : ''}</span>)}</div>
      {soilT != null && <p className="sr" style={{ marginTop: 8 }}>At {soilT.toFixed(0)} °C the soil will germinate {ready.length ? ready.map(p => p.name).join(', ') : 'nothing that is in its window'}.</p>}
    </Section>
  );
}
