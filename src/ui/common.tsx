import React from 'react';
import type { MoonState } from '../astro/moon';

export function scoreColor(v: number | undefined) {
  if (v === undefined) return 'var(--neutral)';
  if (v >= 1.2) return '#4f9d3f'; if (v >= 0.4) return '#7fb069'; if (v > -0.4) return '#8a9a7f'; if (v > -1.2) return '#d9a05f'; return '#d96c5f';
}
export function scoreWord(v: number | undefined) {
  if (v === undefined) return 'no opinion'; if (v >= 1.2) return 'excellent'; if (v >= 0.4) return 'good'; if (v > -0.4) return 'neutral'; if (v > -1.2) return 'poor'; return 'avoid';
}

/** Moon disc with the real terminator for the phase angle (0 new → 180 full → 360). */
export function MoonDisc({ phase, size = 120, lat = 36 }: { phase: number; size?: number; lat?: number }) {
  const r = size / 2 - 2, cx = size / 2, cy = size / 2;
  const k = Math.cos((phase * Math.PI) / 180); // terminator ellipse semi-axis ratio
  const waxing = phase < 180;
  // In the northern hemisphere the lit limb is on the right when waxing. Southern: mirrored.
  const litRight = lat >= 0 ? waxing : !waxing;
  const sweepLimb = litRight ? 1 : 0;
  const rx = Math.abs(k) * r;
  // Lit region = half disc on lit side + (if k<0 i.e. gibbous) the terminator bulge on dark side, else minus the crescent bite.
  const termSweep = (k < 0) === litRight ? 1 : 0;
  const path = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweepLimb} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${termSweep} ${cx} ${cy - r} Z`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Moon, phase ${Math.round(phase)}°`}>
      <defs><radialGradient id="mg" cx="40%" cy="35%"><stop offset="0" stopColor="#fff8dc" /><stop offset="1" stopColor="var(--moon)" /></radialGradient></defs>
      <circle cx={cx} cy={cy} r={r} fill="#22301f" stroke="var(--line)" />
      <path d={path} fill="url(#mg)" />
      <circle cx={cx - r * 0.25} cy={cy - r * 0.2} r={r * 0.11} fill="rgba(0,0,0,.07)" />
      <circle cx={cx + r * 0.3} cy={cy + r * 0.25} r={r * 0.16} fill="rgba(0,0,0,.07)" />
      <circle cx={cx - r * 0.1} cy={cy + r * 0.45} r={r * 0.08} fill="rgba(0,0,0,.07)" />
    </svg>
  );
}

export function phaseName(m: MoonState) {
  const p = m.phaseAngle;
  if (m.isNewMoonDay) return 'New Moon'; if (m.isFullMoonDay) return 'Full Moon';
  if (Math.abs(p - 90) < 6) return 'First Quarter'; if (Math.abs(p - 270) < 6) return 'Last Quarter';
  if (p < 90) return 'Waxing crescent'; if (p < 180) return 'Waxing gibbous'; if (p < 270) return 'Waning gibbous'; return 'Waning crescent';
}

export function Toast({ msg }: { msg: string | null }) { return msg ? <div className="toast">{msg}</div> : null; }

export function fmtMD(md: string) { const [m, d] = md.split('-').map(Number); return new Date(Date.UTC(2001, m - 1, d)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }); }
export function fmtYMD(ymd: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' }); }
export function todayYmd(tz: string) { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch { return new Date().toISOString().slice(0, 10); } }
export const Row: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => <div className="row" style={style}>{children}</div>;
