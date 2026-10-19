import React from 'react';
import {
  Search, Building2, Layers, FileSpreadsheet, PenTool, Download,
  ClipboardCheck, Droplets, Trash2, Waves, Receipt, Home, Wallet,
  SlidersHorizontal, ChevronRight, Sparkles,
} from 'lucide-react';
import { useAuth } from '../services/auth';
import { HeadId } from '../services/heads';
import { ROLE_LABEL, Tab } from '../services/access';

export type Choice = { tab: Tab; head?: HeadId };

const BILL_ICON: Record<HeadId, React.ReactNode> = {
  property_tax: <Home className="w-6 h-6" strokeWidth={2.2} />,
  water: <Droplets className="w-6 h-6" strokeWidth={2.2} />,
  garbage: <Trash2 className="w-6 h-6" strokeWidth={2.2} />,
  sewerage: <Waves className="w-6 h-6" strokeWidth={2.2} />,
  other: <Receipt className="w-6 h-6" strokeWidth={2.2} />,
};
const BILL_NAME: Record<HeadId, string> = {
  property_tax: 'Property tax',
  water: 'Water bill',
  garbage: 'Garbage bill',
  sewerage: 'Sewerage bill',
  other: 'Other utility bills',
};

/* ── Primary action strip (Search / Pending / Rules) ── */
const ActionRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  note: string;
  tone: 'amber' | 'rose' | 'blue';
  onClick: () => void;
}> = ({ icon, title, note, tone, onClick }) => {
  const tones = {
    amber: {
      wrap: 'border-amber-300/90 from-amber-50/80 to-white hover:border-amber-400',
      iconBox: 'bg-amber-100 text-amber-600 ring-amber-200/80',
      chevron: 'text-amber-400 group-hover:text-amber-600',
    },
    rose: {
      wrap: 'border-rose-300/90 from-rose-50/80 to-white hover:border-rose-400',
      iconBox: 'bg-rose-100 text-rose-600 ring-rose-200/80',
      chevron: 'text-rose-400 group-hover:text-rose-600',
    },
    blue: {
      wrap: 'border-sky-300/90 from-sky-50/80 to-white hover:border-sky-400',
      iconBox: 'bg-sky-100 text-sky-600 ring-sky-200/80',
      chevron: 'text-sky-400 group-hover:text-sky-600',
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-2xl border-2 bg-gradient-to-r ${tones.wrap}
        px-4 py-3.5 sm:px-5 sm:py-4 flex items-center gap-3.5 text-left
        shadow-[0_4px_18px_rgba(20,40,70,0.04)]
        hover:shadow-[0_12px_32px_rgba(20,40,70,0.1)]
        hover:-translate-y-0.5 active:translate-y-0
        transition-all duration-200`}
    >
      <span className={`flex-none w-11 h-11 rounded-xl grid place-items-center ring-1 ${tones.iconBox}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] sm:text-base font-bold text-slate-800 leading-tight tracking-tight">
          {title}
        </span>
        <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{note}</span>
      </span>
      <ChevronRight className={`w-5 h-5 flex-none opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ${tones.chevron}`} />
    </button>
  );
};

/* ── Collect-bill tiles (strong accent) ── */
const BillTile: React.FC<{
  icon: React.ReactNode;
  title: string;
  note?: string;
  onClick: () => void;
}> = ({ icon, title, note, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative text-left overflow-hidden rounded-2xl min-h-[120px] p-4
      flex flex-col justify-between text-white
      bg-gradient-to-br from-[#4f7dff] via-[#4568e8] to-[#2f4fc4]
      shadow-[0_12px_28px_rgba(47,79,196,0.28)]
      hover:shadow-[0_18px_40px_rgba(47,79,196,0.4)]
      hover:-translate-y-1 active:translate-y-0
      transition-all duration-200"
  >
    <span
      className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full
        bg-white/10 blur-xl group-hover:bg-cyan-300/20 transition-colors"
      aria-hidden
    />
    <span className="relative w-10 h-10 rounded-xl bg-white/15 grid place-items-center backdrop-blur-sm">
      {icon}
    </span>
    <span className="relative">
      <span className="block text-[15px] font-extrabold leading-tight tracking-tight">{title}</span>
      {note && (
        <span className="block text-[11px] text-indigo-100/90 mt-1 font-medium">{note}</span>
      )}
    </span>
  </button>
);

/* ── Light secondary tiles (survey / reports) ── */
const LightTile: React.FC<{
  icon: React.ReactNode;
  title: string;
  note?: string;
  onClick: () => void;
}> = ({ icon, title, note, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group text-left rounded-2xl min-h-[120px] p-4 flex flex-col justify-between
      bg-white border border-slate-200/90
      shadow-[0_4px_16px_rgba(20,40,70,0.045)]
      hover:border-[#93b4ff] hover:shadow-[0_14px_32px_rgba(20,40,70,0.1)]
      hover:-translate-y-1 active:translate-y-0
      transition-all duration-200"
  >
    <span className="w-10 h-10 rounded-xl bg-[#eef3ff] text-[#477dff] grid place-items-center
      group-hover:bg-[#477dff] group-hover:text-white transition-colors duration-200">
      {icon}
    </span>
    <span>
      <span className="block text-[15px] font-extrabold text-slate-800 leading-tight tracking-tight">
        {title}
      </span>
      {note && <span className="block text-[11px] text-slate-500 mt-1">{note}</span>}
    </span>
  </button>
);

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </h3>
      <span className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
  </section>
);

interface Props {
  townName: string;
  tabs: Tab[];
  bills: HeadId[];
  onChoose: (c: Choice) => void;
}

/** Full makeover of the post-login work menu. */
export const WorkMenu: React.FC<Props> = ({ townName, tabs, bills, onChoose }) => {
  const { role, head, displayName, isSuper } = useAuth();
  const has = (t: Tab) => tabs.includes(t);
  const roleLine = [role ? ROLE_LABEL[role] : '', head ? BILL_NAME[head] : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="work-menu-page relative max-w-3xl mx-auto px-1 pb-10">
      {/* Soft ambient wash behind the menu */}
      <div
        className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-[min(100%,40rem)] h-48
          bg-[radial-gradient(ellipse_at_center,rgba(79,125,255,0.12),transparent_70%)]"
        aria-hidden
      />

      {/* Hero / town card */}
      <header className="relative mb-6 rounded-3xl overflow-hidden
        bg-gradient-to-br from-[#0a1020] via-[#122040] to-[#0d1a38]
        text-white shadow-[0_20px_50px_rgba(10,16,32,0.35)]
        border border-white/10">
        <div
          className="pointer-events-none absolute inset-0
            bg-[radial-gradient(ellipse_at_90%_0%,rgba(37,214,197,0.18),transparent_40%),
                radial-gradient(ellipse_at_10%_100%,rgba(79,125,255,0.2),transparent_45%)]"
          aria-hidden
        />
        <div className="relative px-5 py-5 sm:px-6 sm:py-6 flex items-start gap-4">
          <div className="flex-none w-12 h-12 rounded-2xl grid place-items-center
            bg-gradient-to-br from-[#4f8cff] to-[#21c9c3]
            shadow-[0_0_0_5px_rgba(63,131,255,0.12),0_10px_24px_rgba(49,116,255,0.35)]">
            <Sparkles className="w-6 h-6 text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-300/90 mb-1">
              {role === 'cashier' ? 'Cashier desk' : 'Command centre'}
            </p>
            <h2 className="text-2xl sm:text-[1.75rem] font-black tracking-tight leading-none">
              {isSuper ? 'All ULBs' : townName}
            </h2>
            <p className="mt-1.5 text-sm font-semibold text-[#9bb8ff]">
              {isSuper ? 'Platform owner' : roleLine || 'Signed in'}
            </p>
            {displayName && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{displayName}</p>
            )}
          </div>
        </div>
        <div className="relative h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
        <div className="relative px-5 py-2.5 sm:px-6 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-300
            px-2.5 py-1 font-semibold border border-emerald-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ready
          </span>
          <span className="text-slate-500">
            {role === 'cashier' ? 'Select a payment head to collect' : 'Choose a task below'}
          </span>
        </div>
      </header>

      <div className="relative space-y-6">
        {/* Primary actions */}
        {(has('search') || has('dues') || has('rules')) && (
          <div className="space-y-3">
            {has('search') && (
              <ActionRow
                tone="amber"
                icon={<Search className="w-5 h-5" strokeWidth={2.4} />}
                title="Search dues"
                note="By property ID or owner"
                onClick={() => onChoose({ tab: 'search' })}
              />
            )}
            {has('dues') && (
              <ActionRow
                tone="rose"
                icon={<Wallet className="w-5 h-5" strokeWidth={2.4} />}
                title="Pending dues"
                note="See and update dues of every bill"
                onClick={() => onChoose({ tab: 'dues' })}
              />
            )}
            {has('rules') && (
              <ActionRow
                tone="blue"
                icon={<SlidersHorizontal className="w-5 h-5" strokeWidth={2.4} />}
                title="Bill rules"
                note="Amounts, interest %, due date and rebate for the whole town"
                onClick={() => onChoose({ tab: 'rules' })}
              />
            )}
          </div>
        )}

        {/* Collect bills */}
        {has('collection') && bills.length > 0 && (
          <Group title="Collect bills">
            {bills.map((h) => (
              <BillTile
                key={h}
                icon={BILL_ICON[h]}
                title={BILL_NAME[h]}
                note="Demand & payment"
                onClick={() => onChoose({ tab: 'collection', head: h })}
              />
            ))}
          </Group>
        )}

        {/* Survey & assessment */}
        {(has('survey') || has('records') || has('assessment')) && (
          <Group title="Survey & assessment">
            {has('survey') && (
              <LightTile
                icon={<Building2 className="w-5 h-5" strokeWidth={2.2} />}
                title="Property survey"
                onClick={() => onChoose({ tab: 'survey' })}
              />
            )}
            {has('records') && (
              <LightTile
                icon={<Layers className="w-5 h-5" strokeWidth={2.2} />}
                title="Property records"
                onClick={() => onChoose({ tab: 'records' })}
              />
            )}
            {has('assessment') && (
              <LightTile
                icon={<ClipboardCheck className="w-5 h-5" strokeWidth={2.2} />}
                title="Assessment"
                note="Form A / E"
                onClick={() => onChoose({ tab: 'assessment' })}
              />
            )}
          </Group>
        )}

        {/* Reports & maps */}
        {(has('reports') || has('map-editor') || has('exports')) && (
          <Group title="Reports & maps">
            {has('reports') && (
              <LightTile
                icon={<FileSpreadsheet className="w-5 h-5" strokeWidth={2.2} />}
                title="Reports & notices"
                onClick={() => onChoose({ tab: 'reports' })}
              />
            )}
            {has('map-editor') && (
              <LightTile
                icon={<PenTool className="w-5 h-5" strokeWidth={2.2} />}
                title="Ward map"
                onClick={() => onChoose({ tab: 'map-editor' })}
              />
            )}
            {has('exports') && (
              <LightTile
                icon={<Download className="w-5 h-5" strokeWidth={2.2} />}
                title="GIS exports"
                onClick={() => onChoose({ tab: 'exports' })}
              />
            )}
          </Group>
        )}
      </div>
    </div>
  );
};

export { BILL_NAME };
