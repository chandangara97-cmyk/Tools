// Reads the live town settings and writes an uploaded workbook's changes. Every write goes through the same
// database rules as the app's own pages, so a login can only change what it could change by hand.
import { ref, get, update, push } from 'firebase/database';
import { db } from '../firebase';
import { currentUid } from './assessmentStore';
import { ledgerKey, HeadId } from './heads';
import { CollectionSettings, LedgerEntry, liveDemand, placeholderSettings } from './collection';
import { RateTable } from './assessment';
import {
  CorrectionRow, HEAD_IDS, KnownTown, ParsedConfig, TownState, TownWrites, correctionEntryId, planWrites,
} from './excelConfig';

const val = async <T,>(path: string): Promise<T | null> => (await get(ref(db, path))).val() as T | null;

/** The ULBs a login can see: all of them for the platform owner, only its own for a town admin. */
export async function listTowns(isSuper: boolean, ulb: string | null): Promise<KnownTown[]> {
  if (isSuper) {
    const all = (await val<Record<string, { name?: string }>>('ulbs')) || {};
    return Object.entries(all).map(([slug, v]) => ({ slug, name: v?.name || slug })).sort((a, b) => a.name.localeCompare(b.name));
  }
  if (!ulb) return [];
  const one = await val<{ name?: string }>(`ulbs/${ulb}`);
  return [{ slug: ulb, name: one?.name || ulb }];
}

/** Live state of the given towns, in the shape the diff and the download use. */
export async function loadStates(towns: KnownTown[]): Promise<Record<string, TownState>> {
  const out: Record<string, TownState> = {};
  await Promise.all(towns.map(async ({ slug, name }) => {
    const [u, pr, hs, cs, rt] = await Promise.all([
      val<{ active?: boolean; heads?: Record<string, string> }>(`ulbs/${slug}`),
      val<Record<string, { residential?: unknown; commercial?: unknown; frequency?: string }>>(`payableRates/${slug}`),
      val<Record<string, CollectionSettings>>(`headSettings/${slug}`),
      val<CollectionSettings>(`collectionSettings/${slug}`),
      val<RateTable>(`rateTables/${slug}`),
    ]);
    const recorded = HEAD_IDS.filter((h) => u?.heads && h in u.heads);
    const heads: HeadId[] = recorded.length ? (recorded.includes('property_tax') ? recorded : ['property_tax', ...recorded]) : [...HEAD_IDS];
    const rates: TownState['rates'] = {};
    for (const [h, v] of Object.entries(pr || {})) {
      if (!v || typeof v !== 'object' || !HEAD_IDS.includes(h as HeadId)) continue;
      rates[h as HeadId] = { residential: typeof v.residential === 'number' ? v.residential : null, commercial: typeof v.commercial === 'number' ? v.commercial : null, frequency: v.frequency === 'monthly' ? 'monthly' : 'yearly' };
    }
    const rules: TownState['rules'] = {};
    const norm = (v: CollectionSettings): CollectionSettings => ({ ...placeholderSettings(), ...v, clauses: v.clauses || {} });
    if (cs) rules.property_tax = norm(cs);
    for (const [h, v] of Object.entries(hs || {})) if (v && HEAD_IDS.includes(h as HeadId)) rules[h as HeadId] = norm(v);
    out[slug] = { slug, name, active: u?.active !== false, heads, rates, rules, bylaw: rt ?? null };
  }));
  return out;
}

export interface TownResult { town: string; ok: boolean; changes: number; message: string }
export interface CorrectionResult { id: string; town: string; status: 'posted' | 'skipped' | 'rejected'; message: string }
export interface ApplyReport { towns: TownResult[]; corrections: CorrectionResult[] }

const friendly = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return /permission[_ ]denied/i.test(m) ? 'Not allowed for your login (or the value was refused by the database rules).' : m || 'Could not save. Check the internet connection and try again.';
};
const newKey = (path: string) => push(ref(db, path)).key as string;

/** Write the settings changes, one town at a time, so a problem in one town never blocks another. */
export async function applySettings(cfg: ParsedConfig, current: Record<string, TownState>): Promise<TownResult[]> {
  const uid = currentUid();
  const plans: TownWrites[] = planWrites(cfg, current, uid, Date.now());
  const results: TownResult[] = [];
  for (const p of plans) {
    if (!Object.keys(p.updates).length) continue;
    try {
      const detail = `Excel upload: ${p.changes.map((c) => `${c.area} ${c.label}`).join('; ')}`.slice(0, 900);
      await update(ref(db), { ...p.updates, [`audit/${p.town}/${newKey(`audit/${p.town}`)}`]: { at: Date.now(), by: uid, action: 'excel', detail } });
      results.push({ town: p.town, ok: true, changes: p.changes.length, message: `${p.changes.length} change(s) saved.` });
    } catch (e) {
      results.push({ town: p.town, ok: false, changes: p.changes.length, message: friendly(e) });
    }
  }
  return results;
}

/**
 * Post each correction as an adjustment under a fixed id, so uploading the same file twice never doubles it.
 * A correction is refused when the property has no live bill for that period, rather than creating an orphan entry.
 */
export async function postCorrections(rows: CorrectionRow[]): Promise<CorrectionResult[]> {
  const uid = currentUid();
  const out: CorrectionResult[] = [];
  const one = async (c: CorrectionRow): Promise<CorrectionResult> => {
    const base = `ledger/${c.town}/${ledgerKey(c.head, c.propertyId)}`;
    const eid = correctionEntryId(c.id);
    try {
      const raw = (await val<Record<string, Omit<LedgerEntry, 'id'>>>(base)) || {};
      if (raw[eid]) return { id: c.id, town: c.town, status: 'skipped', message: 'Already posted earlier.' };
      const entries: LedgerEntry[] = Object.entries(raw).map(([id, e]) => ({ ...e, id }));
      if (!liveDemand(entries, c.period)) return { id: c.id, town: c.town, status: 'rejected', message: `No bill for ${c.period} on this property and head. Generate the bill first.` };
      const entry = { type: 'adjustment', fy: c.period, amount: c.amount, date: c.date, at: Date.now(), by: uid, reason: c.reason };
      await update(ref(db), {
        [`${base}/${eid}`]: entry,
        [`audit/${c.town}/${newKey(`audit/${c.town}`)}`]: { at: Date.now(), by: uid, action: 'adjustment', propertyId: c.propertyId, detail: `Excel correction ${c.id}: ${c.head} ${c.period} ${c.amount > 0 ? '+' : ''}${c.amount}. ${c.reason}`.slice(0, 900) },
      });
      return { id: c.id, town: c.town, status: 'posted', message: `${c.amount > 0 ? '+' : ''}${c.amount} posted.` };
    } catch (e) {
      return { id: c.id, town: c.town, status: 'rejected', message: friendly(e) };
    }
  };
  for (let i = 0; i < rows.length; i += 8) out.push(...(await Promise.all(rows.slice(i, i + 8).map(one))));
  return out;
}
