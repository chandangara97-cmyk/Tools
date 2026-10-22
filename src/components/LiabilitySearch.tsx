import React, { useEffect, useMemo, useState } from 'react';
import { useStepBack, readStep } from '../hooks/useStepBack';
import { Search, X, QrCode, Share2, FileCheck, Printer, Download, Sparkles } from 'lucide-react';
import { PropertyRecord, triggerFileDownload } from '../utils/gisUtils';
import { HeadId } from '../services/heads';
import { todayIso, financialYearOf } from '../services/collection';
import { useAuth, canCollect, canManageLedger } from '../services/auth';
import { useAllLedgers, useAllSettings, propertyLiability, rulesApproved, PropertyLiability } from '../services/liability';
import { searchRecords, sameOwner, MIN_QUERY } from '../services/propertySearch';
import { BILL_NAME } from './WorkMenu';
import { money, printHtml } from './CollectionPanel';
import { BillMaker } from './BillMaker';
import { generateUpiUrl, generateQrDataUrl, defaultTownVpa, generateVerificationQr } from '../services/upiService';
import { formatDemandNoticeWhatsApp, openWhatsAppChat } from '../utils/whatsapp';
import { generateTaxClearanceCertificateHtml } from '../utils/receiptPrinting';

interface Props { townKey: string; townName: string; records: PropertyRecord[]; heads: HeadId[]; /** Cashier / general public: the box fills the screen and is the only thing on it. */ fullScreen?: boolean }

const none = (n: number) => n <= 0.004;
const tone = (l: PropertyLiability) => (!l.heads.length ? 'text-[#8790bd]' : none(l.total) ? 'text-[#34d399]' : 'text-[#ff6b6f]');

/** One box: type a property ID or owner. The slip shows what is owed on the property and by its owner. */
export const LiabilitySearch: React.FC<Props> = ({ townKey, townName, records, heads, fullScreen = false }) => {
  const { role } = useAuth();
  const { ledgers, status } = useAllLedgers(townKey);
  const { settings, ready: settingsReady } = useAllSettings(townKey);
  const ready = status === 'ready' && settingsReady;
  const today = todayIso();
  const canBill = canCollect(role) || canManageLedger(role);

  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string | null>(() => readStep('srchPick', '') || null);
  const pickNav = useStepBack('srchPick', picked ?? '', (v: string) => setPicked(v || null), '');
  const [billing, setBilling] = useState(false);
  const [slow, setSlow] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiQrUrl, setUpiQrUrl] = useState('');
  const [upiUri, setUpiUri] = useState('');
  const [phoneModal, setPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    if (ready) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, [ready]);

  const handleOpenUpi = async () => {
    if (!rec || !mine) return;
    const vpa = defaultTownVpa(townName);
    const uri = generateUpiUrl({
      vpa,
      payeeName: `${townName} Municipal Council`,
      amount: mine.l.total,
      transactionNote: `PTAX ${rec.id} W${rec.ward}`,
      transactionRef: `PTAX_${rec.id.replace(/\W/g, '')}_${Date.now().toString(36)}`,
    });
    setUpiUri(uri);
    const qr = await generateQrDataUrl(uri, 240);
    setUpiQrUrl(qr);
    setShowUpiModal(true);
  };

  const handleSendWhatsApp = (phone: string) => {
    if (!rec || !mine) return;
    const breakdown = mine.l.heads.map((h) => ({
      headName: BILL_NAME[h.head] || h.head,
      amount: h.total,
    }));
    const text = formatDemandNoticeWhatsApp({
      town: townName,
      propertyId: rec.id,
      ownerName: rec.owner,
      ward: rec.ward,
      houseNo: rec.hno,
      duesBreakdown: breakdown,
      totalDue: mine.l.total,
      dueDate: today,
    });
    openWhatsAppChat(phone, text);
  };

  const handlePrintNoc = async (download: boolean) => {
    if (!rec) return;
    const certNo = `HP-NOC/${townKey.toUpperCase().slice(0, 3)}/${financialYearOf(new Date())}/${rec.id.replace(/\D/g, '').slice(-5) || '10001'}`;
    const qr = await generateVerificationQr('noc', certNo, townName, rec.id);
    const html = generateTaxClearanceCertificateHtml({
      town: townName,
      certificateNo: certNo,
      date: today,
      financialYear: financialYearOf(new Date()),
      propertyId: rec.id,
      ownerName: rec.owner,
      ward: rec.ward,
      houseNo: rec.hno,
      address: rec.addr,
      use: rec.use,
      builtUpSqM: rec.bu || 0,
      qrDataUrl: qr,
    });
    if (download) {
      triggerFileDownload(html, `NOC_${rec.id}.html`, 'text/html');
    } else {
      printHtml(html);
    }
  };

  const town = useMemo(() => records.filter((r) => r && r.id && r.town === townName), [records, townName]);
  const matches = useMemo(() => searchRecords(town, q), [town, q]);
  const rec = (picked && town.find((r) => r.id === picked)) || (matches.length === 1 ? matches[0] : undefined);

  const dues = (id: string) => propertyLiability(id, heads, ledgers, settings, today);
  const listed = useMemo(() => (rec ? [] : matches.map((r) => ({ r, l: dues(r.id) }))), [rec, matches, ledgers, settings, heads]); // eslint-disable-line react-hooks/exhaustive-deps
  const ownerRows = useMemo(() => (rec ? sameOwner(town, rec).map((r) => ({ r, l: dues(r.id) })) : []), [rec, town, ledgers, settings, heads]); // eslint-disable-line react-hooks/exhaustive-deps
  const ownerTotal = ownerRows.reduce((a, x) => a + x.l.total, 0);
  const mine = rec ? ownerRows.find((x) => x.r.id === rec.id) : undefined;
  const skipped = mine ? mine.l.heads.filter((h) => !rulesApproved(settings[h.head])).map((h) => BILL_NAME[h.head]) : [];

  const search = (v: string) => { setQ(v); setPicked(null); setBilling(false); };
  const Amount: React.FC<{ l: PropertyLiability; big?: boolean }> = ({ l, big }) => (
    <span className={`slab font-bold whitespace-nowrap ${big ? 'text-lg' : ''} ${tone(l)}`}>
      {!ready ? '…' : !l.heads.length ? 'No bill' : money(l.total)}
    </span>
  );

  const idle = fullScreen && !q.trim();
  return (
    <div className={fullScreen ? `min-h-[calc(100vh-3.5rem)] w-full px-4 sm:px-10 py-6 flex flex-col ${idle ? 'justify-center' : ''}` : ''}>
    <div className={`${fullScreen ? 'w-full max-w-4xl mx-auto' : 'max-w-2xl mx-auto'} space-y-4`}>
      {idle && (
        <div className="text-center mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Property dues</h1>
          <p className="text-sm text-[#aab4dc] mt-1">{townName}</p>
        </div>
      )}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa8ff] pointer-events-none" />
        <input
          autoFocus value={q} onChange={(e) => search(e.target.value)} inputMode="search" autoComplete="off" spellCheck={false}
          placeholder="Property ID or owner name" aria-label="Property ID or owner name"
          className={`w-full ${fullScreen ? 'h-16 text-base sm:text-xl' : 'h-14 text-lg'} pl-12 pr-12 rounded-2xl bg-[#181f3d] border-2 border-[#2f3a6b] focus:border-[#9aa8ff] outline-none text-white placeholder:text-[#8790bd]`}
        />
        {q && <button type="button" aria-label="Clear" onClick={() => search('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center text-[#aab4dc]"><X className="w-5 h-5" /></button>}
      </div>

      {status === 'error' && <p role="alert" className="text-sm text-[#ff9fa2]">Dues could not be loaded. Check the internet connection and reopen this page.</p>}
      {status !== 'error' && !ready && slow && <p role="status" className="text-sm text-[#ffcf8a]">Still loading dues. Check the internet connection.</p>}

      {q.trim().length >= MIN_QUERY && !rec && !matches.length && (
        <p className="text-sm text-[#aab4dc]">Nothing found for “{q.trim()}”.</p>
      )}

      {listed.length > 1 && (
        <ul className="space-y-2">
          {listed.map(({ r, l }) => (
            <li key={r.id}>
              <button type="button" onClick={() => pickNav.go(r.id)} className="stub w-full text-left bg-[#181f3d] border border-[#2f3a6b] hover:border-[#9aa8ff] p-3 flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-bold text-white truncate">{r.owner || 'Owner not recorded'}</span>
                  <span className="block text-xs text-[#aab4dc] truncate">{r.id} · Ward {r.ward}{r.hno ? ` · ${r.hno}` : ''}</span>
                </span>
                <Amount l={l} big />
              </button>
            </li>
          ))}
        </ul>
      )}

      {rec && mine && (
        <div className="space-y-3">
          {matches.length > 1 && <button type="button" onClick={() => pickNav.back()} className="text-sm font-bold text-[#9aa8ff]">Back to results</button>}

          <div className="stub bg-[#181f3d] border border-[#2f3a6b] p-4 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white leading-tight">{rec.owner || 'Owner not recorded'}</h2>
              <p className="text-sm text-[#aab4dc]">{rec.id} · Ward {rec.ward}{rec.hno ? ` · House ${rec.hno}` : ''}</p>
            </div>

            {!ready ? (
              <p className="text-[#aab4dc]">Loading dues…</p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                  <div>
                    <p className="text-xs text-[#aab4dc] mb-1">This property</p>
                    {!mine.l.heads.length
                      ? <span className="text-lg text-[#aab4dc]">No bill raised yet</span>
                      : <span className={`stamp text-3xl ${none(mine.l.total) ? 'clear' : ''}`}>{none(mine.l.total) ? 'Nothing due' : money(mine.l.total)}</span>}
                  </div>
                  {ownerRows.length > 1 && (
                    <div>
                      <p className="text-xs text-[#aab4dc] mb-1">Owner, {ownerRows.length} properties</p>
                      <span className={`stamp text-3xl ${none(ownerTotal) ? 'clear' : ''}`}>{none(ownerTotal) ? 'Nothing due' : money(ownerTotal)}</span>
                    </div>
                  )}
                </div>

                {mine.l.heads.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-[#aab4dc] border-b border-[#2f3a6b]">
                        <tr><th className="text-left p-2">Bill</th><th className="text-right p-2">Tax / charge</th><th className="text-right p-2">Interest</th><th className="text-right p-2">Due</th></tr>
                      </thead>
                      <tbody>
                        {mine.l.heads.map((h) => (
                          <tr key={h.head} className="border-b border-[#252e56]">
                            <td className="p-2 font-bold text-white">{BILL_NAME[h.head]}</td>
                            <td className="p-2 text-right">{money(h.principal)}</td>
                            <td className="p-2 text-right">{money(h.interest)}</td>
                            <td className={`p-2 text-right font-bold ${none(h.total) ? 'text-[#34d399]' : 'text-[#ff6b6f]'}`}>{money(h.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr><td colSpan={3} className="p-2 text-right font-bold text-white">Total due</td><td className="p-2 text-right font-bold text-[#ffe3a3] text-base">{money(mine.l.total)}</td></tr></tfoot>
                    </table>
                  </div>
                )}

                {skipped.length > 0 && <p className="text-xs text-[#ffcf8a]">Interest is not added for {skipped.join(', ')}: its collection rules are not approved yet.</p>}
                <p className="text-[11px] text-[#8790bd]">As on {today}</p>

                {/* Action Toolbar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#252e56]">
                  {!none(mine.l.total) ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleOpenUpi()}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                        <QrCode className="w-4 h-4" />
                        Scan &amp; Pay via UPI QR
                      </button>

                      <button
                        type="button"
                        onClick={() => setPhoneModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#25d366]/20 border border-[#25d366]/40 hover:bg-[#25d366]/30 text-[#25d366] font-bold text-xs active:scale-95 transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                        Send Notice (WhatsApp)
                      </button>

                      {canBill && !billing && mine.l.heads.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setBilling(true)}
                          className="text-xs font-bold px-3.5 py-2.5 rounded-xl bg-[#f2b233] text-[#2b1d00] hover:bg-[#f5be4f] transition-all"
                        >
                          Generate bill
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#10b981]/10 border border-[#10b981]/30 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-[#10b981]" />
                        <div>
                          <span className="text-xs font-bold text-white block">Tax Clearance Certificate (NOC) Available</span>
                          <span className="text-[10px] text-[#aab4dc]">Zero municipal liabilities pending against this property</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handlePrintNoc(false)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print NOC
                        </button>
                        <button
                          type="button"
                          onClick={() => void handlePrintNoc(true)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1d2547] border border-[#2f3a6b] hover:border-[#9aa8ff] text-[#aab4dc] font-bold text-xs"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Dynamic UPI QR Code Modal */}
          {showUpiModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#181f3d] border border-[#28325c] w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 text-center">
                <div className="flex items-center justify-between border-b border-[#252e56] pb-3">
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      Dynamic NPCI UPI QR
                    </h3>
                    <p className="text-[10px] text-[#aab4dc]">Scan with PhonePe, Google Pay, Paytm or BHIM</p>
                  </div>
                  <button onClick={() => setShowUpiModal(false)} className="text-[#aab4dc] hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-white p-3 rounded-2xl mx-auto inline-block shadow-inner border border-slate-200">
                  {upiQrUrl ? (
                    <img src={upiQrUrl} alt="UPI QR" className="w-48 h-48 block mx-auto" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">Generating QR...</div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-[#aab4dc]">Total Payable Amount:</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">{money(mine.l.total)}</div>
                  <div className="text-[11px] text-[#d6dcf5] font-mono">{rec.id} · Ward {rec.ward}</div>
                  <div className="text-[10px] text-[#8790bd] truncate">VPA: {defaultTownVpa(townName)}</div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(upiUri);
                      alert('UPI Payment Link copied to clipboard!');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#1d2547] border border-[#2f3a6b] text-xs font-bold text-[#d6dcf5] hover:text-white"
                  >
                    Copy UPI Link
                  </button>
                  <a
                    href={upiUri}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center justify-center gap-1"
                  >
                    Open UPI App
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Phone Prompt Modal */}
          {phoneModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#181f3d] border border-[#28325c] w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#252e56] pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-[#25d366]" />
                    Send Notice on WhatsApp
                  </h3>
                  <button onClick={() => setPhoneModal(false)} className="text-[#aab4dc] hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs text-[#aab4dc]">
                    Owner Phone / WhatsApp Number:
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="e.g. 9816012345"
                      className="w-full mt-1.5 h-10 px-3 rounded-xl bg-[#121830] border border-[#2f3a6b] text-white text-sm outline-none focus:border-[#25d366]"
                    />
                  </label>
                  <p className="text-[10px] text-[#8790bd]">Bilingual notice with bill summary, due date &amp; UPI payment link will be sent.</p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPhoneModal(false)}
                    className="flex-1 py-2 rounded-xl bg-[#1d2547] text-xs font-bold text-[#aab4dc]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!phoneInput.trim()) { alert('Please enter phone number'); return; }
                      handleSendWhatsApp(phoneInput);
                      setPhoneModal(false);
                    }}
                    className="flex-1 py-2 rounded-xl bg-[#25d366] hover:bg-[#20ba5a] text-xs font-bold text-slate-950"
                  >
                    Send on WhatsApp
                  </button>
                </div>
              </div>
            </div>
          )}

          {ready && canBill && billing && <BillMaker key={rec.id} town={townName} rows={ownerRows} currentId={rec.id} onClose={() => setBilling(false)} />}

          {ready && ownerRows.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Other properties of this owner</h3>
              {ownerRows.filter((x) => x.r.id !== rec.id).map(({ r, l }) => (
                <button key={r.id} type="button" onClick={() => { pickNav.go(r.id); setBilling(false); }} className="stub w-full text-left bg-[#181f3d] border border-[#2f3a6b] hover:border-[#9aa8ff] p-3 flex items-center justify-between gap-3">
                  <span className="min-w-0"><span className="block font-bold text-white truncate">{r.id}</span><span className="block text-xs text-[#aab4dc] truncate">Ward {r.ward}{r.hno ? ` · ${r.hno}` : ''}</span></span>
                  <Amount l={l} big />
                </button>
              ))}
              <p className="text-[11px] text-[#8790bd]">Grouped by the owner’s name as surveyed.</p>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
};
