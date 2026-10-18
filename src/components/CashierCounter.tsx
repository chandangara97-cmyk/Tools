import React, { useState } from 'react';
import {
  Banknote,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  QrCode,
  CreditCard,
  Building2,
  TrendingUp,
  Receipt,
  User,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  AdminFeatureFlags,
  MunicipalityProfile,
  PaymentReceipt,
  Property,
  TaxRatesConfig,
} from '../types';
import { calculateTaxBreakdown } from '../services/portalStore';

interface CashierCounterProps {
  properties: Property[];
  receipts: PaymentReceipt[];
  profile: MunicipalityProfile;
  rates: TaxRatesConfig;
  flags: AdminFeatureFlags;
  onCollectPayment: (property: Property) => void;
  onViewReceipt: (receipt: PaymentReceipt) => void;
}

export const CashierCounter: React.FC<CashierCounterProps> = ({
  properties,
  receipts,
  profile,
  rates,
  flags,
  onCollectPayment,
  onViewReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState<string>('ALL');

  // Filter properties
  const filtered = properties.filter((p) => {
    const matchesSearch =
      !searchTerm.trim() ||
      p.holdingNo.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      p.assessmentNo.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      p.ownerName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      p.mobile.includes(searchTerm.trim());

    const matchesWard = selectedWard === 'ALL' || p.wardNo.toString() === selectedWard;

    return matchesSearch && matchesWard;
  });

  // Calculate today's cashier counter stats
  const counterReceipts = receipts.filter(
    (r) => r.collectedBy === 'Counter Cashier' || r.collectedBy === 'Field Mobile POS'
  );
  const totalCashCollected = counterReceipts
    .filter((r) => r.paymentMethod === 'CASH')
    .reduce((sum, r) => sum + r.totalPaid, 0);
  const totalDigitalCollected = counterReceipts
    .filter((r) => r.paymentMethod !== 'CASH')
    .reduce((sum, r) => sum + r.totalPaid, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Shift Register Dashboard Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  Cashier Counter Station #01 Active
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Municipal Tax Collection Counter POS
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-mono">
              Staff ID: REV-OFF-441
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20">
              FY {rates.financialYear}
            </span>
          </div>
        </div>

        {/* Counter Cash Drawer Ticker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
            <span className="text-xs text-slate-400 font-medium block">Total Physical Cash in Drawer</span>
            <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
              {profile.currencySymbol}{totalCashCollected.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Ready for end-of-day bank deposit
            </span>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
            <span className="text-xs text-slate-400 font-medium block">Digital / UPI POS Clearance</span>
            <span className="text-2xl font-black font-mono text-cyan-400 mt-1 block">
              {profile.currencySymbol}{totalDigitalCollected.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Direct settlement to Municipal Treasury
            </span>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
            <span className="text-xs text-slate-400 font-medium block">Receipts Issued Today</span>
            <span className="text-2xl font-black font-mono text-white mt-1 block">
              {counterReceipts.length} Citizens
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Zero pending queue items
            </span>
          </div>
        </div>
      </div>

      {/* Quick Lookup Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type Holding No (e.g. HLD-1002), Mobile, or Citizen Name to collect..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Filter Ward:</label>
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none font-semibold text-slate-700"
          >
            <option value="ALL">All Municipal Wards</option>
            {Array.from({ length: 47 }).map((_, i) => (
              <option key={i + 1} value={(i + 1).toString()}>
                Ward #{i + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Property Counter List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Citizen Assessee Records ({filtered.length})
          </h3>
          <span className="text-xs text-slate-400">Click &ldquo;Collect at Counter&rdquo; to process cash/card</span>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Holding & Owner</th>
                <th className="py-3 px-4">Ward / Zone</th>
                <th className="py-3 px-4">Usage</th>
                <th className="py-3 px-4 text-right">Current Demand</th>
                <th className="py-3 px-4 text-right">Arrears</th>
                <th className="py-3 px-4 text-right">Net Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Counter Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((prop) => {
                const b = calculateTaxBreakdown(prop, rates, flags);
                return (
                  <tr key={prop.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold font-mono text-emerald-800 text-xs">{prop.holdingNo}</div>
                      <div className="font-semibold text-slate-900">{prop.ownerName}</div>
                      <div className="text-[11px] text-slate-400">{prop.mobile}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">Ward #{prop.wardNo}</span>
                      <span className="text-[10px] text-slate-400">{prop.zone}</span>
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] font-bold text-slate-600">
                      {prop.usage}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {profile.currencySymbol}{b.baseHoldingTax.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {b.arrears > 0 ? (
                        <span className="text-rose-700 font-bold">
                          {profile.currencySymbol}{b.arrears.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      {profile.currencySymbol}{b.netPayable.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {prop.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Cleared
                        </span>
                      ) : prop.status === 'overdue' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Due
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {prop.status !== 'paid' ? (
                        <button
                          type="button"
                          onClick={() => onCollectPayment(prop)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          Collect at Counter
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const r = receipts.find((x) => x.holdingNo === prop.holdingNo);
                            if (r) onViewReceipt(r);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Reprint Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
