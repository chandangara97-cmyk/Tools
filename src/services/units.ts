// Units inside one building: a shop, a flat, a floor. One structure can hold shops and homes, owners and tenants.
// Garbage is billed per unit. A unit's ledger lives at ledger/<town>/garbage~<propertyId>~<unitId>, so every
// existing rule, receipt and report keeps working: the app simply treats each unit like a small property.
// Buildings without units keep the old single key (garbage~<propertyId>) and behave exactly as before.
import type { PropertyRecord } from '../utils/gisUtils';
import type { HeadId } from './heads';
import type { LedgerEntry } from './collection';

export type UnitUse = 'Residential' | 'Commercial';
export type OccupantType = 'Owner' | 'Tenant' | 'Vacant';
export interface PropertyUnit {
  id: string;            // U1, U2 ...
  label: string;         // e.g. "Ground floor shop"
  use: UnitUse;
  occupantType: OccupantType;
  occupant: string;      // who pays: the owner or the tenant
  mobile?: string;
  active: boolean;       // false = closed; kept so old bills stay visible
  // Optional survey details. Kept as they are when a unit is edited, so no field is lost on save.
  businessType?: string;
  builtUp?: number;
  rentMonthly?: number;
  occupancyStatus?: string;
  unitId?: string;
  parentPropertyId?: string;
}

export const UNIT_SEP = '~';
/** Bill heads charged per unit. Everything else stays one bill per building. */
export const UNIT_BILLED_HEADS: HeadId[] = ['garbage'];
export const isUnitHead = (h: HeadId) => UNIT_BILLED_HEADS.includes(h);

const num = (id: string) => parseInt(id.replace(/\D/g, ''), 10) || 0;

/** The record's units as a sorted list. Safe on damaged data. */
export function unitList(rec: { units?: Record<string, Partial<PropertyUnit>> }): PropertyUnit[] {
  const out: PropertyUnit[] = [];
  for (const [id, u] of Object.entries(rec.units || {})) {
    if (!u || typeof u !== 'object') continue;
    out.push({
      id, label: String(u.label || id), use: u.use === 'Commercial' ? 'Commercial' : 'Residential',
      occupantType: u.occupantType === 'Tenant' ? 'Tenant' : u.occupantType === 'Vacant' ? 'Vacant' : 'Owner', occupant: String(u.occupant || ''),
      mobile: u.mobile ? String(u.mobile) : undefined, active: u.active !== false,
      ...(u.businessType ? { businessType: String(u.businessType) } : {}),
      ...(typeof u.builtUp === 'number' ? { builtUp: u.builtUp } : {}),
      ...(typeof u.rentMonthly === 'number' ? { rentMonthly: u.rentMonthly } : {}),
      ...(u.occupancyStatus ? { occupancyStatus: String(u.occupancyStatus) } : {}),
      ...(u.unitId ? { unitId: String(u.unitId) } : {}),
      ...(u.parentPropertyId ? { parentPropertyId: String(u.parentPropertyId) } : {}),
    });
  }
  return out.sort((a, b) => num(a.id) - num(b.id));
}

export const nextUnitId = (units: { id: string }[]) => `U${String(units.reduce((m, u) => Math.max(m, num(u.id)), 0) + 1).padStart(2, '0')}`;

/** Draft list -> the object stored in the database (keyed by unit id). Empty list gives undefined. */
export function unitsToRecord(units: PropertyUnit[]): PropertyRecord['units'] {
  const kept = units.filter((u) => u.label.trim());
  if (!kept.length) return undefined;
  const out: NonNullable<PropertyRecord['units']> = {};
  for (const u of kept) {
    out[u.id] = {
      label: u.label.trim(), use: u.use, occupantType: u.occupantType, occupant: u.occupant.trim(), active: u.active,
      ...(u.mobile?.trim() ? { mobile: u.mobile.trim() } : {}),
      ...(u.businessType?.trim() ? { businessType: u.businessType.trim() } : {}),
      ...(typeof u.builtUp === 'number' ? { builtUp: u.builtUp } : {}),
      ...(typeof u.rentMonthly === 'number' ? { rentMonthly: u.rentMonthly } : {}),
      ...(u.occupancyStatus ? { occupancyStatus: u.occupancyStatus } : {}),
      ...(u.unitId ? { unitId: u.unitId } : {}),
      ...(u.parentPropertyId ? { parentPropertyId: u.parentPropertyId } : {}),
    };
  }
  return out;
}

/** A building with a mixed or unknown use and no units cannot be billed for garbage yet. */
export const needsUnits = (r: PropertyRecord) =>
  !unitList(r).length && r.use !== 'Residential' && r.use !== 'Commercial';

/**
 * The rows the garbage screens work on. A building without units is one row (as before). A building with units
 * becomes one row per active unit, with the id `<propertyId>~<unitId>`. Bills raised before units existed stay
 * visible as an "earlier bills" row, and a closed unit stays visible while it has any ledger entries.
 * `billable: false` rows are shown but never get a new demand.
 */
export function expandForHead(records: PropertyRecord[], head: HeadId, ledgers: Record<string, LedgerEntry[]>): PropertyRecord[] {
  if (!isUnitHead(head)) return records;
  const out: PropertyRecord[] = [];
  for (const r of records) {
    const units = unitList(r);
    if (!units.length) { out.push(r); continue; }
    if ((ledgers[r.id] || []).length) out.push({ ...r, owner: `${r.owner} (earlier bills, whole building)`, billable: false });
    for (const u of units) {
      const key = `${r.id}${UNIT_SEP}${u.id}`;
      if (!u.active && !(ledgers[key] || []).length) continue;
      const who = u.occupant || r.owner;
      out.push({
        ...r, id: key, use: u.use, billable: u.active,
        owner: `${who} (${u.label}${u.occupantType === 'Tenant' ? ', tenant' : ''}${u.active ? '' : ', closed'})`,
        tenant: u.occupantType === 'Tenant' ? u.occupant : '',
        occ: u.occupantType === 'Tenant' ? 'Tenanted' : u.occupantType === 'Vacant' ? 'Vacant' : 'Owner-occupied',
      });
    }
  }
  return out;
}

/**
 * What one building will be billed for a unit head, counted the same way expandForHead bills it:
 * every ACTIVE unit is one bill (Residential or Commercial). A building with no units at all is one implicit
 * unit of its own use. A mixed/unknown building with no units bills nothing (needsUnits).
 */
export interface UnitBilling { residential: number; commercial: number; total: number; implicit: boolean }
export function unitBilling(rec: PropertyRecord): UnitBilling {
  const units = unitList(rec);
  if (units.length) {
    const act = units.filter((u) => u.active);
    const residential = act.filter((u) => u.use === 'Residential').length;
    const commercial = act.filter((u) => u.use === 'Commercial').length;
    return { residential, commercial, total: residential + commercial, implicit: false };
  }
  const residential = rec.use === 'Residential' ? 1 : 0;
  const commercial = rec.use === 'Commercial' ? 1 : 0;
  return { residential, commercial, total: residential + commercial, implicit: true };
}

/** Ledger keys (property part) that belong to one building in a unit-billed head. */
export const belongsTo = (pid: string, key: string) => key === pid || key.startsWith(pid + UNIT_SEP);
