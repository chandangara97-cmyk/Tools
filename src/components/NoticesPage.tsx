import React, { useMemo, useState } from 'react';
import { BellRing, Check, Download, FileText, MessageCircle, MessageSquare, Pencil, Printer, Search, SkipForward, X, Zap } from 'lucide-react';
import type { PropertyRecord } from '../utils/gisUtils';
import { triggerFileDownload } from '../utils/gisUtils';
import { HeadId, headLabel } from '../services/heads';
import { todayIso } from '../services/collection';
import { useAllLedgers, useAllSettings, propertyLiability, PropertyLiability } from '../services/liability';
import {
  addDaysIso, buildNotice, fmtDate, mobileFromRecord, normalizeMobile, noticesDocument, showMobile, smsLink, smsText, waLink, whatsappText,
} from '../services/noticeText';
import { NoticeChannel, logNotice, saveOwnerMobile, useNoticeLog, useOwnerContacts } from '../services/noticeStore';
import { printHtml } from './CollectionPanel';
import { HEAD_COLOR, inrFull } from './charts';

interface Props { townKey: string; townName: string; records: PropertyRecord[]; heads: HeadId[] }

const INK = '#1f3856', MUTED = '#64788f', LINE = '#dbe6f2';
const card = 'rounded-2xl border bg-white p-4 sm:p-5';
const cardStyle: React.CSSProperties = { borderColor: LINE, boxShadow: '0 8px 28px rgba(20,44,83,.06)' };
const field = 'rounded-xl border px-3 py-2 text-sm outline-none focus:ring-4';
const fieldStyle: React.CSSProperties = { borderColor: '#cbd8e8', background: '#fff', color: INK };
const CHANNEL_LABEL: Record<NoticeChannel, string> = { whatsapp: 'WhatsApp', sms: 'SMS', print: 'Printed', download: 'Downloaded' };
const MAX_BULK = 200;
const q = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;

interface Row { r: PropertyRecord; liab: PropertyLiability; total: number; overdue: number; mobile: string; valid: boolean }

const ago = (at: number) => {
  const d = Math.floor((Date.now() - at) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

const Btn: React.FC<{ onClick: () => void; disabled?: boolean; bg: string; fg?: string; border?: string; children: React.ReactNode; title?: string }> = ({ onClick, disabled, bg, fg = '#fff', border, children, title }) => (
  <button type="button" title={title} onClick={onClick} disabled={disabled}
    className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold disabled:opacity-40 active:scale-[0.98] transition"
    style={{ background: bg, color: fg, border: border ? `1px solid ${border}` : '1px solid transparent' }}>{children}</button>
);

export const NoticesPage: React.FC<Props> = ({ townKey, townName, records, heads }) => {
  const { ledgers, status } = useAllLedgers(townKey);
  const { settings, ready: settingsReady } = useAllSettings(townKey);
  const contacts = useOwnerContacts(townKey);
  const log = useNoticeLog(townKey);
  const ready = status === 'ready' && settingsReady;
  const today = todayIso();

  const [off, setOff] = useState<HeadId[]>([]); // bills switched off for this notice run
  const [ward, setWard] = useState('all');
  const [minDue, setMinDue] = useState('1');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [needMobile, setNeedMobile] = useState(false);
  const [payDays, setPayDays] = useState('15');
  const [extra, setExtra] = useState('Please pay the dues at the earliest to avoid further interest.');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(40);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [queue, setQueue] = useState<{ items: Row[]; i: number } | null>(null);

  const activeHeads = useMemo(() => { const a = heads.filter((h) => !off.includes(h)); return a.length ? a : heads; }, [heads, off]);
  const town = useMemo(() => records.filter((r) => r && r.id && r.town === townName), [records, townName]);
  const wards = useMemo(() => [...new Set(town.map((r) => r.ward))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [town]);
  const payBy = addDaysIso(today, Math.max(0, parseInt(payDays, 10) || 0));

  const all: Row[] = useMemo(() => {
    if (!ready) return [];
    const out: Row[] = [];
    for (const r of town) {
      const liab = propertyLiability(r.id, activeHeads, ledgers, settings, today);
      if (liab.total <= 0.004) continue;
      const overdue = liab.heads.reduce((a, h) => a + h.periods.filter((p) => p.dueDate < today).reduce((b, p) => b + p.total, 0), 0);
      const mobile = contacts[r.id] || mobileFromRecord(r);
      out.push({ r, liab, total: liab.total, overdue, mobile, valid: !!normalizeMobile(mobile) });
    }
    return out.sort((a, b) => b.total - a.total);
  }, [ready, town, activeHeads, ledgers, settings, today, contacts]);

  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    const min = parseFloat(minDue) || 0;
    return all.filter((x) =>
      x.total >= min && (ward === 'all' || x.r.ward === ward) && (!overdueOnly || x.overdue > 0.004) && (!needMobile || x.valid)
      && (!t || `${x.r.id} ${x.r.owner} ${x.r.hno} ${x.mobile}`.toLowerCase().includes(t)));
  }, [all, search, minDue, ward, overdueOnly, needMobile]);

  const totalAmt = rows.reduce((a, x) => a + x.total, 0);
  const withMobile = rows.filter((x) => x.valid).length;
  const notified = rows.filter((x) => log[x.r.id]).length;

  const noticeOf = (x: Row) => buildNotice(x.r, x.liab, activeHeads, { town: townName, today, payBy, extra });
  const record = (x: Row, ch: NoticeChannel) => logNotice(townKey, x.r.id, x.r.owner, ch, x.total, log[x.r.id]?.count || 0);

  const startEdit = (x: Row) => { setEditing(x.r.id); setDraft(x.mobile ? showMobile(x.mobile) : ''); setErr(''); };
  const saveMobile = async (pid: string) => {
    setErr('');
    try { await saveOwnerMobile(townKey, pid, draft); setEditing(null); setNote(draft.trim() ? 'Mobile number saved.' : 'Mobile number removed.'); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not save. Check the internet connection and try again.'); }
  };

  const sendWhatsApp = (x: Row) => {
    if (!x.valid) { startEdit(x); setErr('Add a valid mobile number first.'); return; }
    window.open(waLink(x.mobile, whatsappText(noticeOf(x))), '_blank', 'noopener');
    void record(x, 'whatsapp'); setNote(`WhatsApp opened for ${x.r.owner || x.r.id}. Press Send in WhatsApp.`);
  };
  const sendSms = (x: Row) => {
    if (!x.valid) { startEdit(x); setErr('Add a valid mobile number first.'); return; }
    void record(x, 'sms'); window.location.href = smsLink(x.mobile, smsText(noticeOf(x)));
  };
  const printOne = (x: Row) => { printHtml(noticesDocument([noticeOf(x)])); void record(x, 'print'); };

  const bulk = rows.slice(0, MAX_BULK);
  const bulkPrint = (download: boolean) => {
    if (!bulk.length) return;
    if (!window.confirm(`${download ? 'Download' : 'Print'} ${bulk.length} notice${bulk.length === 1 ? '' : 's'} (${inrFull(bulk.reduce((a, x) => a + x.total, 0))})?${rows.length > MAX_BULK ? `\n\nOnly the first ${MAX_BULK} of ${rows.length} are included. Narrow by ward or raise the minimum.` : ''}`)) return;
    const html = noticesDocument(bulk.map(noticeOf));
    if (download) triggerFileDownload(html, `${townName}_dues_notices_${today}.html`, 'text/html'); else printHtml(html);
    bulk.forEach((x) => void record(x, download ? 'download' : 'print'));
    setNote(`${bulk.length} notice${bulk.length === 1 ? '' : 's'} ${download ? 'downloaded' : 'sent to the printer'}.`);
  };
  const csv = () => {
    const head = ['Property', 'Ward', 'Owner', 'House', 'Mobile', ...activeHeads.map(headLabel), 'Overdue', 'Total due', 'Last notice'];
    const lines = [head.join(','), ...rows.map((x) => [
      q(x.r.id), q(x.r.ward), q(x.r.owner), q(x.r.hno), q(x.valid ? showMobile(x.mobile) : ''),
      ...activeHeads.map((h) => (x.liab.heads.find((y) => y.head === h)?.total || 0).toFixed(2)),
      x.overdue.toFixed(2), x.total.toFixed(2), q(log[x.r.id] ? `${CHANNEL_LABEL[log[x.r.id].channel]} ${fmtDate(new Date(log[x.r.id].at).toISOString().slice(0, 10))}` : ''),
    ].join(','))];
    triggerFileDownload('\uFEFF' + lines.join('\n'), `${townName}_notice_list_${today}.csv`, 'text/csv');
  };

  const startQueue = () => {
    const items = rows.filter((x) => x.valid).slice(0, MAX_BULK);
    if (!items.length) { setErr('No property in this list has a valid mobile number.'); return; }
    setErr(''); setQueue({ items, i: 0 });
  };
  const queueSend = () => {
    if (!queue) return;
    const x = queue.items[queue.i];
    window.open(waLink(x.mobile, whatsappText(noticeOf(x))), '_blank', 'noopener');
    void record(x, 'whatsapp');
    setQueue(queue.i + 1 >= queue.items.length ? null : { ...queue, i: queue.i + 1 });
  };
  const queueSkip = () => queue && setQueue(queue.i + 1 >= queue.items.length ? null : { ...queue, i: queue.i + 1 });

  const toggleHead = (h: HeadId) => setOff((o) => (o.includes(h) ? o.filter((x) => x !== h) : activeHeads.length > 1 ? [...o, h] : o));
  const cur = queue ? queue.items[queue.i] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-10">
      <section className={card} style={cardStyle}>
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl grid place-items-center flex-none" style={{ background: '#fff4d6', color: '#b45309' }}><BellRing className="w-5 h-5" /></span>
          <div className="min-w-0">
            <h2 className="font-black tracking-tight" style={{ color: INK, fontSize: 22 }}>Dues notices · {townName}</h2>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>Send a notice to the owner of every structure that has a pending bill: property tax, garbage, water, sewerage or any other. One notice lists all pending bills of the property.</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>Bills to include</p>
          <div className="flex flex-wrap gap-2">
            {heads.map((h) => {
              const on = activeHeads.includes(h);
              return (
                <button key={h} type="button" onClick={() => toggleHead(h)} aria-pressed={on}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold border transition"
                  style={on ? { background: HEAD_COLOR[h], color: '#fff', borderColor: HEAD_COLOR[h] } : { background: '#fff', color: MUTED, borderColor: '#cbd8e8' }}>
                  {on && <Check className="w-3 h-3" />}{headLabel(h)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Ward
            <select value={ward} onChange={(e) => setWard(e.target.value)} className={`${field} w-full mt-1`} style={fieldStyle}>
              <option value="all">All wards</option>{wards.map((w) => <option key={w} value={w}>Ward {w}</option>)}
            </select></label>
          <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Minimum due (₹)
            <input type="number" min="0" value={minDue} onChange={(e) => setMinDue(e.target.value)} className={`${field} w-full mt-1`} style={fieldStyle} /></label>
          <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Pay within (days)
            <input type="number" min="0" value={payDays} onChange={(e) => setPayDays(e.target.value)} className={`${field} w-full mt-1`} style={fieldStyle} /></label>
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Last date to pay
            <div className="mt-1 rounded-xl px-3 py-2 text-sm font-extrabold normal-case" style={{ background: '#eef4fd', color: INK }}>{fmtDate(payBy)}</div></div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm" style={{ color: INK }}>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Overdue only (due date passed)</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={needMobile} onChange={(e) => setNeedMobile(e.target.checked)} /> Only owners with a mobile number</label>
        </div>
        <label className="block text-[11px] font-bold uppercase tracking-wider mt-3" style={{ color: MUTED }}>Message added to every notice
          <textarea rows={2} value={extra} onChange={(e) => setExtra(e.target.value)} className={`${field} w-full mt-1 normal-case font-normal`} style={fieldStyle} /></label>
      </section>

      {/* Summary + bulk tools */}
      <section className={`${card} space-y-3`} style={{ ...cardStyle, borderTop: '3px solid #f59e0b' }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Notices to send', ready ? String(rows.length) : '…', INK],
            ['Total pending', ready ? inrFull(totalAmt) : '…', '#dc2626'],
            ['With mobile number', ready ? `${withMobile} / ${rows.length}` : '…', '#16a34a'],
            ['Already notified', ready ? String(notified) : '…', '#7c3aed'],
          ].map(([l, v, c]) => (
            <div key={l}><p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{l}</p><p className="font-black tabular-nums" style={{ color: c, fontSize: 22 }}>{v}</p></div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn bg="#16a34a" onClick={startQueue} disabled={!rows.length}><Zap className="w-3.5 h-3.5" /> WhatsApp all, one by one</Btn>
          <Btn bg="#2f6fed" onClick={() => bulkPrint(false)} disabled={!rows.length}><Printer className="w-3.5 h-3.5" /> Print all</Btn>
          <Btn bg="#eef4fd" fg="#245bb0" border="#cfe0f7" onClick={() => bulkPrint(true)} disabled={!rows.length}><FileText className="w-3.5 h-3.5" /> Download notices</Btn>
          <Btn bg="#fff" fg={INK} border="#cbd8e8" onClick={csv} disabled={!rows.length}><Download className="w-3.5 h-3.5" /> List (CSV)</Btn>
        </div>
        {queue && cur && (
          <div className="rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: '#ecfdf3', border: '1px solid #a7e8c4' }}>
            <div className="min-w-0">
              <p className="text-xs font-bold" style={{ color: '#157f3b' }}>Notice {queue.i + 1} of {queue.items.length}</p>
              <p className="font-extrabold truncate" style={{ color: INK }}>{cur.r.owner || cur.r.id} · {showMobile(cur.mobile)} · {inrFull(cur.total)}</p>
            </div>
            <div className="flex gap-2">
              <Btn bg="#16a34a" onClick={queueSend}><MessageCircle className="w-3.5 h-3.5" /> Open WhatsApp</Btn>
              <Btn bg="#fff" fg={INK} border="#cbd8e8" onClick={queueSkip}><SkipForward className="w-3.5 h-3.5" /> Skip</Btn>
              <Btn bg="#fff" fg="#b42318" border="#f3c3bd" onClick={() => setQueue(null)}><X className="w-3.5 h-3.5" /> Stop</Btn>
            </div>
          </div>
        )}
        {note && <p role="status" className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#157f3b' }}><Check className="w-4 h-4" />{note}</p>}
        {err && !editing && <p role="alert" className="text-sm font-semibold" style={{ color: '#b42318' }}>{err}</p>}
      </section>

      {status === 'error' && <p role="alert" className="text-sm" style={{ color: '#b42318' }}>Dues could not be loaded. Check the internet connection and reopen this page.</p>}

      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#3979db' }} />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setLimit(40); }} placeholder="Search owner, property ID, house or mobile" aria-label="Search" autoComplete="off"
          className="w-full h-12 pl-12 pr-4 rounded-2xl border-2 outline-none text-base" style={{ borderColor: '#cbd8e8', background: '#fff', color: INK }} />
      </div>

      {/* Owner list */}
      <ul className="space-y-3">
        {rows.slice(0, limit).map((x) => {
          const l = log[x.r.id];
          const open = editing === x.r.id;
          return (
            <li key={x.r.id} className={card} style={{ ...cardStyle, borderLeft: `4px solid ${x.overdue > 0.004 ? '#ef4444' : '#f59e0b'}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold truncate" style={{ color: INK, fontSize: 16 }}>{x.r.owner || 'Owner not recorded'}</p>
                  <p className="text-xs truncate" style={{ color: MUTED }}>{x.r.id} · Ward {x.r.ward}{x.r.hno ? ` · House ${x.r.hno}` : ''}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {x.liab.heads.filter((h) => h.total > 0.004).map((h) => (
                      <span key={h.head} className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${HEAD_COLOR[h.head]}16`, color: HEAD_COLOR[h.head] }}>{headLabel(h.head)} {inrFull(h.total)}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-none">
                  <p className="font-black tabular-nums" style={{ color: '#dc2626', fontSize: 19 }}>{inrFull(x.total)}</p>
                  <p className="text-[11px] font-bold" style={{ color: x.overdue > 0.004 ? '#b42318' : '#b45309' }}>{x.overdue > 0.004 ? `${inrFull(x.overdue)} overdue` : 'not yet overdue'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 text-xs flex-wrap" style={{ color: MUTED }}>
                <span className="font-semibold" style={{ color: x.valid ? INK : '#b45309' }}>{x.valid ? `📱 ${showMobile(x.mobile)}` : 'No mobile number'}</span>
                <button type="button" onClick={() => (open ? setEditing(null) : startEdit(x))} className="inline-flex items-center gap-1 font-bold" style={{ color: '#245bb0' }}><Pencil className="w-3 h-3" />{x.valid ? 'Change' : 'Add'}</button>
                {l && <span className="ml-auto rounded-full px-2 py-0.5 font-bold" style={{ background: '#f1ecfe', color: '#6d28d9' }}>Notice {ago(l.at)} · {CHANNEL_LABEL[l.channel]}{l.count > 1 ? ` · ${l.count}×` : ''}</span>}
              </div>

              {open && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} inputMode="tel" placeholder="10-digit mobile" aria-label="Owner mobile number" autoFocus
                    className={`${field} w-48`} style={fieldStyle} onKeyDown={(e) => { if (e.key === 'Enter') void saveMobile(x.r.id); }} />
                  <Btn bg="#2f6fed" onClick={() => void saveMobile(x.r.id)}>Save</Btn>
                  <Btn bg="#fff" fg={INK} border="#cbd8e8" onClick={() => setEditing(null)}>Cancel</Btn>
                  {err && <span role="alert" className="text-xs font-semibold" style={{ color: '#b42318' }}>{err}</span>}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                <Btn bg="#16a34a" onClick={() => sendWhatsApp(x)}><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</Btn>
                <Btn bg="#0ea5c6" onClick={() => sendSms(x)}><MessageSquare className="w-3.5 h-3.5" /> SMS</Btn>
                <Btn bg="#eef4fd" fg="#245bb0" border="#cfe0f7" onClick={() => printOne(x)}><Printer className="w-3.5 h-3.5" /> Print notice</Btn>
              </div>
            </li>
          );
        })}
      </ul>

      {ready && !rows.length && (
        <div className={`${card} text-center`} style={cardStyle}>
          <p className="font-extrabold" style={{ color: INK }}>{all.length ? 'No property matches these filters.' : 'No pending dues for the selected bills.'}</p>
          <p className="text-sm mt-1" style={{ color: MUTED }}>{all.length ? 'Lower the minimum amount or clear the filters.' : 'Nothing to send a notice for.'}</p>
        </div>
      )}
      {ready && rows.length > limit && <button type="button" onClick={() => setLimit(limit + 40)} className="w-full rounded-xl py-3 text-sm font-extrabold border" style={{ borderColor: '#cbd8e8', color: '#245bb0', background: '#fff' }}>Show more ({rows.length - limit} left)</button>}

      <p className="text-[11px]" style={{ color: MUTED }}>WhatsApp and SMS open on this device with the message already written; press Send there. Printing and “Download notices” cover at most {MAX_BULK} notices at a time. Every notice is recorded in the audit trail. Interest shown is worked out from each bill's approved rules.</p>
    </div>
  );
};
