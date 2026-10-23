// Cloud storage for dues notices: owner mobile numbers (ownerContacts/<town>/<pid>) and the log of notices sent
// (notices/<town>/<pid>). Every notice is also written to the audit trail.
import { useEffect, useState } from 'react';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { db } from '../firebase';
import { currentUid } from './assessmentStore';
import { normalizeMobile } from './noticeText';

export type NoticeChannel = 'whatsapp' | 'sms' | 'print' | 'download';
export interface NoticeLogEntry { at: number; count: number; channel: NoticeChannel; total: number }

export function useOwnerContacts(townKey: string): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    setMap({});
    return onValue(ref(db, `ownerContacts/${townKey}`), (snap) => {
      const raw = (snap.val() || {}) as Record<string, { mobile?: string }>;
      setMap(Object.fromEntries(Object.entries(raw).filter(([, v]) => v && v.mobile).map(([k, v]) => [k, v.mobile as string])));
    }, () => { /* no permission or offline: keep what we have */ });
  }, [townKey]);
  return map;
}

/** Save (or, with an empty value, remove) an owner's mobile number. Throws if the number is not a valid Indian mobile. */
export async function saveOwnerMobile(townKey: string, pid: string, mobile: string): Promise<void> {
  const node = ref(db, `ownerContacts/${townKey}/${pid}`);
  if (!mobile.trim()) { await remove(node); return; }
  const n = normalizeMobile(mobile);
  if (!n) throw new Error('Enter a 10-digit mobile number (starting with 6, 7, 8 or 9).');
  await set(node, { mobile: n.slice(2), updatedAt: Date.now(), updatedBy: currentUid() });
}

export function useNoticeLog(townKey: string): Record<string, NoticeLogEntry> {
  const [map, setMap] = useState<Record<string, NoticeLogEntry>>({});
  useEffect(() => {
    setMap({});
    return onValue(ref(db, `notices/${townKey}`), (snap) => setMap((snap.val() || {}) as Record<string, NoticeLogEntry>), () => { /* ignore */ });
  }, [townKey]);
  return map;
}

/** Remember that a notice went out: last-sent record for the property, plus an audit-trail line. Never throws. */
export async function logNotice(townKey: string, pid: string, owner: string, channel: NoticeChannel, total: number, prevCount: number): Promise<void> {
  try {
    const at = Date.now();
    await set(ref(db, `notices/${townKey}/${pid}`), { at, count: prevCount + 1, channel, total: Math.round(total * 100) / 100 });
    await set(push(ref(db, `audit/${townKey}`)), {
      at, by: currentUid(), action: 'notice', propertyId: pid,
      detail: `Dues notice by ${channel} to ${owner || 'owner'} for ₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    });
  } catch { /* the notice itself was already handed to WhatsApp / SMS / printer; a failed log must not block the user */ }
}
