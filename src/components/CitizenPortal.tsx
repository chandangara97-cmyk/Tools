import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  FileText,
  Building2,
  Sparkles,
  Phone,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Percent,
  Receipt,
  UserCheck,
} from 'lucide-react';
import {
  AdminFeatureFlags,
  MunicipalityProfile,
  PaymentReceipt,
  Property,
  TaxRatesConfig,
} from '../types';
import { calculateTaxBreakdown } from '../services/portalStore';

interface CitizenPortalProps {
  properties: Property[];
  receipts: PaymentReceipt[];
  profile: MunicipalityProfile;
  rates: TaxRatesConfig;
  flags: AdminFeatureFlags;
  onInitiatePayment: (prop: Property) => void;
  onViewReceipt: (receipt: PaymentReceipt) => void;
  onOpenSelfAssessment: () => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  properties,
  receipts,
  profile,
  rates,
  flags,
  onInitiatePayment,
  onViewReceipt,
  onOpenSelfAssessment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');

  // Filtered properties
  const filteredProperties = properties.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.holdingNo.toLowerCase().includes(q) ||
      p.assessmentNo.toLowerCase().includes(q) ||
      p.ownerName.toLowerCase().includes(q) ||
      p.mobile.includes(q) ||
      p.address.toLowerCase().includes(q)
    );
  });

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) || filteredProperties[0] || properties[0];
  const breakdown = selectedProperty ? calculateTaxBreakdown(selectedProperty, rates, flags) : null;

  // Filter receipts for selected property
  const propertyReceipts = receipts.filter(
    (r) => selectedProperty && r.holdingNo === selectedProperty.holdingNo
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Search Section */}
      <div className="relative rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-10 shadow-xl overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Official Citizen Tax & Bill Collection Portal
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Pay Property Tax & Municipal Dues in 60 Seconds
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Search your holding by Assessment Number, Holding ID, Mobile, or Owner Name.
            Instant digital receipts with verifiable clearance certificates.
          </p>

          {/* Quick Search Input */}
          <div className="pt-2">
            <div className="relative flex items-center shadow-lg rounded-2xl bg-white text-slate-900 overflow-hidden p-1.5 focus-within:ring-3 focus-within:ring-emerald-400">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Holding # (e.g. HLD-1001), Mobile, or Name..."
                className="w-full px-3 py-3 text-sm focus:outline-none placeholder:text-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-2 text-xs text-slate-400 hover:text-slate-600 mr-2 cursor-pointer font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Instant Search Results Dropdown */}
            {searchQuery.trim() && (
              <div className="mt-2 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 z-20">
                <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                  <span>Found {filteredProperties.length} Matching Holdings</span>
                  <span>Click to Load Bill</span>
                </div>
                {filteredProperties.length > 0 ? (
                  filteredProperties.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPropertyId(p.id);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/70 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-emerald-800">{p.holdingNo}</span>
                          <span className="font-semibold text-xs text-slate-900">{p.ownerName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase font-semibold">
                            Ward #{p.wardNo}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{p.address} • {p.mobile}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : p.status === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.status.toUpperCase()}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No holding found matching &ldquo;{searchQuery}&rdquo;.
                  </div>
                )}
              </div>
            )}

            {/* Quick Demo Shortcuts */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
              <span className="text-slate-400 font-medium">Quick Demo Click:</span>
              {[
                { label: 'HLD-1001 (Residential Due)', id: 'prop-1' },
                { label: 'HLD-1002 (Commercial Overdue)', id: 'prop-2' },
                { label: 'HLD-1003 (Paid & Clear)', id: 'prop-3' },
                { label: 'HLD-1007 (Industrial Large)', id: 'prop-7' },
              ].map((shortcut) => (
                <button
                  key={shortcut.id}
                  type="button"
                  onClick={() => {
                    setSelectedPropertyId(shortcut.id);
                    setSearchQuery('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedPropertyId === shortcut.id
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
                  }`}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Property Bill Detail + Helper Sidebar */}
      {selectedProperty && breakdown ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: The Bill / Property Sheet */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Header Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Assessment Record
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
                      Ward #{selectedProperty.wardNo}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {selectedProperty.zone}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                    {selectedProperty.ownerName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Care of / Guardian: <span className="text-slate-700 font-medium">{selectedProperty.guardianName}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {selectedProperty.address}
                  </p>
                </div>

                {/* Status Badge */}
                <div className="text-right">
                  {selectedProperty.status === 'paid' ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      All Dues Cleared (Paid)
                    </div>
                  ) : selectedProperty.status === 'overdue' ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Overdue ({selectedProperty.monthsOverdue} mos)
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Current Demand Due
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400 mt-1.5 font-mono">
                    Holding No: <strong className="text-slate-800 font-bold">{selectedProperty.holdingNo}</strong>
                  </div>
                </div>
              </div>

              {/* Property Specs Mini-Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Property Category</span>
                  <span className="font-bold text-slate-800 uppercase">{selectedProperty.usage}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Covered Built-Up</span>
                  <span className="font-bold text-slate-800">
                    {selectedProperty.builtUpAreaSqFt > 0
                      ? `${selectedProperty.builtUpAreaSqFt.toLocaleString('en-IN')} Sq.Ft.`
                      : `${selectedProperty.landAreaKatha} Katha (Vacant)`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Annual Val. (ARV)</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {profile.currencySymbol}{selectedProperty.annualRateableValue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Contact Phone</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedProperty.mobile}</span>
                </div>
              </div>

              {/* Itemized Dues Calculation Table */}
              <div className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Statutory Tax Demand Breakdown for FY {rates.financialYear}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Base: {profile.currencySymbol}{rates.residentialBaseRatePerSqFt}/sqft
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                  <div className="divide-y divide-slate-100">
                    <div className="flex items-center justify-between p-3 bg-white">
                      <div>
                        <span className="font-semibold text-slate-800 block">General Property / Holding Tax</span>
                        <span className="text-[11px] text-slate-400">
                          Built-up {selectedProperty.builtUpAreaSqFt} sqft × {rates.residentialBaseRatePerSqFt} × zone mult ({breakdown.zoneMultiplier}x) × usage ({breakdown.usageMultiplier}x)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {profile.currencySymbol}{breakdown.baseHoldingTax.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {breakdown.arrears > 0 && (
                      <div className="flex items-center justify-between p-3 bg-amber-50/60">
                        <div>
                          <span className="font-semibold text-amber-900 block">Arrears & Past Year Pending Dues</span>
                          <span className="text-[11px] text-amber-700">Accumulated unpaid tax from previous cycles</span>
                        </div>
                        <span className="font-mono font-bold text-amber-900 text-sm">
                          {profile.currencySymbol}{breakdown.arrears.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {flags.enableWaterCharges && breakdown.waterTax > 0 && (
                      <div className="flex items-center justify-between p-3 bg-white">
                        <div>
                          <span className="font-semibold text-slate-800 block">Municipal Water Supply Maintenance</span>
                          <span className="text-[11px] text-slate-400">Annual pipeline connection and service cess</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {profile.currencySymbol}{breakdown.waterTax.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {flags.enableSanitationCess && (
                      <div className="flex items-center justify-between p-3 bg-white">
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            Solid Waste & Sanitation Cess ({rates.sanitationCessRatePercent}%)
                          </span>
                          <span className="text-[11px] text-slate-400">Statutory urban cleanliness contribution</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {profile.currencySymbol}{breakdown.sanitationCess.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-white">
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          Public Street Lighting Cess ({rates.lightingCessRatePercent}%)
                        </span>
                        <span className="text-[11px] text-slate-400">Urban infrastructure maintenance</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {profile.currencySymbol}{breakdown.lightingCess.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {breakdown.penaltySurcharge > 0 && (
                      <div className="flex items-center justify-between p-3 bg-rose-50/70 text-rose-900">
                        <div>
                          <span className="font-semibold block flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            Overdue Penalty & Late Interest Surcharge
                          </span>
                          <span className="text-[11px] text-rose-700">
                            Statutory late fee applied at {rates.latePenaltyPercentPerMonth}% per month overdue
                          </span>
                        </div>
                        <span className="font-mono font-bold text-rose-800 text-sm">
                          +{profile.currencySymbol}{breakdown.penaltySurcharge.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {breakdown.earlyRebateDiscount > 0 && (
                      <div className="flex items-center justify-between p-3 bg-emerald-50/70 text-emerald-900">
                        <div>
                          <span className="font-semibold block flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            Prompt Payment Rebate ({rates.earlyBirdRebatePercent}%)
                          </span>
                          <span className="text-[11px] text-emerald-700">
                            Early-bird taxpayer incentive discount applied
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          -{profile.currencySymbol}{breakdown.earlyRebateDiscount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Net Total Strip */}
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-slate-300 font-bold block">
                        Net Amount Payable Now
                      </span>
                      <span className="text-[11px] text-emerald-400">Includes all applicable rebates & taxes</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black font-mono text-emerald-400">
                        {profile.currencySymbol}{breakdown.netPayable.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Call to Action Button */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {selectedProperty.status === 'paid' ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Paid on{' '}
                        {new Date(selectedProperty.lastPaymentDate || '').toLocaleDateString('en-IN')}
                      </span>
                    ) : (
                      <span>Tax clearance certificate issued immediately upon confirmation.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedProperty.status !== 'paid' ? (
                      flags.enableOnlineCitizenPayment ? (
                        <button
                          type="button"
                          onClick={() => onInitiatePayment(selectedProperty)}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Pay {profile.currencySymbol}{breakdown.netPayable.toLocaleString('en-IN')} Online</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium border border-slate-200">
                          Online payment counter is temporarily paused by Admin. Please visit Cashier POS desk.
                        </div>
                      )
                    ) : (
                      propertyReceipts[0] && (
                        <button
                          type="button"
                          onClick={() => onViewReceipt(propertyReceipts[0])}
                          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-emerald-400" />
                          View & Print Clearance Receipt
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Past Receipts for this Holding */}
            {propertyReceipts.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Past Payment Clearance Receipts for {selectedProperty.holdingNo}
                </h3>
                <div className="divide-y divide-slate-100">
                  {propertyReceipts.map((rcp) => (
                    <div
                      key={rcp.receiptNo}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs font-mono">{rcp.receiptNo}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {rcp.paymentMethod}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(rcp.paymentDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          • FY {rcp.financialYear} • {rcp.collectedBy}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold font-mono text-sm text-slate-900">
                          {profile.currencySymbol}{rcp.totalPaid.toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => onViewReceipt(rcp)}
                          className="px-3 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          View / Print
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Col: Citizen Quick Tools & FAQ */}
          <div className="space-y-6">
            {/* Self-Assessment Promo Card */}
            {flags.enableCitizenSelfAssessment && (
              <div className="bg-linear-to-br from-emerald-50 to-teal-50/50 rounded-2xl p-6 border border-emerald-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-xs">
                  <Percent className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  Property Tax Estimator
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Planning construction or curious about holding tax before purchasing? Use our 3-step self-assessment estimator.
                </p>
                <button
                  type="button"
                  onClick={onOpenSelfAssessment}
                  className="mt-4 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Launch Tax Estimator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Prompt Payment Discount Explainer */}
            {flags.enableEarlyBirdDiscount && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Taxpayer Incentive Scheme
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Save {rates.earlyBirdRebatePercent}% with Early Payment
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The municipal board awards a {rates.earlyBirdRebatePercent}% discount on current general holding tax
                  to citizens who clear all dues without allowing arrears.
                </p>
              </div>
            )}

            {/* Helpline and Municipal Office Info */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Official Help & Tax Assistance
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Toll-Free Tax Helpline</span>
                    <span className="text-slate-600 font-mono">{profile.portalHelpline}</span>
                    <span className="text-[11px] text-slate-400 block">10:00 AM - 5:30 PM (Mon-Sat)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Municipal Headquarters</span>
                    <span className="text-slate-600 leading-tight block">{profile.officeAddress}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Authorized Bank Counters</span>
                    <ul className="text-[11px] text-slate-500 list-disc list-inside mt-0.5 space-y-0.5">
                      {profile.bankCounters.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Property Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            We couldn&apos;t find any property matching &ldquo;{searchQuery}&rdquo;. Try searching by Holding ID like
            <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono">HLD-1001</code>
            or clear the search to browse all properties.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
          >
            Reset Search
          </button>
        </div>
      )}
    </div>
  );
};
