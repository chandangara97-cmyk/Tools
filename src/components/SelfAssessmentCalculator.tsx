import React, { useState } from 'react';
import {
  Calculator,
  Building,
  Home,
  Store,
  Factory,
  Sparkles,
  ArrowRight,
  Info,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { MunicipalityProfile, PropertyUsage, TaxRatesConfig, ZoneType } from '../types';

interface SelfAssessmentCalculatorProps {
  rates: TaxRatesConfig;
  profile: MunicipalityProfile;
  onClose?: () => void;
  onGoToPay?: () => void;
}

export const SelfAssessmentCalculator: React.FC<SelfAssessmentCalculatorProps> = ({
  rates,
  profile,
  onClose,
  onGoToPay,
}) => {
  const [zone, setZone] = useState<ZoneType>('Zone-A');
  const [usage, setUsage] = useState<PropertyUsage>('residential');
  const [builtUpSqFt, setBuiltUpSqFt] = useState<number>(1200);
  const [includeWater, setIncludeWater] = useState<boolean>(true);
  const [includeSanitation, setIncludeSanitation] = useState<boolean>(true);

  // Math
  let usageMult = 1.0;
  if (usage === 'commercial') usageMult = rates.commercialMultiplier;
  else if (usage === 'industrial') usageMult = rates.industrialMultiplier;
  else if (usage === 'institutional') usageMult = rates.institutionalMultiplier;
  else if (usage === 'vacant_land') usageMult = rates.vacantLandMultiplier;

  const zoneMult = rates.zoneMultipliers[zone] || 1.0;
  const holdingTax = Math.round(builtUpSqFt * rates.residentialBaseRatePerSqFt * usageMult * zoneMult);
  const sanitationCess = includeSanitation ? Math.round((holdingTax * rates.sanitationCessRatePercent) / 100) : 0;
  const lightingCess = Math.round((holdingTax * rates.lightingCessRatePercent) / 100);
  const waterTax = includeWater ? rates.waterSupplyFlatFee : 0;
  const grossTax = holdingTax + sanitationCess + lightingCess + waterTax;
  const earlyRebate = Math.round((holdingTax * rates.earlyBirdRebatePercent) / 100);
  const netEstimated = Math.max(0, grossTax - earlyRebate);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-linear-to-r from-slate-900 to-emerald-950 p-6 sm:p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold block">
                Citizen Self-Assessment Tool
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Property Tax & Cess Estimator
              </h2>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
            >
              Back to Portal
            </button>
          )}
        </div>
        <p className="text-xs text-slate-300 mt-2 max-w-2xl">
          Instantly compute your projected annual municipal holding tax based on the latest gazetted municipal rate slabs for FY {rates.financialYear}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {/* Left Inputs (7 Cols) */}
        <div className="md:col-span-7 p-6 sm:p-8 space-y-6">
          {/* Step 1: Zone Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>1. Select Municipal Zone</span>
              <span className="text-[11px] text-slate-400 font-normal">Based on road width & connectivity</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'Zone-A', name: 'Zone A (Prime)', mult: rates.zoneMultipliers['Zone-A'], desc: 'Arterial / Commercial roads' },
                { id: 'Zone-B', name: 'Zone B (Standard)', mult: rates.zoneMultipliers['Zone-B'], desc: 'Residential colonies' },
                { id: 'Zone-C', name: 'Zone C (Outer)', mult: rates.zoneMultipliers['Zone-C'], desc: 'Developing / Suburban' },
              ].map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setZone(z.id as ZoneType)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    zone === z.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-xs block">{z.name}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{z.desc}</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 mt-1 inline-block">
                    {z.mult}x multiplier
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Property Usage */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Property Usage Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'residential', label: 'Residential', icon: Home, mult: 1.0 },
                { id: 'commercial', label: 'Commercial', icon: Store, mult: rates.commercialMultiplier },
                { id: 'industrial', label: 'Industrial', icon: Factory, mult: rates.industrialMultiplier },
                { id: 'institutional', label: 'Institutional', icon: Building, mult: rates.institutionalMultiplier },
              ].map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setUsage(item.id as PropertyUsage)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      usage === item.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 mx-auto mb-1 ${usage === item.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs block">{item.label}</span>
                    <span className="text-[10px] font-mono text-slate-500">{item.mult}x</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Built-Up Area Slider & Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Total Covered Built-Up Area
              </label>
              <div className="flex items-center gap-1.5 font-mono text-emerald-700 font-bold text-sm bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <input
                  type="number"
                  min={100}
                  max={50000}
                  value={builtUpSqFt}
                  onChange={(e) => setBuiltUpSqFt(Math.max(50, parseInt(e.target.value) || 0))}
                  className="w-18 bg-transparent text-right focus:outline-none"
                />
                <span className="text-xs font-sans">Sq.Ft.</span>
              </div>
            </div>

            <input
              type="range"
              min={200}
              max={8000}
              step={50}
              value={builtUpSqFt}
              onChange={(e) => setBuiltUpSqFt(parseInt(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>200 sqft (Studio/Shop)</span>
              <span>2,000 sqft (Duplex/Office)</span>
              <span>8,000+ sqft</span>
            </div>
          </div>

          {/* Additional checkboxes */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={includeWater}
                onChange={(e) => setIncludeWater(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span>Includes Municipal Water Supply</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={includeSanitation}
                onChange={(e) => setIncludeSanitation(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span>Includes Solid Waste Cess ({rates.sanitationCessRatePercent}%)</span>
            </label>
          </div>
        </div>

        {/* Right Output Card (5 Cols) */}
        <div className="md:col-span-5 bg-slate-50 p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Estimated Annual Liability
            </span>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Base Holding Tax</span>
                <span className="font-mono font-bold text-slate-800">
                  {profile.currencySymbol}{holdingTax.toLocaleString('en-IN')}
                </span>
              </div>

              {includeWater && (
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Water Supply Fee</span>
                  <span className="font-mono font-bold text-slate-800">
                    {profile.currencySymbol}{waterTax.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {includeSanitation && (
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Sanitation Cess ({rates.sanitationCessRatePercent}%)</span>
                  <span className="font-mono font-bold text-slate-800">
                    {profile.currencySymbol}{sanitationCess.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Street Lighting Cess ({rates.lightingCessRatePercent}%)</span>
                <span className="font-mono font-bold text-slate-800">
                  {profile.currencySymbol}{lightingCess.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center text-xs text-emerald-700 font-semibold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Early Rebate ({rates.earlyBirdRebatePercent}%)
                </span>
                <span className="font-mono font-bold">
                  -{profile.currencySymbol}{earlyRebate.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-end">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-bold block">
                    Estimated Net Due
                  </span>
                  <span className="text-xs text-slate-500">Per Assessment Year</span>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-600">
                  {profile.currencySymbol}{netEstimated.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Based on base rate {profile.currencySymbol}{rates.residentialBaseRatePerSqFt}/sqft, zone factor {zoneMult}x,
                and {usage} multiplier {usageMult}x.
              </span>
            </div>
          </div>

          <div className="pt-6">
            {onGoToPay && (
              <button
                type="button"
                onClick={onGoToPay}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Search Existing Property Record</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
