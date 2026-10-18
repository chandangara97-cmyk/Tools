// What each login may open. One place decides it, so the menu and the pages always agree.
import type { Role } from './auth';
import type { HeadId } from './heads';

export type Tab = 'search' | 'survey' | 'map-editor' | 'records' | 'assessment' | 'collection' | 'reports' | 'exports';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'ULB admin', supervisor: 'Supervisor', surveyor: 'Data collector',
  assessor: 'Assessor', cashier: 'Cashier', monitor: 'Monitor',
};

const ALL: Tab[] = ['search', 'collection', 'survey', 'records', 'assessment', 'reports', 'map-editor', 'exports'];

/** Pages this login may open. */
export function allowedTabs(role: Role | null, head: HeadId | null, isSuper: boolean): Tab[] {
  if (isSuper || role === 'admin') return ALL;
  switch (role) {
    case 'supervisor':
      // a supervisor tied to water, garbage etc. only works that bill head
      return head && head !== 'property_tax' ? ['search', 'collection'] : ALL;
    case 'surveyor': return ['survey', 'records'];
    case 'assessor': return ['assessment', 'records'];
    case 'cashier': return ['search', 'collection'];
    case 'monitor': return ['search', 'reports', 'collection'];
    default: return [];
  }
}

/** Bill heads a login may open in Demand & Collection. */
export function allowedHeads(role: Role | null, head: HeadId | null, isSuper: boolean, townHeads: HeadId[]): HeadId[] {
  if (!isSuper && role === 'supervisor' && head) return [head];
  return townHeads;
}
