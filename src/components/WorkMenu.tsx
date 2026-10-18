import React from 'react';
import { Building2, Layers, FileSpreadsheet, PenTool, Download, ClipboardCheck, Droplets, Trash2, Waves, Receipt, Home } from 'lucide-react';
import { useAuth } from '../services/auth';
import { HeadId } from '../services/heads';
import { ROLE_LABEL, Tab } from '../services/access';

export type Choice = { tab: Tab; head?: HeadId };

const BILL_ICON: Record<HeadId, React.ReactNode> = {
  property_tax: <Home className="w-7 h-7" />,
  water: <Droplets className="w-7 h-7" />,
  garbage: <Trash2 className="w-7 h-7" />,
  sewerage: <Waves className="w-7 h-7" />,
  other: <Receipt className="w-7 h-7" />,
};
const BILL_NAME: Record<HeadId, string> = {
  property_tax: 'Property tax', water: 'Water bill', garbage: 'Garbage bill', sewerage: 'Sewerage bill', other: 'Other utility bills',
};

const Tile: React.FC<{ icon: React.ReactNode; title: string; note?: string; onClick: () => void; accent?: boolean }> = ({ icon, title, note, onClick, accent }) => (
  <button type="button" onClick={onClick}
    className={`text-left rounded-2xl border p-4 min-h-[104px] flex flex-col justify-between transition-all active:scale-[.98] ${accent ? 'bg-[#0e8a7d] border-[#20b5a6] hover:bg-[#11a394]' : 'bg-[#0f2a32] border-[#23534d] hover:border-[#20b5a6] hover:bg-[#12343a]'}`}>
    <span className={accent ? 'text-[#f7dfae]' : 'text-[#20b5a6]'}>{icon}</span>
    <span>
      <span className="block text-base font-extrabold text-white leading-tight">{title}</span>
      {note && <span className="block text-[11px] text-[#c5d8df] mt-0.5">{note}</span>}
    </span>
  </button>
);

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h3 className="text-[11px] font-bold uppercase tracking-[.2em] text-[#7fa6a0] mb-2">{title}</h3>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
  </section>
);

interface Props {
  townName: string;
  tabs: Tab[];
  /** Bill heads that may be opened under Demand & Collection. */
  bills: HeadId[];
  onChoose: (c: Choice) => void;
}

/** Shown right after sign-in: only what this login can do, as big buttons. */
export const WorkMenu: React.FC<Props> = ({ townName, tabs, bills, onChoose }) => {
  const { role, head, displayName, isSuper } = useAuth();
  const has = (t: Tab) => tabs.includes(t);
  const who = [role ? ROLE_LABEL[role] : '', head ? BILL_NAME[head] : ''].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white leading-tight">{isSuper ? 'All ULBs' : townName}</h2>
        <p className="text-sm text-[#f7dfae] font-bold mt-0.5">{who}</p>
        <p className="text-xs text-[#9fc7c1]">{displayName}</p>
      </div>

      {has('collection') && bills.length > 0 && (
        <Group title="Collect bills">
          {bills.map((h) => (
            <Tile key={h} accent icon={BILL_ICON[h]} title={BILL_NAME[h]} note="Demand & payment" onClick={() => onChoose({ tab: 'collection', head: h })} />
          ))}
        </Group>
      )}

      {(has('survey') || has('records') || has('assessment')) && (
        <Group title="Survey & assessment">
          {has('survey') && <Tile icon={<Building2 className="w-7 h-7" />} title="Property survey" onClick={() => onChoose({ tab: 'survey' })} />}
          {has('records') && <Tile icon={<Layers className="w-7 h-7" />} title="Property records" onClick={() => onChoose({ tab: 'records' })} />}
          {has('assessment') && <Tile icon={<ClipboardCheck className="w-7 h-7" />} title="Assessment" note="Form A / E" onClick={() => onChoose({ tab: 'assessment' })} />}
        </Group>
      )}

      {(has('reports') || has('map-editor') || has('exports')) && (
        <Group title="Reports & maps">
          {has('reports') && <Tile icon={<FileSpreadsheet className="w-7 h-7" />} title="Reports & notices" onClick={() => onChoose({ tab: 'reports' })} />}
          {has('map-editor') && <Tile icon={<PenTool className="w-7 h-7" />} title="Ward map" onClick={() => onChoose({ tab: 'map-editor' })} />}
          {has('exports') && <Tile icon={<Download className="w-7 h-7" />} title="GIS exports" onClick={() => onChoose({ tab: 'exports' })} />}
        </Group>
      )}
    </div>
  );
};

export { BILL_NAME };
