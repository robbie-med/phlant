import React from 'react';

export function Section({ title, sub, right, children, wide, className, hero }: { title?: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; children?: React.ReactNode; wide?: boolean; className?: string; hero?: boolean }) {
  return (
    <section className={`card ${wide ? 'wide' : ''} ${hero ? 'hero' : ''} ${className ?? ''}`}>
      {(title || right) && <div className="section-h"><div>{title && <h2>{title}</h2>}{sub && <p>{sub}</p>}</div>{right}</div>}
      {children}
    </section>
  );
}
export function Seg<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: Array<[T, React.ReactNode]>; onChange: (v: T) => void; ariaLabel?: string }) {
  return <div className="seg" role="tablist" aria-label={ariaLabel}>{options.map(([v, l]) => <button key={v} role="tab" aria-selected={v === value} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}</div>;
}
export function Stat({ value, label }: { value: React.ReactNode; label: React.ReactNode }) { return <div className="stat"><b>{value}</b><span>{label}</span></div>; }
export function Acc({ head, sub, icon, open, children }: { head: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; open?: boolean; children: React.ReactNode }) {
  return <details className="acc" open={open}><summary>{icon && <span>{icon}</span>}<span className="hd">{head}</span>{sub && <span className="sub">{sub}</span>}</summary><div className="body">{children}</div></details>;
}
export function Empty({ children }: { children: React.ReactNode }) { return <div className="empty">{children}</div>; }
export function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return <div className="sheet-bg" onClick={onClose}><div className="sheet" onClick={e => e.stopPropagation()}><div className="grab" />{children}</div></div>;
}
