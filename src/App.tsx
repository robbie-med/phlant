import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { setState, useSettings, useSite } from './state/store';
import Today from './ui/Today';
import Calendar from './ui/Calendar';
import Sky from './ui/Sky';
import Plants from './ui/Plants';
import Garden from './ui/Garden';
import Tools from './ui/Tools';
import Site from './ui/Site';
import Onboarding from './ui/Onboarding';
import { MoonDisc, phaseName, todayYmd, fmtYMD } from './ui/common';
import { Sheet } from './ui/kit';
import { moonState } from './astro/moon';
import { addDays, noonAtOffset, tzOffsetHours } from './astro/dates';
import * as A from 'astronomy-engine';

const NAV: Array<{ id: string; label: string; ic: string; mobile?: boolean }> = [
  { id: 'today', label: 'Today', ic: '🌙', mobile: true },
  { id: 'calendar', label: 'Calendar', ic: '📅', mobile: true },
  { id: 'garden', label: 'Garden', ic: '🪴', mobile: true },
  { id: 'plants', label: 'Plants', ic: '🥬', mobile: true },
  { id: 'sky', label: 'Sky', ic: '✨' },
  { id: 'tools', label: 'Tools', ic: '🧮' },
  { id: 'site', label: 'Site & data', ic: '📍' }
];

export default function App() {
  const s = useSettings();
  const site = useSite();
  const tab = s.tab ?? 'today';
  const [more, setMore] = useState(false);
  const today = todayYmd(site.tz);
  const date = s.selectedDate ?? today;
  const off = tzOffsetHours(site.tz, noonAtOffset(date, 0));
  const moon = useMemo(() => moonState(noonAtOffset(date, off), new A.Observer(site.lat, site.lon, site.elevationM)), [date, off, site]);
  useEffect(() => { document.documentElement.dataset.theme = s.theme && s.theme !== 'auto' ? s.theme : ''; }, [s.theme]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab]);
  if (!s.onboarded && s.sites.length <= 1 && s.sites[0]?.id === 'tulsa' && !localStorage.getItem('phlant:skipOnb')) {
    return <Onboarding onDone={() => setState({ onboarded: true })} />;
  }
  const go = (id: string) => { setState({ tab: id }); setMore(false); };
  const NavLink = ({ n }: { n: typeof NAV[number] }) => <a className={tab === n.id ? 'on' : ''} onClick={() => go(n.id)} role="link" tabIndex={0} onKeyDown={e => e.key === 'Enter' && go(n.id)}><span className="ic">{n.ic}</span>{n.label}</a>;
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><div className="logo">🌙</div><div><b>Phlant</b></div></div>
        <nav className="nav">{NAV.map(n => <NavLink key={n.id} n={n} />)}</nav>
        <div className="foot">
          <select value={s.siteId} onChange={e => setState({ siteId: e.target.value })} aria-label="Site">{s.sites.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <div className="seg" style={{ alignSelf: 'stretch' }}><button className={s.mode === 'beginner' ? 'on' : ''} onClick={() => setState({ mode: 'beginner' })}>Simple</button><button className={s.mode === 'expert' ? 'on' : ''} onClick={() => setState({ mode: 'expert' })}>Detailed</button></div>
          <div className="seg" style={{ alignSelf: 'stretch' }}>{(['auto', 'light', 'dark'] as const).map(t => <button key={t} className={(s.theme ?? 'auto') === t ? 'on' : ''} onClick={() => setState({ theme: t })}>{t === 'auto' ? '◐' : t === 'light' ? '☀' : '☾'}</button>)}</div>
        </div>
      </aside>
      <div className="content">
        <header className="top">
          <div className="topbar">
            <div className="datebar">
              <button className="ghost" aria-label="Previous day" onClick={() => setState({ selectedDate: addDays(date, -1) })}>‹</button>
              <div className="d">{fmtYMD(date, { weekday: 'short', month: 'short', day: 'numeric' })}{date.slice(0, 4) !== today.slice(0, 4) ? ` ${date.slice(0, 4)}` : ''}</div>
              <button className="ghost" aria-label="Next day" onClick={() => setState({ selectedDate: addDays(date, 1) })}>›</button>
              {date !== today && <button onClick={() => setState({ selectedDate: undefined })}>Today</button>}
              <input type="date" value={date} onChange={e => e.target.value && setState({ selectedDate: e.target.value === today ? undefined : e.target.value })} aria-label="Pick a date" style={{ width: 'auto', minHeight: 36, padding: '4px 8px' }} />
            </div>
            <div className="moonpill" title="Moon on the selected date" onClick={() => go('sky')} style={{ cursor: 'pointer' }}><MoonDisc phase={moon.phaseAngle} size={28} lat={site.lat} /><span>{phaseName(moon)} · {Math.round(moon.illumination * 100)}%</span></div>
            <div className="spacer" />
            <span className="sr" style={{ display: 'none' }}>{site.name}</span>
          </div>
        </header>
        <main key={site.id}>
          <Suspense fallback={<div className="skeleton" style={{ height: 120 }} />}>
            {tab === 'today' && <Today />}
            {tab === 'calendar' && <Calendar />}
            {tab === 'sky' && <Sky />}
            {tab === 'plants' && <Plants />}
            {tab === 'garden' && <Garden />}
            {tab === 'tools' && <Tools />}
            {tab === 'site' && <Site />}
          </Suspense>
        </main>
      </div>
      <nav className="bottomnav" aria-label="Sections">
        {NAV.filter(n => n.mobile).map(n => <a key={n.id} className={tab === n.id ? 'on' : ''} onClick={() => go(n.id)}><span className="ic">{n.ic}</span>{n.label}</a>)}
        <a className={['sky', 'tools', 'site'].includes(tab) ? 'on' : ''} onClick={() => setMore(true)}><span className="ic">⋯</span>More</a>
      </nav>
      {more && <Sheet onClose={() => setMore(false)}>
        <h3>More</h3>
        <div className="nav">{NAV.filter(n => !n.mobile).map(n => <NavLink key={n.id} n={n} />)}</div>
        <div className="row" style={{ marginTop: 12 }}>
          <select value={s.siteId} onChange={e => setState({ siteId: e.target.value })} aria-label="Site" style={{ width: 'auto', flex: 1 }}>{s.sites.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <div className="seg"><button className={s.mode === 'beginner' ? 'on' : ''} onClick={() => setState({ mode: 'beginner' })}>Simple</button><button className={s.mode === 'expert' ? 'on' : ''} onClick={() => setState({ mode: 'expert' })}>Detailed</button></div>
          <div className="seg">{(['auto', 'light', 'dark'] as const).map(t => <button key={t} className={(s.theme ?? 'auto') === t ? 'on' : ''} onClick={() => setState({ theme: t })}>{t === 'auto' ? '◐' : t === 'light' ? '☀' : '☾'}</button>)}</div>
        </div>
      </Sheet>}
    </div>
  );
}
