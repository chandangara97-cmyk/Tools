/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AdminFeatureFlags,
  MunicipalityProfile,
  PaymentReceipt,
  Property,
  TaxRatesConfig,
} from './types';
import { portalStore } from './services/portalStore';
import { AppViewMode, Navbar } from './components/Navbar';
import { CitizenPortal } from './components/CitizenPortal';
import { SelfAssessmentCalculator } from './components/SelfAssessmentCalculator';
import { CashierCounter } from './components/CashierCounter';
import { AdminControlPanel } from './components/AdminControlPanel';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { DemandNoticeModal } from './components/DemandNoticeModal';
import PropertyRecords from './components/PropertyRecords';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  HelpCircle,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState<MunicipalityProfile>(portalStore.getProfile());
  const [flags, setFlags] = useState<AdminFeatureFlags>(portalStore.getFlags());
  const [rates, setRates] = useState<TaxRatesConfig>(portalStore.getRates());
  const [properties, setProperties] = useState<Property[]>(portalStore.getProperties());
  const [receipts, setReceipts] = useState<PaymentReceipt[]>(portalStore.getReceipts());

  const [currentView, setCurrentView] = useState<AppViewMode>('citizen');

  // Modals
  const [paymentProperty, setPaymentProperty] = useState<Property | null>(null);
  const [isCashierPayment, setIsCashierPayment] = useState<boolean>(false);
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceipt | null>(null);
  const [demandNoticeProperty, setDemandNoticeProperty] = useState<Property | null>(null);

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = portalStore.subscribe(() => {
      setProfile(portalStore.getProfile());
      setFlags(portalStore.getFlags());
      setRates(portalStore.getRates());
      setProperties(portalStore.getProperties());
      setReceipts(portalStore.getReceipts());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleStartCitizenPayment = (prop: Property) => {
    setIsCashierPayment(false);
    setPaymentProperty(prop);
  };

  const handleStartCashierPayment = (prop: Property) => {
    setIsCashierPayment(true);
    setPaymentProperty(prop);
  };

  const handlePaymentSuccess = (receipt: PaymentReceipt) => {
    setPaymentProperty(null);
    setActiveReceipt(receipt);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-emerald-200">
      {/* Top Navbar */}
      <Navbar
        profile={profile}
        currentView={currentView}
        onViewChange={setCurrentView}
        financialYear={rates.financialYear}
      />

      {/* Maintenance Mode Warning if active */}
      {flags.maintenanceMode && (
        <div className="bg-amber-500 text-slate-950 font-bold text-xs py-2 px-4 text-center border-b border-amber-600 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
          <span>
            NOTICE: Municipal Portal is currently under scheduled rate slab review / audit by the Revenue Directorate.
            You can still test and administer all features freely in Admin mode.
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {currentView === 'citizen' && (
          <CitizenPortal
            properties={properties}
            receipts={receipts}
            profile={profile}
            rates={rates}
            flags={flags}
            onInitiatePayment={handleStartCitizenPayment}
            onViewReceipt={setActiveReceipt}
            onOpenSelfAssessment={() => setCurrentView('estimator')}
          />
        )}

        {currentView === 'estimator' && (
          <div className="py-4">
            <SelfAssessmentCalculator
              rates={rates}
              profile={profile}
              onClose={() => setCurrentView('citizen')}
              onGoToPay={() => setCurrentView('citizen')}
            />
          </div>
        )}

        {currentView === 'cashier' && (
          <CashierCounter
            properties={properties}
            receipts={receipts}
            profile={profile}
            rates={rates}
            flags={flags}
            onCollectPayment={handleStartCashierPayment}
            onViewReceipt={setActiveReceipt}
          />
        )}

        {currentView === 'records' && <PropertyRecords />}

        {currentView === 'admin' && (
          <AdminControlPanel
            flags={flags}
            rates={rates}
            profile={profile}
            properties={properties}
            receipts={receipts}
            onOpenDemandNotice={setDemandNoticeProperty}
            onOpenReceipt={setActiveReceipt}
          />
        )}
      </main>

      {/* Modals */}
      {paymentProperty && (
        <PaymentModal
          property={paymentProperty}
          profile={profile}
          rates={rates}
          flags={flags}
          isCashierMode={isCashierPayment}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPaymentProperty(null)}
        />
      )}

      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          profile={profile}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {demandNoticeProperty && (
        <DemandNoticeModal
          property={demandNoticeProperty}
          profile={profile}
          rates={rates}
          onClose={() => setDemandNoticeProperty(null)}
        />
      )}

      {/* Footer */}
      <footer className="no-print bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block text-sm">{profile.name}</span>
                <span className="text-[11px] text-slate-500">
                  Department of Urban Development & Municipal Affairs, Govt. of {profile.state}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <button
                type="button"
                onClick={() => setCurrentView('citizen')}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                Citizen Portal
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('estimator')}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                Tax Estimator
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('cashier')}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                Cashier POS Counter
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('records')}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                Property Records & Billing
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('admin')}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
              >
                Admin Control Tower
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>
              © {new Date().getFullYear()} {profile.name}. All property tax assessments and collections are governed
              by the Municipal Corporation Act & State Urban Tax Bylaws.
            </p>
            <div className="flex items-center gap-4">
              <span>Helpline: {profile.portalHelpline}</span>
              <span>•</span>
              <span>Support: {profile.supportEmail}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
