// Searching properties by ID, owner, house number, address or UPN. Pure functions, safe on incomplete records.
export interface Searchable { id: string; owner?: string; hno?: string; addr?: string; upn?: string; ward?: string }

/** Lower-case, single-spaced text. Never throws on missing values. */
export const norm = (s: unknown): string => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
/** Letters and digits of any script only (Hindi names keep their letters), for comparing IDs. */
export const compact = (s: unknown): string => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export const MIN_QUERY = 2;

/**
 * Properties matching the text, best first. An exact property ID returns just that property.
 * Anything else matches when the ID or UPN contains the text, or every word appears in owner, house number, address or ID.
 */
export function searchRecords<T extends Searchable>(records: T[], query: string, limit = 25): T[] {
  const t = norm(query);
  const c = compact(query);
  if (t.length < MIN_QUERY || !c) return [];
  const words = t.split(' ').filter(Boolean);

  const exact = records.filter((r) => compact(r.id) === c);
  if (exact.length) return exact.slice(0, limit);

  const scored: { r: T; score: number }[] = [];
  for (const r of records) {
    const id = compact(r.id);
    const owner = norm(r.owner);
    const hay = `${owner} ${norm(r.hno)} ${norm(r.addr)} ${norm(r.id)}`;
    let score = -1;
    if (id.startsWith(c)) score = 3;
    else if (id.includes(c)) score = 2;
    else if (r.upn && compact(r.upn).includes(c)) score = 2;
    else if (words.every((w) => hay.includes(w))) score = owner.startsWith(t) ? 2 : 1;
    if (score > 0) scored.push({ r, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.r);
}

/** Properties that belong to the same owner, by name. A record with no owner name is never grouped with others. */
export function sameOwner<T extends Searchable>(records: T[], rec: T): T[] {
  const o = norm(rec.owner);
  if (!o) return [rec];
  return records.filter((r) => norm(r.owner) === o);
}
