// Small dependency-free SVG charts for the funds dashboard. Colours are inline so the page theme cannot wash them out.
import React, { useState } from 'react';

export const HEAD_COLOR: Record<string, string> = {
  property_tax: '#2f6fed', water: '#0ea5c6', garbage: '#16a34a', sewerage: '#7c3aed', other: '#64748b',
};
export const MODE_COLOR: Record<string, string> = {
  cash: '#16a34a', upi: '#2f6fed', cheque: '#f59e0b', razorpay: '#7c3aed', other: '#64748b',
};
export const MODE_LABEL: Record<string, string> = { cash: 'Cash', upi: 'UPI', cheque: 'Cheque', razorpay: 'Online (Razorpay)', other: 'Other' };

/** ₹ in Indian short form: 12,500 -> ₹12.5K, 3,40,000 -> ₹3.4 L, 2.5 crore -> ₹2.5 Cr. */
export function inrShort(n: number): string {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(a >= 1e8 ? 1 : 2).replace(/\.?0+$/, '')} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1).replace(/\.?0+$/, '')}K`;
  return `${s}₹${Math.round(a)}`;
}
export const inrFull = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const INK = '#1f3856', MUTED = '#64788f', GRID = '#e3ebf5';

/** Round an axis maximum up to a clean number and give 4 tick steps. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

export interface Slice { label: string; value: number; color: string }

export const Donut: React.FC<{ data: Slice[]; centerTop: string; centerBottom: string; empty?: string }> = ({ data, centerTop, centerBottom, empty = 'Nothing to show yet' }) => {
  const [hot, setHot] = useState<number | null>(null);
  const items = data.filter((d) => d.value > 0.004);
  const total = items.reduce((a, d) => a + d.value, 0);
  const R = 70, W = 26, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg viewBox="0 0 200 200" className="w-44 h-44 flex-none" role="img" aria-label={`${centerBottom} ${centerTop}`}>
        <circle cx="100" cy="100" r={R} fill="none" stroke={GRID} strokeWidth={W} />
        {total > 0 && items.map((d, i) => {
          const len = (d.value / total) * C;
          const el = (
            <circle key={d.label} cx="100" cy="100" r={R} fill="none" stroke={d.color} strokeWidth={hot === i ? W + 5 : W}
              strokeDasharray={`${Math.max(len - (items.length > 1 ? 2 : 0), 0.5)} ${C}`} strokeDashoffset={-acc}
              transform="rotate(-90 100 100)" style={{ transition: 'stroke-width .15s' }}
              onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)}><title>{`${d.label}: ${inrFull(d.value)}`}</title></circle>
          );
          acc += len;
          return el;
        })}
        <text x="100" y="97" textAnchor="middle" style={{ fontSize: 21, fontWeight: 800, fill: INK }}>{total > 0 ? centerTop : '—'}</text>
        <text x="100" y="117" textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 700, fill: MUTED, letterSpacing: '.06em' }}>{centerBottom.toUpperCase()}</text>
      </svg>
      <ul className="w-full min-w-0 space-y-1.5">
        {items.length === 0 && <li className="text-sm" style={{ color: MUTED }}>{empty}</li>}
        {items.map((d, i) => (
          <li key={d.label} onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)}
            className="flex items-center gap-2 text-sm rounded-lg px-2 py-1.5" style={{ background: hot === i ? '#f1f6fd' : 'transparent' }}>
            <span className="w-3 h-3 rounded-[4px] flex-none" style={{ background: d.color }} />
            <span className="flex-1 truncate font-semibold" style={{ color: INK }}>{d.label}</span>
            <span className="font-bold tabular-nums" style={{ color: INK }}>{inrShort(d.value)}</span>
            <span className="w-11 text-right text-xs tabular-nums" style={{ color: MUTED }}>{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export interface Series { key: string; label: string; color: string }
export interface Group { label: string; values: Record<string, number> }

/** Vertical columns. `stacked` piles the series up, otherwise they stand side by side. */
export const Columns: React.FC<{ groups: Group[]; series: Series[]; stacked?: boolean; height?: number }> = ({ groups, series, stacked = false, height = 220 }) => {
  const [hot, setHot] = useState<number | null>(null);
  const W = 420, H = height, L = 46, T = 14, B = 30, R = 6;
  const tot = (g: Group) => series.reduce((a, s) => a + (g.values[s.key] || 0), 0);
  const maxV = niceMax(Math.max(0, ...groups.map((g) => (stacked ? tot(g) : Math.max(0, ...series.map((s) => g.values[s.key] || 0))))));
  const ph = H - T - B, pw = W - L - R;
  const slot = pw / Math.max(groups.length, 1);
  const bw = stacked ? Math.min(40, slot * 0.58) : Math.min(22, (slot * 0.72) / series.length);
  const y = (v: number) => T + ph - (v / maxV) * ph;
  const any = groups.some((g) => tot(g) > 0);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (maxV / 4) * i;
          return (
            <g key={i}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
              <text x={L - 7} y={y(v) + 3.5} textAnchor="end" style={{ fontSize: 11, fill: MUTED }}>{inrShort(v)}</text>
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const cx = L + slot * gi + slot / 2;
          let base = 0;
          return (
            <g key={g.label} onMouseEnter={() => setHot(gi)} onMouseLeave={() => setHot(null)}>
              {hot === gi && <rect x={cx - slot / 2 + 3} y={T} width={slot - 6} height={ph} rx="8" fill="#eef4fd" />}
              {series.map((s, si) => {
                const v = g.values[s.key] || 0;
                if (v <= 0) return null;
                const h = (v / maxV) * ph;
                const x = stacked ? cx - bw / 2 : cx - (bw * series.length) / 2 + si * bw + (si > 0 ? 0 : 0);
                const yy = stacked ? y(base + v) : y(v);
                base += v;
                return <rect key={s.key} x={x + (stacked ? 0 : 1)} y={yy} width={bw - (stacked ? 0 : 2)} height={Math.max(h - (stacked ? 1 : 0), 1)} rx={stacked ? 2 : 4} fill={s.color}><title>{`${g.label} · ${s.label}: ${inrFull(v)}`}</title></rect>;
              })}
              <text x={cx} y={H - 10} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 600, fill: MUTED }}>{g.label}</text>
              {hot === gi && stacked && tot(g) > 0 && <text x={cx} y={y(tot(g)) - 5} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 800, fill: INK }}>{inrShort(tot(g))}</text>}
            </g>
          );
        })}
        {!any && <text x={W / 2} y={H / 2} textAnchor="middle" style={{ fontSize: 13, fill: MUTED }}>No collections recorded in this period</text>}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: INK }}>
            <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color }} />{s.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Ranked horizontal bars (e.g. pending by ward). */
export const HBars: React.FC<{ rows: { label: string; value: number; note?: string }[]; color?: string; empty?: string }> = ({ rows, color = '#ef4444', empty = 'Nothing to show yet' }) => {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm" style={{ color: MUTED }}>{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold truncate" style={{ color: INK }}>{r.label}</span>
            <span className="font-bold tabular-nums whitespace-nowrap" style={{ color: INK }}>{inrShort(r.value)}{r.note && <span className="ml-2 text-xs font-medium" style={{ color: MUTED }}>{r.note}</span>}</span>
          </div>
          <div className="mt-1 h-2.5 rounded-full overflow-hidden" style={{ background: GRID }}>
            <div className="h-full rounded-full" style={{ width: `${max > 0 ? Math.max((r.value / max) * 100, 2) : 0}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, transition: 'width .4s' }} />
          </div>
        </li>
      ))}
    </ul>
  );
};
