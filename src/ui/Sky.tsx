import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as A from 'astronomy-engine';
import { useSettings, useSite, setState } from '../state/store';
import { MoonDisc, todayYmd, fmtMD } from './common';
import { solarTermsCached } from '../astro/solarterms';
import { lastPhaseBefore, moonState, SIGN_ELEMENT, SIGN_GLYPH, moonRiseSet, siderealConstellation, tropicalSign } from '../astro/moon';
import { addDays, midnightAtOffset, noonAtOffset, tzOffsetHours, fmtTime, civilDateAtOffset } from '../astro/dates';
import { lunisolarDate, KO_MONTHS } from '../astro/lunisolar';

const ELEMENT_COLOR: Record<string, string> = { earth: '#a67c52', water: '#5aa0d9', air: '#e0c75a', fire: '#d96c5f' };

export default function Sky() {
  const s = useSettings(); const site = useSite();
  const today = s.selectedDate ?? todayYmd(site.tz);
  const [month, setMonth] = useState(today.slice(0, 7));
  return (
    <div className="grid">
      <YearWheel year={+today.slice(0, 4)} today={today} />
      <MonthStrip month={month} setMonth={setMonth} today={today} />
      <PatternGrid />
      <RiseSetTable month={month} />
    </div>
  );
}

/** The year as a wheel: the Sun's ecliptic longitude is the angle. Solstices top/bottom, equinoxes left/right. */
function YearWheel({ year, today }: { year: number; today: string }) {
  const site = useSite();
  const off = tzOffsetHours(site.tz, new Date());
  const R = 150, cx = 190, cy = 190;
  // Screen angle: June solstice (lon 90°) at top, Sun moves anticlockwise as longitude grows.
  const ang = (lon: number) => -Math.PI / 2 - ((lon - 90) * Math.PI) / 180;
  const pt = (lon: number, r: number) => [cx + r * Math.cos(ang(lon)), cy + r * Math.sin(ang(lon))];
  const sunLonAt = (ymd: string) => A.SunPosition(noonAtOffset(ymd, off)).elon;
  const data = useMemo(() => {
    const terms = solarTermsCached(year).slice(0, 24).map(e => ({ ...e, ymd: civilDateAtOffset(e.time, off) }));
    const monthStarts = Array.from({ length: 12 }, (_, i) => { const ymd = `${year}-${String(i + 1).padStart(2, '0')}-01`; return { ymd, lon: sunLonAt(ymd) }; });
    const newMoons: Array<{ ymd: string; lon: number; month: number; leap: boolean }> = [], fullMoons: Array<{ ymd: string; lon: number }> = [];
    let t = new Date(Date.UTC(year, 0, 1));
    while (t.getUTCFullYear() === year) { const nm = A.SearchMoonPhase(0, t, 40); if (!nm || nm.date.getUTCFullYear() !== year) break; const ymd = civilDateAtOffset(nm.date, off); const L = lunisolarDate(civilDateAtOffset(nm.date, 9), 9); newMoons.push({ ymd, lon: A.SunPosition(nm.date).elon, month: L.month, leap: L.leap }); t = new Date(nm.date.getTime() + 86_400_000); }
    t = new Date(Date.UTC(year, 0, 1));
    while (t.getUTCFullYear() === year) { const fm = A.SearchMoonPhase(180, t, 40); if (!fm || fm.date.getUTCFullYear() !== year) break; fullMoons.push({ ymd: civilDateAtOffset(fm.date, off), lon: A.SunPosition(fm.date).elon }); t = new Date(fm.date.getTime() + 86_400_000); }
    const peri = A.SearchPlanetApsis(A.Body.Earth, new Date(Date.UTC(year, 0, 1)));
    return { terms, monthStarts, newMoons, fullMoons, lf: sunLonAt(`${year}-${site.lastFrost}`), ff: sunLonAt(`${year}-${site.firstFrost}`), todayLon: sunLonAt(today), perihelionLon: A.SunPosition(peri.time.date).elon, perihelionYmd: civilDateAtOffset(peri.time.date, off) };
  }, [year, off, site.lastFrost, site.firstFrost, today]);
  const arc = (a: number, b: number, r: number) => { const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r); const sweep = ((b - a + 360) % 360) > 180 ? 1 : 0; return `M ${x1} ${y1} A ${r} ${r} 0 ${sweep} 1 ${x2} ${y2}`; };
  return (
    <div className="card wide">
      <h2>The year as the Sun sees it <small>· {year} · angle = Sun\'s ecliptic longitude, so the 24 solar terms are evenly spaced and the calendar months are not</small></h2>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <svg viewBox="0 0 380 380" width="380" style={{ maxWidth: '100%' }}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" />
          <circle cx={cx} cy={cy} r={R - 34} fill="none" stroke="var(--line)" />
          {/* frost-free season */}
          <path d={arc(data.lf, data.ff, R - 17)} stroke="var(--accent)" strokeWidth={30} fill="none" opacity={.25} />
          {/* seasons quadrants labels */}
          {[['Summer solstice', 90], ['Winter solstice', 270], ['Spring equinox', 0], ['Autumn equinox', 180]].map(([l, lon]) => { const [x, y] = pt(+lon, R + 22); return <text key={l as string} x={x} y={y} fontSize={9} textAnchor="middle" fill="var(--muted)">{l}</text>; })}
          {/* solar terms */}
          {data.terms.map(e => { const [x1, y1] = pt(e.def.lon, R), [x2, y2] = pt(e.def.lon, R - 6), [tx, ty] = pt(e.def.lon + 7.5, R - 24); return <g key={e.def.i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--fg)" /><text x={tx} y={ty + 3} fontSize={8.5} textAnchor="middle" fill="var(--fg)">{e.def.zh}</text><title>{e.def.ko} {e.def.en} — {e.ymd}</title></g>; })}
          {/* gregorian months */}
          {data.monthStarts.map((m, i) => { const [x1, y1] = pt(m.lon, R - 34), [x2, y2] = pt(m.lon, R - 42), [tx, ty] = pt(m.lon + 14, R - 52); return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" /><text x={tx} y={ty + 3} fontSize={9} textAnchor="middle" fill="var(--muted)">{new Date(Date.UTC(2001, i, 1)).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</text></g>; })}
          {/* lunar months: new moons as dark beads, full moons as light */}
          {data.newMoons.map((m, i) => { const [x, y] = pt(m.lon, R - 70); return <g key={'n' + i}><circle cx={x} cy={y} r={5} fill="#0f1a13" stroke="var(--fg)" /><text x={x} y={y + 14} fontSize={7.5} textAnchor="middle" fill="var(--muted)">{m.leap ? '윤' : ''}{m.month}월</text><title>New Moon {m.ymd} — start of 음력 {m.leap ? '윤' : ''}{KO_MONTHS[m.month - 1]}</title></g>; })}
          {data.fullMoons.map((m, i) => { const [x, y] = pt(m.lon, R - 70); return <circle key={'f' + i} cx={x} cy={y} r={4} fill="var(--moon)"><title>Full Moon {m.ymd}</title></circle>; })}
          {/* perihelion */}
          {(() => { const [x, y] = pt(data.perihelionLon, R - 95); return <g><circle cx={x} cy={y} r={3} fill="var(--warn)" /><title>Perihelion {data.perihelionYmd}: Earth closest to the Sun</title></g>; })()}
          {/* today */}
          {(() => { const [x, y] = pt(data.todayLon, R - 17); const [x0, y0] = pt(data.todayLon, R - 100); return <g><line x1={x0} y1={y0} x2={x} y2={y} stroke="var(--accent2)" strokeWidth={2} /><circle cx={x} cy={y} r={6} fill="var(--accent2)" /><title>{today}</title></g>; })()}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--fg)">{year}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="var(--muted)">frost-free {fmtMD(site.lastFrost)} – {fmtMD(site.firstFrost)}</text>
        </svg>
        <div style={{ flex: 1, minWidth: 220 }} className="sr">
          <p><b>Read it like this.</b> The Sun moves anticlockwise. Each spoke on the outer ring is a 节气/절기 — fifteen degrees of the Sun's path, about fifteen days. The grey ticks are the Gregorian months: notice they drift against the terms because our calendar is not tied to the Sun's longitude the way the terms are.</p>
          <p>The beads on the inner ring are the new Moons (dark) and full Moons (light). Twelve and a bit lunations fit in a solar year, which is why the Korean and Chinese calendars insert a leap month (윤달/闰月) every two or three years — you can see the extra bead when it happens.</p>
          <p>The green band is your frost-free season at {site.name}. Everything in the plant list is timed from its two ends. The amber dot is perihelion: Earth is closest to the Sun in early January, so seasons come from tilt, not distance.</p>
        </div>
      </div>
    </div>
  );
}

/** One month: phase, declination (ascending/descending), distance, ecliptic latitude (nodes), constellation bands. */
function MonthStrip({ month, setMonth, today }: { month: string; setMonth: (m: string) => void; today: string }) {
  const site = useSite();
  const [y, mo] = month.split('-').map(Number);
  const n = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const off = tzOffsetHours(site.tz, new Date());
  const rows = useMemo(() => Array.from({ length: n }, (_, i) => { const ymd = `${month}-${String(i + 1).padStart(2, '0')}`; const m = moonState(noonAtOffset(ymd, off), new A.Observer(site.lat, site.lon, site.elevationM)); return { ymd, m }; }), [month, n, off, site]);
  const W = 760, H = 300, x0 = 36, cw = (W - x0 - 10) / n;
  const X = (i: number) => x0 + i * cw + cw / 2;
  const line = (f: (m: ReturnType<typeof moonState>) => number, y: (v: number) => number) => rows.map((r, i) => `${i ? 'L' : 'M'} ${X(i)} ${y(f(r.m))}`).join(' ');
  const yDec = (d: number) => 120 - d * 1.6, yDist = (km: number) => 215 - (km - 356000) / 50000 * 50, yLat = (l: number) => 120 - l * 6;
  const shift = (k: number) => setMonth(new Date(Date.UTC(y, mo - 1 + k, 1)).toISOString().slice(0, 7));
  const north = site.lat >= 0;
  return (
    <div className="card wide">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>The Moon this month <small>· what the traditions are actually reading</small></h2>
        <div className="row"><button onClick={() => shift(-1)}>‹</button><b>{new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}</b><button onClick={() => shift(1)}>›</button></div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ marginTop: 8 }}>
        {/* phase row */}
        {rows.map((r, i) => <g key={r.ymd} transform={`translate(${X(i) - 9}, 4)`} onClick={() => setState({ selectedDate: r.ymd, tab: 'today' })} style={{ cursor: 'pointer' }}><MiniMoon phase={r.m.phaseAngle} north={north} /><title>{r.ymd}: {Math.round(r.m.illumination * 100)}% lit</title></g>)}
        {rows.map((r, i) => <text key={'d' + r.ymd} x={X(i)} y={36} fontSize={8} textAnchor="middle" fill={r.ymd === today ? 'var(--accent2)' : 'var(--muted)'} fontWeight={r.ymd === today ? 700 : 400}>{i + 1}</text>)}
        {/* declination */}
        <text x={2} y={60} fontSize={9} fill="var(--muted)">Declination</text>
        <text x={2} y={72} fontSize={8} fill="var(--muted)">{north ? '↗ ascending' : '↘ ascending (S)'}</text>
        <line x1={x0} x2={W} y1={yDec(0)} y2={yDec(0)} stroke="var(--line)" />
        <text x={W - 4} y={yDec(0) - 2} fontSize={8} textAnchor="end" fill="var(--muted)">equator</text>
        <path d={line(m => m.declination, yDec)} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {/* ecliptic latitude (nodes) */}
        <path d={line(m => m.eclLat, yLat)} fill="none" stroke="var(--warn)" strokeWidth={1.2} strokeDasharray="3 2" />
        <text x={2} y={100} fontSize={8} fill="var(--warn)">ecliptic lat.</text>
        {rows.filter(r => Math.abs(r.m.nearestNode.hours) <= 12).map(r => { const i = rows.indexOf(r); return <g key={'nd' + r.ymd}><line x1={X(i)} x2={X(i)} y1={44} y2={160} stroke="var(--warn)" strokeDasharray="2 2" /><text x={X(i)} y={170} fontSize={8} textAnchor="middle" fill="var(--warn)">node</text></g>; })}
        {/* distance */}
        <text x={2} y={200} fontSize={9} fill="var(--muted)">Distance</text>
        <path d={line(m => m.distanceKm, yDist)} fill="none" stroke="#5aa0d9" strokeWidth={2} />
        {rows.filter(r => Math.abs(r.m.nearestApsis.hours) <= 12).map(r => { const i = rows.indexOf(r); return <text key={'ap' + r.ymd} x={X(i)} y={yDist(r.m.distanceKm) + (r.m.nearestApsis.kind === 'perigee' ? 12 : -6)} fontSize={8} textAnchor="middle" fill="#5aa0d9">{r.m.nearestApsis.kind}</text>; })}
        {/* constellation bands */}
        <text x={2} y={252} fontSize={8} fill="var(--muted)">sidereal</text>
        {rows.map((r, i) => <rect key={'s' + r.ymd} x={x0 + i * cw} y={244} width={cw} height={10} fill={ELEMENT_COLOR[SIGN_ELEMENT[r.m.sidereal]]}><title>{r.m.sidereal} ({SIGN_ELEMENT[r.m.sidereal]} → {({ earth: 'root', water: 'leaf', air: 'flower', fire: 'fruit' } as any)[SIGN_ELEMENT[r.m.sidereal]]} day)</title></rect>)}
        {rows.map((r, i) => (i === 0 || rows[i - 1].m.sidereal !== r.m.sidereal) ? <text key={'sg' + r.ymd} x={x0 + i * cw + 2} y={252} fontSize={8} fill="#0f1a13">{SIGN_GLYPH[r.m.sidereal]}</text> : null)}
        <text x={2} y={268} fontSize={8} fill="var(--muted)">tropical</text>
        {rows.map((r, i) => <rect key={'t' + r.ymd} x={x0 + i * cw} y={260} width={cw} height={10} fill={ELEMENT_COLOR[SIGN_ELEMENT[r.m.tropical]]} opacity={.7}><title>{r.m.tropical} ({SIGN_ELEMENT[r.m.tropical]})</title></rect>)}
        {rows.map((r, i) => (i === 0 || rows[i - 1].m.tropical !== r.m.tropical) ? <text key={'tg' + r.ymd} x={x0 + i * cw + 2} y={268} fontSize={8} fill="#0f1a13">{SIGN_GLYPH[r.m.tropical]}</text> : null)}
        <text x={x0} y={290} fontSize={9} fill="var(--muted)">■ earth → root &nbsp; ■ water → leaf &nbsp; ■ air → flower &nbsp; ■ fire → fruit. The sidereal band (real constellations, unequal) trails the tropical band (astrological, 30° each) by about one sign: that offset is why biodynamic and almanac calendars disagree.</text>
        {rows.filter(r => r.ymd === today).map(r => <rect key="today" x={x0 + rows.indexOf(r) * cw} y={2} width={cw} height={272} fill="none" stroke="var(--accent2)" rx={3} />)}
      </svg>
    </div>
  );
}

function MiniMoon({ phase, north }: { phase: number; north: boolean }) {
  const r = 8, cx = 9, cy = 9, k = Math.cos(phase * Math.PI / 180), waxing = phase < 180, litRight = north ? waxing : !waxing;
  const path = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${litRight ? 1 : 0} ${cx} ${cy + r} A ${Math.abs(k) * r} ${r} 0 0 ${(k < 0) === litRight ? 1 : 0} ${cx} ${cy - r} Z`;
  return <g><circle cx={cx} cy={cy} r={r} fill="#22301f" stroke="var(--line)" strokeWidth={.5} /><path d={path} fill="var(--moon)" /></g>;
}

/** Many years × day-of-year, coloured by illumination: the 19-year Metonic repeat jumps out. */
function PatternGrid() {
  const site = useSite();
  const ref = useRef<HTMLCanvasElement>(null);
  const [start, setStart] = useState(new Date().getUTCFullYear() - 19);
  const years = 40;
  const [mode, setMode] = useState<'phase' | 'distance' | 'declination'>('phase');
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d')!; const cw = 3, ch = 7; c.width = 366 * cw + 50; c.height = years * ch + 20;
    ctx.fillStyle = '#0f1a13'; ctx.fillRect(0, 0, c.width, c.height);
    for (let yi = 0; yi < years; yi++) {
      const y = start + yi;
      for (let d = 0; d < 366; d++) {
        const t = new Date(Date.UTC(y, 0, 1 + d, 12)); if (t.getUTCFullYear() !== y) continue;
        let col: string;
        if (mode === 'phase') { const ill = A.Illumination(A.Body.Moon, t).phase_fraction; const v = Math.round(20 + ill * 215); col = `rgb(${v},${v},${Math.round(v * 0.85)})`; }
        else if (mode === 'distance') { const km = A.GeoVector(A.Body.Moon, t, false).Length() * A.KM_PER_AU; const v = (km - 356000) / 51000; col = `hsl(${200 + v * 60}, 70%, ${35 + v * 30}%)`; }
        else { const dec = A.Equator(A.Body.Moon, t, new A.Observer(0, 0, 0), true, true).dec; const v = (dec + 29) / 58; col = `hsl(${v * 120}, 60%, ${30 + v * 30}%)`; }
        ctx.fillStyle = col; ctx.fillRect(50 + d * cw, 10 + yi * ch, cw, ch - 1);
      }
      ctx.fillStyle = '#9db39a'; ctx.font = '8px sans-serif'; if (yi % 2 === 0) ctx.fillText(String(y), 22, 10 + yi * ch + 6);
    }
    ctx.fillStyle = '#9db39a'; 'JFMAMJJASOND'.split('').forEach((m, i) => ctx.fillText(m, 50 + Math.round(i * 30.4 * cw), 8));
  }, [start, mode, years]);
  return (
    <div className="card wide">
      <h2>Patterns across {years} years <small>· one row per year, one pixel column per day</small></h2>
      <div className="row"><button onClick={() => setStart(start - 10)}>‹ 10 yrs</button><span>{start}–{start + years - 1}</span><button onClick={() => setStart(start + 10)}>10 yrs ›</button>
        <div className="chips">{(['phase', 'distance', 'declination'] as const).map(m => <button key={m} className={`chip ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>{m}</button>)}</div></div>
      <canvas ref={ref} style={{ width: '100%', imageRendering: 'pixelated', marginTop: 8, borderRadius: 8 }} />
      <p className="sr">{mode === 'phase' && <>Bright = full Moon, dark = new. The stripes lean because 12 lunations fall 11 days short of a year. Look 19 rows down from any full Moon: it lands on almost the same date. That is the Metonic cycle (235 lunations ≈ 19 years), the basis of the leap-month rule in the Korean and Chinese calendars and of the Easter computus. Every 8 years the phase also nearly repeats (the octaeteris), which is why folk calendars could be reused.</>}
        {mode === 'distance' && <>Light = far (apogee), dark = near (perigee). Perigee drifts through the year over 8.85 years — the apsidal cycle. When perigee coincides with full Moon you get a "supermoon"; biodynamic calendars block perigee days.</>}
        {mode === 'declination' && <>Green/yellow = Moon far north, red = far south. The monthly swing (the ascending/descending Moon of French and biodynamic practice) breathes wider and narrower over 18.6 years as the Moon's nodes regress: the "major lunar standstill" years (2024–25) show the widest swing. Southern hemisphere gardeners read this chart upside down.</>}</p>
    </div>
  );
}

function RiseSetTable({ month }: { month: string }) {
  const site = useSite();
  const [y, mo] = month.split('-').map(Number);
  const n = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const rows = useMemo(() => { const obs = new A.Observer(site.lat, site.lon, site.elevationM); return Array.from({ length: n }, (_, i) => { const ymd = `${month}-${String(i + 1).padStart(2, '0')}`; const off = tzOffsetHours(site.tz, noonAtOffset(ymd, 0)); const d0 = midnightAtOffset(ymd, off); const m = moonRiseSet(noonAtOffset(ymd, off), obs, d0); const sr = A.SearchRiseSet(A.Body.Sun, obs, +1, d0, 1), ss = A.SearchRiseSet(A.Body.Sun, obs, -1, d0, 1); const ms = moonState(noonAtOffset(ymd, off), obs); return { ymd, m, sr: sr?.date, ss: ss?.date, ms }; }); }, [month, n, site]);
  return (
    <div className="card wide">
      <details><summary>Sun & Moon rise/set table for this month ({site.name})</summary>
        <table className="t" style={{ marginTop: 8 }}><thead><tr><th>Day</th><th>Sunrise</th><th>Sunset</th><th>Moonrise</th><th>Moonset</th><th>Lit</th><th>Sidereal</th><th>Tropical</th><th>Dec</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.ymd}><td>{+r.ymd.slice(8)}</td><td>{r.sr ? fmtTime(r.sr, site.tz) : '—'}</td><td>{r.ss ? fmtTime(r.ss, site.tz) : '—'}</td><td>{r.m.rise ? fmtTime(r.m.rise, site.tz) : '—'}</td><td>{r.m.set ? fmtTime(r.m.set, site.tz) : '—'}</td><td>{Math.round(r.ms.illumination * 100)}%</td><td>{SIGN_GLYPH[r.ms.sidereal]} {r.ms.sidereal}</td><td>{SIGN_GLYPH[r.ms.tropical]} {r.ms.tropical}</td><td>{r.ms.declination.toFixed(1)}°</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}
