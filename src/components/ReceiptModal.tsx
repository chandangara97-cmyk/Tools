import React from 'react';
import {
  CheckCircle2,
  Download,
  Printer,
  X,
  Building2,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { MunicipalityProfile, PaymentReceipt } from '../types';

interface ReceiptModalProps {
  receipt: PaymentReceipt | null;
  profile: MunicipalityProfile;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, profile, onClose }) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const receiptContent = `
============================================================
           ${profile.name.toUpperCase()}
     OFFICIAL PROPERTY TAX & MUNICIPAL DUES RECEIPT
============================================================
Receipt No: ${receipt.receiptNo}
Transaction ID: ${receipt.transactionId}
Date & Time: ${new Date(receipt.paymentDate).toLocaleString('en-IN')}
Financial Year: ${receipt.financialYear}
Holding No: ${receipt.holdingNo}
Owner Name: ${receipt.ownerName}
Ward No: Ward #${receipt.wardNo}
Payment Mode: ${receipt.paymentMethod} (${receipt.collectedBy})
${receipt.cashierName ? `Counter / Cashier: ${receipt.cashierName}` : ''}

------------------------------------------------------------
FEE BREAKDOWN
------------------------------------------------------------
Holding Property Tax:   ${profile.currencySymbol}${receipt.holdingTaxAmount.toLocaleString('en-IN')}
Arrears / Past Dues:    ${profile.currencySymbol}${receipt.arrearsAmount.toLocaleString('en-IN')}
Water Supply Charges:   ${profile.currencySymbol}${receipt.waterTaxAmount.toLocaleString('en-IN')}
Sanitation Cess:        ${profile.currencySymbol}${receipt.sanitationCessAmount.toLocaleString('en-IN')}
Lighting Cess:          ${profile.currencySymbol}${receipt.lightingCessAmount.toLocaleString('en-IN')}
Late Surcharge Penalty: ${profile.currencySymbol}${receipt.penaltyAmount.toLocaleString('en-IN')}
Early Bird Rebate:     -${profile.currencySymbol}${receipt.rebateDiscount.toLocaleString('en-IN')}
------------------------------------------------------------
TOTAL PAID:             ${profile.currencySymbol}${receipt.totalPaid.toLocaleString('en-IN')}
------------------------------------------------------------
Status: SUCCESSFUL / CLEARED
Authority: ${profile.commissionerTitle}
Address: ${profile.officeAddress}
Helpline: ${profile.portalHelpline}
============================================================
Computer-generated official receipt. No physical signature required.
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receipt.receiptNo}-${receipt.holdingNo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 print:m-0 print:p-0 print:shadow-none print:w-full">
        {/* Header toolbar (Hidden in print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm tracking-wide">Official Municipal Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download text copy"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-8 bg-white print:p-6 print:border-none border-b border-slate-100">
          {/* Header watermark & emblem */}
          <div className="text-center pb-6 border-b border-dashed border-slate-300">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 rounded-full mb-2 border border-emerald-200 text-emerald-700">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight">
              {profile.name}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Government of {profile.state} • Urban Local Bodies Department
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {profile.officeAddress} • Helpline: {profile.portalHelpline}
            </p>
            <div className="mt-3 inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider">
              E-Payment Tax Clearance Receipt (FY {receipt.financialYear})
            </div>
          </div>

          {/* Key Identifiers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-b border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Receipt No</span>
              <span className="text-slate-900 font-bold font-mono text-sm">{receipt.receiptNo}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Transaction ID</span>
              <span className="text-slate-900 font-mono text-xs">{receipt.transactionId}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Date & Time</span>
              <span className="text-slate-900 font-medium">
                {new Date(receipt.paymentDate).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Holding Number</span>
              <span className="text-emerald-700 font-bold font-mono text-sm">{receipt.holdingNo}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Owner Name</span>
              <span className="text-slate-900 font-semibold">{receipt.ownerName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Ward No / Jurisdiction</span>
              <span className="text-slate-900 font-semibold">Ward #{receipt.wardNo}</span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="py-4">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Itemized Tax & Cess Particulars
            </h4>
            <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
              <table className="w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Description</th>
                    <th className="py-2.5 px-3 text-right">Applicable Period</th>
                    <th className="py-2.5 px-3 text-right">Amount ({profile.currencySymbol})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2 px-3 font-medium">Annual Holding Property Tax</td>
                    <td className="py-2 px-3 text-right text-slate-500">FY {receipt.financialYear}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium">
                      {profile.currencySymbol}{receipt.holdingTaxAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  {receipt.arrearsAmount > 0 && (
                    <tr className="bg-amber-50/50">
                      <td className="py-2 px-3 font-medium text-amber-900">Arrears & Past Dues</td>
                      <td className="py-2 px-3 text-right text-amber-700">Prior Assessment</td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-amber-900">
                        {profile.currencySymbol}{receipt.arrearsAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                  {receipt.waterTaxAmount > 0 && (
                    <tr>
                      <td className="py-2 px-3 font-medium">Municipal Water Supply Charges</td>
                      <td className="py-2 px-3 text-right text-slate-500">Annual Fixed</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {profile.currencySymbol}{receipt.waterTaxAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                  {receipt.sanitationCessAmount > 0 && (
                    <tr>
                      <td className="py-2 px-3 font-medium">Solid Waste & Sanitation Cess</td>
                      <td className="py-2 px-3 text-right text-slate-500">Statutory</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {profile.currencySymbol}{receipt.sanitationCessAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                  {receipt.lightingCessAmount > 0 && (
                    <tr>
                      <td className="py-2 px-3 font-medium">Public Street Lighting Cess</td>
                      <td className="py-2 px-3 text-right text-slate-500">Statutory</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {profile.currencySymbol}{receipt.lightingCessAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                  {receipt.penaltyAmount > 0 && (
                    <tr className="text-rose-700 bg-rose-50/50">
                      <td className="py-2 px-3 font-medium">Late Surcharge & Interest</td>
                      <td className="py-2 px-3 text-right">Overdue surcharge</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        +{profile.currencySymbol}{receipt.penaltyAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                  {receipt.rebateDiscount > 0 && (
                    <tr className="text-emerald-700 bg-emerald-50/50">
                      <td className="py-2 px-3 font-medium">Early-Bird Prompt Payment Rebate</td>
                      <td className="py-2 px-3 text-right">Incentive discount</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        -{profile.currencySymbol}{receipt.rebateDiscount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 text-sm">
                      TOTAL AMOUNT RECEIVED IN FULL
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-base text-emerald-400">
                      {profile.currencySymbol}{receipt.totalPaid.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment Mode & Authenticity Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-xs items-center">
            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">Payment Mode</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 rounded font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {receipt.paymentMethod}
              </span>
              <span className="text-[11px] text-slate-500 block">Channel: {receipt.collectedBy}</span>
              {receipt.cashierName && (
                <span className="text-[11px] text-slate-500 block">Operator: {receipt.cashierName}</span>
              )}
            </div>

            <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <QrCode className="w-12 h-12 text-slate-700 mb-1" />
              <span className="text-[10px] text-slate-400 font-mono font-medium">Scan to Verify Clearance</span>
            </div>

            <div className="text-right sm:text-right space-y-1">
              <div className="h-10 flex items-end justify-end">
                <div className="border-b border-slate-400 pb-0.5 px-4 font-mono text-[11px] text-slate-600 font-semibold italic">
                  Digitally Authorized
                </div>
              </div>
              <span className="font-semibold text-slate-800 text-[11px] block">{profile.commissionerTitle}</span>
              <span className="text-[10px] text-slate-400 block">{profile.name}</span>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-dashed border-slate-200 text-center text-[10px] text-slate-400">
            This is a computer-generated official payment voucher issued under Section 136 of the Municipal Corporation Act.
            Retain this document for property assessment & sale clearance records.
          </div>
        </div>

        {/* Footer Actions (Hidden in print) */}
        <div className="no-print bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <p className="text-xs text-slate-500">
            A confirmation receipt has also been logged in the municipal register.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
