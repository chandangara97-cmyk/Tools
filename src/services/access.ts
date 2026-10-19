// What each login may open. One place decides it, so the menu and the pages always agree.
import type { Role } from './auth';
import type { HeadId } from './heads';

export type Tab =
  | 'search'
  | 'survey'
  | 'map-editor'
  | 'records'
  | 'assessment'
  | 'collection'
  | 'reports'
  | 'exports'
  | 'dues'
  | 'rules';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'ULB admin',
  supervisor: 'Supervisor',
  surveyor: 'Data collector',
  assessor: 'Assessor',
  cashier: 'Cashier',
  monitor: 'Monitor',
  public: 'General public',
};

const ALL: Tab[] = [
  'search',
  'collection',
  'survey',
  'records',
  'assessment',
  'reports',
  'map-editor',
  'exports',
];

/** Pages this login may open. */
export function allowedTabs(
  role: Role | null,
  head: HeadId | null,
  isSuper: boolean,
): Tab[] {
  if (isSuper || role === 'admin') return [...ALL, 'dues', 'rules'];
  switch (role) {
    case 'supervisor':
      // a supervisor tied to water, garbage etc. only works that bill head
      return head && head !== 'property_tax' ? ['search', 'collection'] : ALL;
    case 'surveyor':
      return ['survey', 'records'];
    case 'assessor':
      return ['assessment', 'records'];
    // Cashier: search + every payment head (collection) on the work menu
    case 'cashier':
      return ['search', 'collection'];
    // General public: full-screen search only
    case 'public':
      return ['search'];
    case 'monitor':
      return ['search', 'reports', 'collection'];
    default:
      return [];
  }
}

/** Bill heads a login may open in Demand & Collection. */
export function allowedHeads(
  role: Role | null,
  head: HeadId | null,
  isSuper: boolean,
  townHeads: HeadId[],
): HeadId[] {
  // Supervisor locked to one utility head only
  if (!isSuper && role === 'supervisor' && head) return [head];
  // Cashier always gets every payment head enabled for the town
  if (role === 'cashier') {
    return townHeads.length
      ? townHeads
      : (['property_tax', 'water', 'garbage', 'sewerage', 'other'] as HeadId[]);
  }
  return townHeads;
}

/**
 * Bare full-screen search only (no work menu, no extra chrome).
 * Cashier is NOT search-only — they get the work menu with all payment heads.
 */
export const isSearchOnly = (role: Role | null, isSuper: boolean) =>
  !isSuper && role === 'public';

/** The page a login lands on right after signing in. */
export function startTab(
  role: Role | null,
  head: HeadId | null,
  isSuper: boolean,
): Tab | 'menu' {
  const t = allowedTabs(role, head, isSuper);
  if (isSearchOnly(role, isSuper) && t.includes('search')) return 'search';
  // Cashier lands on the menu so every payment head is visible
  if (role === 'cashier') return 'menu';
  if (t.length !== 1) return 'menu';
  return t[0] !== 'collection' || (!isSuper && role === 'supervisor' && head)
    ? t[0]
    : 'menu';
}
