import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  Building,
  Banknote,
  CheckCircle2,
  Lock,
  ArrowRight,
  X,
  Sparkles,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import {
  AdminFeatureFlags,
  MunicipalityProfile,
  PaymentMethod,
  PaymentReceipt,
  Property,
  TaxRatesConfig,
} from '../types';
import { calculateTaxBreakdown, portalStore } from '../services/portalStore';

interface PaymentModalProps {
  property: Property;
  profile: MunicipalityProfile;
  rates: TaxRatesConfig;
  flags: AdminFeatureFlags;
  isCashierMode?: boolean;
  onSuccess: (receipt: PaymentReceipt) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  property,
  profile,
  rates,
  flags,
  isCashierMode = false,
  onSuccess,
  onClose,
}) => {
  const breakdown = calculateTaxBreakdown(property, rates, flags);
  const [activeTab, setActiveTab] = useState<PaymentMethod>(isCashierMode ? 'CASH' : 'UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashTendered, setCashTendered] = useState<string>(breakdown.netPayable.toString());
  const [cashierNotes, setCashierNotes] = useState('');
  const [chequeRef, setChequeRef] = useState('');
  const [cardNumber, setCardNumber] = useState('4532 8190 2341 8892');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('321');
  const [cardName, setCardName] = useState(property.ownerName);
  const [selectedBank, setSelectedBank] = useState('State Bank of India');
  const [upiId, setUpiId] = useState(`${property.mobile}@upi`);

  const cashAmountNum = parseFloat(cashTendered) || 0;
  const cashChange = Math.max(0, cashAmountNum - breakdown.netPayable);

  const handleExecutePayment = () => {
    setIsProcessing(true);

    setTimeout(() => {
      try {
        const receipt = portalStore.recordPayment({
          propertyId: property.id,
          amountPaid: breakdown.netPayable,
          paymentMethod: activeTab,
          collectedBy: isCashierMode ? 'Counter Cashier' : 'Citizen Online',
          cashierName: isCashierMode ? 'Municipal Desk #1' : undefined,
          notes: isCashierMode
            ? activeTab === 'CHEQUE'
              ? `Cheque/DD: ${chequeRef}. ${cashierNotes}`
              : `Cash Counter: ${cashierNotes}`
            : `Online Portal: ${activeTab} transfer`,
        });
        setIsProcessing(false);
        onSuccess(receipt);
      } catch (err) {
        setIsProcessing(false);
        alert('Payment processing failed. Please try again.');
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isCashierMode ? 'Counter POS Terminal' : 'Citizen Secure Gateway'}
              </span>
              <span className="text-xs text-slate-400 font-mono">FY {rates.financialYear}</span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              Pay Property Dues for {property.holdingNo}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary Strip */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">Property Owner:</span>{' '}
            <span className="font-semibold text-slate-800">{property.ownerName}</span>
            <span className="text-slate-400 mx-2">•</span>
            <span className="text-slate-500">Ward:</span>{' '}
            <span className="font-semibold text-slate-800">#{property.wardNo}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 mr-2">Net Payable:</span>
            <span className="text-emerald-700 font-bold font-mono text-base">
              {profile.currencySymbol}{breakdown.netPayable.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Payment Channels Nav */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-2 pt-3 overflow-x-auto">
          {!isCashierMode && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('UPI')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                  activeTab === 'UPI'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4" />
                UPI & QR Code
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CARD')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                  activeTab === 'CARD'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('NET_BANKING')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                  activeTab === 'NET_BANKING'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building className="w-4 h-4" />
                Net Banking
              </button>
            </>
          )}

          {isCashierMode && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('CASH')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                  activeTab === 'CASH'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Banknote className="w-4 h-4" />
                Cash in Hand
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('UPI')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                  activeTab === 'UPI'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4" />
                Counter POS QR
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CHEQUE')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                  activeTab === 'CHEQUE'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Cheque / Demand Draft
              </button>
            </>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {activeTab === 'UPI' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center gap-5">
                {/* Simulated dynamic QR code */}
                <div className="p-3 bg-white rounded-xl shadow-xs border border-emerald-200 flex flex-col items-center">
                  <div className="w-36 h-36 bg-slate-900 rounded-lg flex flex-col items-center justify-center p-2 text-white relative overflow-hidden">
                    {/* SVG representation of crisp QR pattern */}
                    <div className="grid grid-cols-6 gap-1 w-full h-full p-1 opacity-90">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-xs ${
                            i % 2 === 0 || i % 5 === 0 || i < 7 || i > 28 ? 'bg-white' : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="px-1.5 py-0.5 bg-emerald-600 rounded text-[9px] font-bold text-white shadow-xs">
                        {profile.currencySymbol}{breakdown.netPayable}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1">BHIM UPI Dynamic QR</span>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Zero Transaction Fee
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Point your camera or UPI scanner to complete instant municipal tax clearance.
                  </p>
                  <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                    <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 font-medium">
                      Google Pay
                    </span>
                    <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 font-medium">
                      PhonePe
                    </span>
                    <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 font-medium">
                      Paytm
                    </span>
                    <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 font-medium">
                      Amazon Pay
                    </span>
                  </div>
                </div>
              </div>

              {/* Or UPI ID manual */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Or Enter UPI ID (VPA)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. mobile@upi"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CARD' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Card Number</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Valid Thru (MM/YY)</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">CVV / CVC</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Cardholder Name</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>256-Bit SSL Encrypted Municipal Gateway Integration</span>
              </div>
            </div>
          )}

          {activeTab === 'NET_BANKING' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 block">Select Authorized Bank</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'State Bank of India',
                  'HDFC Bank',
                  'ICICI Bank',
                  'Punjab National Bank',
                  'Axis Bank',
                  'Bank of Baroda',
                ].map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer ${
                      selectedBank === bank
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5 mb-1 text-slate-500" />
                    {bank}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                You will be securely routed to {selectedBank}&apos;s verified net banking portal.
              </p>
            </div>
          )}

          {activeTab === 'CASH' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Exact Bill Demand:</span>
                  <span className="font-mono text-slate-900 text-sm">
                    {profile.currencySymbol}{breakdown.netPayable.toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Cash Tendered by Citizen ({profile.currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full px-3 py-2 text-base font-bold font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-emerald-200 text-xs">
                  <span className="font-semibold text-slate-700">Change to Return to Citizen:</span>
                  <span className="font-mono font-bold text-base text-emerald-700">
                    {profile.currencySymbol}{cashChange.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Cashier Shift Notes / Counter Reference (Optional)
                </label>
                <input
                  type="text"
                  value={cashierNotes}
                  onChange={(e) => setCashierNotes(e.target.value)}
                  placeholder="e.g. Received 2x500 notes, clean transaction"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'CHEQUE' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cheque / Demand Draft Number & Bank Name
                </label>
                <input
                  type="text"
                  value={chequeRef}
                  onChange={(e) => setChequeRef(e.target.value)}
                  placeholder="e.g. DD #882190 - State Bank of India"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Drawee Branch / Date on Instrument
                </label>
                <input
                  type="text"
                  value={cashierNotes}
                  onChange={(e) => setCashierNotes(e.target.value)}
                  placeholder="e.g. Main Branch, Dated 15-Oct-2026"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Receipt issued for cheque payments is provisional and subject to realization within 3 bank working days.
              </p>
            </div>
          )}
        </div>

        {/* Action Button Strip */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Instant Clearance & Receipt</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecutePayment}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Clearing Payment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Confirm {profile.currencySymbol}{breakdown.netPayable.toLocaleString('en-IN')} Payment
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
