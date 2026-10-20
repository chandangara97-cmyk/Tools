import React from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Download,
  FileText,
  Printer,
  ShieldAlert,
  X,
} from 'lucide-react';
import { MunicipalityProfile, Property, TaxRatesConfig } from '../types';

interface DemandNoticeModalProps {
  property: Property | null;
  profile: MunicipalityProfile;
  rates: TaxRatesConfig;
  onClose: () => void;
}

export const DemandNoticeModal: React.FC<DemandNoticeModalProps> = ({
  property,
  profile,
  rates,
  onClose,
}) => {
  if (!property) return null;

  const noticeNo = `NOT-DEM-${property.wardNo}-${property.holdingNo.replace('HLD-', '')}-2026`;
  const issueDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  
  // Compliance deadline: 15 days from today
  const deadlineDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const totalOverdue = property.currentYearDemand + property.arrearsDemand + property.waterTaxDue + property.sanitationCessDue;
  const estimatedSurcharge = Math.round(totalOverdue * 0.12);
  const grandTotal = totalOverdue + estimatedSurcharge;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const noticeContent = `
========================================================================
                      ${profile.name.toUpperCase()}
               DEPARTMENT OF ASSESSMENT & REVENUE COLLECTION
                     STATUTORY DEMAND NOTICE (FINAL)
========================================================================
Notice Number: ${noticeNo}
Date of Issue: ${issueDate}
Statutory Compliance Deadline: ${deadlineDate}

TO:
Assessee / Owner Name: ${property.ownerName}
Father / Guardian:    ${property.guardianName}
Property Holding No:  ${property.holdingNo}
Assessment Reference: ${property.assessmentNo}
Jurisdiction:         Ward #${property.wardNo}, ${property.zone}
Site Address:         ${property.address}

SUBJECT: FINAL DEMAND NOTICE FOR UNPAID MUNICIPAL TAXES & ARREARS UNDER
         SECTION 131/132 OF THE MUNICIPAL CORPORATION ACT.

Take notice that the municipal property tax and utility service charges in respect
of your holding detailed above have remained unpaid despite previous bill demands:

Principal Current Year Demand:  ${profile.currencySymbol}${property.currentYearDemand.toLocaleString('en-IN')}
Accumulated Arrears / Back Dues: ${profile.currencySymbol}${property.arrearsDemand.toLocaleString('en-IN')}
Water Supply & Sanitation Cess:  ${profile.currencySymbol}${(property.waterTaxDue + property.sanitationCessDue).toLocaleString('en-IN')}
Statutory Surcharge & Interest: ${profile.currencySymbol}${estimatedSurcharge.toLocaleString('en-IN')}
------------------------------------------------------------------------
TOTAL OUTSTANDING AMOUNT:       ${profile.currencySymbol}${grandTotal.toLocaleString('en-IN')}
------------------------------------------------------------------------

You are hereby commanded to clear the outstanding sum of ${profile.currencySymbol}${grandTotal.toLocaleString('en-IN')}
within fifteen (15) days from the service of this notice, failing which recovery
proceedings under Section 134/137 (Distraint of Movables / Attachment of Rent /
Disconnection of Water Line) shall be instituted without further correspondence.

Payments can be cleared online at ${profile.portalHelpline} or at any authorized
Municipal Collection Counter.

Issued by Order of:
${profile.commissionerTitle}
${profile.name}
Office: ${profile.officeAddress}
========================================================================
    `.trim();

    const blob = new Blob([noticeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Demand_Notice_${property.holdingNo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 print:m-0 print:p-0 print:shadow-none print:w-full print:rounded-none border border-slate-200">
        {/* Top actions toolbar */}
        <div className="no-print flex items-center justify-between px-5 sm:px-6 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-semibold text-sm truncate">Statutory Demand Notice</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Paper — professional official document */}
        <div className="doc-sheet !max-w-none !shadow-none !border-0 !rounded-none p-8 sm:p-10 print:p-6">
          {/* Official Emblem & Header */}
          <div className="doc-masthead font-sans">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-50 rounded-full mb-2 border border-rose-200 text-rose-700">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {profile.name}
            </h1>
            <p className="text-xs text-slate-600 font-medium tracking-wide uppercase">
              Assessment & Municipal Tax Collection Directorate • Revenue Wing
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {profile.officeAddress} • Phone / Helpline: {profile.portalHelpline}
            </p>
            <div className="mt-3 inline-block px-4 py-1 bg-rose-100 text-rose-900 text-xs font-black rounded uppercase tracking-widest border border-rose-300">
              LEGAL NOTICE OF DEMAND UNDER SECTION 131/132
            </div>
          </div>

          {/* Reference & Metadata */}
          <div className="flex flex-wrap items-center justify-between py-4 border-b border-slate-200 text-xs font-sans">
            <div>
              <span className="text-slate-500 block">Notice Reference No:</span>
              <span className="font-mono font-bold text-slate-900">{noticeNo}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Date of Issue:</span>
              <span className="font-bold text-slate-900">{issueDate}</span>
            </div>
            <div className="bg-rose-50 px-3 py-1.5 rounded border border-rose-200 text-rose-900">
              <span className="block text-[10px] font-bold uppercase tracking-wider">Compulsory Due Date</span>
              <span className="font-bold">{deadlineDate} (15 Days)</span>
            </div>
          </div>

          {/* Notice Body */}
          <div className="py-6 space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-sans">
              <span className="font-bold text-slate-700 uppercase block mb-1 text-[11px]">To Assessee / Owner:</span>
              <p className="font-bold text-slate-900 text-sm">{property.ownerName}</p>
              <p className="text-xs text-slate-600">S/o, D/o, W/o: {property.guardianName}</p>
              <p className="text-xs text-slate-600">Property Holding No: <span className="font-mono font-bold text-emerald-800">{property.holdingNo}</span> (Assessment No: {property.assessmentNo})</p>
              <p className="text-xs text-slate-600">Address: {property.address}, Ward #{property.wardNo}</p>
            </div>

            <p>
              <strong className="text-rose-900 font-sans">SIR / MADAM,</strong>
            </p>
            <p>
              Please take notice that an inspection of the municipal assessment ledger shows that your property tax,
              water supply maintenance fees, and statutory conservancy cess for Holding No.{' '}
              <strong className="font-mono">{property.holdingNo}</strong> have remained in default despite statutory bill issuances
              for the current and preceding assessment periods.
            </p>

            {/* Demands Table */}
            <div className="rounded-lg border border-slate-300 overflow-hidden font-sans my-4">
              <table className="w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Head of Assessment</th>
                    <th className="py-2.5 px-3 text-right">Dues Particulars</th>
                    <th className="py-2.5 px-3 text-right">Amount ({profile.currencySymbol})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2 px-3 font-medium">Current Assessment Tax ({rates.financialYear})</td>
                    <td className="py-2 px-3 text-right text-slate-500">Regular Demand</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold">
                      {profile.currencySymbol}{property.currentYearDemand.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-rose-800">Prior Assessment Arrears</td>
                    <td className="py-2 px-3 text-right text-rose-700">Accumulated Overdue</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-rose-800">
                      {profile.currencySymbol}{property.arrearsDemand.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Water & Conservancy Cess</td>
                    <td className="py-2 px-3 text-right text-slate-500">Statutory Charges</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold">
                      {profile.currencySymbol}{(property.waterTaxDue + property.sanitationCessDue).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr className="bg-amber-50">
                    <td className="py-2 px-3 font-medium text-amber-900">Overdue Penalty & Interest Surcharge</td>
                    <td className="py-2 px-3 text-right text-amber-800">Per Month Statutory</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-amber-900">
                      {profile.currencySymbol}{estimatedSurcharge.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-sm">
                      TOTAL DEMAND OUTSTANDING
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-base text-rose-300">
                      {profile.currencySymbol}{grandTotal.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-xs text-slate-700">
              You are hereby required to deposit the full sum of{' '}
              <strong className="text-slate-900 font-bold">
                {profile.currencySymbol}{grandTotal.toLocaleString('en-IN')}
              </strong>{' '}
              at the Municipal Treasury or through the official online citizen collection portal on or before{' '}
              <strong className="text-rose-900 underline">{deadlineDate}</strong>.
            </p>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg text-xs text-rose-900 font-sans flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">STATUTORY WARNING:</span>
                If payment is not made within the stipulated 15-day timeline, recovery warrants will be
                issued under Chapter IX of the Municipal Act for attachment of rental income, distraint of movable assets,
                and disconnection of municipal utility supply without further warning.
              </div>
            </div>
          </div>

          {/* Signature Authority */}
          <div className="pt-8 border-t border-slate-300 flex justify-between items-end font-sans">
            <div className="text-[11px] text-slate-500">
              <p>Certified true copy dispatched via registered postal & municipal server.</p>
              <p>For dispute redressal, visit Revenue Desk, Room 102, Municipal HQ.</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs text-slate-700 italic border-b border-slate-400 pb-1 mb-1 font-bold">
                (By Order of the Corporation)
              </div>
              <p className="font-bold text-slate-900 text-xs">{profile.commissionerTitle}</p>
              <p className="text-[11px] text-slate-500">{profile.name}</p>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="no-print bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Official notice formatted for standard A4 printing.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
          >
            Close Notice
          </button>
        </div>
      </div>
    </div>
  );
};
