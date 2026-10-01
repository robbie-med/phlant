import React, { useEffect, useRef, useState } from 'react';
import { newSiteId, setState, updateSite, useSettings, useSite, type SiteConfig, TULSA } from '../state/store';
import { TRADITIONS, DEFAULT_ENABLED } from '../traditions';
import { CLIMATES, SOIL_INFO, type SoilType } from '../data/plants';
import { geocode, fetchForecast, climatePreset, type Forecast } from '../services/climate';
import { buildSitePack, deletePack, exportPacks, loadAllPacks, loadPack, savePack, type SitePack } from '../services/sitepack';
import { fetchLatest, type Reading } from '../services/water';
import { fmtMD, Toast } from './common';
import { WindHeatmap, WindRose, isClimatology } from './WindRose';
import { parseCoords } from '../services/soil';
import { Section } from './kit';
const SiteMap = React.lazy(() => import('./SiteMap'));

const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const degToDir = (d: number) => DIRS[Math.round(((d % 360) + 360) % 360 / 22.5) % 16];

export default function Site() {
  const s = useSettings(); const site = useSite();
  const [pack, setPack] = useState<SitePack | undefined>();
  const [packs, setPacks] = useState<SitePack[]>([]);
  const [progress, setProgress] = useState<{ step: string; done: number; total: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState(''); const [hits, setHits] = useState<Awaited<ReturnType<typeof geocode>>>([]);
  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [coordText, setCoordText] = useState('');
  const [acres, setAcres] = useState(() => { try { return +(localStorage.getItem('phlant:acres') || 7); } catch { return 7; } });
  const inUS = site.lat > 17 && site.lat < 72 && site.lon > -180 && site.lon < -64;
  const applyCoords = () => { const c = parseCoords(coordText); if (!c) return say('Could not read those coordinates. Try "36.15, -95.99" or 36°09\'N 95°59\'W.'); set({ lat: c.lat, lon: c.lon }); setCoordText(''); say(`Pin moved to ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}. Re-download the pack to refresh soil, frost and wind.`); };
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };
  const refresh = async () => { setPack(await loadPack(site.id)); setPacks(await loadAllPacks()); };
  useEffect(() => { refresh(); setReadings(null); setForecast(null); }, [site.id]);

  const applyPack = (p: SitePack, target: SiteConfig) => {
    const patch: Partial<SiteConfig> = {};
    if (p.elevationM != null) patch.elevationM = Math.round(p.elevationM);
    if (p.climate) { patch.lastFrost = p.climate.lastSpring.p90; patch.firstFrost = p.climate.firstFall.median; patch.climateId = climatePreset(p.climate, target.lat); } // safe spring date (frost-free in 90 % of years), average autumn date
    if (p.wind) patch.windDeg = p.wind.growingSeasonDominantDeg;
    if (p.soil?.summary.clay != null) { patch.soil = p.soil.summary.type; if (p.soil.summary.ph) patch.soilPh = p.soil.summary.ph; }
    updateSite(target.id, patch);
  };
  const download = async (target: SiteConfig, quiet = false) => {
    setProgress({ step: 'Starting…', done: 0, total: 5 });
    const p = await buildSitePack(target.id, target.lat, target.lon, (step, done, total) => setProgress({ step, done, total }));
    await savePack(p); applyPack(p, target); await refresh(); setProgress(null);
    if (!quiet) say(p.errors.length ? `Saved with ${p.errors.length} warning(s) — see below` : `Site pack saved for ${target.name}. Frost dates, soil and wind applied.`);
    return p;
  };
  const downloadAll = async () => { for (const x of s.sites) await download(x, true); say(`Downloaded ${s.sites.length} site packs. The app now works offline for all of them.`); };
  const addSite = (name: string, lat: number, lon: number, tz: string, elev?: number) => {
    const id = newSiteId();
    const ns: SiteConfig = { ...TULSA, id, name, lat, lon, tz, elevationM: Math.round(elev ?? 200), beds: [], soil: 'loam', soilPh: undefined, climateId: 'humid_continental', lastFrost: lat < 0 ? '10-15' : '05-01', firstFrost: lat < 0 ? '04-15' : '10-10' };
    setState(st => ({ sites: [...st.sites, ns], siteId: id })); setHits([]); setQ('');
    say(`Added ${name}. Download its site pack to get real frost dates, soil and wind.`);
  };
  const search = async () => { try { setHits(await geocode(q)); } catch { say('Search needs a network connection.'); } };
  const locate = () => { if (!navigator.geolocation) return say('No geolocation available.'); navigator.geolocation.getCurrentPosition(pos => { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; addSite(`My location (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`, +pos.coords.latitude.toFixed(4), +pos.coords.longitude.toFixed(4), tz, pos.coords.altitude ?? undefined); }, () => say('Location permission denied.')); };
  const removeSite = async () => { if (s.sites.length < 2) return say('Keep at least one site.'); if (!confirm(`Delete site "${site.name}" and its downloaded data?`)) return; await deletePack(site.id); setState(st => { const sites = st.sites.filter(x => x.id !== site.id); return { sites, siteId: sites[0].id }; }); };
  const importFile = async (f: File) => { try { const j = JSON.parse(await f.text()); if (j.phlant !== 1) throw new Error(); for (const p of j.packs as SitePack[]) await savePack(p); const incoming = (j.sites as SiteConfig[]).filter(x => !s.sites.some(y => y.id === x.id)); setState(st => ({ sites: [...st.sites, ...incoming] })); await refresh(); say(`Imported ${j.packs.length} packs, ${incoming.length} new sites.`); } catch { say('Not a Phlant export file.'); } };
  const live = async () => { try { setReadings(await fetchLatest(site.lat, site.lon)); } catch { say('USGS live readings need a network connection.'); } };
  const fc = async () => { try { setForecast(await fetchForecast(site.lat, site.lon)); } catch { say('Forecast needs a network connection.'); } };
  const set = (patch: Partial<SiteConfig>) => updateSite(site.id, patch);
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="f"><span>{label}</span>{children}</label>;

  return (
    <div className="grid">
      <Toast msg={toast} />
      <div className="card wide">
        <h2>Sites <small>{s.sites.length} saved · each one keeps its own offline data pack</small></h2>
        <div className="row">
          <div className="chips">{s.sites.map(x => <button key={x.id} className={`chip ${x.id === s.siteId ? 'on' : ''}`} onClick={() => setState({ siteId: x.id })}>{x.name}{packs.some(p => p.siteId === x.id) ? ' ✓' : ''}</button>)}</div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <input placeholder="Add a place: Rapid City SD · Burlington VT · Cheyenne · Seoul…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} style={{ maxWidth: 420 }} />
          <button onClick={search}>Search</button>
          <button onClick={locate}>📍 Use my location</button>
          <button className="primary" onClick={downloadAll} disabled={!!progress}>⬇ Download data for all sites</button>
          <button onClick={async () => exportPacks(await loadAllPacks(), s.sites)}>Export file</button>
          <button onClick={() => fileRef.current?.click()}>Import file</button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && importFile(e.target.files[0])} />
        </div>
        {hits.length > 0 && <div className="chips" style={{ marginTop: 8 }}>{hits.map((h, i) => <button key={i} className="chip" onClick={() => addSite(`${h.name}${h.admin1 ? ', ' + h.admin1 : ''}`, h.lat, h.lon, h.tz, h.elevationM)}>{h.name}, {h.admin1} · {h.country} ({h.lat.toFixed(2)}, {h.lon.toFixed(2)})</button>)}</div>}
        <p className="sr" style={{ marginTop: 8 }}>✓ = data downloaded. A site pack holds the soil survey, nearby gauges, ten years of temperature history boiled down to frost dates and zone, prevailing wind and elevation (about 50–200 KB). The sky is computed on-device, so after download the app needs no network. Only live river readings and the 7-day forecast fetch again.</p>
      </div>

      <Section wide title="Where exactly" sub="Click the map, drag the pin, or paste coordinates. The soil survey is drawn for the square around the pin.">
        <div className="row" style={{ marginBottom: 8 }}>
          <input placeholder='Paste coordinates: 36.1511, -95.9926  or  36°09′04″N 95°59′33″W' value={coordText} onChange={e => setCoordText(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyCoords()} style={{ maxWidth: 420 }} />
          <button onClick={applyCoords}>Set pin</button>
          <span className="sr">Pin: {site.lat.toFixed(5)}, {site.lon.toFixed(5)} · <a href={`https://www.openstreetmap.org/?mlat=${site.lat}&mlon=${site.lon}#map=17/${site.lat}/${site.lon}`} target="_blank" rel="noreferrer">open in OSM</a></span>
        </div>
        <React.Suspense fallback={<div className="skeleton" style={{ height: 420 }} />}>
          <SiteMap lat={site.lat} lon={site.lon} acres={acres} inUS={inUS} onAcres={a => { setAcres(a); try { localStorage.setItem('phlant:acres', String(a)); } catch { /* */ } }} onMove={(la, lo) => set({ lat: la, lon: lo })} />
        </React.Suspense>
      </Section>

      <div className="card wide">
        <h2>{site.name} <small>site settings — the data pack fills most of these; edit anything you know better</small></h2>
        <div className="three">
          <F label="Name"><input value={site.name} onChange={e => set({ name: e.target.value })} /></F>
          <F label="Time zone"><input value={site.tz} onChange={e => set({ tz: e.target.value })} /></F>
          <F label="Latitude"><input type="number" step="0.0001" value={site.lat} onChange={e => set({ lat: +e.target.value })} /></F>
          <F label="Longitude"><input type="number" step="0.0001" value={site.lon} onChange={e => set({ lon: +e.target.value })} /></F>
          <F label="Elevation (m)"><input type="number" value={site.elevationM} onChange={e => set({ elevationM: +e.target.value })} /></F>
          <F label="Climate"><select value={site.climateId} onChange={e => set({ climateId: e.target.value })}>{CLIMATES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
          <F label="Average last spring frost (MM-DD)"><input value={site.lastFrost} onChange={e => set({ lastFrost: e.target.value })} /></F>
          <F label="Average first autumn frost (MM-DD)"><input value={site.firstFrost} onChange={e => set({ firstFrost: e.target.value })} /></F>
          <F label="Soil type"><select value={site.soil} onChange={e => set({ soil: e.target.value as SoilType })}>{Object.entries(SOIL_INFO).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></F>
          <F label="Soil pH"><input type="number" step="0.1" value={site.soilPh ?? ''} onChange={e => set({ soilPh: e.target.value ? +e.target.value : undefined })} /></F>
          <F label={`Prevailing wind from (${degToDir(site.windDeg)})`}><input type="range" min={0} max={359} value={site.windDeg} onChange={e => set({ windDeg: +e.target.value })} /></F>
          <F label="House side (legacy — place real casters on the Garden page)"><select value={site.shadeSide} onChange={e => set({ shadeSide: e.target.value as any })}>{['none', 'N', 'S', 'E', 'W'].map(x => <option key={x}>{x}</option>)}</select></F>
          <F label={`Garden width (${site.units}) east–west`}><input type="number" value={+(site.units === 'ft' ? site.widthM / 0.3048 : site.widthM).toFixed(1)} onChange={e => set({ widthM: site.units === 'ft' ? +e.target.value * 0.3048 : +e.target.value })} /></F>
          <F label={`Garden depth (${site.units}) north–south`}><input type="number" value={+(site.units === 'ft' ? site.depthM / 0.3048 : site.depthM).toFixed(1)} onChange={e => set({ depthM: site.units === 'ft' ? +e.target.value * 0.3048 : +e.target.value })} /></F>
          <F label="Units"><select value={site.units} onChange={e => set({ units: e.target.value as any })}><option value="ft">feet</option><option value="m">metres</option></select></F>
          <F label="Slope"><div className="row"><select value={site.slope} onChange={e => set({ slope: e.target.value as any })}>{['flat', 'gentle', 'steep'].map(x => <option key={x}>{x}</option>)}</select><select value={site.slopeFacing} onChange={e => set({ slopeFacing: e.target.value as any })}>{['N', 'S', 'E', 'W'].map(x => <option key={x}>facing {x}</option>)}</select></div></F>
        </div>
        <div className="tip">{CLIMATES.find(c => c.id === site.climateId)?.hint} {SOIL_INFO[site.soil].tips[0]}</div>
        <div className="row" style={{ marginTop: 8 }}><button onClick={removeSite} style={{ color: 'var(--bad)' }}>Delete site</button></div>
      </div>

      <div className="card wide">
        <h2>Offline data pack <small>{pack ? `built ${new Date(pack.builtAt).toLocaleString()}` : 'not downloaded yet'}</small></h2>
        {progress && <div><div className="sr">{progress.step}</div><div className="progress"><i style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div></div>}
        <div className="row" style={{ margin: '8px 0' }}>
          <button className="primary" onClick={() => download(site)} disabled={!!progress}>⬇ {pack ? 'Refresh' : 'Download'} data for {site.name}</button>
          {pack && <button onClick={() => applyPack(pack, site)}>Re-apply pack to settings</button>}
        </div>
        {pack?.errors.length ? <ul className="notes" style={{ color: 'var(--warn)' }}>{pack.errors.map((e, i) => <li key={i}>{e}</li>)}</ul> : null}
        {pack?.climate && (
          <div>
            <h3>Climate <small>{pack.climate.source}</small></h3>
            <table className="t"><tbody>
              <tr><th>Hardiness zone</th><td>{pack.climate.hardinessZone} (mean annual low {pack.climate.minTempMeanC} °C)</td></tr>
              <tr><th>Last spring frost (≤ {pack.climate.thresholdC} °C)</th><td>median {fmtMD(pack.climate.lastSpring.median)} · <b>safe date {fmtMD(pack.climate.lastSpring.p90)}</b> (frost-free after it in 9 years of 10, applied as your last frost) · earliest {fmtMD(pack.climate.lastSpring.p10)}</td></tr>
              <tr><th>First autumn frost</th><td><b>median {fmtMD(pack.climate.firstFall.median)}</b> (applied) · one year in ten by {fmtMD(pack.climate.firstFall.p10)}</td></tr>
              <tr><th>Frost-free season</th><td>{pack.climate.frostFreeDays} days · {pack.climate.gdd10} growing degree-days (base 10 °C) · hottest week averages {pack.climate.hottestWeekMaxC} °C</td></tr>
            </tbody></table>
            <svg viewBox="0 0 360 90" width="100%" style={{ marginTop: 6 }} aria-label="Monthly temperature and rain">
              {pack.climate.monthlyMax.map((mx, i) => { const mn = pack.climate!.monthlyMin[i]; const y = (t: number) => 70 - (t + 15) * 1.2; return <g key={i}><rect x={i * 30 + 6} y={y(mx)} width={18} height={Math.max(1, y(mn) - y(mx))} rx={4} fill="var(--accent)" opacity={.8} /><rect x={i * 30 + 10} y={80 - Math.min(40, pack.climate!.monthlyRain[i] / 4)} width={10} height={Math.min(40, pack.climate!.monthlyRain[i] / 4)} fill="#5aa0d9" opacity={.6} /><text x={i * 30 + 15} y={88} fontSize={8} textAnchor="middle" fill="var(--muted)">{'JFMAMJJASOND'[i]}</text></g>; })}
              <line x1={0} x2={360} y1={70 - 15 * 1.2} y2={70 - 15 * 1.2} stroke="var(--line)" strokeDasharray="3 3" /><text x={2} y={70 - 15 * 1.2 - 2} fontSize={8} fill="var(--muted)">0 °C</text>
            </svg>
            <details><summary>Frost dates by year</summary><table className="t"><thead><tr><th>Year</th><th>Last spring</th><th>First autumn</th></tr></thead><tbody>{Object.keys(pack.climate.lastSpring.perYear).map(y => <tr key={y}><td>{y}</td><td>{pack.climate!.lastSpring.perYear[y] ? fmtMD(pack.climate!.lastSpring.perYear[y]!) : '—'}</td><td>{pack.climate!.firstFall.perYear[y] ? fmtMD(pack.climate!.firstFall.perYear[y]!) : '—'}</td></tr>)}</tbody></table></details>
          </div>
        )}
        {pack?.wind && (isClimatology(pack.wind) ? <div>
          <h3>Wind <small>{pack.wind.source} · {degToDir(pack.wind.dominantDeg)} year-round, {degToDir(pack.wind.growingSeasonDominantDeg)} in the growing season</small></h3>
          <div className="row" style={{ alignItems: 'flex-start' }}><WindRose wind={pack.wind} size={170} title="all year, north up" /><div style={{ flex: 1, minWidth: 260 }}><WindHeatmap wind={pack.wind} highlightMonth={new Date().getMonth()} /></div></div>
          <p className="sr">Each row is a month, each column a compass direction; darker = more of that month's wind energy from that direction. The Garden page picks the row for the date you are planning.</p>
        </div> : <p className="sr">Prevailing wind: {degToDir(pack.wind.dominantDeg)} year-round, {degToDir(pack.wind.growingSeasonDominantDeg)} in the growing season. Refresh the pack to get the month-by-direction rose.</p>)}
        {pack?.soil && (
          <div>
            <h3>Soil <small>{pack.soil.source}</small></h3>
            <p className="sr">{pack.soil.summary.label}{pack.soil.summary.ph ? ` · pH ${pack.soil.summary.ph}` : ''}{pack.soil.summary.clay != null ? ` · ${pack.soil.summary.sand}% sand / ${pack.soil.summary.silt}% silt / ${pack.soil.summary.clay}% clay` : ''}</p>
            <details><summary>Soil components and horizons ({pack.soil.components.length})</summary>
              {pack.soil.components.map((c, i) => <div key={i} style={{ marginTop: 6 }}><b>{c.name}</b> {c.percent}% of “{c.mapUnit}” {c.drainage ? `· ${c.drainage}` : ''} {c.order ? `· ${c.order}` : ''} {c.slope != null ? `· slope ${c.slope}%` : ''} {c.capability ? `· capability class ${c.capability}` : ''}
                {c.horizons.length > 0 && <table className="t"><thead><tr><th>Horizon</th><th>Depth cm</th><th>Sand/Silt/Clay %</th><th>pH</th><th>OM %</th><th>Texture</th></tr></thead><tbody>{c.horizons.map((h, j) => <tr key={j}><td>{h.name}</td><td>{h.topCm}–{h.bottomCm}</td><td>{h.sand ?? '–'}/{h.silt ?? '–'}/{h.clay ?? '–'}</td><td>{h.ph ?? '–'}</td><td>{h.om ?? '–'}</td><td>{h.texture ?? ''}</td></tr>)}</tbody></table>}
              </div>)}
            </details>
          </div>
        )}
        {pack?.gauges && (
          <div>
            <h3>Water <small>{pack.gauges.length} USGS gauges within 25 km</small></h3>
            <div className="row"><button onClick={live}>Fetch live readings</button><button onClick={fc}>7-day forecast + soil temperature</button></div>
            {forecast && <p className="sr">Soil at 6 cm now {forecast.soilTempC?.toFixed(1)} °C · moisture {forecast.soilMoisture?.toFixed(2)} m³/m³ · {forecast.days.map(d => `${d.date.slice(5)}: ${Math.round(d.tmin)}–${Math.round(d.tmax)}° ${d.rain}mm ${degToDir(d.windDir)}`).join(' · ')}</p>}
            <details open={!!readings}><summary>Nearest gauges</summary><table className="t"><tbody>{pack.gauges.slice(0, 12).map(g => <tr key={g.id}><td>{g.name}</td><td>{g.distanceKm.toFixed(1)} km</td><td>{readings?.filter(r => r.gaugeId === g.id).map(r => `${r.label} ${r.value} ${r.unit}`).join(' · ')}</td></tr>)}</tbody></table></details>
          </div>
        )}
      </div>

      <div className="card wide">
        <h2>Traditions to compare <small>{s.enabled.length} on</small></h2>
        <div className="grid">
          {TRADITIONS.map(t => <label key={t.id} className="task" style={{ cursor: 'pointer' }}><div className="row"><input type="checkbox" style={{ width: 'auto' }} checked={s.enabled.includes(t.id)} onChange={e => setState(st => ({ enabled: e.target.checked ? [...st.enabled, t.id] : st.enabled.filter(x => x !== t.id) }))} /><b>{t.flag} {t.name}</b></div><div className="sr" style={{ marginTop: 4 }}>{t.summary}</div></label>)}
        </div>
        <div className="row" style={{ marginTop: 8 }}><button onClick={() => setState({ enabled: [...DEFAULT_ENABLED] })}>Reset to default set</button><button onClick={() => setState({ enabled: TRADITIONS.map(t => t.id) })}>All</button></div>
      </div>
    </div>
  );
}
