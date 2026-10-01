import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as A from 'astronomy-engine';
import { useSettings, useSite, setState } from '../state/store';
import { MoonDisc, todayYmd, fmtMD, fmtYMD } from './common';
import { solarTermsCached } from '../astro/solarterms';
import { moonState, SIGN_ELEMENT, SIGN_GLYPH, moonRiseSet, TROPICAL_SIGNS, SIDEREAL_BOUNDS, signIngresses, type MoonState } from '../astro/moon';
import { addDays, midnightAtOffset, noonAtOffset, tzOffsetHours, fmtTime, civilDateAtOffset, fmtDateTime } from '../astro/dates';
import { lunisolarDate, KO_MONTHS } from '../astro/lunisolar';

const ELEMENT_COLOR: Record<string, string> = { earth: '#a67c52', water: '#5aa0d9', air: '#e0c75a', fire: '#d96c5f' };

export default function Sky() {
  const s = useSettings(); const site = useSite();
  const today = s.selectedDate ?? todayYmd(site.tz);
  const [month, setMonth] = useState(today.slice(0, 7));
  const off = tzOffsetHours(site.tz, new Date());
  const noon = noonAtOffset(today, off);
  const m = useMemo(() => moonState(noon, new A.Observer(site.lat, site.lon, site.elevationM)), [noon, site]);
  return (
    <div className="grid">
      <div className="card wide">
        <h2>The Moon has five clocks <small>· every planting tradition reads one or two of them. Today is marked on each.</small></h2>
        <p className="sr">The Moon circles Earth once every 27.3 days, but the Sun has moved on in that time, so the Moon needs 29.5 days to get back to the same phase. That gap between the two months is the root of every lunar calendar puzzle. Earth's tilt, the Moon's slightly tilted and oval orbit each add a rhythm of their own.</p>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))' }}>
          <PhaseClock m={m} north={site.lat >= 0} />
          <ZodiacClock m={m} />
          <HeightClock m={m} north={site.lat >= 0} />
          <DistanceClock m={m} />
          <NodeClock m={m} />
          <LongRhythms />
        </div>
      </div>
      <EclipticRing today={today} noon={noon} m={m} />
      <MonthStrip month={month} setMonth={setMonth} today={today} />
      <YearWheel year={+today.slice(0, 4)} today={today} />
      <PatternGrid />
      <RiseSetTable month={month} />
    </div>
  );
}

/* ---------- the five clocks ---------- */
function Clock({ title, period, who, children, text }: { title: string; period: string; who: string; children: React.ReactNode; text: string }) {
  return (
    <div className="task" style={{ padding: 12 }}>
      <div className="t" style={{ fontSize: 14 }}>{title} <span className="muted" style={{ fontWeight: 400 }}>· {period}</span></div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>{children}</div>
      <div className="sr">{text}</div>
      <div className="sr" style={{ marginTop: 4 }}><b>Who reads it:</b> {who}</div>
    </div>
  );
}

function miniMoonPath(phase: number, cx: number, cy: number, r: number, north: boolean) {
  const k = Math.cos(phase * Math.PI / 180), waxing = phase < 180, litRight = north ? waxing : !waxing;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${litRight ? 1 : 0} ${cx} ${cy + r} A ${Math.abs(k) * r} ${r} 0 0 ${(k < 0) === litRight ? 1 : 0} ${cx} ${cy - r} Z`;
}

function PhaseClock({ m, north }: { m: MoonState; north: boolean }) {
  const R = 58, cx = 100, cy = 70;
  const a = (deg: number) => (-90 + deg) * Math.PI / 180; // new moon at top, clockwise
  return (
    <Clock title="1 · Phase" period="29.5 days (synodic month)" who="English lore, the Russian calendar and the American almanac: waxing for crops that grow upward, waning for roots; the exact new and full Moon are rest days." text="New Moon at the top: the Moon sits between us and the Sun, unlit. It moves clockwise here, growing (waxing) on the right side until Full at the bottom, then shrinking (waning) on the left. 'Light of the Moon' is the right half, 'dark of the Moon' the left.">
      <svg width={200} height={150} viewBox="0 0 200 150">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" />
        {Array.from({ length: 8 }, (_, i) => { const p = i * 45; const x = cx + R * Math.cos(a(p)), y = cy + R * Math.sin(a(p)); return <g key={i}><circle cx={x} cy={y} r={9} fill="#22301f" stroke="var(--line)" strokeWidth={.5} /><path d={miniMoonPath(p, x, y, 9, north)} fill="var(--moon)" /></g>; })}
        <text x={cx} y={cy - R + 24} textAnchor="middle" fontSize={8} fill="var(--muted)">new</text>
        <text x={cx} y={cy + R - 18} textAnchor="middle" fontSize={8} fill="var(--muted)">full</text>
        <text x={cx + R + 4} y={cy + 3} textAnchor="start" fontSize={8} fill="var(--muted)">waxing</text>
        <text x={cx - R - 4} y={cy + 3} textAnchor="end" fontSize={8} fill="var(--muted)">waning</text>
        {(() => { const x = cx + R * Math.cos(a(m.phaseAngle)), y = cy + R * Math.sin(a(m.phaseAngle)); return <circle cx={x} cy={y} r={13} fill="none" stroke="var(--accent2)" strokeWidth={2} />; })()}
        <text x={cx} y={cy + 3} textAnchor="middle" fontSize={9} fill="var(--fg)">day {m.ageDays.toFixed(1)}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={8} fill="var(--muted)">of 29.5</text>
      </svg>
    </Clock>
  );
}

function ZodiacClock({ m }: { m: MoonState }) {
  const R = 58, cx = 80, cy = 70;
  const a = (lon: number) => -lon * Math.PI / 180; // anticlockwise like the real sky
  return (
    <Clock title="2 · Through the stars" period="27.3 days (sidereal month)" who="Russian and American almanacs use the tropical signs (12 equal slices from the spring equinox). Biodynamic and French calendars use the real constellations, which sit about one sign later and are unequal in size." text="The Moon crosses one zodiac sign every 2¼ days, moving anticlockwise. Each sign carries an element, and the element names the plant part: earth → root, water → leaf, air → flower, fire → fruit. Outer ring: tropical signs. Inner ring: the real constellations.">
      <svg width={160} height={150} viewBox="0 0 160 150">
        {TROPICAL_SIGNS.map((sgn, i) => { const lon = i * 30 + 15; return <g key={sgn}><path d={`M ${cx + (R - 10) * Math.cos(a(i * 30))} ${cy + (R - 10) * Math.sin(a(i * 30))} A ${R - 10} ${R - 10} 0 0 0 ${cx + (R - 10) * Math.cos(a(i * 30 + 30))} ${cy + (R - 10) * Math.sin(a(i * 30 + 30))} L ${cx + R * Math.cos(a(i * 30 + 30))} ${cy + R * Math.sin(a(i * 30 + 30))} A ${R} ${R} 0 0 1 ${cx + R * Math.cos(a(i * 30))} ${cy + R * Math.sin(a(i * 30))} Z`} fill={ELEMENT_COLOR[SIGN_ELEMENT[sgn]]} opacity={.75} /><text x={cx + (R - 5) * Math.cos(a(lon))} y={cy + (R - 5) * Math.sin(a(lon)) + 3} textAnchor="middle" fontSize={7} fill="#0f1a13">{SIGN_GLYPH[sgn]}</text></g>; })}
        {SIDEREAL_BOUNDS.map(([start, sgn], i) => { const end = SIDEREAL_BOUNDS[(i + 1) % 12][0]; const span = ((end - start) + 360) % 360; const r1 = R - 24, r2 = R - 12; return <path key={sgn} d={`M ${cx + r1 * Math.cos(a(start))} ${cy + r1 * Math.sin(a(start))} A ${r1} ${r1} 0 ${span > 180 ? 1 : 0} 0 ${cx + r1 * Math.cos(a(start + span))} ${cy + r1 * Math.sin(a(start + span))} L ${cx + r2 * Math.cos(a(start + span))} ${cy + r2 * Math.sin(a(start + span))} A ${r2} ${r2} 0 ${span > 180 ? 1 : 0} 1 ${cx + r2 * Math.cos(a(start))} ${cy + r2 * Math.sin(a(start))} Z`} fill={ELEMENT_COLOR[SIGN_ELEMENT[sgn as keyof typeof SIGN_ELEMENT]]} opacity={.45} stroke="var(--bg)" strokeWidth={.5} />; })}
        <circle cx={cx + (R - 17) * Math.cos(a(m.eclLon))} cy={cy + (R - 17) * Math.sin(a(m.eclLon))} r={6} fill="var(--moon)" stroke="var(--accent2)" strokeWidth={2} />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={8} fill="var(--fg)">{SIGN_GLYPH[m.tropical]} {m.tropical}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize={7} fill="var(--muted)">stars: {m.sidereal}</text>
      </svg>
    </Clock>
  );
}

function HeightClock({ m, north }: { m: MoonState; north: boolean }) {
  const asc = north ? m.ascending : !m.ascending;
  const dec = north ? m.declination : -m.declination;
  const h = 95 - (dec / 28) * 30; // arc apex y
  return (
    <Clock title="3 · High and low" period="27.3 days (declination)" who="French 'lune montante / descendante' and the biodynamic calendar: ascending = sap rises, sow and graft; descending = sap sinks, plant out, prune, compost. Nothing to do with waxing and waning — it is a different clock." text="Over a month the Moon's daily arc across the sky climbs from a low winter-like path to a high summer-like one and back, because its path is tilted against the equator. While the arc is getting higher each day the Moon is 'ascending'. Today's arc is drawn bright; the ghost arcs show the extremes.">
      <svg width={170} height={120} viewBox="0 0 170 120">
        <line x1={10} x2={160} y1={100} y2={100} stroke="var(--line)" />
        <text x={12} y={112} fontSize={8} fill="var(--muted)">E</text><text x={150} y={112} fontSize={8} fill="var(--muted)">W</text>
        <path d="M 20 100 Q 85 50 150 100" fill="none" stroke="var(--line)" strokeDasharray="3 3" />
        <path d="M 20 100 Q 85 110 150 100" fill="none" stroke="var(--line)" strokeDasharray="3 3" />
        <path d={`M 20 100 Q 85 ${h * 2 - 100} 150 100`} fill="none" stroke="var(--accent2)" strokeWidth={2} />
        <circle cx={85} cy={h} r={6} fill="var(--moon)" />
        <text x={85} y={h - 10} textAnchor="middle" fontSize={9} fill="var(--fg)">{asc ? '↗ ascending' : '↘ descending'}</text>
        <text x={85} y={20} textAnchor="middle" fontSize={8} fill="var(--muted)">dec {m.declination.toFixed(1)}°</text>
      </svg>
    </Clock>
  );
}

function DistanceClock({ m }: { m: MoonState }) {
  // ellipse with Earth at a focus; Moon placed by true anomaly approx from distance
  const cx = 85, cy = 60, ax = 70, by = 60, c = 12; // exaggerated eccentricity for legibility
  const frac = (m.distanceKm - 356500) / (406700 - 356500); // 0 perigee .. 1 apogee
  const theta = Math.PI * frac; // 0 at perigee (right), π at apogee (left)
  const x = cx + ax * Math.cos(theta), y = cy - by * Math.sin(theta) * (m.waxing ? 1 : -1);
  return (
    <Clock title="4 · Near and far" period="27.6 days (anomalistic month)" who="Biodynamic: perigee days are skipped (plants sown then are prone to fungus), apogee is the day for potatoes. French Rustica masks a few hours around both." text="The orbit is an oval; Earth sits off-centre. Perigee (closest, ~357 000 km) and apogee (farthest, ~406 000 km) come round every 27.6 days — a different beat from the phases, so a full Moon at perigee ('supermoon') is only occasional.">
      <svg width={170} height={120} viewBox="0 0 170 120">
          <ellipse cx={cx} cy={cy} rx={ax} ry={by - 10} fill="none" stroke="var(--line)" />
          <circle cx={cx + c} cy={cy} r={7} fill="#5aa0d9" /><text x={cx + c} y={cy + 18} textAnchor="middle" fontSize={8} fill="var(--muted)">Earth</text>
          <text x={cx + ax + 2} y={cy - 6} fontSize={8} fill="var(--muted)" textAnchor="end">perigee</text>
          <text x={cx - ax - 2} y={cy - 6} fontSize={8} fill="var(--muted)">apogee</text>
          <circle cx={x} cy={cy + (y - cy) * ((by - 10) / by)} r={5} fill="var(--moon)" stroke="var(--accent2)" strokeWidth={2} />
          <text x={cx} y={14} textAnchor="middle" fontSize={9} fill="var(--fg)">{Math.round(m.distanceKm).toLocaleString()} km · {m.nearestApsis.kind} {Math.abs(m.nearestApsis.hours) < 24 ? 'today' : `in ${Math.round(Math.abs(m.nearestApsis.hours) / 24)} d`}</text>
      </svg>
    </Clock>
  );
}

function NodeClock({ m }: { m: MoonState }) {
  const tilt = 5.1 * 3; // exaggerated
  const lat = m.eclLat;
  const x = 85 + 70 * Math.cos(m.eclLon * Math.PI / 180);
  return (
    <Clock title="5 · Crossing the Sun's path" period="27.2 days (draconic month)" who="Biodynamic and French calendars leave node days blank — 'the Moon is confused'. Nodes are also where eclipses happen, and the 18.6-year drift of the nodes drives the standstill years." text="The Moon's orbit is tilted 5° to the Sun's path (the ecliptic). Twice a month it crosses that path at the nodes ☊ ☋. Side view: the slanted line is the Moon's orbit, the flat line the ecliptic. The Moon is drawn at today's height above or below it.">
      <svg width={170} height={120} viewBox="0 0 170 120">
        <line x1={10} x2={160} y1={60} y2={60} stroke="var(--warn)" />
        <text x={160} y={56} textAnchor="end" fontSize={8} fill="var(--warn)">ecliptic (Sun's path)</text>
        <line x1={15} y1={60 + tilt} x2={155} y2={60 - tilt} stroke="var(--line)" strokeWidth={2} />
        <text x={18} y={60 + tilt + 10} fontSize={8} fill="var(--muted)">☋ node</text><text x={130} y={60 - tilt - 4} fontSize={8} fill="var(--muted)">node ☊</text>
        <circle cx={x} cy={60 - lat * 4} r={6} fill="var(--moon)" stroke="var(--accent2)" strokeWidth={2} />
        <text x={85} y={105} textAnchor="middle" fontSize={9} fill="var(--fg)">{lat >= 0 ? 'above' : 'below'} by {Math.abs(lat).toFixed(1)}° · next node {Math.abs(m.nearestNode.hours) < 24 ? 'today' : `in ${Math.round(Math.abs(m.nearestNode.hours) / 24)} d`}</text>
      </svg>
    </Clock>
  );
}

function LongRhythms() {
  return (
    <div className="task" style={{ padding: 12 }}>
      <div className="t" style={{ fontSize: 14 }}>The long rhythms</div>
      <ul className="notes" style={{ fontSize: 12.5 }}>
        <li><b>19 years — Metonic.</b> 235 phases ≈ 19 years, so the full Moon returns to the same date. This is why the Korean and Chinese calendars add 7 leap months every 19 years, and how Easter is computed.</li>
        <li><b>18.6 years — nodal.</b> The nodes slide backwards round the ecliptic. When they line up with the equinoxes (2024–25) the Moon's monthly high–low swing is widest: the 'major lunar standstill'. Stonehenge and the Chaco Canyon sun dagger mark it.</li>
        <li><b>8.85 years — apsidal.</b> Perigee creeps forward through the signs, so supermoons move through the seasons.</li>
        <li><b>18 y 11 d — Saros.</b> An eclipse repeats almost exactly. Chinese court astronomers tracked it by 500 BC.</li>
        <li><b>8 years — octaeteris.</b> 99 lunations ≈ 8 years, a cruder repeat; old farmers reused an eight-year-old almanac in a pinch.</li>
      </ul>
      <div className="sr">See them in the pattern grid at the bottom of this page.</div>
    </div>
  );
}

/* ---------- ecliptic ring with planets ---------- */
const PLANETS: Array<{ body: A.Body; name: string; glyph: string; color: string; lore: string }> = [
  { body: A.Body.Mercury, name: 'Mercury', glyph: '☿', color: '#c9c9c9', lore: 'Modern folklore avoids signing contracts and sowing during Mercury retrograde; no traditional farm calendar does.' },
  { body: A.Body.Venus, name: 'Venus', glyph: '♀', color: '#f3e9c6', lore: 'The Evening/Morning Star. Mesoamerican and some European lore ties flower sowing to Venus; the Almanac lists Venus for "beauty crops".' },
  { body: A.Body.Mars, name: 'Mars', glyph: '♂', color: '#d96c5f', lore: 'Hot and dry in the humoral scheme: Culpeper assigns nettles, garlic, peppers to Mars.' },
  { body: A.Body.Jupiter, name: 'Jupiter', glyph: '♃', color: '#e0c75a', lore: '岁星, the Year Star: its 12-year circuit gave China the 12 earthly branches. Biodynamic: Moon–Jupiter aspects favour flower and fruit.' },
  { body: A.Body.Saturn, name: 'Saturn', glyph: '♄', color: '#a67c52', lore: 'Thun\'s key planet: Moon opposite Saturn is the best sowing day of the month for sturdy, disease-resistant plants.' }
];

function EclipticRing({ today, noon, m }: { today: string; noon: Date; m: MoonState }) {
  const site = useSite();
  const R = 150, cx = 190, cy = 190;
  const a = (lon: number) => -lon * Math.PI / 180;
  const pt = (lon: number, r: number) => [cx + r * Math.cos(a(lon)), cy + r * Math.sin(a(lon))];
  const data = useMemo(() => {
    const sunLon = A.SunPosition(noon).elon;
    const planets = PLANETS.map(p => {
      const e = A.Ecliptic(A.GeoVector(p.body, noon, true)); const e2 = A.Ecliptic(A.GeoVector(p.body, new Date(noon.getTime() + 86_400_000), true));
      const retro = ((e2.elon - e.elon + 540) % 360 - 180) < 0;
      const elong = A.AngleFromSun(p.body, noon); const pair = A.PairLongitude(p.body, A.Body.Sun, noon);
      const mag = A.Illumination(p.body, noon).mag;
      const vis = elong < 12 ? 'lost in the Sun\'s glare' : pair < 180 ? 'evening sky, after sunset' : 'morning sky, before dawn';
      const lonM = ((e.elon - m.eclLon + 540) % 360) - 180;
      return { ...p, lon: e.elon, retro, elong, mag, vis, moonAspect: Math.abs(Math.abs(lonM) - 180) < 8 ? 'opposition ☍ with the Moon' : Math.abs(lonM) < 8 ? 'conjunction ☌ with the Moon' : Math.abs(Math.abs(lonM) - 120) < 6 ? 'trine △ with the Moon' : null };
    });
    const nodeT = A.SearchMoonNode(noon); const nodeLon = A.Ecliptic(A.GeoVector(A.Body.Moon, nodeT.time.date, true)).elon;
    const ascNodeLon = nodeT.kind === 1 ? nodeLon : (nodeLon + 180) % 360;
    const periT = A.SearchLunarApsis(noon); const periLon = A.Ecliptic(A.GeoVector(A.Body.Moon, periT.time.date, true)).elon;
    const perigeeLon = periT.kind === 0 ? periLon : (periLon + 180) % 360;
    return { sunLon, planets, ascNodeLon, perigeeLon };
  }, [noon, m]);
  const [sel, setSel] = useState<string | null>(null);
  const selP = data.planets.find(p => p.name === sel);
  return (
    <div className="card wide">
      <h2>The ring of the ecliptic today <small>· {fmtYMD(today)} · Earth at the centre, the Sun's path as the ring; everything that matters to the traditions sits on it</small></h2>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <svg viewBox="0 0 380 380" width="380" style={{ maxWidth: '100%' }}>
          {TROPICAL_SIGNS.map((sgn, i) => { const [x1, y1] = pt(i * 30, R), [x2, y2] = pt(i * 30 + 30, R), [x3, y3] = pt(i * 30 + 30, R - 16), [x4, y4] = pt(i * 30, R - 16); const [tx, ty] = pt(i * 30 + 15, R - 8); return <g key={sgn}><path d={`M ${x1} ${y1} A ${R} ${R} 0 0 0 ${x2} ${y2} L ${x3} ${y3} A ${R - 16} ${R - 16} 0 0 1 ${x4} ${y4} Z`} fill={ELEMENT_COLOR[SIGN_ELEMENT[sgn]]} opacity={.8} stroke="var(--bg)" /><text x={tx} y={ty + 4} textAnchor="middle" fontSize={11} fill="#0f1a13">{SIGN_GLYPH[sgn]}</text><title>{sgn} (tropical) — {SIGN_ELEMENT[sgn]}</title></g>; })}
          {SIDEREAL_BOUNDS.map(([start, sgn], i) => { const end = SIDEREAL_BOUNDS[(i + 1) % 12][0]; const span = ((end - start) + 360) % 360; const r1 = R - 32, r2 = R - 18; const [x1, y1] = pt(start, r2), [x2, y2] = pt(start + span, r2), [x3, y3] = pt(start + span, r1), [x4, y4] = pt(start, r1); const [tx, ty] = pt(start + span / 2, (r1 + r2) / 2); return <g key={sgn}><path d={`M ${x1} ${y1} A ${r2} ${r2} 0 ${span > 180 ? 1 : 0} 0 ${x2} ${y2} L ${x3} ${y3} A ${r1} ${r1} 0 ${span > 180 ? 1 : 0} 1 ${x4} ${y4} Z`} fill={ELEMENT_COLOR[SIGN_ELEMENT[sgn as keyof typeof SIGN_ELEMENT]]} opacity={.45} stroke="var(--bg)" /><text x={tx} y={ty + 3} textAnchor="middle" fontSize={8} fill="var(--fg)">{SIGN_GLYPH[sgn as keyof typeof SIGN_GLYPH]}</text><title>{sgn} constellation (sidereal)</title></g>; })}
          <circle cx={cx} cy={cy} r={R - 32} fill="none" stroke="var(--line)" />
          {/* nodes and perigee axes */}
          {(() => { const [x1, y1] = pt(data.ascNodeLon, R - 34), [x2, y2] = pt(data.ascNodeLon + 180, R - 34); return <g><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--warn)" strokeDasharray="4 3" /><text x={x1} y={y1 - 4} fontSize={11} fill="var(--warn)" textAnchor="middle">☊</text><text x={x2} y={y2 + 12} fontSize={11} fill="var(--warn)" textAnchor="middle">☋</text><title>Lunar nodes (where the Moon crosses the ecliptic)</title></g>; })()}
          {(() => { const [x1, y1] = pt(data.perigeeLon, R - 40); return <g><line x1={cx} y1={cy} x2={x1} y2={y1} stroke="#5aa0d9" strokeDasharray="2 3" /><text x={x1} y={y1} fontSize={8} fill="#5aa0d9" textAnchor="middle">perigee</text></g>; })()}
          {/* Sun */}
          {(() => { const [x, y] = pt(data.sunLon, R - 55); return <g><circle cx={x} cy={y} r={11} fill="#f3c969" /><text x={x} y={y + 4} textAnchor="middle" fontSize={11} fill="#0f1a13">☉</text><title>Sun at {data.sunLon.toFixed(1)}°</title></g>; })()}
          {/* Moon–Saturn opposition line */}
          {m.saturnOpposition && (() => { const sat = data.planets.find(p => p.name === 'Saturn')!; const [x1, y1] = pt(m.eclLon, R - 55), [x2, y2] = pt(sat.lon, R - 85); return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent)" strokeWidth={2} />; })()}
          {/* Moon */}
          {(() => { const [x, y] = pt(m.eclLon, R - 55); return <g onClick={() => setSel('Moon')} style={{ cursor: 'pointer' }}><circle cx={x} cy={y} r={11} fill="#22301f" stroke="var(--accent2)" /><path d={miniMoonPath(m.phaseAngle, x, y, 11, site.lat >= 0)} fill="var(--moon)" /><title>Moon at {m.eclLon.toFixed(1)}°</title></g>; })()}
          {/* planets */}
          {data.planets.map(p => { const [x, y] = pt(p.lon, R - 85); return <g key={p.name} onClick={() => setSel(p.name)} style={{ cursor: 'pointer' }}><circle cx={x} cy={y} r={8} fill={p.color} stroke={sel === p.name ? 'var(--accent2)' : 'var(--bg)'} strokeWidth={sel === p.name ? 2 : 1} /><text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#0f1a13">{p.glyph}</text>{p.retro && <text x={x + 9} y={y - 5} fontSize={7} fill="var(--fg)">℞</text>}<title>{p.name} at {p.lon.toFixed(1)}°{p.retro ? ' (retrograde)' : ''}</title></g>; })}
          <circle cx={cx} cy={cy} r={9} fill="#5aa0d9" /><text x={cx} y={cy + 22} textAnchor="middle" fontSize={9} fill="var(--muted)">Earth</text>
          <text x={cx + R - 60} y={cy - 4} textAnchor="middle" fontSize={8} fill="var(--muted)">0° ♈ →</text>
        </svg>
        <div style={{ flex: 1, minWidth: 240 }}>
          <p className="sr"><b>Read it like this.</b> Longitude runs anticlockwise from 0° at the spring equinox point (right). The outer ring is the <b>tropical</b> zodiac: twelve equal 30° slices measured from that point — what the Russian calendar and American almanac mean by "Moon in Cancer". The inner ring is where the <b>constellations</b> really are: because Earth's axis wobbles (precession), they have slipped about 24° since the signs were fixed 2 000 years ago. The biodynamic and French calendars read this inner ring. Same Moon, two different answers — that is the biggest single reason the traditions disagree.</p>
          <p className="sr">The Sun ☉ sits where the season says. The Moon is full when it is opposite the Sun, new when beside it. Planets near the Sun are invisible; ℞ marks one moving backwards against the stars (retrograde — a trick of perspective as Earth overtakes it). The dashed amber axis is the nodes, the blue spoke points to perigee.</p>
          <table className="t"><thead><tr><th></th><th>Where</th><th>Visible</th><th>Mag.</th><th>Moon aspect</th></tr></thead><tbody>
            <tr style={{ cursor: 'pointer' }} onClick={() => setSel('Moon')}><td>🌙 Moon</td><td>{SIGN_GLYPH[m.tropical]} {m.tropical} / {m.sidereal}</td><td>{m.waxing ? 'evening' : 'morning'}</td><td></td><td>{m.saturnOpposition ? '☍ Saturn' : ''}</td></tr>
            {data.planets.map(p => <tr key={p.name} style={{ cursor: 'pointer', background: sel === p.name ? 'var(--card2)' : undefined }} onClick={() => setSel(p.name)}><td>{p.glyph} {p.name}{p.retro ? ' ℞' : ''}</td><td>{SIGN_GLYPH[TROPICAL_SIGNS[Math.floor(p.lon / 30)]]} {TROPICAL_SIGNS[Math.floor(p.lon / 30)]}</td><td>{p.vis}</td><td>{p.mag.toFixed(1)}</td><td>{p.moonAspect ?? ''}</td></tr>)}
          </tbody></table>
          {selP && <div className="tip">{selP.name}: {selP.lore} {selP.retro ? `Retrograde now — it will appear to drift west against the stars for some weeks.` : ''} {selP.elong.toFixed(0)}° from the Sun.</div>}
          {sel === 'Moon' && <div className="tip">Moon: {Math.round(m.illumination * 100)}% lit, {m.waxing ? 'waxing' : 'waning'}, {(site.lat >= 0 ? m.ascending : !m.ascending) ? 'ascending' : 'descending'}, {Math.round(m.distanceKm).toLocaleString()} km away, {Math.abs(m.eclLat).toFixed(1)}° {m.eclLat >= 0 ? 'above' : 'below'} the ecliptic.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- month strip, rebuilt with labelled panels ---------- */
function MonthStrip({ month, setMonth, today }: { month: string; setMonth: (m: string) => void; today: string }) {
  const site = useSite();
  const [y, mo] = month.split('-').map(Number);
  const n = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const off = tzOffsetHours(site.tz, new Date());
  const rows = useMemo(() => Array.from({ length: n }, (_, i) => { const ymd = `${month}-${String(i + 1).padStart(2, '0')}`; const m = moonState(noonAtOffset(ymd, off), new A.Observer(site.lat, site.lon, site.elevationM)); return { ymd, m }; }), [month, n, off, site]);
  const ingresses = useMemo(() => signIngresses(midnightAtOffset(`${month}-01`, off), midnightAtOffset(addDays(`${month}-01`, n), off)), [month, n, off]);
  const W = 760, x0 = 110, cw = (W - x0 - 10) / n;
  const tX = (d: Date) => x0 + ((d.getTime() - midnightAtOffset(`${month}-01`, off).getTime()) / 86_400_000) * cw;
  const X = (i: number) => x0 + i * cw + cw / 2;
  const shift = (k: number) => setMonth(new Date(Date.UTC(y, mo - 1 + k, 1)).toISOString().slice(0, 7));
  const north = site.lat >= 0;
  const line = (f: (m: MoonState) => number, yf: (v: number) => number) => rows.map((r, i) => `${i ? 'L' : 'M'} ${X(i)} ${yf(f(r.m))}`).join(' ');
  const todayI = rows.findIndex(r => r.ymd === today);
  const Panel = ({ y0, h, label, sub, children }: { y0: number; h: number; label: string; sub: string; children: React.ReactNode }) => <g><rect x={x0} y={y0} width={W - x0 - 10} height={h} fill="var(--card2)" rx={4} /><text x={4} y={y0 + 14} fontSize={10} fontWeight={700} fill="var(--fg)">{label}</text><foreignObject x={4} y={y0 + 18} width={x0 - 8} height={h - 18}><div style={{ fontSize: 8.5, color: 'var(--muted)', lineHeight: 1.2 }}>{sub}</div></foreignObject>{children}</g>;
  return (
    <div className="card wide">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>All five clocks, one month <small>· click a day to open it</small></h2>
        <div className="row"><button onClick={() => shift(-1)}>‹</button><b>{new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}</b><button onClick={() => shift(1)}>›</button></div>
      </div>
      <svg viewBox={`0 0 ${W} 420`} width="100%" style={{ marginTop: 8 }}>
        {todayI >= 0 && <rect x={x0 + todayI * cw} y={0} width={cw} height={400} fill="var(--accent2)" opacity={.12} />}
        {rows.map((r, i) => <text key={'d' + r.ymd} x={X(i)} y={10} fontSize={8} textAnchor="middle" fill={r.ymd === today ? 'var(--accent2)' : 'var(--muted)'} fontWeight={r.ymd === today ? 700 : 400}>{i + 1}</text>)}
        <Panel y0={14} h={44} label="1 · Phase" sub="waxing → full → waning">
          {rows.map((r, i) => <g key={r.ymd} transform={`translate(${X(i) - 9}, 25)`} onClick={() => setState({ selectedDate: r.ymd, tab: 'today' })} style={{ cursor: 'pointer' }}><circle cx={9} cy={9} r={8} fill="#22301f" /><path d={miniMoonPath(r.m.phaseAngle, 9, 9, 8, north)} fill="var(--moon)" /><title>{r.ymd}: {Math.round(r.m.illumination * 100)}% lit</title></g>)}
          {rows.filter(r => r.m.isNewMoonDay || r.m.isFullMoonDay).map(r => <text key={'p' + r.ymd} x={X(rows.indexOf(r))} y={54} fontSize={7} textAnchor="middle" fill="var(--accent2)">{r.m.isNewMoonDay ? 'new' : 'full'}</text>)}
        </Panel>
        <Panel y0={64} h={40} label="2 · Through the stars" sub="top: tropical sign · bottom: real constellation · colour = element → plant part">
          {rows.map((r, i) => <rect key={'t' + r.ymd} x={x0 + i * cw} y={68} width={cw} height={14} fill={ELEMENT_COLOR[SIGN_ELEMENT[r.m.tropical]]} opacity={.85}><title>{r.ymd}: tropical {r.m.tropical}</title></rect>)}
          {rows.map((r, i) => (i === 0 || rows[i - 1].m.tropical !== r.m.tropical) ? <text key={'tg' + r.ymd} x={x0 + i * cw + 2} y={79} fontSize={9} fill="#0f1a13">{SIGN_GLYPH[r.m.tropical]}</text> : null)}
          {rows.map((r, i) => <rect key={'s' + r.ymd} x={x0 + i * cw} y={86} width={cw} height={14} fill={ELEMENT_COLOR[SIGN_ELEMENT[r.m.sidereal]]} opacity={.55}><title>{r.ymd}: constellation {r.m.sidereal}</title></rect>)}
          {rows.map((r, i) => (i === 0 || rows[i - 1].m.sidereal !== r.m.sidereal) ? <text key={'sg' + r.ymd} x={x0 + i * cw + 2} y={97} fontSize={9} fill="#0f1a13">{SIGN_GLYPH[r.m.sidereal]}</text> : null)}
          {ingresses.map((g, i) => <line key={'ing' + i} x1={tX(g.time)} x2={tX(g.time)} y1={g.kind === 'tropical' ? 66 : 84} y2={g.kind === 'tropical' ? 84 : 102} stroke="#0f1a13" strokeWidth={1.2}><title>{g.kind === 'tropical' ? 'Enters' : 'Enters constellation'} {g.to} at {fmtDateTime(g.time, site.tz)}</title></line>)}
        </Panel>
        <Panel y0={110} h={90} label="3 · High and low" sub="declination: Moon's arc climbs (ascending ↗) then sinks (descending ↘). Line = celestial equator.">
          {(() => { const yD = (d: number) => 155 - (north ? d : -d) * 1.4; return <g><line x1={x0} x2={W - 10} y1={yD(0)} y2={yD(0)} stroke="var(--line)" /><text x={W - 12} y={yD(0) - 2} fontSize={7} textAnchor="end" fill="var(--muted)">equator</text><text x={x0 + 3} y={118} fontSize={7} fill="var(--muted)">high in the sky</text><text x={x0 + 3} y={196} fontSize={7} fill="var(--muted)">low in the sky</text><path d={line(m => m.declination, yD)} fill="none" stroke="var(--accent)" strokeWidth={2} />{rows.map((r, i) => <circle key={'dc' + r.ymd} cx={X(i)} cy={yD(r.m.declination)} r={2.5} fill={(north ? r.m.ascending : !r.m.ascending) ? 'var(--accent)' : 'var(--warn)'}><title>{r.ymd}: {r.m.declination.toFixed(1)}° {(north ? r.m.ascending : !r.m.ascending) ? 'ascending' : 'descending'}</title></circle>)}<text x={W - 12} y={118} fontSize={7} textAnchor="end" fill="var(--accent)">● ascending</text><text x={W - 12} y={127} fontSize={7} textAnchor="end" fill="var(--warn)">● descending</text></g>; })()}
        </Panel>
        <Panel y0={206} h={70} label="4 · Near and far" sub="distance: dips = perigee (skip sowing in biodynamic), peaks = apogee">
          {(() => { const yK = (km: number) => 268 - (km - 356000) / 51000 * 52; return <g><path d={line(m => m.distanceKm, yK)} fill="none" stroke="#5aa0d9" strokeWidth={2} />{rows.filter(r => Math.abs(r.m.nearestApsis.hours) <= 12).map(r => { const i = rows.indexOf(r); return <text key={'ap' + r.ymd} x={X(i)} y={yK(r.m.distanceKm) + (r.m.nearestApsis.kind === 'perigee' ? -5 : 11)} fontSize={8} textAnchor="middle" fill="#5aa0d9">{r.m.nearestApsis.kind}</text>; })}<text x={x0 + 3} y={216} fontSize={7} fill="var(--muted)">406 000 km</text><text x={x0 + 3} y={272} fontSize={7} fill="var(--muted)">357 000 km</text></g>; })()}
        </Panel>
        <Panel y0={282} h={70} label="5 · Crossing the Sun's path" sub="ecliptic latitude: zero crossings are the nodes (rest days in biodynamic & French)">
          {(() => { const yL = (l: number) => 317 - l * 5.5; return <g><line x1={x0} x2={W - 10} y1={yL(0)} y2={yL(0)} stroke="var(--warn)" opacity={.6} /><text x={W - 12} y={yL(0) - 2} fontSize={7} textAnchor="end" fill="var(--warn)">ecliptic</text><path d={line(m => m.eclLat, yL)} fill="none" stroke="var(--warn)" strokeWidth={2} />{rows.filter(r => Math.abs(r.m.nearestNode.hours) <= 12).map(r => { const i = rows.indexOf(r); return <g key={'nd' + r.ymd}><circle cx={X(i)} cy={yL(0)} r={4} fill="var(--warn)" /><text x={X(i)} y={yL(0) + 14} fontSize={8} textAnchor="middle" fill="var(--warn)">{r.m.nearestNode.kind === 'ascending' ? '☊' : '☋'} node</text></g>; })}</g>; })()}
        </Panel>
        <Panel y0={358} h={46} label="What each day is" sub="biodynamic reading from clocks 2–5">
          {rows.map((r, i) => { const part = ({ earth: 'root', water: 'leaf', air: 'flower', fire: 'fruit' } as any)[SIGN_ELEMENT[r.m.sidereal]]; const blocked = Math.abs(r.m.nearestNode.hours) <= 12 || (r.m.nearestApsis.kind === 'perigee' && Math.abs(r.m.nearestApsis.hours) <= 12); return <g key={'w' + r.ymd} onClick={() => setState({ selectedDate: r.ymd, tab: 'today' })} style={{ cursor: 'pointer' }}><rect x={x0 + i * cw + 1} y={362} width={cw - 2} height={38} rx={3} fill={blocked ? 'var(--bg2)' : ELEMENT_COLOR[SIGN_ELEMENT[r.m.sidereal]]} opacity={blocked ? 1 : .8} /><text x={X(i)} y={377} fontSize={7} textAnchor="middle" fill={blocked ? 'var(--muted)' : '#0f1a13'}>{blocked ? 'rest' : part}</text><text x={X(i)} y={390} fontSize={7} textAnchor="middle" fill={blocked ? 'var(--muted)' : '#0f1a13'}>{(north ? r.m.ascending : !r.m.ascending) ? '↗ sow' : '↘ plant'}</text><title>{r.ymd}: {blocked ? 'node/perigee — rest day' : `${part} day, ${(north ? r.m.ascending : !r.m.ascending) ? 'ascending: sow, graft' : 'descending: plant out, prune, compost'}`}</title></g>; })}
        </Panel>
        <text x={x0} y={416} fontSize={8} fill="var(--muted)">■ earth → root &nbsp; ■ water → leaf &nbsp; ■ air → flower &nbsp; ■ fire → fruit</text>
      </svg>
      <details><summary>Exact sign changes this month ({ingresses.length}) — computed by bisection on the Moon's longitude, shown in {site.tz}</summary>
        <p className="sr">The day cells above sample the Moon at local noon, so a sign that lasts 2¼ days shows as two or three cells. These are the true crossing times. Constellations are unequal (Scorpius spans 25°, Virgo 44°), so the sidereal intervals vary from 2 to 4 days — that is real, not rounding.</p>
        <div className="two">
          <table className="t"><thead><tr><th>Tropical sign</th><th>Enters</th></tr></thead><tbody>{ingresses.filter(g => g.kind === 'tropical').map((g, i) => <tr key={i}><td>{SIGN_GLYPH[g.to]} {g.to} <span className="muted">({SIGN_ELEMENT[g.to]})</span></td><td>{fmtDateTime(g.time, site.tz)}</td></tr>)}</tbody></table>
          <table className="t"><thead><tr><th>Constellation</th><th>Enters</th></tr></thead><tbody>{ingresses.filter(g => g.kind === 'sidereal').map((g, i) => <tr key={i}><td>{SIGN_GLYPH[g.to]} {g.to} <span className="muted">({SIGN_ELEMENT[g.to]} → {({ earth: 'root', water: 'leaf', air: 'flower', fire: 'fruit' } as any)[SIGN_ELEMENT[g.to]]})</span></td><td>{fmtDateTime(g.time, site.tz)}</td></tr>)}</tbody></table>
        </div>
      </details>
    </div>
  );
}

/* ---------- year wheel (unchanged) ---------- */
function YearWheel({ year, today }: { year: number; today: string }) {
  const site = useSite();
  const off = tzOffsetHours(site.tz, new Date());
  const R = 150, cx = 190, cy = 190;
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
  const arc = (a: number, b: number, r: number) => { const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r); const sweep = ((b - a + 360) % 360) > 180 ? 1 : 0; return `M ${x1} ${y1} A ${r} ${r} 0 ${sweep} 0 ${x2} ${y2}`; };
  return (
    <div className="card wide">
      <h2>The year as the Sun sees it <small>· {year} · angle = Sun's ecliptic longitude, so the 24 solar terms are evenly spaced and the calendar months are not</small></h2>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <svg viewBox="0 0 380 380" width="380" style={{ maxWidth: '100%' }}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" />
          <circle cx={cx} cy={cy} r={R - 34} fill="none" stroke="var(--line)" />
          <path d={arc(data.lf, data.ff, R - 17)} stroke="var(--accent)" strokeWidth={30} fill="none" opacity={.25} />
          {[['Summer solstice', 90], ['Winter solstice', 270], ['Spring equinox', 0], ['Autumn equinox', 180]].map(([l, lon]) => { const [x, y] = pt(+lon, R + 22); return <text key={l as string} x={x} y={y} fontSize={9} textAnchor="middle" fill="var(--muted)">{l}</text>; })}
          {data.terms.map(e => { const [x1, y1] = pt(e.def.lon, R), [x2, y2] = pt(e.def.lon, R - 6), [tx, ty] = pt(e.def.lon + 7.5, R - 24); return <g key={e.def.i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--fg)" /><text x={tx} y={ty + 3} fontSize={8.5} textAnchor="middle" fill="var(--fg)">{e.def.zh}</text><title>{e.def.ko} {e.def.en} — {e.ymd}</title></g>; })}
          {data.monthStarts.map((mm, i) => { const [x1, y1] = pt(mm.lon, R - 34), [x2, y2] = pt(mm.lon, R - 42), [tx, ty] = pt(mm.lon + 14, R - 52); return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" /><text x={tx} y={ty + 3} fontSize={9} textAnchor="middle" fill="var(--muted)">{new Date(Date.UTC(2001, i, 1)).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</text></g>; })}
          {data.newMoons.map((mm, i) => { const [x, y] = pt(mm.lon, R - 70); return <g key={'n' + i}><circle cx={x} cy={y} r={5} fill="#0f1a13" stroke="var(--fg)" /><text x={x} y={y + 14} fontSize={7.5} textAnchor="middle" fill="var(--muted)">{mm.leap ? '윤' : ''}{mm.month}월</text><title>New Moon {mm.ymd} — start of 음력 {mm.leap ? '윤' : ''}{KO_MONTHS[mm.month - 1]}</title></g>; })}
          {data.fullMoons.map((mm, i) => { const [x, y] = pt(mm.lon, R - 70); return <circle key={'f' + i} cx={x} cy={y} r={4} fill="var(--moon)"><title>Full Moon {mm.ymd}</title></circle>; })}
          {(() => { const [x, y] = pt(data.perihelionLon, R - 95); return <g><circle cx={x} cy={y} r={3} fill="var(--warn)" /><title>Perihelion {data.perihelionYmd}: Earth closest to the Sun</title></g>; })()}
          {(() => { const [x, y] = pt(data.todayLon, R - 17); const [x0, y0] = pt(data.todayLon, R - 100); return <g><line x1={x0} y1={y0} x2={x} y2={y} stroke="var(--accent2)" strokeWidth={2} /><circle cx={x} cy={y} r={6} fill="var(--accent2)" /><title>{today}</title></g>; })()}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--fg)">{year}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="var(--muted)">frost-free {fmtMD(site.lastFrost)} – {fmtMD(site.firstFrost)}</text>
        </svg>
        <div style={{ flex: 1, minWidth: 220 }} className="sr">
          <p><b>Read it like this.</b> The Sun moves anticlockwise. Each spoke on the outer ring is a 节气/절기 — fifteen degrees of the Sun's path, about fifteen days. The grey ticks are the Gregorian months: they drift against the terms because our calendar is not tied to the Sun's longitude the way the terms are.</p>
          <p>The beads on the inner ring are the new Moons (dark) and full Moons (light). Twelve and a bit lunations fit in a solar year, which is why the Korean and Chinese calendars insert a leap month (윤달/闰月) every two or three years — you can see the extra bead when it happens.</p>
          <p>The green band is your frost-free season at {site.name}. The amber dot is perihelion: Earth is closest to the Sun in early January, so seasons come from tilt, not distance.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- pattern grid, rebuilt ---------- */
function PatternGrid() {
  const site = useSite();
  const [start, setStart] = useState(new Date().getUTCFullYear() - 10);
  const years = 20;
  const [mode, setMode] = useState<'phase' | 'distance' | 'declination'>('phase');
  const [pick, setPick] = useState<{ y: number; d: number } | null>(null);
  const cw = 3.2, ch = 14, x0 = 44;
  const cells = useMemo(() => {
    const out: Array<{ y: number; d: number; v: number; ymd: string }> = [];
    for (let yi = 0; yi < years; yi++) { const y = start + yi; for (let d = 0; d < 366; d++) { const t = new Date(Date.UTC(y, 0, 1 + d, 12)); if (t.getUTCFullYear() !== y) continue; let v: number; if (mode === 'phase') v = A.Illumination(A.Body.Moon, t).phase_fraction; else if (mode === 'distance') v = (A.GeoVector(A.Body.Moon, t, false).Length() * A.KM_PER_AU - 356000) / 51000; else v = (A.Equator(A.Body.Moon, t, new A.Observer(0, 0, 0), true, true).dec + 29) / 58; out.push({ y, d, v, ymd: t.toISOString().slice(0, 10) }); } }
    return out;
  }, [start, mode]);
  const color = (v: number) => mode === 'phase' ? `rgb(${Math.round(25 + v * 215)},${Math.round(25 + v * 210)},${Math.round(20 + v * 170)})` : mode === 'distance' ? `hsl(${210 + v * 50}, 70%, ${30 + v * 40}%)` : `hsl(${v * 120}, 60%, ${30 + v * 30}%)`;
  const fulls = useMemo(() => mode === 'phase' ? cells.filter((c, i) => c.v > 0.98 && (i === 0 || cells[i - 1].y !== c.y || cells[i - 1].v <= c.v) && (i === cells.length - 1 || cells[i + 1].y !== c.y || cells[i + 1].v < c.v)) : [], [cells, mode]);
  return (
    <div className="card wide">
      <h2>Patterns across {years} years <small>· one row per year, one column per day of the year · click any day</small></h2>
      <div className="row"><button onClick={() => setStart(start - 10)}>‹ 10 yrs</button><span>{start}–{start + years - 1}</span><button onClick={() => setStart(start + 10)}>10 yrs ›</button>
        <div className="chips">{(['phase', 'distance', 'declination'] as const).map(mm => <button key={mm} className={`chip ${mode === mm ? 'on' : ''}`} onClick={() => setMode(mm)}>{mm}</button>)}</div></div>
      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <svg width={x0 + 366 * cw + 10} height={years * ch + 24} style={{ display: 'block' }}>
          {'JFMAMJJASOND'.split('').map((mm, i) => <text key={i} x={x0 + Math.round(i * 30.4 * cw)} y={10} fontSize={9} fill="var(--muted)">{mm}</text>)}
          {Array.from({ length: years }, (_, yi) => <text key={yi} x={x0 - 4} y={16 + yi * ch + 10} fontSize={9} textAnchor="end" fill={start + yi === new Date().getUTCFullYear() ? 'var(--accent2)' : 'var(--muted)'}>{start + yi}</text>)}
          {cells.map(c => <rect key={c.ymd} x={x0 + c.d * cw} y={16 + (c.y - start) * ch} width={cw} height={ch - 1} fill={color(c.v)} onClick={() => setPick({ y: c.y, d: c.d })} style={{ cursor: 'pointer' }}><title>{c.ymd}</title></rect>)}
          {mode === 'phase' && fulls.map(c => <circle key={'f' + c.ymd} cx={x0 + c.d * cw + cw / 2} cy={16 + (c.y - start) * ch + ch / 2} r={2.2} fill="none" stroke="#0f1a13" strokeWidth={.8} />)}
          {pick && <g>
            <rect x={x0 + pick.d * cw - 1} y={16 + (pick.y - start) * ch - 1} width={cw + 2} height={ch + 1} fill="none" stroke="var(--accent2)" strokeWidth={1.5} />
            {pick.y + 19 < start + years && <g><rect x={x0 + pick.d * cw - 1} y={16 + (pick.y + 19 - start) * ch - 1} width={cw + 2} height={ch + 1} fill="none" stroke="var(--accent)" strokeWidth={1.5} /><line x1={x0 + pick.d * cw + cw / 2} y1={16 + (pick.y - start) * ch + ch} x2={x0 + pick.d * cw + cw / 2} y2={16 + (pick.y + 19 - start) * ch} stroke="var(--accent)" strokeDasharray="2 2" /><text x={x0 + pick.d * cw + 6} y={16 + (pick.y + 9 - start) * ch + 8} fontSize={9} fill="var(--accent)">19 years later: same phase (Metonic)</text></g>}
            {pick.y + 8 < start + years && <rect x={x0 + pick.d * cw - 1} y={16 + (pick.y + 8 - start) * ch - 1} width={cw + 2} height={ch + 1} fill="none" stroke="var(--warn)" strokeWidth={1.2} />}
          </g>}
        </svg>
      </div>
      <p className="sr">{mode === 'phase' && <>Bright = full Moon (ringed), dark = new. Each year the stripes shift left by about 11 days because 12 lunations fall short of a year; after three years a 13th lunation (a leap month) has squeezed in. <b>Click any full Moon</b>: the green box 19 rows down lands on the same date — the Metonic cycle behind the Korean and Chinese leap-month rule and the Easter computus. The amber box 8 rows down is the cruder 8-year repeat.</>}
        {mode === 'distance' && <>Light = far (apogee), dark = near (perigee). Watch the dark stripe creep rightward year by year: perigee drifts through the calendar over 8.85 years (the apsidal cycle). Where a dark stripe meets a full Moon you get a 'supermoon'; biodynamic calendars skip perigee days whatever the phase.</>}
        {mode === 'declination' && <>Green = Moon far north (high in a northern sky), red = far south. Each row shows the monthly ascending/descending swing of clocks 3; the swing is widest in the 'major standstill' years (2006, 2024–25, 2043) and narrowest 9 years later, as the nodes regress round the ecliptic over 18.6 years. Southern hemisphere: read the colours the other way up.</>}</p>
      {pick && <p className="sr">Selected {start + 0 <= pick.y ? `${pick.y}-${String(new Date(Date.UTC(pick.y, 0, 1 + pick.d)).getUTCMonth() + 1).padStart(2, '0')}-${String(new Date(Date.UTC(pick.y, 0, 1 + pick.d)).getUTCDate()).padStart(2, '0')}` : ''} — <a href="#" onClick={e => { e.preventDefault(); setState({ selectedDate: new Date(Date.UTC(pick.y, 0, 1 + pick.d)).toISOString().slice(0, 10), tab: 'today' }); }}>open that day</a></p>}
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
        <table className="t" style={{ marginTop: 8 }}><thead><tr><th>Day</th><th>Sunrise</th><th>Sunset</th><th>Moonrise</th><th>Moonset</th><th>Lit</th><th>Constellation</th><th>Tropical sign</th><th>Dec</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.ymd}><td>{+r.ymd.slice(8)}</td><td>{r.sr ? fmtTime(r.sr, site.tz) : '—'}</td><td>{r.ss ? fmtTime(r.ss, site.tz) : '—'}</td><td>{r.m.rise ? fmtTime(r.m.rise, site.tz) : '—'}</td><td>{r.m.set ? fmtTime(r.m.set, site.tz) : '—'}</td><td>{Math.round(r.ms.illumination * 100)}%</td><td>{SIGN_GLYPH[r.ms.sidereal]} {r.ms.sidereal}</td><td>{SIGN_GLYPH[r.ms.tropical]} {r.ms.tropical}</td><td>{r.ms.declination.toFixed(1)}°</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}
