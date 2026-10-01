import React, { useState } from 'react';
import { newSiteId, setState, TULSA, type SiteConfig } from '../state/store';
import { geocode } from '../services/climate';
import { buildSitePack, savePack } from '../services/sitepack';
import { climatePreset } from '../services/climate';
import { TRADITIONS } from '../traditions';
import { MoonDisc } from './common';

const PRESETS: Array<{ name: string; desc: string; ids: string[] }> = [
  { name: 'Everything', desc: 'All seven traditions side by side (recommended to start).', ids: ['korean', 'chinese_north', 'biodynamic', 'french', 'english', 'russian', 'almanac'] },
  { name: 'American & English', desc: 'Old Farmer\'s Almanac, the Signs, and cottage lore.', ids: ['almanac', 'english'] },
  { name: 'Korean & Chinese', desc: 'Solar terms, lunisolar festivals, day officers.', ids: ['korean', 'chinese_north', 'chinese_jiangnan'] },
  { name: 'European lunar', desc: 'Biodynamic, French and Russian calendars.', ids: ['biodynamic', 'french', 'russian'] }
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [q, setQ] = useState(''); const [hits, setHits] = useState<Awaited<ReturnType<typeof geocode>>>([]);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [preset, setPreset] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const choose = (name: string, lat: number, lon: number, tz: string, elev?: number) => { setSite({ ...TULSA, id: newSiteId(), name, lat, lon, tz, elevationM: Math.round(elev ?? 200), beds: [], features: [], soil: 'loam', soilPh: undefined, lastFrost: lat < 0 ? '10-15' : '05-01', firstFrost: lat < 0 ? '04-15' : '10-10' }); setStep(1); };
  const search = async () => { try { setErr(null); setHits(await geocode(q)); } catch { setErr('Search needs a network connection. You can skip and use the example site.'); } };
  const locate = () => { if (!navigator.geolocation) return setErr('No geolocation on this device.'); navigator.geolocation.getCurrentPosition(p => choose(`My garden (${p.coords.latitude.toFixed(2)}, ${p.coords.longitude.toFixed(2)})`, +p.coords.latitude.toFixed(4), +p.coords.longitude.toFixed(4), Intl.DateTimeFormat().resolvedOptions().timeZone, p.coords.altitude ?? undefined), () => setErr('Location permission denied — search by name instead.')); };
  const download = async () => {
    if (!site) return;
    setProgress('Starting…');
    const pack = await buildSitePack(site.id, site.lat, site.lon, (st, d, t) => setProgress(`${st} (${d + 1}/${t})`));
    await savePack(pack);
    const patch: Partial<SiteConfig> = {};
    if (pack.elevationM != null) patch.elevationM = Math.round(pack.elevationM);
    if (pack.climate) { patch.lastFrost = pack.climate.lastSpring.p90; patch.firstFrost = pack.climate.firstFall.median; patch.climateId = climatePreset(pack.climate, site.lat); }
    if (pack.wind) patch.windDeg = pack.wind.growingSeasonDominantDeg;
    if (pack.soil?.summary.clay != null) { patch.soil = pack.soil.summary.type; if (pack.soil.summary.ph) patch.soilPh = pack.soil.summary.ph; }
    setSite({ ...site, ...patch }); setProgress(null); setStep(2);
  };
  const finish = () => {
    const chosen = site ?? TULSA;
    setState(st => ({ sites: site ? [site, ...st.sites.filter(x => x.id !== 'tulsa' || st.sites.length > 1 ? true : false)] : st.sites, siteId: chosen.id, enabled: PRESETS[preset].ids, mode: 'beginner', onboarded: true }));
    onDone();
  };
  const skip = () => { localStorage.setItem('phlant:skipOnb', '1'); setState({ onboarded: true }); onDone(); };
  return (
    <div className="shell" style={{ display: 'block' }}>
      <main className="onb">
        <div className="row" style={{ justifyContent: 'center', marginBottom: 12 }}><MoonDisc phase={240} size={56} /><div><b className="display" style={{ fontSize: 30 }}>Phlant</b><div className="muted">Seven planting traditions, one sky, your soil.</div></div></div>
        <div className="steps">{[0, 1, 2].map(i => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        {step === 0 && <section className="card">
          <h2>Where is your garden?</h2>
          <p className="muted">Everything is computed for your spot on Earth: the Moon's rise, the solar terms, frost dates, soil survey, wind. Nothing you enter leaves your device except the coordinates sent to the public data services.</p>
          <div className="row" style={{ marginTop: 10 }}><input placeholder="Town or city — e.g. Rapid City, Burlington VT, Seoul" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} /><button className="primary" onClick={search}>Search</button></div>
          <div className="row" style={{ marginTop: 8 }}><button onClick={locate}>📍 Use my location</button><button className="ghost" onClick={() => { setSite(null); setStep(2); }}>Skip — use the Tulsa example</button></div>
          {err && <p className="tip warn">{err}</p>}
          {hits.length > 0 && <div className="chips" style={{ marginTop: 10 }}>{hits.map((h, i) => <button key={i} className="chip" onClick={() => choose(`${h.name}${h.admin1 ? ', ' + h.admin1 : ''}`, h.lat, h.lon, h.tz, h.elevationM)}>{h.name}, {h.admin1} · {h.country}</button>)}</div>}
        </section>}
        {step === 1 && site && <section className="card">
          <h2>Download the data for {site.name}</h2>
          <p className="muted">One download, then the app works offline: ten years of temperature history → your frost dates and hardiness zone; three years of hourly wind → a wind rose by month; the soil survey at your coordinates; nearby stream gauges; elevation. About 100–300 KB.</p>
          {progress ? <div style={{ marginTop: 10 }}><div className="sr">{progress}</div><div className="progress"><i style={{ width: '60%' }} /></div></div> : <div className="row" style={{ marginTop: 10 }}><button className="primary" onClick={download}>⬇ Download now</button><button className="ghost" onClick={() => setStep(2)}>Later</button></div>}
        </section>}
        {step === 2 && <section className="card">
          <h2>Which traditions do you want to compare?</h2>
          <p className="muted">You can change this any time. Each one is a rule engine over the real sky — the app shows where they agree.</p>
          <div className="grid" style={{ marginTop: 10 }}>{PRESETS.map((p, i) => <button key={p.name} className={`task ${preset === i ? 'on' : ''}`} style={{ textAlign: 'left', borderColor: preset === i ? 'var(--accent)' : undefined }} onClick={() => setPreset(i)}><b>{p.name}</b><div className="sr">{p.desc}</div><div className="chips" style={{ marginTop: 6 }}>{p.ids.map(id => <span key={id} className="chip">{TRADITIONS.find(t => t.id === id)?.flag}</span>)}</div></button>)}</div>
          <div className="row" style={{ marginTop: 14 }}><button className="primary" onClick={finish}>Start</button><button className="ghost" onClick={skip}>Skip setup</button></div>
        </section>}
      </main>
    </div>
  );
}
