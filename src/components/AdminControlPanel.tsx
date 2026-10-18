import React, { useState } from 'react';
import {
  Sliders,
  Settings,
  Building2,
  FileSpreadsheet,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Save,
  RotateCcw,
  Shield,
  Percent,
  Coins,
  Phone,
  Mail,
  Search,
  FileText,
  Trash2,
  TrendingUp,
  Download,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  AdminFeatureFlags,
  MunicipalityProfile,
  PaymentReceipt,
  Property,
  PropertyUsage,
  TaxRatesConfig,
  ZoneType,
} from '../types';
import { calculateTaxBreakdown, portalStore } from '../services/portalStore';

interface AdminControlPanelProps {
  flags: AdminFeatureFlags;
  rates: TaxRatesConfig;
  profile: MunicipalityProfile;
  properties: Property[];
  receipts: PaymentReceipt[];
  onOpenDemandNotice: (prop: Property) => void;
  onOpenReceipt: (receipt: PaymentReceipt) => void;
}

type AdminTab = 'features' | 'rates' | 'profile' | 'properties' | 'analytics';

export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({
  flags,
  rates,
  profile,
  properties,
  receipts,
  onOpenDemandNotice,
  onOpenReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('features');
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // Local editable copies
  const [editableRates, setEditableRates] = useState<TaxRatesConfig>({ ...rates });
  const [editableProfile, setEditableProfile] = useState<MunicipalityProfile>({ ...profile });
  const [propertyFilter, setPropertyFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');
  const [propertySearch, setPropertySearch] = useState('');

  // Add Property Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProp, setNewProp] = useState<Omit<Property, 'id'>>({
    holdingNo: `HLD-${1010 + properties.length + 1}`,
    assessmentNo: `ASS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    ownerName: '',
    guardianName: '',
    mobile: '',
    email: '',
    address: '',
    wardNo: 1,
    zone: 'Zone-A',
    usage: 'residential',
    builtUpAreaSqFt: 1200,
    landAreaKatha: 2.0,
    annualRateableValue: 80000,
    currentYearDemand: 6500,
    arrearsDemand: 0,
    waterTaxDue: 450,
    sanitationCessDue: 520,
    status: 'unpaid',
    monthsOverdue: 0,
  });

  const notifySaved = (msg: string) => {
    setSavedNotification(msg);
    setTimeout(() => setSavedNotification(null), 3500);
  };

  // Toggle flag handler
  const handleToggleFlag = (key: keyof AdminFeatureFlags) => {
    const updated = { [key]: !flags[key] };
    portalStore.updateFlags(updated);
    notifySaved(`Feature "${key}" is now ${!flags[key] ? 'ENABLED' : 'DISABLED'}`);
  };

  // Save rates
  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    portalStore.updateRates(editableRates);
    notifySaved('Tax rate slabs and calculation rules updated successfully!');
  };

  // Save profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    portalStore.updateProfile(editableProfile);
    notifySaved('Municipality profile & settings saved successfully!');
  };

  // Create property
  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProp.ownerName.trim() || !newProp.holdingNo.trim()) {
      alert('Please enter Owner Name and Holding Number');
      return;
    }
    portalStore.addProperty(newProp);
    setShowAddModal(false);
    notifySaved(`New property holding ${newProp.holdingNo} added to assessment registry!`);
  };

  // Filter properties
  const filteredProps = properties.filter((p) => {
    const matchesFilter =
      propertyFilter === 'all' ||
      (propertyFilter === 'paid' && p.status === 'paid') ||
      (propertyFilter === 'unpaid' && p.status === 'unpaid') ||
      (propertyFilter === 'overdue' && p.status === 'overdue');

    const q = propertySearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.holdingNo.toLowerCase().includes(q) ||
      p.ownerName.toLowerCase().includes(q) ||
      p.mobile.includes(q) ||
      p.address.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  // Analytics stats
  const totalDemand = properties.reduce(
    (sum, p) => sum + p.currentYearDemand + p.arrearsDemand + p.waterTaxDue + p.sanitationCessDue,
    0
  );
  const totalCollected = receipts.reduce((sum, r) => sum + r.totalPaid, 0);
  const totalArrears = properties.reduce((sum, p) => sum + p.arrearsDemand, 0);
  const defaultersCount = properties.filter((p) => p.status === 'overdue').length;

  const exportPropertiesCSV = () => {
    const headers = ['Holding No', 'Assessment No', 'Owner Name', 'Ward', 'Zone', 'Usage', 'Area (SqFt)', 'Current Demand', 'Arrears', 'Status'];
    const rows = properties.map((p) => [
      p.holdingNo,
      p.assessmentNo,
      `"${p.ownerName}"`,
      p.wardNo,
      p.zone,
      p.usage,
      p.builtUpAreaSqFt,
      p.currentYearDemand,
      p.arrearsDemand,
      p.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Municipal_Properties_${profile.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">
                  Administrative Command Center
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                  FY {rates.financialYear}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Revenue & Feature Control Tower
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all municipality settings, rates, and properties to initial default state?')) {
                  portalStore.resetToDefaults();
                  setEditableRates({ ...portalStore.getRates() });
                  setEditableProfile({ ...portalStore.getProfile() });
                  notifySaved('System restored to factory initial demo state.');
                }
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo Data
            </button>
          </div>
        </div>

        {/* Saved Toast */}
        {savedNotification && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{savedNotification}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-800 mt-6">
          {[
            { id: 'features', label: 'Feature Master Switches', icon: Sliders },
            { id: 'rates', label: 'Tax Rate Slabs & Formulas', icon: Coins },
            { id: 'profile', label: 'ULB & Municipality Settings', icon: Building2 },
            { id: 'properties', label: 'Property & Defaulter Registry', icon: FileSpreadsheet },
            { id: 'analytics', label: 'Revenue & Audit Ledger', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Master Feature Switches */}
      {activeTab === 'features' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Master Feature & Module Switches
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Toggle any module on or off in real time. Changes take immediate effect across the Citizen Portal,
              Cashier POS, and receipts generation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'enableOnlineCitizenPayment' as const,
                title: 'Citizen Online Payment Gateway',
                desc: 'Permits taxpayers to pay property dues directly via UPI, QR, debit/credit cards, and net banking.',
                val: flags.enableOnlineCitizenPayment,
              },
              {
                key: 'enableCitizenSelfAssessment' as const,
                title: 'Citizen Self-Assessment Tax Estimator',
                desc: 'Allows citizens to calculate hypothetical tax for new or altered buildings before registration.',
                val: flags.enableCitizenSelfAssessment,
              },
              {
                key: 'enableEarlyBirdDiscount' as const,
                title: 'Prompt Payment Rebate Scheme',
                desc: `Grants ${rates.earlyBirdRebatePercent}% incentive discount on current holding tax for early payment.`,
                val: flags.enableEarlyBirdDiscount,
              },
              {
                key: 'enableLatePaymentPenalty' as const,
                title: 'Late Surcharge & Overdue Penalties',
                desc: `Applies ${rates.latePenaltyPercentPerMonth}% per month penalty surcharge on unpaid overdue amounts.`,
                val: flags.enableLatePaymentPenalty,
              },
              {
                key: 'enableCashierCounterPOS' as const,
                title: 'Cashier Counter POS Mode',
                desc: 'Enables cash and demand-draft desk collection mode for municipal treasury operators.',
                val: flags.enableCashierCounterPOS,
              },
              {
                key: 'enableWaterCharges' as const,
                title: 'Municipal Water Supply Billing',
                desc: `Includes annual water pipeline connection fee (₹${rates.waterSupplyFlatFee}/yr) in bills.`,
                val: flags.enableWaterCharges,
              },
              {
                key: 'enableSanitationCess' as const,
                title: 'Solid Waste & Sanitation Cess',
                desc: `Levies statutory cleanliness fee (${rates.sanitationCessRatePercent}% of holding tax).`,
                val: flags.enableSanitationCess,
              },
              {
                key: 'enableDemandNoticeGeneration' as const,
                title: 'Legal Demand Notices (Section 131/132)',
                desc: 'Allows generating official 15-day compliance demand notices with distraint warnings for defaulters.',
                val: flags.enableDemandNoticeGeneration,
              },
              {
                key: 'enableSMSAlertsSimulation' as const,
                title: 'SMS & WhatsApp Payment Confirmations',
                desc: 'Simulates automatic dispatch of digital tax clearance vouchers to citizen mobile numbers.',
                val: flags.enableSMSAlertsSimulation,
              },
              {
                key: 'maintenanceMode' as const,
                title: 'System Maintenance Lockout',
                desc: 'Temporarily disables taxpayer self-service while municipal rate revisions are being audited.',
                val: flags.maintenanceMode,
              },
            ].map((f) => (
              <div
                key={f.key}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">{f.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFlag(f.key)}
                  className={`p-1 rounded-full transition-colors cursor-pointer shrink-0 ${
                    f.val ? 'text-emerald-600' : 'text-slate-300'
                  }`}
                >
                  {f.val ? (
                    <ToggleRight className="w-9 h-9" />
                  ) : (
                    <ToggleLeft className="w-9 h-9" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Tax Rate Slabs & Formulas */}
      {activeTab === 'rates' && (
        <form onSubmit={handleSaveRates} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tax Slabs, Multipliers & Penalty Configurations
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Customize base holding rate per sq.ft, category multipliers, and statutory cess percentages.
              </p>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Tax Slabs
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
            {/* Base Rates */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Base Holding Tax Rate
              </h4>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Active Financial Year
                </label>
                <input
                  type="text"
                  value={editableRates.financialYear}
                  onChange={(e) => setEditableRates({ ...editableRates, financialYear: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Residential Base Rate (₹ per Sq.Ft / Year)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editableRates.residentialBaseRatePerSqFt}
                  onChange={(e) =>
                    setEditableRates({
                      ...editableRates,
                      residentialBaseRatePerSqFt: parseFloat(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Water Supply Annual Flat Charge (₹)
                </label>
                <input
                  type="number"
                  value={editableRates.waterSupplyFlatFee}
                  onChange={(e) =>
                    setEditableRates({
                      ...editableRates,
                      waterSupplyFlatFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            {/* Category Multipliers */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Property Usage Multipliers
              </h4>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Commercial Property Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editableRates.commercialMultiplier}
                  onChange={(e) =>
                    setEditableRates({
                      ...editableRates,
                      commercialMultiplier: parseFloat(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Industrial Property Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editableRates.industrialMultiplier}
                  onChange={(e) =>
                    setEditableRates({
                      ...editableRates,
                      industrialMultiplier: parseFloat(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Institutional / Clinic Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editableRates.institutionalMultiplier}
                  onChange={(e) =>
                    setEditableRates({
                      ...editableRates,
                      institutionalMultiplier: parseFloat(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            {/* Statutory Cess & Incentives */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Cess, Rebates & Penalty Surcharges
              </h4>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Sanitation & Waste Cess (% of holding tax)
                </label>
                <input
                  type="number"
                  value={editableRates.sanitationCessRatePercent}
                  onChange={(e) =>
                    setEditableRates({
                      ...editableRates,
                      sanitationCessRatePercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Early-Bird Prompt Rebate (%)
                </label>
                <input
                  type="number"
                  value={editableRates.earlyBirdRebatePercent}
                  onChange={(e) =>
                    setEditableRates({
                      ...editableRates,
                      earlyBirdRebatePercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Late Penalty Surcharge (% per month)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editableRates.latePenaltyPercentPerMonth}
                  onChange={(e) =>
                    setEditableRates({
                      ...editableRates,
                      latePenaltyPercentPerMonth: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab 3: Municipality Settings */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                ULB & Municipality Branding Settings
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Customize corporation title, address, helpline numbers, and signature titles appearing on official receipts.
              </p>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Municipality Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Urban Local Body / Municipality Name
              </label>
              <input
                type="text"
                value={editableProfile.name}
                onChange={(e) => setEditableProfile({ ...editableProfile, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                State & District Jurisdiction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={editableProfile.state}
                  onChange={(e) => setEditableProfile({ ...editableProfile, state: e.target.value })}
                  placeholder="State"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={editableProfile.district}
                  onChange={(e) => setEditableProfile({ ...editableProfile, district: e.target.value })}
                  placeholder="District"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Official Head Office Address
              </label>
              <input
                type="text"
                value={editableProfile.officeAddress}
                onChange={(e) => setEditableProfile({ ...editableProfile, officeAddress: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Commissioner / Revenue Authority Designation
              </label>
              <input
                type="text"
                value={editableProfile.commissionerTitle}
                onChange={(e) => setEditableProfile({ ...editableProfile, commissionerTitle: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Toll-Free Tax Helpline Phone
              </label>
              <input
                type="text"
                value={editableProfile.portalHelpline}
                onChange={(e) => setEditableProfile({ ...editableProfile, portalHelpline: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Revenue Support Email
              </label>
              <input
                type="email"
                value={editableProfile.supportEmail}
                onChange={(e) => setEditableProfile({ ...editableProfile, supportEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </form>
      )}

      {/* Tab 4: Property & Defaulters Registry */}
      {activeTab === 'properties' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Property Assessee Master Registry ({properties.length} Properties)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage property holdings, detect chronic defaulters, and issue statutory legal demand notices.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportPropertiesCSV}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add New Holding
              </button>
            </div>
          </div>

          {/* Defaulter Alert Strip */}
          {defaultersCount > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-900">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold">
                    {defaultersCount} Chronic Defaulter Holdings Detected
                  </span>
                  <span className="block text-[11px] text-rose-700">
                    Total unpaid arrears demand: {profile.currencySymbol}{totalArrears.toLocaleString('en-IN')}.
                    Immediate Section 131 notice dispatch recommended.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPropertyFilter('overdue')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Filter Defaulters
              </button>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={propertySearch}
                onChange={(e) => setPropertySearch(e.target.value)}
                placeholder="Search holding #, owner name, or address..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {(['all', 'unpaid', 'overdue', 'paid'] as const).map((filterType) => (
                <button
                  key={filterType}
                  type="button"
                  onClick={() => setPropertyFilter(filterType)}
                  className={`px-3 py-1.5 rounded-lg font-semibold uppercase text-[11px] transition-colors cursor-pointer ${
                    propertyFilter === filterType
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {filterType}
                </button>
              ))}
            </div>
          </div>

          {/* Properties Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Holding # & Owner</th>
                  <th className="py-3 px-4">Ward</th>
                  <th className="py-3 px-4">Usage</th>
                  <th className="py-3 px-4 text-right">Built Area</th>
                  <th className="py-3 px-4 text-right">Current Demand</th>
                  <th className="py-3 px-4 text-right">Arrears</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProps.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold font-mono text-indigo-900">{p.holdingNo}</div>
                      <div className="font-semibold text-slate-900">{p.ownerName}</div>
                      <div className="text-[11px] text-slate-400">{p.address}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      Ward #{p.wardNo}
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] font-bold text-slate-600">
                      {p.usage}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {p.builtUpAreaSqFt > 0 ? `${p.builtUpAreaSqFt} sqft` : `${p.landAreaKatha} katha`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {profile.currencySymbol}{p.currentYearDemand.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {p.arrearsDemand > 0 ? (
                        <span className="text-rose-700 font-bold">
                          {profile.currencySymbol}{p.arrearsDemand.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.status === 'paid' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Paid
                        </span>
                      ) : p.status === 'overdue' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Overdue ({p.monthsOverdue}m)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Due
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === 'overdue' && flags.enableDemandNoticeGeneration && (
                          <button
                            type="button"
                            onClick={() => onOpenDemandNotice(p)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[11px] transition-colors cursor-pointer"
                            title="Generate Legal Demand Notice under Section 131"
                          >
                            Demand Notice
                          </button>
                        )}
                        {p.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Mark dues for ${p.holdingNo} as cleared/settled by admin order?`)) {
                                portalStore.recordPayment({
                                  propertyId: p.id,
                                  amountPaid: p.currentYearDemand + p.arrearsDemand,
                                  paymentMethod: 'CASH',
                                  collectedBy: 'Counter Cashier',
                                  cashierName: 'Admin Direct Authorization',
                                });
                                notifySaved(`Marked ${p.holdingNo} as paid.`);
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] transition-colors cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Analytics & Audit Logs */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400 font-medium block">Total Annual Assessment Demand</span>
              <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">
                {profile.currencySymbol}{totalDemand.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">All 47 Municipal Wards</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400 font-medium block">Total Revenue Realized</span>
              <span className="text-2xl font-black font-mono text-emerald-600 mt-1 block">
                {profile.currencySymbol}{totalCollected.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                {Math.round((totalCollected / (totalDemand || 1)) * 100)}% Collection Efficiency
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400 font-medium block">Accumulated Arrears</span>
              <span className="text-2xl font-black font-mono text-rose-600 mt-1 block">
                {profile.currencySymbol}{totalArrears.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-rose-700 mt-1 block">{defaultersCount} overdue holdings</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400 font-medium block">Total Receipts Generated</span>
              <span className="text-2xl font-black font-mono text-indigo-600 mt-1 block">
                {receipts.length}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Verifiable clearance certificates</span>
            </div>
          </div>

          {/* Payment Method Share */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">
                Collection Channel Distribution
              </h3>
              <div className="space-y-3 text-xs">
                {['UPI', 'CASH', 'CARD', 'NET_BANKING', 'CHEQUE'].map((method) => {
                  const methodReceipts = receipts.filter((r) => r.paymentMethod === method);
                  const methodTotal = methodReceipts.reduce((sum, r) => sum + r.totalPaid, 0);
                  const pct = totalCollected > 0 ? Math.round((methodTotal / totalCollected) * 100) : 0;
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex justify-between font-semibold text-slate-700">
                        <span>{method}</span>
                        <span className="font-mono">
                          {profile.currencySymbol}{methodTotal.toLocaleString('en-IN')} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audit Log */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  System Audit Trail & Access Logs
                </h3>
                <span className="text-[11px] text-slate-400">Live Immutable Log</span>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 text-xs">
                {portalStore.getAuditLogs().map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString('en-IN')}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{log.details}</p>
                    <span className="text-[10px] text-slate-400 font-mono">By: {log.actor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Property Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Register New Property Holding</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Holding Number</label>
                  <input
                    type="text"
                    required
                    value={newProp.holdingNo}
                    onChange={(e) => setNewProp({ ...newProp, holdingNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assessment No</label>
                  <input
                    type="text"
                    required
                    value={newProp.assessmentNo}
                    onChange={(e) => setNewProp({ ...newProp, assessmentNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assessee / Owner Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar Verma"
                    value={newProp.ownerName}
                    onChange={(e) => setNewProp({ ...newProp, ownerName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Guardian / Care of</label>
                  <input
                    type="text"
                    placeholder="e.g. Late S. N. Verma"
                    value={newProp.guardianName}
                    onChange={(e) => setNewProp({ ...newProp, guardianName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ward Number</label>
                  <input
                    type="number"
                    min={1}
                    max={47}
                    required
                    value={newProp.wardNo}
                    onChange={(e) => setNewProp({ ...newProp, wardNo: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Zone Tier</label>
                  <select
                    value={newProp.zone}
                    onChange={(e) => setNewProp({ ...newProp, zone: e.target.value as ZoneType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Zone-A">Zone-A (Prime)</option>
                    <option value="Zone-B">Zone-B (Standard)</option>
                    <option value="Zone-C">Zone-C (Outer)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Property Usage</label>
                  <select
                    value={newProp.usage}
                    onChange={(e) => setNewProp({ ...newProp, usage: e.target.value as PropertyUsage })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="institutional">Institutional</option>
                    <option value="vacant_land">Vacant Plot</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Covered Area (Sq.Ft.)</label>
                  <input
                    type="number"
                    value={newProp.builtUpAreaSqFt}
                    onChange={(e) => setNewProp({ ...newProp, builtUpAreaSqFt: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Mobile</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={newProp.mobile}
                    onChange={(e) => setNewProp({ ...newProp, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Past Arrears (₹)</label>
                  <input
                    type="number"
                    value={newProp.arrearsDemand}
                    onChange={(e) => setNewProp({ ...newProp, arrearsDemand: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Site / Holding Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. House 45, Sevoke Road, Ward 10"
                  value={newProp.address}
                  onChange={(e) => setNewProp({ ...newProp, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save & Register Holding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
