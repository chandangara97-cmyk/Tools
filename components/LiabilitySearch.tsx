import React, { useMemo, useState } from 'react';
import { Search, X, Printer, Home, Droplets, Trash2, Waves, Zap, Receipt, Building2 } from 'lucide-react';
import { PropertyRecord } from '../utils/gisUtils';
import { HeadId, HEAD_LIST } from '../services/heads';
import { todayIso } from '../services/collection';
import {
  useAllLedgers,
  useAllSettings,
  propertyLiability,
  PayStatus,
  STATUS_LABEL,
  HeadLiability,
} from '../services/liability';
import { BILL_NAME } from './WorkMenu';
import { money } from './CollectionPanel';
import { BillMaker } from './BillMaker';
import { CitizenPay } from './CitizenPay';
import { useAuth, canCollect, canManageLedger, canPayOnline } from '../services/auth';

interface Props {
  townKey: string;
  townName: string;
  records: PropertyRecord[];
  heads: HeadId[];
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const HEAD_ICON: Record<HeadId, React.ReactNode> = {
  property_tax: <Home className="w-4 h-4" />,
  water: <Droplets className="w-4 h-4" />,
  garbage: <Trash2 className="w-4 h-4" />,
  sewerage: <Waves className="w-4 h-4" />,
  electricity: <Zap className="w-4 h-4" />,
  other: <Receipt className="w-4 h-4" />,
};

const STATUS_STYLE: Record<PayStatus, string> = {
  paid: 'bg-[#34d399]/15 text-[#34d399] border-[#34d399]/35',
  partial: 'bg-[#e8b84a]/15 text-[#f7df9a] border-[#e8b84a]/40',
  pending: 'bg-[#ff6b6f]/12 text-[#ff8d89] border-[#ff6b6f]/30',
  no_demand: 'bg-white/[0.04] text-[#7d8ba3] border-white/[0.08]',
};

function StatusBadge({ status }: { status: PayStatus }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function HeadRow({ h }: { h: HeadLiability }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none bg-white/[0.04] border border-white/[0.07] text-[#e8b84a]">
        {HEAD_ICON[h.head]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white">{BILL_NAME[h.head] || HEAD_LIST.find((x) => x.id === h.head)?.label}</span>
          <StatusBadge status={h.status} />
        </div>
        {h.periods.length > 0 && (
          <p className="text-[11px] text-[#7d8ba3] mt-0.5 truncate">
            {h.periods.map((p) => p.fy).join(' · ')}
          </p>
        )}
        {h.status === 'no_demand' && (
          <p className="text-[11px] text-[#5c6a84] mt-0.5">No demand raised yet</p>
        )}
      </div>
      <div className="flex-none min-w-[178px] sm:min-w-[228px]">
        <div className="grid grid-cols-3 gap-2 text-right">
          <div>
            <div className="text-[9px] uppercase tracking-wide text-[#7d8ba3]">Demand</div>
            <div className="text-[11px] sm:text-xs font-semibold tabular-nums text-[#cbd5e1]">{money(h.demanded)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-[#7d8ba3]">Paid</div>
            <div className="text-[11px] sm:text-xs font-semibold tabular-nums text-[#34d399]">{money(h.paid)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-[#7d8ba3]">Balance</div>
            <div className={`text-xs sm:text-sm font-bold tabular-nums ${h.total > 0.004 ? 'text-[#ff8d89]' : 'text-[#34d399]'}`}>{money(h.total)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Search by owner, building/address, house no, UPN or property ID.
 *  One screen: property tax, water, garbage, electricity, sewerage & other — with paid / partial / pending. */
export const LiabilitySearch: React.FC<Props> = ({ townKey, townName, records, heads }) => {
  const ledgers = useAllLedgers(townKey);
  const settings = useAllSettings(townKey);
  const today = todayIso();
  const [q, setQ] = useState(() => {
    try { const raw = sessionStorage.getItem('schemeHubSearch'); if (raw) { const saved = JSON.parse(raw) as { query?: string }; sessionStorage.removeItem('schemeHubSearch'); return saved.query || ''; } } catch { /* storage may be disabled */ }
    return '';
  });
  const [picked, setPicked] = useState<string | null>(null);
  const [billing, setBilling] = useState(false);
  const { role } = useAuth();
  const canBill = canCollect(role) || canManageLedger(role);
  const canOnline = canPayOnline(role);

  const allHeads = useMemo(() => {
    const set = new Set<HeadId>(heads.length ? heads : HEAD_LIST.map((h) => h.id));
    // Always surface the core set the user expects on this screen
    (['property_tax', 'water', 'garbage', 'electricity', 'sewerage', 'other'] as HeadId[]).forEach((h) => set.add(h));
    return HEAD_LIST.map((h) => h.id).filter((id) => set.has(id));
  }, [heads]);

  const town = useMemo(() => records.filter((r) => r.town === townName), [records, townName]);
  const byId = useMemo(() => new Map(town.map((r) => [r.id, r])), [town]);

  const matches = useMemo(() => {
    const t = norm(q);
    if (t.length < 2) return [];
    const c = compact(q);
    const words = t.split(' ');
    const exact = town.filter((r) => compact(r.id) === c);
    if (exact.length) return exact;
    return town
      .filter((r) => {
        const hay = norm(`${r.owner} ${r.hno} ${r.addr || ''} ${r.str || ''} ${r.id} ${r.upn || ''}`);
        return (
          compact(r.id).includes(c) ||
          (r.upn && compact(r.upn).includes(c)) ||
          words.every((w) => hay.includes(w))
        );
      })
      .slice(0, 30);
  }, [q, town]);

  const liab = (id: string) => propertyLiability(id, allHeads, ledgers, settings, today);

  const rec = picked ? byId.get(picked) : matches.length === 1 ? matches[0] : undefined;
  const ownerProps = useMemo(
    () => (rec ? town.filter((r) => norm(r.owner) === norm(rec.owner)) : []),
    [rec, town],
  );
  const ownerRows = useMemo(
    () => ownerProps.map((r) => ({ r, l: liab(r.id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownerProps, ledgers, settings, allHeads],
  );
  const ownerTotal = ownerRows.reduce((a, x) => a + x.l.total, 0);
  const ownerPaid = ownerRows.reduce((a, x) => a + x.l.paid, 0);

  const mainLiab = rec ? liab(rec.id) : null;

  const clear = () => {
    setQ('');
    setPicked(null);
    setBilling(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 px-1">
      {/* Header */}
      <div>
        <p className="text-[10.5px] font-semibold tracking-[0.2em] uppercase text-[#e8b84a] mb-1">
          Demand & collection
        </p>
        <h2 className="font-serif text-2xl tracking-tight text-white">
          Search <em className="italic text-[#f7df9a]">dues</em>
        </h2>
        <p className="text-[13px] text-[#7d8ba3] mt-1.5 leading-relaxed">
          Find a building by owner name, address, house no. or UPN — all bills on one screen with payment status.
        </p>
      </div>

      {/* Search */}
      <div className="glass p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#5c6a84] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPicked(null);
              setBilling(false);
            }}
            placeholder="Owner, building / address, H.No, UPN or property ID…"
            className="w-full bg-[#0a101c] border border-white/[0.07] text-[#eef2fb] text-[14px] rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:border-[#e8b84a]/45 focus:ring-[3px] focus:ring-[#e8b84a]/12 placeholder:text-[#5c6a84]"
            autoComplete="off"
          />
          {q && (
            <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d8ba3] hover:text-white" aria-label="Clear">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Match list */}
        {!picked && matches.length > 1 && (
          <ul className="mt-3 max-h-56 overflow-auto divide-y divide-white/[0.05] rounded-xl border border-white/[0.06]">
            {matches.map((r) => {
              const l = liab(r.id);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(r.id)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors flex items-center gap-3"
                  >
                    <Building2 className="w-4 h-4 text-[#e8b84a] flex-none" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-white truncate">{r.owner}</span>
                      <span className="block text-[11px] text-[#7d8ba3] truncate">
                        H.No {r.hno}
                        {r.addr ? ` · ${r.addr}` : ''} · {r.id}
                      </span>
                    </span>
                    <StatusBadge status={l.status} />
                    <span className={`text-sm font-semibold tabular-nums flex-none ${l.total > 0 ? 'text-[#ff8d89]' : 'text-[#34d399]'}`}>
                      {money(l.total)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {q.length >= 2 && !matches.length && !picked && (
          <p className="mt-3 text-sm text-[#7d8ba3] text-center py-4">No building matched that search.</p>
        )}
      </div>

      {/* Selected property — unified bill sheet */}
      {rec && mainLiab && !billing && (
        <div className="space-y-4">
          <div className="glass p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#e8b84a] mb-1">Building</p>
                <h3 className="text-lg font-semibold text-white leading-tight">{rec.owner}</h3>
                <p className="text-[13px] text-[#7d8ba3] mt-1">
                  H.No {rec.hno}
                  {rec.addr ? ` · ${rec.addr}` : ''}
                  {rec.upn ? ` · UPN ${rec.upn}` : ''}
                </p>
                <p className="text-[11px] text-[#5c6a84] font-mono mt-0.5">{rec.id}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={mainLiab.status} />
                <div className={`text-2xl font-semibold tabular-nums mt-1.5 ${mainLiab.total > 0.004 ? 'text-[#ff8d89]' : 'text-[#34d399]'}`}>
                  {money(mainLiab.total)}
                </div>
                <p className="text-[11px] text-[#7d8ba3]">Total outstanding</p>
                {mainLiab.paid > 0.004 && (
                  <p className="text-[11px] text-[#34d399] mt-0.5">Collected {money(mainLiab.paid)}</p>
                )}
              </div>
            </div>

            <div className="mt-5 pt-2 border-t border-white/[0.06]">
              <p className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-[#7d8ba3] mb-1">
                All bills on this building
              </p>
              {mainLiab.heads.map((h) => (
                <HeadRow key={h.head} h={h} />
              ))}
            </div>

            {canBill && mainLiab.total > 0.004 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBilling(true)}
                  className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Generate combined bill
                </button>
              </div>
            )}

            {canOnline && mainLiab.total > 0.004 && (
              <CitizenPay
                townKey={townKey}
                townName={townName}
                propertyId={rec.id}
                ownerName={rec.owner}
                heads={mainLiab.heads}
              />
            )}
          </div>

          {/* Owner’s other properties */}
          {ownerRows.length > 1 && (
            <div className="glass p-5">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <p className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-[#e8b84a]">Same owner</p>
                  <h4 className="text-base font-semibold text-white mt-0.5">
                    {ownerRows.length} properties · due {money(ownerTotal)}
                  </h4>
                  {ownerPaid > 0.004 && (
                    <p className="text-[11px] text-[#34d399]">Collected across properties {money(ownerPaid)}</p>
                  )}
                </div>
              </div>
              <ul className="divide-y divide-white/[0.05]">
                {ownerRows.map(({ r, l }) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(r.id)}
                      className={`w-full text-left py-3 flex items-center gap-3 transition-colors ${
                        r.id === rec.id ? 'opacity-100' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-white">
                          H.No {r.hno}
                          {r.addr ? ` · ${r.addr}` : ''}
                        </span>
                        <span className="block text-[11px] text-[#5c6a84] font-mono">{r.id}</span>
                      </span>
                      <StatusBadge status={l.status} />
                      <span className={`text-sm font-semibold tabular-nums ${l.total > 0 ? 'text-[#ff8d89]' : 'text-[#34d399]'}`}>
                        {money(l.total)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {rec && billing && (
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl text-white">Combined bill</h3>
            <button type="button" onClick={() => setBilling(false)} className="text-sm text-[#7d8ba3] hover:text-white">
              ← Back to dues
            </button>
          </div>
          <BillMaker
            town={townName}
            rows={ownerRows}
            currentId={rec.id}
            onClose={() => setBilling(false)}
          />
        </div>
      )}
    </div>
  );
};
