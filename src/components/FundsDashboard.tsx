import React, { useMemo } from 'react';
import { BellRing, Banknote, CalendarDays, Wallet, TrendingUp, AlertTriangle, Search, ArrowRight, Receipt } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import { HeadId, headLabel } from '../services/heads';
import { todayIso } from '../services/collection';
import { useAllLedgers, useAllSettings } from '../services/liability';
import { computeFundStats } from '../services/fundStats';
import type { Tab } from '../services/access';
import { Columns, Donut, HBars, HEAD_COLOR, MODE_COLOR, MODE_LABEL, inrFull, inrShort } from './charts';

interface Props {
  townKey: string;
  townName: string;
  records: PropertyRecord[];
  heads: HeadId[];
  /** Pages this login may open, so only usable shortcuts are shown. */
  tabs: Tab[];
  onOpen: (t: Tab) => void;
}

const INK = '#1f3856', MUTED = '#64788f';
const card = 'rounded-2xl border bg-white p-4 sm:p-5';
const cardStyle: React.CSSProperties = { borderColor: '#dbe6f2', boxShadow: '0 8px 28px rgba(20,44,83,.06)' };

const Card: React.FC<{ title: string; sub?: string; children: React.ReactNode; className?: string }> = ({ title, sub, children, className = '' }) => (
  <section className={`${card} ${className}`} style={cardStyle}>
    <h3 className="font-extrabold tracking-tight" style={{ color: INK, fontSize: 15 }}>{title}</h3>
    {sub && <p className="text-xs mt-0.5 mb-3" style={{ color: MUTED }}>{sub}</p>}
    {!sub && <div className="h-3" />}
    {children}
  </section>
);

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; note?: string; tone: string; onClick?: () => void; cta?: string }> = ({ icon, label, value, note, tone, onClick, cta }) => {
  const body = (
    <>
      <span className="w-10 h-10 rounded-xl grid place-items-center flex-none" style={{ background: `${tone}18`, color: tone }}>{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{label}</span>
        <span className="block font-black tabular-nums leading-tight whitespace-nowrap" style={{ color: INK, fontSize: 'clamp(19px, 5.4vw, 24px)' }}>{value}</span>
        {note && <span className="block text-xs mt-0.5" style={{ color: MUTED }}>{note}</span>}
        {cta && <span className="inline-flex items-center gap-1 text-xs font-bold mt-1" style={{ color: tone }}>{cta} <ArrowRight className="w-3 h-3" /></span>}
      </span>
    </>
  );
  const cls = `${card} flex items-start gap-3 ${onClick ? 'text-left hover:-translate-y-0.5 transition-transform cursor-pointer' : ''}`;
  const st: React.CSSProperties = { ...cardStyle, borderTop: `3px solid ${tone}` };
  return onClick ? <button type="button" onClick={onClick} className={cls} style={st}>{body}</button> : <div className={cls} style={st}>{body}</div>;
};

/** Recovery gauge: share of everything payable that has already been collected. */
const Gauge: React.FC<{ pct: number }> = ({ pct }) => {
  const R = 44, C = 2 * Math.PI * R, p = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 110 110" className="w-24 h-24 flex-none" role="img" aria-label={`Recovery ${p}%`}>
      <circle cx="55" cy="55" r={R} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="10" />
      <circle cx="55" cy="55" r={R} fill="none" stroke="#34d399" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(p / 100) * C} ${C}`} transform="rotate(-90 55 55)" />
      <text x="55" y="54" textAnchor="middle" style={{ fontSize: 22, fontWeight: 900, fill: '#fff' }}>{p % 1 === 0 ? p : p.toFixed(1)}%</text>
      <text x="55" y="70" textAnchor="middle" style={{ fontSize: 8.5, fontWeight: 700, fill: '#a9c4ec', letterSpacing: '.08em' }}>RECOVERED</text>
    </svg>
  );
};

export const FundsDashboard: React.FC<Props> = ({ townKey, townName, records, heads, tabs, onOpen }) => {
  const { ledgers, status } = useAllLedgers(townKey);
  const { settings, ready: settingsReady } = useAllSettings(townKey);
  const ready = status === 'ready' && settingsReady;
  const today = todayIso();

  const town = useMemo(() => records.filter((r) => r && r.id && r.town === townName), [records, townName]);
  const byId = useMemo(() => new Map(town.map((r) => [r.id, r])), [town]);

  const stats = useMemo(
    () => (ready ? computeFundStats(heads, ledgers, settings, (pid) => byId.get(pid)?.ward, today, 6) : null),
    [ready, heads, ledgers, settings, byId, today],
  );

  const t = stats?.totals;
  const can = (x: Tab) => tabs.includes(x);

  const headSeries = [
    { key: 'demand', label: 'Demand', color: '#94a3b8' },
    { key: 'collected', label: 'Collected', color: '#16a34a' },
    { key: 'pending', label: 'Pending', color: '#ef4444' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-10">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl" style={{ background: 'linear-gradient(120deg,#0a1b3a 0%,#123a73 55%,#0f6b86 100%)', boxShadow: '0 18px 44px rgba(10,27,58,.30)' }}>
        <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 88% 0%,rgba(52,211,153,.22),transparent 45%),radial-gradient(ellipse at 8% 100%,rgba(96,165,250,.22),transparent 50%)' }} />
        <div className="relative px-5 py-5 sm:px-7 sm:py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase" style={{ color: '#7dd3fc', letterSpacing: '.14em' }}>Funds overview</p>
            <h2 className="font-black tracking-tight" style={{ color: '#fff', fontSize: 28, lineHeight: 1.1 }}>{townName}</h2>
            <p className="mt-1.5 text-sm" style={{ color: '#bcd3f3' }}>
              Demand, collection and pending across {heads.length} bill{heads.length === 1 ? '' : 's'} · as on {new Date(today + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            <span className="inline-flex items-center gap-1.5 mt-3 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: 'rgba(52,211,153,.16)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,.3)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }} /> Live from the ledger
            </span>
          </div>
          <div className="flex items-center gap-5">
            {t && <Gauge pct={t.recovery} />}
            <div className="flex flex-col gap-2">
              {can('notices') && (
                <button type="button" onClick={() => onOpen('notices')} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold" style={{ background: '#fbbf24', color: '#3b2600' }}>
                  <BellRing className="w-4 h-4" /> Send dues notices
                </button>
              )}
              {can('search') && (
                <button type="button" onClick={() => onOpen('search')} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.22)' }}>
                  <Search className="w-4 h-4" /> Search dues
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {status === 'error' && <p role="alert" className="text-sm" style={{ color: '#b42318' }}>Figures could not be loaded. Check the internet connection and reopen this page.</p>}

      {!stats && status !== 'error' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={`${card} h-[104px] animate-pulse`} style={{ ...cardStyle, background: '#eef3f9' }} />)}
        </div>
      )}

      {stats && t && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Kpi icon={<Receipt className="w-5 h-5" />} label="Total demand" value={inrShort(t.demand)} note={`${inrFull(t.demand)} raised`} tone="#2f6fed" />
            <Kpi icon={<Banknote className="w-5 h-5" />} label="Collected" value={inrShort(t.collected)} note={t.rebate > 0 ? `plus ${inrShort(t.rebate)} rebate given` : 'payments received'} tone="#16a34a" />
            <Kpi icon={<Wallet className="w-5 h-5" />} label="Pending" value={inrShort(t.pending)} note={`incl. ${inrShort(t.interest)} interest`} tone="#ef4444" />
            <Kpi icon={<CalendarDays className="w-5 h-5" />} label="Collected today" value={inrShort(t.today)} note={`${inrShort(t.thisMonth)} this month`} tone="#0ea5c6" />
            <Kpi icon={<TrendingUp className="w-5 h-5" />} label="Properties with dues" value={String(t.withDues)} note={`of ${town.length} surveyed`} tone="#7c3aed" />
            <Kpi icon={<AlertTriangle className="w-5 h-5" />} label="Defaulters (overdue)" value={String(t.defaulters)} tone="#f59e0b"
              note={t.defaulters ? 'due date already passed' : 'no overdue bills'} cta={can('notices') && t.defaulters ? 'Send notices' : undefined}
              onClick={can('notices') ? () => onOpen('notices') : undefined} />
          </div>

          {/* Pie charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Pending by bill" sub="How the outstanding amount splits across bills">
              <Donut centerTop={inrShort(t.pending)} centerBottom="Pending"
                data={stats.perHead.map((h) => ({ label: headLabel(h.head), value: h.pending, color: HEAD_COLOR[h.head] }))} empty="No pending dues. Everything is cleared." />
            </Card>
            <Card title="Collected by payment mode" sub="Where the money came from">
              <Donut centerTop={inrShort(t.collected)} centerBottom="Collected"
                data={stats.byMode.map((m) => ({ label: MODE_LABEL[m.mode] || m.mode, value: m.amount, color: MODE_COLOR[m.mode] || '#64748b' }))} empty="No payments recorded yet." />
            </Card>
          </div>

          {/* Bar charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Demand, collected and pending by bill" sub="Bill-wise position of the funds">
              <Columns series={headSeries}
                groups={stats.perHead.map((h) => ({ label: headLabel(h.head).replace(' utilities', '').replace(' tax', ' tax'), values: { demand: h.demand, collected: h.collected, pending: h.pending } }))} />
            </Card>
            <Card title="Collections, last 6 months" sub="Month-wise money received, split by bill">
              <Columns stacked series={stats.perHead.map((h) => ({ key: h.head, label: headLabel(h.head), color: HEAD_COLOR[h.head] }))}
                groups={stats.monthly.map((m) => ({ label: m.label, values: m.byHead as Record<string, number> }))} />
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Ward-wise pending" sub="Top wards by outstanding amount">
              <HBars rows={stats.wards.slice(0, 8).map((w) => ({ label: /^\d+$/.test(w.ward) ? `Ward ${w.ward}` : w.ward, value: w.pending, note: `${w.properties} propert${w.properties === 1 ? 'y' : 'ies'}` }))} empty="No pending dues in any ward." />
            </Card>
            <Card title="Recovery by bill" sub="Collected as a share of collected + pending">
              <ul className="space-y-3">
                {stats.perHead.map((h) => {
                  const base = h.collected + h.pending;
                  const pct = base > 0 ? Math.round((h.collected / base) * 100) : 0;
                  return (
                    <li key={h.head}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold" style={{ color: INK }}>{headLabel(h.head)}</span>
                        <span className="font-bold tabular-nums" style={{ color: INK }}>{base > 0 ? `${pct}%` : 'no bills yet'}</span>
                      </div>
                      <div className="mt-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#e3ebf5' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: HEAD_COLOR[h.head] }} />
                      </div>
                      <div className="flex justify-between text-[11px] mt-0.5" style={{ color: MUTED }}>
                        <span>Collected {inrShort(h.collected)}</span><span>Pending {inrShort(h.pending)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          {/* Biggest dues */}
          <Card title="Largest pending dues" sub="Top 5 properties by total outstanding">
            {stats.dues.length === 0 ? <p className="text-sm" style={{ color: MUTED }}>No pending dues.</p> : (
              <ul className="divide-y" style={{ borderColor: '#e6edf6' }}>
                {stats.dues.slice(0, 5).map((d) => {
                  const r = byId.get(d.pid);
                  return (
                    <li key={d.pid} className="py-2.5 flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-bold truncate" style={{ color: INK }}>{r?.owner || 'Owner not recorded'}</span>
                        <span className="block text-xs truncate" style={{ color: MUTED }}>{d.pid}{r ? ` · Ward ${r.ward}` : ''} · {Object.entries(d.byHead).map(([h, v]) => `${headLabel(h as HeadId)} ${inrShort(v as number)}`).join(' · ')}</span>
                      </span>
                      <span className="font-black tabular-nums whitespace-nowrap" style={{ color: '#dc2626' }}>{inrFull(d.total)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <p className="text-[11px]" style={{ color: MUTED }}>Figures are worked out live from every bill's ledger (reversed entries are ignored). Pending includes interest charged under each bill's approved rules.</p>
        </>
      )}
    </div>
  );
};
