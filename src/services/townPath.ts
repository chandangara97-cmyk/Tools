// Towns are stored in the database under their NAME (e.g. properties/Bhota/...), not under the
// old name-plus-LGD-code key. The LGD code is kept separately and still forms the ULB part of
// property IDs and receipt numbers, so IDs do not change.
import type { TownData } from '../utils/gisUtils';

const codes: Record<string, string> = {}; // slug -> LGD / ULB code

/** Database-safe form of a town name: "Baijnath paprola" -> "Baijnath_paprola". */
export function townSlug(name: string): string {
  return name.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Town';
}

/** ULB code for a town slug, if known. */
export const townCode = (slug: string): string | undefined => codes[slug];

/**
 * Re-key a towns map by town name. Safe to run on an already re-keyed map.
 * The code comes from the town's own `code`, else from the numeric suffix of its old key.
 */
export function rekeyTowns(towns: Record<string, TownData>): Record<string, TownData> {
  const out: Record<string, TownData> = {};
  for (const [oldKey, t] of Object.entries(towns)) {
    const code = t.code || oldKey.match(/(\d{5,})$/)?.[1];
    let slug = townSlug(t.n);
    if (out[slug]) slug = `${slug}_${code || Object.keys(out).length}`; // two towns with the same name
    if (code) codes[slug] = code;
    out[slug] = code ? { ...t, code } : t;
  }
  return out;
}
