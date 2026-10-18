import React from 'react';
import {
  Building2,
  Users,
  Shield,
  Banknote,
  Calculator,
  Phone,
  Sparkles,
  SearchCheck,
} from 'lucide-react';
import { MunicipalityProfile } from '../types';

export type AppViewMode = 'citizen' | 'estimator' | 'cashier' | 'admin' | 'records';

interface NavbarProps {
  profile: MunicipalityProfile;
  currentView: AppViewMode;
  onViewChange: (view: AppViewMode) => void;
  financialYear: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  currentView,
  onViewChange,
  financialYear,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs no-print">
      {/* Top micro-bar */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 sm:px-8 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-400">
            Government of {profile.state} • Urban Development & Municipal Affairs
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-emerald-400 font-medium">
            <Sparkles className="w-3 h-3" /> E-Governance Portal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300 font-mono">
            <Phone className="w-3 h-3 text-emerald-400" />
            <span>Toll-Free: {profile.portalHelpline}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[10px]">
            FY {financialYear}
          </span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand identity */}
        <div
          onClick={() => onViewChange('citizen')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none group-hover:text-emerald-700 transition-colors">
                {profile.name}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Property Tax, Water Maintenance & Municipal Revenue Portal
            </p>
          </div>
        </div>

        {/* Operational Modes Navigation Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => onViewChange('citizen')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentView === 'citizen'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Citizen Portal</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('estimator')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentView === 'estimator'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tax Estimator</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('cashier')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentView === 'cashier'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cashier POS</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('records')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentView === 'records'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SearchCheck className="w-3.5 h-3.5" />
            <span>Property Records</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('admin')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentView === 'admin'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Control</span>
          </button>
        </div>
      </div>
    </header>
  );
};
