import React, { Suspense } from 'react';
import { setState, useSettings, useSite } from './state/store';
import Today from './ui/Today';
import Calendar from './ui/Calendar';
import Sky from './ui/Sky';
import Plants from './ui/Plants';
import Garden from './ui/Garden';
import Tools from './ui/Tools';
import Site from './ui/Site';

const TABS: Array<[string, string]> = [['today', 'Today'], ['calendar', 'Calendar'], ['sky', 'Sky'], ['plants', 'Plants'], ['garden', 'Garden'], ['tools', 'Tools'], ['site', 'Site & data']];

export default function App() {
  const s = useSettings();
  const site = useSite();
  const tab = s.tab ?? 'today';
  return (
    <div className="app">
      <header className="top">
        <span style={{ fontSize: 22 }}>🌙</span>
        <h1>Phlant</h1>
        <div className="site">
          <select value={s.siteId} onChange={e => setState({ siteId: e.target.value })} style={{ width: 'auto' }} aria-label="Site">
            {s.sites.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <button className="ghost" title="Beginner mode shows plain-language guidance; expert mode shows every rule." onClick={() => setState({ mode: s.mode === 'beginner' ? 'expert' : 'beginner' })}>{s.mode === 'beginner' ? '🌱 beginner' : '🔬 expert'}</button>
        </div>
      </header>
      <nav className="tabs" aria-label="Sections">
        {TABS.map(([id, label]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setState({ tab: id })}>{label}</button>)}
      </nav>
      <main key={site.id}>
        <Suspense fallback={<div className="muted">Loading…</div>}>
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
  );
}
