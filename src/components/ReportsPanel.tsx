import React, { useMemo, useState } from 'react';
import { Download, Printer, FileText, Trophy, Target, TrendingUp, WalletCards } from 'lucide-react';
import type { PropertyRecord, WardFeature } from '../utils/gisUtils';
import { triggerFileDownload } from '../utils/gisUtils';
import { CollectionSettings, LedgerEntry, LedgerResult, computeLedger, todayIso, periodLabel } from '../services/collection';
import { HeadId, HEAD_LIST, headLabel, useTownHeads } from '../services/heads';
import { useHeadSettings, useLedgers } from '../services/collectionStore';
import { esc, money, printHtml } from './CollectionPanel';

interface Props { townKey: string; townName: string; records: PropertyRecord[]; settings: CollectionSettings; wards: WardFeature[] }

type Status = 'none' | 'paid' | 'partial' | 'unpaid';
const COLOR: Record<Status, string> = { none: '#7a83ad', paid: '#9aa8ff', partial: '#f2b233', unpaid: '#ef4444' };
const LABEL: Record<Status, string> = { none: 'no demand', paid: 'paid', partial: 'part paid', unpaid: 'unpaid' };
const inp = 'bg-[#121830] border border-[#2f3a6b] text-white text-xs rounded p-1.5';
const card = 'bg-[#181f3d] border border-[#28325c] rounded-xl p-4 shadow-lg';
const btn = 'inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-40';
const q = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;

interface Row {
  r: PropertyRecord; entries: LedgerEntry[]; led: LedgerResult; status: Status;
  demand: number; paid: number; overdue: number; // overdue = dues of years whose due date has passed
}

const PAGE_CSS = `body{font-family:Arial,sans-serif;font-size:13px;margin:0;color:#111}.pg{padding:28px;page-break-after:always}.pg:last-child{page-break-after:auto}
h1{font-size:18px;margin:0}h2{font-size:14px;margin:2px 0 14px}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #999;padding:5px 8px;text-align:left}
.r{text-align:right}.kv td{border:none;padding:2px 8px 2px 0}.sig{margin-top:56px;display:flex;justify-content:space-between}`;

function pageHtml(o: { town: string; title: string; row: Row; today: string; text: string; rebate: boolean }) {
  const { town, title, row, today, text, rebate } = o;
  const { r, led } = row;
  const body = led.rows.filter((x) => x.totalDue > 0 || x.demand > 0).map((x) =>
    `<tr><td>${esc(periodLabel(x.fy))}</td><td>${esc(x.dueDate)}</td><td class="r">${money(x.demand + x.adjustments)}</td><td class="r">${money(x.rebate)}</td><td class="r">${money(x.paidPrincipal + x.paidInterest)}</td><td class="r">${money(x.principalDue)}</td><td class="r">${money(x.interestDue)}</td><td class="r">${money(x.totalDue)}</td></tr>`).join('');
  const avail = rebate ? led.rows.filter((x) => x.rebateAvailable > 0) : [];
  return `<div class="pg"><h1>${esc(town)}</h1><h2>${esc(title)}</h2>
<table class="kv"><tr><td>Date</td><td><b>${esc(today)}</b></td><td>Property ID</td><td><b>${esc(r.id)}</b></td></tr>
<tr><td>Owner</td><td>${esc(r.owner)}</td><td>Ward</td><td>${esc(r.ward)}</td></tr>
<tr><td>House / plot</td><td>${esc(r.hno)}</td><td>Address</td><td>${esc(r.addr)}</td></tr></table>
<table><tr><th>Year / Period</th><th>Due on</th><th class="r">Demand</th><th class="r">Rebate</th><th class="r">Paid</th><th class="r">Tax/Charge due</th><th class="r">Interest due</th><th class="r">Total due</th></tr>${body}
<tr><th colspan="7" class="r">Total payable as on ${esc(today)}</th><th class="r">${money(led.totalDue)}</th></tr></table>
${avail.length ? `<p>Early-payment rebate of ${money(avail.reduce((a, x) => a + x.rebateAvailable, 0))} applies if paid in full by the rebate date.</p>` : ''}
${text ? `<p>${esc(text)}</p>` : ''}
<p style="font-size:11px">Interest, if shown, is charged as per the rules in force and grows with each month of delay.</p>
<div class="sig"><span>Received by</span><span>Authorised signatory</span></div></div>`;
}

export const ReportsPanel: React.FC<Props> = ({ townKey, townName, records, settings, wards: wardShapes }) => {
  const availableHeads = useTownHeads(townKey);
  const [selectedHead, setSelectedHead] = useState<HeadId>('property_tax');
  const { settings: headSettings } = useHeadSettings(townKey, selectedHead);
  const activeSettings = selectedHead === 'property_tax' ? settings : headSettings;
  const ledgers = useLedgers(townKey, selectedHead);
  const today = todayIso();
  const [ward, setWard] = useState('all');
  const [minDue, setMinDue] = useState('1');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(today);
  const [text, setText] = useState('Please pay the dues shown above at the earliest to avoid further interest.');
  const [hover, setHover] = useState<string | null>(null);
  const [tint, setTint] = useState(true);

  const townRecords = useMemo(() => records.filter((r) => r.town === townName), [records, townName]);
  const wards = useMemo(() => [...new Set(townRecords.map((r) => r.ward))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [townRecords]);

  const rows: Row[] = useMemo(() => townRecords.map((r) => {
    const entries = ledgers[r.id] || [];
    const led = computeLedger(entries, activeSettings, today);
    const demand = led.rows.reduce((a, x) => a + x.demand + x.adjustments, 0);
    const paid = led.rows.reduce((a, x) => a + x.paidPrincipal + x.paidInterest, 0);
    const overdue = led.rows.filter((x) => x.dueDate < today).reduce((a, x) => a + x.totalDue, 0);
    const status: Status = !led.rows.length ? 'none' : led.totalDue <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    return { r, entries, led, status, demand, paid, overdue };
  }), [townRecords, ledgers, activeSettings, today]);

  const inWard = useMemo(() => rows.filter(({ r }) => ward === 'all' || r.ward === ward), [rows, ward]);

  // ward-wise collection in the chosen date range (receipts, i.e. active payments by payment date)
  const wardTable = useMemo(() => {
    const m: Record<string, { ward: string; props: number; demanded: number; collected: number; rebate: number; due: number; interestDue: number; defaulters: number }> = {};
    rows.forEach(({ r, entries, led, overdue }) => {
      const w = (m[r.ward] ||= { ward: r.ward, props: 0, demanded: 0, collected: 0, rebate: 0, due: 0, interestDue: 0, defaulters: 0 });
      w.props++;
      w.demanded += led.rows.reduce((a, x) => a + x.demand + x.adjustments, 0);
      w.due += led.principalDue; w.interestDue += led.interestDue;
      if (overdue > 0) w.defaulters++;
      const cancelled = new Set(entries.filter((e) => e.type === 'reversal').map((e) => e.reverses));
      entries.forEach((e) => {
        if (cancelled.has(e.id) || (from && e.date < from) || e.date > to) return;
        if (e.type === 'payment') w.collected += e.amount;
        if (e.type === 'rebate') w.rebate += e.amount;
      });
    });
    return Object.values(m).sort((a, b) => a.ward.localeCompare(b.ward, undefined, { numeric: true }));
  }, [rows, from, to]);
  const grand = wardTable.reduce((g, w) => ({ props: g.props + w.props, demanded: g.demanded + w.demanded, collected: g.collected + w.collected, rebate: g.rebate + w.rebate, due: g.due + w.due, interestDue: g.interestDue + w.interestDue, defaulters: g.defaulters + w.defaulters }), { props: 0, demanded: 0, collected: 0, rebate: 0, due: 0, interestDue: 0, defaulters: 0 });

  const modeBreakdown = useMemo(() => {
    const counts: Record<string, number> = { cash: 0, upi: 0, cheque: 0, other: 0 };
    rows.forEach(({ entries }) => {
      const cancelled = new Set(entries.filter((e) => e.type === 'reversal').map((e) => e.reverses));
      entries.forEach((e) => {
        if (cancelled.has(e.id) || e.type !== 'payment') return;
        const m = (e.mode || 'cash').toLowerCase();
        counts[m] = (counts[m] || 0) + e.amount;
      });
    });
    return counts;
  }, [rows]);

  const wardRankings = useMemo(() => {
    return [...wardTable]
      .map((w) => ({
        ...w,
        pct: w.demanded > 0 ? (w.collected / w.demanded) * 100 : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [wardTable]);

  const defaulters = useMemo(() => {
    const min = parseFloat(minDue) || 0;
    return inWard.filter((x) => x.overdue > 0 && x.led.totalDue >= min).sort((a, b) => b.led.totalDue - a.led.totalDue);
  }, [inWard, minDue]);

  const dl = (name: string, head: string[], lines: unknown[][]) =>
    triggerFileDownload([head.join(','), ...lines.map((l) => l.join(','))].join('\n'), name, 'text/csv');

  const wardCsv = () => dl(`${townName}_${headLabel(selectedHead).replace(/\s+/g, '_')}_WardCollection_${today}.csv`,
    ['Ward', 'Properties', 'Demanded', `Collected ${from || 'start'} to ${to}`, 'Rebate allowed', 'Tax outstanding', 'Interest outstanding', 'Defaulters', 'Collected % of demand'],
    wardTable.map((w) => [q(w.ward), w.props, w.demanded.toFixed(2), w.collected.toFixed(2), w.rebate.toFixed(2), w.due.toFixed(2), w.interestDue.toFixed(2), w.defaulters, w.demanded ? ((w.collected / w.demanded) * 100).toFixed(1) : '']));
  const defCsv = () => dl(`${townName}_${headLabel(selectedHead).replace(/\s+/g, '_')}_Defaulters_${ward}_${today}.csv`,
    ['Property ID', 'Ward', 'Owner', 'House/plot', 'Overdue (tax+interest)', 'Tax due', 'Interest due', 'Total due', 'Oldest unpaid year'],
    defaulters.map(({ r, led, overdue }) => [r.id, q(r.ward), q(r.owner), q(r.hno), overdue.toFixed(2), led.principalDue.toFixed(2), led.interestDue.toFixed(2), led.totalDue.toFixed(2), led.rows.find((x) => x.totalDue > 0)?.fy || '']));

  const printPages = (list: Row[], title: string, rebate: boolean, download: boolean) => {
    if (!list.length) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PAGE_CSS}</style></head><body>${list.slice(0, 200).map((row) => pageHtml({ town: townName, title, row, today, text, rebate })).join('')}</body></html>`;
    if (download) triggerFileDownload(html, `${townName}_${title.replace(/\W+/g, '_')}_${today}.html`, 'text/html'); else printHtml(html);
  };
  const billable = inWard.filter((x) => x.led.totalDue > 0);

  // map: plain SVG of ward boundaries and survey points, works offline
  const pts = inWard.map((x) => ({ x, lat: parseFloat(x.r.lat), lng: parseFloat(x.r.lng) })).filter((p) => isFinite(p.lat) && isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0));
  const shown = useMemo(() => wardShapes.filter((w) => (ward === 'all' || String(w.w) === ward) && w.rings?.length), [wardShapes, ward]);
  // recovery per ward: share of demand already cleared (grey if nothing demanded)
  const wardRecovery = useMemo(() => {
    const m: Record<string, number | null> = {};
    wardTable.forEach((w) => { m[String(w.ward)] = w.demanded > 0 ? Math.max(0, Math.min(1, 1 - (w.due + w.interestDue) / w.demanded)) : null; });
    return m;
  }, [wardTable]);
  const box = useMemo(() => {
    const lngs: number[] = [], lats: number[] = [];
    shown.forEach((w) => w.rings.forEach((ring) => ring.forEach(([x, y]) => { lngs.push(x); lats.push(y); })));
    pts.forEach((p) => { lngs.push(p.lng); lats.push(p.lat); });
    if (!lngs.length) return null;
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
    const w = Math.max((maxLng - minLng) * k, 1e-5), h = Math.max(maxLat - minLat, 1e-5);
    const W = 700, H = Math.min(560, Math.max(220, (700 * h) / w)), pad = 16;
    const s = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
    return { W, H, px: (lng: number) => pad + (lng - minLng) * k * s, py: (lat: number) => H - pad - (lat - minLat) * s };
  }, [pts, shown]);
  const recoveryFill = (v: number | null | undefined) => (v === null || v === undefined ? '#7a83ad' : `hsl(${Math.round(v * 140)}, 70%, 45%)`); // red -> green
  const wardPath = (w: WardFeature) => box ? w.rings.map((ring) => 'M' + ring.map(([x, y]) => `${box.px(x).toFixed(1)},${box.py(y).toFixed(1)}`).join('L') + 'Z').join('') : '';
  const wardLabel = (w: WardFeature) => {
    const ring = w.rings[0]; if (!ring?.length || !box) return null;
    const x = ring.reduce((a, c) => a + c[0], 0) / ring.length, y = ring.reduce((a, c) => a + c[1], 0) / ring.length;
    return { x: box.px(x), y: box.py(y) };
  };
  const counts = (Object.keys(COLOR) as Status[]).map((k) => ({ k, n: inWard.filter((x) => x.status === k).length }));
  const hv = hover ? rows.find((x) => x.r.id === hover) : null;

  return (
    <div className="space-y-4">
      {/* Bill Head Selector Bar */}
      <div className={`${card} flex flex-wrap items-center justify-between gap-3 bg-[#131b38]`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-[#ffe3a3] uppercase tracking-wider mr-2">Bill Head:</span>
          {availableHeads.map((hId) => (
            <button
              key={hId}
              type="button"
              onClick={() => setSelectedHead(hId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedHead === hId ? 'bg-[#4f46e5] text-white shadow-md' : 'bg-[#121830] text-[#aab4dc] hover:text-white'
              }`}
            >
              {headLabel(hId)}
            </button>
          ))}
        </div>
        <div className="text-xs font-bold text-[#9aa8ff]">
          Reporting: {headLabel(selectedHead)}
        </div>
      </div>

      {/* Executive Overview & Ward Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Recovery Target Card */}
        <div className={`${card} bg-gradient-to-br from-[#181f3d] to-[#121830] space-y-2`}>
          <div className="flex items-center justify-between text-xs font-bold text-[#aab4dc]">
            <span className="flex items-center gap-1.5 text-white">
              <Target className="w-4 h-4 text-cyan-400" /> Collection Target
            </span>
            <span className="text-cyan-300 font-mono">
              {grand.demanded > 0 ? `${((grand.collected / grand.demanded) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
          <div className="w-full bg-[#0a0f24] rounded-full h-2.5 overflow-hidden border border-[#28325c]">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, grand.demanded > 0 ? (grand.collected / grand.demanded) * 100 : 0)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div>
              <span className="text-[#8790bd] block">Total Collected</span>
              <span className="text-white font-bold font-mono">{money(grand.collected)}</span>
            </div>
            <div>
              <span className="text-[#8790bd] block">Outstanding Dues</span>
              <span className="text-rose-400 font-bold font-mono">{money(grand.due + grand.interestDue)}</span>
            </div>
          </div>
        </div>

        {/* Ward Leaderboard Card */}
        <div className={`${card} bg-gradient-to-br from-[#181f3d] to-[#121830] space-y-2`}>
          <div className="flex items-center justify-between text-xs font-bold text-[#aab4dc]">
            <span className="flex items-center gap-1.5 text-white">
              <Trophy className="w-4 h-4 text-amber-400" /> Ward Leaderboard
            </span>
            <span className="text-amber-300 text-[10px]">Recovery Rank</span>
          </div>
          <div className="space-y-1 text-xs">
            {wardRankings.slice(0, 3).map((w, idx) => (
              <div key={w.ward} className="flex items-center justify-between p-1 rounded bg-[#0d1326] border border-[#232d54]">
                <div className="flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-white font-medium">Ward {w.ward}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[#aab4dc]">{money(w.collected)}</span>
                  <span className={`font-bold ${w.pct >= 75 ? 'text-emerald-400' : w.pct >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {w.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
            {!wardRankings.length && <p className="text-[#8790bd] text-xs">No ward data available.</p>}
          </div>
        </div>

        {/* Payment Channels Card */}
        <div className={`${card} bg-gradient-to-br from-[#181f3d] to-[#121830] space-y-2`}>
          <div className="flex items-center justify-between text-xs font-bold text-[#aab4dc]">
            <span className="flex items-center gap-1.5 text-white">
              <WalletCards className="w-4 h-4 text-emerald-400" /> Payment Channels
            </span>
            <span className="text-emerald-300 text-[10px]">Active Receipts</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
            <div className="p-1.5 rounded-lg bg-[#0d1326] border border-[#232d54]">
              <span className="text-[#8790bd] block text-[10px]">Cash</span>
              <span className="text-white font-bold font-mono text-[11px]">{money(modeBreakdown['cash'] || 0)}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#0d1326] border border-[#232d54]">
              <span className="text-emerald-400 block text-[10px]">UPI QR</span>
              <span className="text-white font-bold font-mono text-[11px]">{money(modeBreakdown['upi'] || 0)}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#0d1326] border border-[#232d54]">
              <span className="text-cyan-400 block text-[10px]">Cheque</span>
              <span className="text-white font-bold font-mono text-[11px]">{money(modeBreakdown['cheque'] || 0)}</span>
            </div>
          </div>
          <div className="text-[10px] text-[#8790bd] text-right">
            Rebates granted: {money(grand.rebate)}
          </div>
        </div>
      </div>

      <div className={`${card} flex flex-wrap items-end gap-3`}>
        <label className="text-[11px] text-[#aab4dc]">Ward<select value={ward} onChange={(e) => setWard(e.target.value)} className={`${inp} block mt-1`}><option value="all">All wards</option>{wards.map((w) => <option key={w}>{w}</option>)}</select></label>
        <label className="text-[11px] text-[#aab4dc]">Collected from<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inp} block mt-1`} /></label>
        <label className="text-[11px] text-[#aab4dc]">to<input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value || today)} className={`${inp} block mt-1`} /></label>
        <p className="text-[11px] text-[#8790bd] flex-1 min-w-[200px]">Dues are as on {today}. Collection counts payments by receipt date; reversed receipts are left out.</p>
      </div>

      <div className={`${card} space-y-2`}>
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-[#9aa8ff] uppercase tracking-wider">Ward-wise collection ({headLabel(selectedHead)})</h3>
          <button type="button" onClick={wardCsv} disabled={!wardTable.length} className={`${btn} bg-[#1d2547] text-[#aab4dc] border border-[#2f3a6b]`}><Download className="w-3.5 h-3.5" /> CSV</button></div>
        <div className="overflow-x-auto"><table className="w-full text-xs text-left">
          <thead className="text-[#aab4dc] border-b border-[#28325c]"><tr><th className="p-2">Ward</th><th className="p-2 text-right">Props</th><th className="p-2 text-right">Demanded</th><th className="p-2 text-right">Collected</th><th className="p-2 text-right">Rebate</th><th className="p-2 text-right">Outstanding</th><th className="p-2 text-right">Defaulters</th><th className="p-2 text-right">%</th></tr></thead>
          <tbody>
            {wardTable.map((w) => (
              <tr key={w.ward} className="border-b border-[#20284b] text-white">
                <td className="p-2">{w.ward}</td><td className="p-2 text-right">{w.props}</td><td className="p-2 text-right">{money(w.demanded)}</td><td className="p-2 text-right">{money(w.collected)}</td><td className="p-2 text-right">{money(w.rebate)}</td><td className="p-2 text-right">{money(w.due + w.interestDue)}</td><td className="p-2 text-right">{w.defaulters}</td><td className="p-2 text-right">{w.demanded ? ((w.collected / w.demanded) * 100).toFixed(1) : '-'}</td>
              </tr>))}
            {wardTable.length > 0 && <tr className="font-bold text-[#ffe3a3]"><td className="p-2">Total</td><td className="p-2 text-right">{grand.props}</td><td className="p-2 text-right">{money(grand.demanded)}</td><td className="p-2 text-right">{money(grand.collected)}</td><td className="p-2 text-right">{money(grand.rebate)}</td><td className="p-2 text-right">{money(grand.due + grand.interestDue)}</td><td className="p-2 text-right">{grand.defaulters}</td><td className="p-2 text-right">{grand.demanded ? ((grand.collected / grand.demanded) * 100).toFixed(1) : '-'}</td></tr>}
            {!wardTable.length && <tr><td colSpan={8} className="p-4 text-center text-[#aab4dc]">No surveyed properties yet.</td></tr>}
          </tbody></table></div>
      </div>

      <div className={`${card} space-y-3`}>
        <h3 className="text-sm font-bold text-[#9aa8ff] uppercase tracking-wider">{headLabel(selectedHead)} Defaulters {ward === 'all' ? '(all wards)' : `(ward ${ward})`}: {defaulters.length}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-[#aab4dc]">Minimum total due (₹)<input type="number" min="0" value={minDue} onChange={(e) => setMinDue(e.target.value)} className={`${inp} block mt-1 w-28`} /></label>
          <button type="button" onClick={defCsv} disabled={!defaulters.length} className={`${btn} bg-[#1d2547] text-[#aab4dc] border border-[#2f3a6b]`}><Download className="w-3.5 h-3.5" /> CSV</button>
          <button type="button" onClick={() => printPages(defaulters, `${headLabel(selectedHead)} Notice of arrears`, false, false)} disabled={!defaulters.length} className={`${btn} bg-[#4f46e5] text-white`}><Printer className="w-3.5 h-3.5" /> Print notices</button>
          <button type="button" onClick={() => printPages(defaulters, `${headLabel(selectedHead)} Notice of arrears`, false, true)} disabled={!defaulters.length} className={`${btn} bg-[#2a3464] text-[#9aa8ff]`}><FileText className="w-3.5 h-3.5" /> Download notices</button>
        </div>
        <label className="text-[11px] text-[#aab4dc] block">Wording printed on bills and notices (add the notified clause or last date here)
          <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} className={`${inp} w-full mt-1`} /></label>
        <div className="overflow-x-auto max-h-80 overflow-y-auto"><table className="w-full text-xs text-left">
          <thead className="text-[#aab4dc] border-b border-[#28325c] sticky top-0 bg-[#181f3d]"><tr><th className="p-2">Property</th><th className="p-2">Ward</th><th className="p-2 text-right">Overdue</th><th className="p-2 text-right">Total due</th><th className="p-2">Since</th></tr></thead>
          <tbody>
            {defaulters.slice(0, 300).map(({ r, led, overdue }) => (
              <tr key={r.id} className="border-b border-[#20284b] text-white"><td className="p-2 font-mono">{r.id}<div className="text-[10px] text-[#aab4dc] font-sans">{r.owner}</div></td><td className="p-2">{r.ward}</td><td className="p-2 text-right">{money(overdue)}</td><td className="p-2 text-right font-bold">{money(led.totalDue)}</td><td className="p-2">{led.rows.find((x) => x.totalDue > 0)?.dueDate}</td></tr>))}
            {!defaulters.length && <tr><td colSpan={5} className="p-4 text-center text-[#aab4dc]">No defaulters for this filter.</td></tr>}
          </tbody></table>
          {defaulters.length > 300 && <p className="text-[10px] text-[#8790bd]">Showing 300 of {defaulters.length}. CSV has all.</p>}
        </div>
        <p className="text-[10px] text-[#8790bd]">A defaulter is a property with dues for a period whose due date has passed. Print and download cover at most 200 notices at a time; narrow by ward or raise the minimum.</p>
      </div>

      <div className={`${card} space-y-2`}>
        <h3 className="text-sm font-bold text-[#9aa8ff] uppercase tracking-wider">{headLabel(selectedHead)} Demand bills</h3>
        <p className="text-xs text-[#aab4dc]">{billable.length} propert{billable.length === 1 ? 'y has' : 'ies have'} dues {ward === 'all' ? 'in all wards' : `in ward ${ward}`}. Bills show the period-wise position and any early-payment rebate still open.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => printPages(billable, `${headLabel(selectedHead)} demand bill`, true, false)} disabled={!billable.length} className={`${btn} bg-[#4f46e5] text-white`}><Printer className="w-3.5 h-3.5" /> Print bills</button>
          <button type="button" onClick={() => printPages(billable, `${headLabel(selectedHead)} demand bill`, true, true)} disabled={!billable.length} className={`${btn} bg-[#2a3464] text-[#9aa8ff]`}><FileText className="w-3.5 h-3.5" /> Download bills</button>
        </div>
        {billable.length > 200 && <p className="text-[11px] text-[#ffe3a3]">Only the first 200 will be printed; choose a single ward.</p>}
      </div>

      <div className={`${card} space-y-2`}>
        <h3 className="text-sm font-bold text-[#9aa8ff] uppercase tracking-wider">Paid / unpaid map {ward === 'all' ? '' : `(ward ${ward})`}</h3>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          {counts.map(({ k, n }) => <span key={k} className="px-2 py-1 rounded bg-[#1d2547] text-white flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLOR[k] }} />{LABEL[k]} {n}</span>)}
        </div>
        {box ? (
          <>
            <svg viewBox={`0 0 ${box.W} ${box.H}`} className="w-full bg-[#121830] rounded-lg border border-[#28325c]" role="img" aria-label="Ward boundaries with properties coloured by payment status">
              {shown.map((w) => (
                <path key={`b${w.w}`} d={wardPath(w)} fillRule="evenodd" fill={tint ? recoveryFill(wardRecovery[String(w.w)]) : 'none'} fillOpacity={0.22} stroke="#aab4dc" strokeWidth={1.2} strokeLinejoin="round" />
              ))}
              {pts.map(({ x, lat, lng }) => (
                <circle key={x.r.id} cx={box.px(lng)} cy={box.py(lat)} r={hover === x.r.id ? 7 : 4} fill={COLOR[x.status]} stroke="#121830" strokeWidth={1}
                  onMouseEnter={() => setHover(x.r.id)} onClick={() => setHover(x.r.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} />
              ))}
              {shown.map((w) => { const c = wardLabel(w); return c ? <text key={`l${w.w}`} x={c.x} y={c.y} textAnchor="middle" fontSize={13} fontWeight={700} fill="#ffe3a3" stroke="#121830" strokeWidth={3} paintOrder="stroke" style={{ pointerEvents: 'none' }}>{w.w}</text> : null; })}
            </svg>
            <label className="flex items-center gap-2 text-[11px] text-[#aab4dc]"><input type="checkbox" checked={tint} onChange={(e) => setTint(e.target.checked)} /> Tint each ward by recovery (red = little of the demand cleared, green = most cleared, grey = no demand)</label>
            <p className="text-[11px] text-[#d6dcf5] min-h-[2.5em]">{hv ? `${hv.r.id} · ${hv.r.owner} · ${LABEL[hv.status]} · due ${money(hv.led.totalDue)}` : 'Tap a dot for details. North is up; ward numbers are shown on the boundaries. No base map, so it works offline.'}</p>
            {pts.length < inWard.length && <p className="text-[10px] text-[#8790bd]">{inWard.length - pts.length} propert{inWard.length - pts.length === 1 ? 'y' : 'ies'} without GPS are not shown.</p>}
          </>
        ) : <p className="text-xs text-[#aab4dc]">No ward boundaries or geo-tagged properties for this filter.</p>}
      </div>
    </div>
  );
};
