import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { acreBox, fetchSoilMap, type SoilMap } from '../services/soil';
import { SOIL_INFO } from '../data/plants';

const PALETTE = ['#8fc27a', '#e9d8a6', '#7fb3e6', '#e3b35d', '#c58ad0', '#e07a6a', '#6ecfc0', '#d9a07a', '#a3b86c', '#b8a1e0'];

interface Props { lat: number; lon: number; onMove: (lat: number, lon: number) => void; acres: number; onAcres: (a: number) => void; inUS: boolean; }

export default function SiteMap({ lat, lon, onMove, acres, onAcres, inUS }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const box = useRef<L.Rectangle | null>(null);
  const soilLayer = useRef<L.LayerGroup | null>(null);
  const wms = useRef<L.TileLayer.WMS | null>(null);
  const [soil, setSoil] = useState<SoilMap | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [showLines, setShowLines] = useState(true);

  useEffect(() => {
    const el = ref.current; if (!el || map.current) return;
    const m = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([lat, lon], 16);
    // page scrolls by default; wheel-zoom only after the map is clicked
    m.on('click focus', () => m.scrollWheelZoom.enable()); m.on('mouseout blur', () => m.scrollWheelZoom.disable());
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(m);
    const icon = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;border-radius:50%;background:#e07a6a;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
    marker.current = L.marker([lat, lon], { draggable: true, icon }).addTo(m);
    marker.current.on('dragend', () => { const p = marker.current!.getLatLng(); onMove(+p.lat.toFixed(5), +p.lng.toFixed(5)); });
    m.on('click', e => { onMove(+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)); });
    soilLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    setTimeout(() => m.invalidateSize(), 50);
    return () => { try { m.off(); m.remove(); } catch { /* mid-animation */ } map.current = null; };
     
  }, []);

  // keep marker/box in sync with props
  useEffect(() => {
    const m = map.current; if (!m) return;
    marker.current?.setLatLng([lat, lon]);
    const [s, w, n, e] = acreBox(lat, lon, acres);
    if (box.current) box.current.setBounds([[s, w], [n, e]]); else box.current = L.rectangle([[s, w], [n, e]], { color: '#f1e6c0', weight: 2, dashArray: '6 4', fill: false }).addTo(m);
    m.fitBounds([[s, w], [n, e]], { padding: [20, 20], animate: false });
    if (inUS && showLines) { if (!wms.current) { wms.current = L.tileLayer.wms('https://SDMDataAccess.sc.egov.usda.gov/Spatial/SDM.wms', { layers: 'mapunitpolyextended', format: 'image/png', transparent: true, opacity: 0.85, attribution: 'Soil lines © USDA-NRCS SSURGO' }); } if (!m.hasLayer(wms.current)) wms.current.addTo(m); } else if (wms.current && m.hasLayer(wms.current)) m.removeLayer(wms.current);
  }, [lat, lon, acres, inUS, showLines]);

  // soil polygons
  useEffect(() => {
    if (!inUS) { setSoil(null); soilLayer.current?.clearLayers(); return; }
    const ac = new AbortController(); setBusy(true); setErr(null);
    fetchSoilMap(lat, lon, acres, ac.signal).then(sm => { setSoil(sm); const g = soilLayer.current; if (!g) return; g.clearLayers(); sm.polygons.forEach((p, i) => { L.polygon(p.rings as any, { color: PALETTE[i % PALETTE.length], weight: 1.5, fillColor: PALETTE[i % PALETTE.length], fillOpacity: 0.28 }).bindTooltip(`${p.name}${p.texture ? ' · ' + p.texture : ''}${p.drainage ? ' · ' + p.drainage : ''}`, { sticky: true }).addTo(g); }); })
      .catch(e => { if (e?.name !== 'AbortError') setErr(e?.message ?? 'soil map failed'); }).finally(() => setBusy(false));
    return () => ac.abort();
  }, [lat, lon, acres, inUS]);

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        <label className="f" style={{ minWidth: 260 }}><span>Area around the pin: {acres} acre{acres === 1 ? '' : 's'} ({(acres * 0.4047).toFixed(1)} ha, {Math.round(Math.sqrt(acres * 4046.86))} m square)</span><input type="range" min={0} max={1000} value={Math.round(1000 * Math.log(acres / 0.25) / Math.log(200 / 0.25))} onChange={e => { const a = 0.25 * Math.pow(200 / 0.25, +e.target.value / 1000); onAcres(a < 1 ? +a.toFixed(2) : a < 20 ? +a.toFixed(1) : Math.round(a)); }} /></label>
        <div className="chips">{[0.25, 1, 7, 20, 40, 80, 160, 200].map(a => <button key={a} className={`chip ${acres === a ? 'on' : ''}`} onClick={() => onAcres(a)}>{a} ac</button>)}</div>
        {inUS && <label className="row" style={{ fontSize: 13 }}><input type="checkbox" checked={showLines} onChange={e => setShowLines(e.target.checked)} />official soil lines (USDA WMS)</label>}
      </div>
      <div ref={ref} style={{ height: 420, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--bg2)' }} />
      <p className="sr" style={{ marginTop: 6 }}>Click the map once to enable wheel zoom. Click the map or drag the pin to move your site. Dashed square = the area analysed. Map © OpenStreetMap contributors (ODbL); soil polygons and lines © USDA-NRCS Web Soil Survey (SSURGO).</p>
      {inUS ? (
        <div style={{ marginTop: 8 }}>
          {busy && <div className="skeleton" style={{ height: 14, width: 200 }} />}
          {err && <p className="tip warn">{err}</p>}
          {soil && soil.polygons.length > 0 && <table className="t"><thead><tr><th></th><th>Map unit</th><th>Share of {acres} ac</th><th>Topsoil</th><th>Drainage</th><th>Class</th></tr></thead><tbody>
            {soil.polygons.map((p, i) => <tr key={p.mukey}><td><span className="score" style={{ background: PALETTE[i % PALETTE.length] }} /></td><td>{p.name}</td><td><b>{(p.areaShare * 100).toFixed(0)}%</b> ({(p.areaShare * acres).toFixed(2)} ac)</td><td>{p.texture ?? '—'}{p.type ? ` → ${SOIL_INFO[p.type].name.toLowerCase()}` : ''}</td><td>{p.drainage ?? '—'}{p.hydGroup ? ` (group ${p.hydGroup})` : ''}</td><td>{p.capability ?? '—'}</td></tr>)}
          </tbody></table>}
          {soil && soil.polygons.length === 0 && <p className="sr">No SSURGO polygons here (water or unmapped area).</p>}
          <p className="sr">Slider is logarithmic: 0.25 acres (a town lot) to 200 acres (a quarter-section minus a bit). Capability class 1–2 = prime cropland, 3–4 = workable with care, 5–8 = not suited to tillage. Hydrologic group A drains fast, D is wettest.</p>
        </div>
      ) : <p className="sr" style={{ marginTop: 8 }}>Outside the US the parcel soil map is not available; the site pack uses ISRIC SoilGrids (250 m) for the pin instead.</p>}
    </div>
  );
}
