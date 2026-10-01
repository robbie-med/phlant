import React from 'react';
import type { WindClimatology } from '../services/climate';

export const DIRS16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function isClimatology(w: any): w is WindClimatology { return !!w && Array.isArray(w.monthly) && w.monthly.length === 12; }

/** Rose of 16 sectors. `rotationDeg` rotates so that the plan's "up" is at the top (0 = north up). */
export function WindRose({ wind, month, rotationDeg = 0, size = 220, title }: { wind: WindClimatology; month?: number; rotationDeg?: number; size?: number; title?: string }) {
  const data = month == null ? wind.sectors : wind.monthly[month];
  const max = Math.max(...data, 0.01);
  const cx = size / 2, cy = size / 2, R = size / 2 - 18;
  const ang = (deg: number) => ((deg - rotationDeg - 90) * Math.PI) / 180;
  const wedge = (i: number) => { const a0 = ang(i * 22.5 - 11), a1 = ang(i * 22.5 + 11); const r = (data[i] / max) * R; return `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`; };
  const dom = data.indexOf(Math.max(...data));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} style={{ maxWidth: '100%' }} role="img" aria-label={title ?? 'wind rose'}>
      {[0.25, 0.5, 0.75, 1].map(f => <circle key={f} cx={cx} cy={cy} r={R * f} fill="none" stroke="var(--line)" strokeDasharray={f < 1 ? '2 3' : undefined} />)}
      {Array.from({ length: 16 }, (_, i) => <path key={i} d={wedge(i)} fill={i === dom ? '#5aa0d9' : '#5aa0d9'} opacity={i === dom ? 0.95 : 0.45} stroke="var(--bg)" strokeWidth={0.5}><title>{DIRS16[i]}: {(data[i] * 100).toFixed(0)}% of wind energy{month != null ? ` in ${MONTHS[month]}` : ''}</title></path>)}
      {[0, 4, 8, 12].map(i => { const a = ang(i * 22.5); return <text key={i} x={cx + (R + 11) * Math.cos(a)} y={cy + (R + 11) * Math.sin(a) + 4} fontSize={11} fontWeight={i === 0 ? 700 : 400} textAnchor="middle" fill={i === 0 ? 'var(--accent2)' : 'var(--muted)'}>{DIRS16[i]}</text>; })}
      {title && <text x={cx} y={size - 2} fontSize={10} textAnchor="middle" fill="var(--muted)">{title}</text>}
    </svg>
  );
}

/** Month × direction heatmap: share of wind energy from each sector, per month. */
export function WindHeatmap({ wind, highlightMonth }: { wind: WindClimatology; highlightMonth?: number }) {
  const cw = 34, ch = 18, x0 = 34, y0 = 16;
  const max = Math.max(...wind.monthly.flat(), 0.01);
  return (
    <svg viewBox={`0 0 ${x0 + 16 * cw + 70} ${y0 + 12 * ch + 6}`} width="100%" role="img" aria-label="wind heatmap">
      {DIRS16.map((d, i) => <text key={d} x={x0 + i * cw + cw / 2} y={11} fontSize={9} textAnchor="middle" fill="var(--muted)">{d}</text>)}
      {wind.monthly.map((row, m) => <g key={m}>
        <text x={x0 - 4} y={y0 + m * ch + 13} fontSize={10} textAnchor="end" fill={m === highlightMonth ? 'var(--accent2)' : 'var(--muted)'} fontWeight={m === highlightMonth ? 700 : 400}>{MONTHS[m]}</text>
        {row.map((v, i) => <rect key={i} x={x0 + i * cw} y={y0 + m * ch} width={cw - 1} height={ch - 1} rx={2} fill={`hsl(205, 70%, ${92 - (v / max) * 60}%)`}><title>{MONTHS[m]} {DIRS16[i]}: {(v * 100).toFixed(0)}% of the month's wind energy</title></rect>)}
        <text x={x0 + 16 * cw + 4} y={y0 + m * ch + 13} fontSize={9} fill="var(--muted)">{wind.monthlyMeanSpeed[m]} km/h · calm {(wind.monthlyCalm[m] * 100).toFixed(0)}%</text>
      </g>)}
    </svg>
  );
}
