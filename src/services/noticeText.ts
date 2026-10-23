// Dues notices to property owners: what a notice says, in WhatsApp, SMS and print form. Pure functions (no database).
import { HeadId, headLabel } from './heads';
import { periodLabel, rupeesInWords } from './collection';
import type { PropertyLiability } from './liabilityCalc';
import type { PropertyRecord } from '../utils/gisUtils';

export interface NoticePeriod { period: string; dueDate: string; principal: number; interest: number; total: number; overdue: boolean }
export interface NoticeHead { head: HeadId; label: string; total: number; periods: NoticePeriod[] }
export interface NoticeData {
  town: string; pid: string; owner: string; ward: string; hno: string; addr: string;
  heads: NoticeHead[]; total: number; interest: number; overdue: number;
  today: string; payBy: string; extra: string;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 2026-11-07 -> 07 Nov 2026 */
export const fmtDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : iso);
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const money2 = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** Everything a notice needs, from one property's live dues. Only heads in `heads` are included. */
export function buildNotice(
  rec: Pick<PropertyRecord, 'id' | 'owner' | 'ward' | 'hno' | 'addr'>, liab: PropertyLiability, heads: HeadId[],
  o: { town: string; today: string; payBy: string; extra?: string },
): NoticeData {
  const hs: NoticeHead[] = liab.heads
    .filter((h) => heads.includes(h.head) && h.total > 0.004)
    .map((h) => ({
      head: h.head, label: headLabel(h.head), total: h.total,
      periods: h.periods.map((p) => ({ period: p.fy, dueDate: p.dueDate, principal: p.principal, interest: p.interest, total: p.total, overdue: p.dueDate < o.today })),
    }));
  const all = hs.flatMap((h) => h.periods);
  return {
    town: o.town, pid: rec.id, owner: rec.owner || 'Property owner', ward: rec.ward, hno: rec.hno || '', addr: rec.addr || '',
    heads: hs, total: hs.reduce((a, h) => a + h.total, 0), interest: all.reduce((a, p) => a + p.interest, 0),
    overdue: all.filter((p) => p.overdue).reduce((a, p) => a + p.total, 0),
    today: o.today, payBy: o.payBy, extra: (o.extra || '').trim(),
  };
}

const periodsText = (h: NoticeHead) => {
  const names = h.periods.map((p) => periodLabel(p.period));
  return names.length <= 3 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
};

/** WhatsApp message (bold with *…*), English with a Hindi title. */
export function whatsappText(n: NoticeData): string {
  const lines = n.heads.map((h) => `• ${h.label}: *${inr(h.total)}* (${periodsText(h)})`).join('\n');
  let m = `🏛️ *${n.town.toUpperCase()}*\n*बकाया राशि की सूचना · NOTICE OF PENDING DUES*\n\n`;
  m += `Dear *${n.owner}*,\n`;
  m += `Municipal dues are pending against your property *${n.pid}* (Ward ${n.ward}${n.hno ? `, House ${n.hno}` : ''}).\n\n`;
  m += `📋 *Pending bills / बकाया विवरण:*\n${lines}\n\n`;
  m += `💰 *Total payable: ${inr(n.total)}*${n.interest > 0.004 ? ` (includes interest ${inr(n.interest)})` : ''}\n`;
  m += `📅 *Please pay by: ${fmtDate(n.payBy)}*\n`;
  if (n.overdue > 0.004) m += `⚠️ ${inr(n.overdue)} is already overdue; interest grows every month of delay.\n`;
  if (n.extra) m += `\n${n.extra}\n`;
  m += `\nPay at the municipal cashier counter. Please ignore this message if you have already paid.\n`;
  m += `_Revenue Office, ${n.town}_`;
  return m;
}

/** Short plain-text version for SMS. */
export function smsText(n: NoticeData): string {
  const parts = n.heads.map((h) => `${h.label} ${inr(h.total)}`).join(', ');
  return `${n.town}: Dues of ${inr(n.total)} pending for property ${n.pid} (${parts}). Please pay by ${fmtDate(n.payBy)} at the municipal cashier counter. Ignore if already paid. - Revenue Office`;
}

const PAGE_CSS = `body{font-family:Arial,sans-serif;font-size:13px;margin:0;color:#111}.pg{padding:30px 34px;page-break-after:always}.pg:last-child{page-break-after:auto}
.hd{text-align:center;border-bottom:2px solid #1f3856;padding-bottom:10px;margin-bottom:14px}h1{font-size:19px;margin:0;letter-spacing:.03em}h2{font-size:14px;margin:4px 0 0;color:#1f3856}
table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #9aa7b6;padding:5px 8px;text-align:left}th{background:#eef3f9}.r{text-align:right}
.kv td{border:none;padding:2px 10px 2px 0}.tot td{font-weight:bold;background:#f6f8fb}.ov{color:#b42318;font-weight:bold}.box{border:1px solid #1f3856;padding:8px 10px;margin:10px 0;background:#f6f8fb}
.sig{margin-top:60px;display:flex;justify-content:space-between}.small{font-size:11px;color:#444}`;

/** One printable notice page. */
export function noticePageHtml(n: NoticeData): string {
  const rows = n.heads.map((h) => h.periods.map((p, i) =>
    `<tr><td>${i === 0 ? esc(h.label) : ''}</td><td>${esc(periodLabel(p.period))}</td><td>${esc(fmtDate(p.dueDate))}${p.overdue ? ' <span class="ov">overdue</span>' : ''}</td><td class="r">${money2(p.principal)}</td><td class="r">${money2(p.interest)}</td><td class="r">${money2(p.total)}</td></tr>`).join('')).join('');
  return `<div class="pg"><div class="hd"><h1>${esc(n.town.toUpperCase())}</h1><h2>NOTICE OF PENDING DUES · बकाया राशि की सूचना</h2></div>
<table class="kv"><tr><td>Date</td><td><b>${esc(fmtDate(n.today))}</b></td><td>Property ID</td><td><b>${esc(n.pid)}</b></td></tr>
<tr><td>To (owner)</td><td><b>${esc(n.owner)}</b></td><td>Ward</td><td>${esc(n.ward)}</td></tr>
<tr><td>House / plot</td><td>${esc(n.hno)}</td><td>Address</td><td>${esc(n.addr)}</td></tr></table>
<p>The following municipal dues are pending against your property. You are requested to pay them on or before <b>${esc(fmtDate(n.payBy))}</b>.</p>
<table><tr><th>Bill</th><th>Period</th><th>Due on</th><th class="r">Charge</th><th class="r">Interest</th><th class="r">Total</th></tr>${rows}
<tr class="tot"><td colspan="5" class="r">Total payable as on ${esc(fmtDate(n.today))}</td><td class="r">${money2(n.total)}</td></tr></table>
<div class="box"><b>Amount in words:</b> ${esc(rupeesInWords(n.total))}</div>
${n.overdue > 0.004 ? `<p class="ov">${money2(n.overdue)} of this amount is already overdue.</p>` : ''}
${n.extra ? `<p>${esc(n.extra)}</p>` : ''}
<p class="small">Pay at the municipal cashier counter and collect a receipt. Interest, where applicable, is charged as per the rules in force and increases with each month of delay. If you have already paid, please ignore this notice or show your receipt at the revenue office.</p>
<div class="sig"><span>Received by (owner)</span><span>Authorised signatory<br>Revenue Office, ${esc(n.town)}</span></div></div>`;
}

export function noticesDocument(list: NoticeData[], title = 'Notice of pending dues'): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PAGE_CSS}</style></head><body>${list.map(noticePageHtml).join('')}</body></html>`;
}

/** "98160 12345" / "+91 9816012345" / "09816012345" -> "919816012345". null if it is not an Indian mobile number. */
export function normalizeMobile(s: string | undefined | null): string | null {
  let d = String(s ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `91${d}` : null;
}
/** Show a stored number as 98160 12345. */
export const showMobile = (s: string | null | undefined) => { const n = normalizeMobile(s); return n ? `${n.slice(2, 7)} ${n.slice(7)}` : String(s ?? ''); };

/** A number already on the record: the first unit with a valid mobile (garbage units carry one). */
export function mobileFromRecord(rec: Pick<PropertyRecord, 'units'>): string {
  for (const u of Object.values(rec.units || {})) if (normalizeMobile(u.mobile)) return u.mobile as string;
  return '';
}

export const waLink = (mobile: string, text: string) => `https://wa.me/${normalizeMobile(mobile)}?text=${encodeURIComponent(text)}`;
export const smsLink = (mobile: string, text: string) => `sms:+${normalizeMobile(mobile)}?body=${encodeURIComponent(text)}`;
