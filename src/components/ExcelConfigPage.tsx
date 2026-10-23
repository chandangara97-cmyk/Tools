import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import { canSetPayableRates, useAuth } from '../services/auth';
import { applySettings, ApplyReport, listTowns, loadStates, postCorrections } from '../services/excelApply';
import { Change, diffConfig, KnownTown, parseConfig, ParseResult, TownState } from '../services/excelConfig';

const card = 'bg-[#181f3d] border border-[#28325c] rounded-xl p-4';
const btn = 'inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-40';
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

interface Preview { fileName: string; result: ParseResult; changes: Change[]; missing: string[] }

/** Admin page: the whole town configuration in one Excel file. Download it, edit it, upload it. */
export const ExcelConfigPage: React.FC<{ townKey: string; townName: string }> = () => {
  const { role, isSuper, ulb } = useAuth();
  const allowed = isSuper || canSetPayableRates(role);
  const [towns, setTowns] = useState<KnownTown[]>([]);
  const [states, setStates] = useState<Record<string, TownState>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [report, setReport] = useState<ApplyReport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const t = await listTowns(isSuper, ulb);
      setTowns(t); setStates(await loadStates(t));
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load the current settings. Check the internet connection.'); }
    setLoading(false);
  }, [isSuper, ulb]);
  useEffect(() => { if (allowed) void load(); }, [allowed, load]);

  const ctx = useMemo(() => ({
    towns, canManageTowns: isSuper,
    canWriteTown: (slug: string) => isSuper || slug === ulb,
  }), [towns, isSuper, ulb]);

  if (!allowed) return <p className="text-[#ff9fa2]">Only the ULB admin can use Excel settings.</p>;

  const download = async () => {
    setBusy(true); setErr('');
    try {
      const { buildWorkbook } = await import('../services/excelIO');
      const buf = await buildWorkbook({ towns: towns.map((t) => states[t.slug]).filter(Boolean), today: todayStr() });
      const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url; a.download = `town-settings-${isSuper ? 'all-towns' : ulb}-${todayStr()}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not build the workbook.'); }
    setBusy(false);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setErr(''); setReport(null); setPreview(null);
    try {
      if (!/\.xlsx$/i.test(f.name)) throw new Error('Choose an .xlsx file (Excel workbook). Older .xls and .csv files are not supported.');
      if (f.size > 15 * 1024 * 1024) throw new Error('The file is larger than 15 MB.');
      const { readWorkbook } = await import('../services/excelIO');
      const { sheets, missing } = await readWorkbook(await f.arrayBuffer());
      if (missing.length === 9) throw new Error('This does not look like a settings workbook. Download one from this page and edit that.');
      const result = parseConfig(sheets, ctx);
      setPreview({ fileName: f.name, result, changes: diffConfig(result.config, states), missing });
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not read the file.'); }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const apply = async () => {
    if (!preview || preview.result.errorCount > 0) return;
    const { config } = preview.result;
    const nCorr = config.corrections.length;
    const msg = `Apply ${preview.changes.length} settings change(s)${nCorr ? ` and post ${nCorr} correction(s)` : ''}?\n\nThe website uses the new values straight away.${nCorr ? '\nCorrections are permanent ledger entries; an already-posted Correction ID is skipped.' : ''}`;
    if (!window.confirm(msg)) return;
    setBusy(true); setErr('');
    try {
      const towns2 = await applySettings(config, states);
      const corrections = nCorr ? await postCorrections(config.corrections) : [];
      setReport({ towns: towns2, corrections });
      setPreview(null);
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save. Check the internet connection and try again.'); }
    setBusy(false);
  };

  const byTown = new Map<string, Change[]>();
  for (const c of preview?.changes || []) byTown.set(c.town, [...(byTown.get(c.town) || []), c]);
  const nCorr = preview?.result.config.corrections.length || 0;
  const canApply = !!preview && preview.result.errorCount === 0 && (preview.changes.length > 0 || nCorr > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className={card}>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileSpreadsheet className="w-6 h-6 text-[#34d399]" />Excel settings</h2>
        <p className="text-sm text-[#aab4dc] mt-1">
          Towns, bill heads, fixed amounts, due dates and interest, property tax bye-laws and bill corrections — all in one Excel file.
          {isSuper ? ' You can include every town.' : ' This file covers your town.'} Download it, edit it, upload it, and the website updates.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" disabled={busy || loading || !towns.length} onClick={() => void download()} className={`${btn} bg-[#2a3464] text-[#9aa8ff]`}><Download className="w-4 h-4" />Download current settings</button>
          <button type="button" disabled={busy || loading || !towns.length} onClick={() => fileRef.current?.click()} className={`${btn} bg-[#4f6bff] text-white`}><Upload className="w-4 h-4" />Upload edited file</button>
          <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" aria-label="Upload settings workbook" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
        {loading && <p className="text-xs text-[#aab4dc] mt-2">Loading current settings…</p>}
        {!loading && !towns.length && <p className="text-xs text-[#ffd48a] mt-2">No ULB is set up for this login yet.</p>}
      </div>

      {err && <p role="alert" className="text-sm text-[#ff9fa2]">{err}</p>}

      {preview && (
        <div className={`${card} space-y-3`}>
          <h3 className="text-white font-bold">Checked: {preview.fileName}</h3>
          {preview.missing.length > 0 && <p className="text-xs text-[#ffd48a]">Sheets not in this file (left untouched): {preview.missing.join(', ')}.</p>}

          {preview.result.errorCount > 0 ? (
            <p className="text-sm text-[#ff9fa2] flex items-start gap-1.5"><XCircle className="w-4 h-4 mt-0.5 flex-none" />{preview.result.errorCount} problem(s) found. Nothing has been applied. Fix them in Excel and upload again.</p>
          ) : (
            <p className="text-sm text-[#34d399] flex items-start gap-1.5"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-none" />No problems. {preview.changes.length} settings change(s){nCorr ? `, ${nCorr} correction(s) to post` : ''}{!preview.changes.length && !nCorr ? ' — the file matches the website already' : ''}.</p>
          )}

          {preview.result.issues.length > 0 && (
            <ul className="text-xs space-y-1 max-h-72 overflow-y-auto">
              {preview.result.issues.slice(0, 200).map((i, k) => (
                <li key={k} className={i.level === 'error' ? 'text-[#ff9fa2]' : 'text-[#ffd48a]'}>
                  {i.level === 'error' ? <XCircle className="w-3.5 h-3.5 inline mr-1" /> : <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />}
                  <b>{i.sheet}</b>, row {i.row}: {i.message}
                </li>
              ))}
              {preview.result.issues.length > 200 && <li className="text-[#8790bd]">…and {preview.result.issues.length - 200} more.</li>}
            </ul>
          )}

          {[...byTown.entries()].map(([t, list]) => (
            <div key={t} className="bg-[#121830] rounded-lg p-3">
              <h4 className="text-xs font-bold text-[#ffe3a3] uppercase tracking-wider">{towns.find((x) => x.slug === t)?.name || t} · {list.length} change(s)</h4>
              <ul className="mt-2 space-y-2 text-xs text-[#cfd6f5]">
                {list.map((c, k) => (
                  <li key={k}><b className="text-white">{c.area} · {c.label}</b><br /><span className="text-[#8790bd]">was:</span> {c.before}<br /><span className="text-[#8790bd]">now:</span> {c.after}</li>
                ))}
              </ul>
            </div>
          ))}

          {nCorr > 0 && (
            <div className="bg-[#121830] rounded-lg p-3 text-xs text-[#cfd6f5]">
              <h4 className="font-bold text-[#ffe3a3] uppercase tracking-wider">{nCorr} correction(s) to post</h4>
              <ul className="mt-2 space-y-1">
                {preview.result.config.corrections.slice(0, 50).map((c) => (
                  <li key={c.id}><b className="text-white">{c.id}</b> · {c.town} · {c.head} · {c.propertyId} · {c.period} · {c.amount > 0 ? '+' : ''}{c.amount} · {c.reason}</li>
                ))}
                {nCorr > 50 && <li className="text-[#8790bd]">…and {nCorr - 50} more.</li>}
              </ul>
              <p className="mt-2 text-[#ffd48a]">Permanent ledger entries. A correction whose ID is already posted is skipped; one with no bill for its period is refused.</p>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" disabled={busy || !canApply} onClick={() => void apply()} className={`${btn} bg-[#34d399] text-[#07201a]`}>Apply to website</button>
            <button type="button" disabled={busy} onClick={() => setPreview(null)} className={`${btn} bg-[#2a3464] text-[#9aa8ff]`}>Cancel</button>
          </div>
        </div>
      )}

      {report && (
        <div className={`${card} space-y-2`} role="status">
          <h3 className="text-white font-bold">Result</h3>
          {report.towns.length === 0 && report.corrections.length === 0 && <p className="text-sm text-[#aab4dc]">Nothing needed saving.</p>}
          {report.towns.map((t) => (
            <p key={t.town} className={`text-sm ${t.ok ? 'text-[#34d399]' : 'text-[#ff9fa2]'}`}>{t.ok ? '✓' : '✗'} {towns.find((x) => x.slug === t.town)?.name || t.town}: {t.message}</p>
          ))}
          {report.corrections.length > 0 && (
            <>
              <p className="text-sm text-[#cfd6f5]">Corrections: {report.corrections.filter((c) => c.status === 'posted').length} posted, {report.corrections.filter((c) => c.status === 'skipped').length} already posted, {report.corrections.filter((c) => c.status === 'rejected').length} refused.</p>
              <ul className="text-xs space-y-1">
                {report.corrections.filter((c) => c.status !== 'posted').map((c) => <li key={c.id} className={c.status === 'rejected' ? 'text-[#ff9fa2]' : 'text-[#ffd48a]'}>{c.id}: {c.message}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      <p className="text-[11px] text-[#8790bd]">Only the values in the file are set; towns or heads you leave out stay as they are. Every change is recorded in the audit trail. Use a computer to download and upload; the Excel file cannot be edited inside the app.</p>
    </div>
  );
};
