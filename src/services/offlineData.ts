import type { PropertyRecord, TownData } from '../utils/gisUtils';
import type { LedgerEntry, CollectionSettings } from './collection';
import { placeholderSettings, todayIso } from './collection';
import { placeholderRateTable, RateTable } from './assessment';
import type { Assessment } from './assessmentStore';
import type { PayableRates } from './payableRates';
import type { HeadId } from './heads';
import { ledgerKey } from './heads';
import nestedJson from '../data/properties_nested.json';
import townsJson from '../data/townsData.json';

// Local storage keys
export const KEY_RAW_LEDGER = (town: string) => `ptax_raw_ledger_${town}`;
export const KEY_TOWN_PROPS = (town: string) => `ptax_properties_${town}`;
export const KEY_SETTINGS = (town: string) => `ptax_settings_${town}`;
export const KEY_HEAD_SETTINGS = (town: string, head: string) => `ptax_head_settings_${town}_${head}`;
export const KEY_RATE_TABLE = (town: string) => `ptax_ratetable_${town}`;
export const KEY_ASSESSMENTS = (town: string, fy: string) => `ptax_assessments_${town}_${fy}`;
export const KEY_PAYABLE_RATES = (town: string) => `ptax_payable_rates_${town}`;
export const KEY_RECEIPT_COUNTER = (town: string, ctrKey: string) => `ptax_rc_counter_${town}_${ctrKey}`;

// Default payable rates for towns
export const defaultPayableRates: Record<string, PayableRates> = {
  garbage: { residential: 60, commercial: 150, frequency: 'monthly', updatedAt: Date.now(), updatedBy: 'system' },
  water: { residential: 120, commercial: 300, frequency: 'monthly', updatedAt: Date.now(), updatedBy: 'system' },
  sewerage: { residential: 50, commercial: 120, frequency: 'monthly', updatedAt: Date.now(), updatedBy: 'system' },
  other: { residential: 25, commercial: 50, frequency: 'monthly', updatedAt: Date.now(), updatedBy: 'system' },
};

/** Load pre-seeded records from properties_nested.json for a town */
export function getNestedPropertiesForTown(townName: string): PropertyRecord[] {
  const data = nestedJson as unknown as Record<string, Record<string, Record<string, PropertyRecord>>>;
  const townMap = data[townName] || data[townName.replace(/_/g, ' ')] || data[townName.replace(/ /g, '_')];
  if (!townMap) return [];
  const list: PropertyRecord[] = [];
  for (const ward of Object.keys(townMap)) {
    for (const pid of Object.keys(townMap[ward])) {
      list.push(townMap[ward][pid]);
    }
  }
  return list;
}

/** Rich Bhota demo properties */
const BHOTA_SEED: PropertyRecord[] = [
  {
    id: '1-0001',
    town: 'Bhota',
    ward: '1',
    sur: 'Field Surveyor 01',
    owner: 'Ramesh Chand Sharma',
    hno: '14/B',
    addr: 'Near Main Bazaar, Bhota',
    use: 'Commercial',
    occ: 'Owner-occupied',
    str: 'RCC',
    yr: '2016',
    floors: [120, 115],
    bu: 235,
    land: 160,
    act: 'General Kirana Store & Residence',
    zone: 'A',
    ncls: 'D',
    tenant: '',
    upn: 'HP-BHT-01-0014',
    lat: '31.6115',
    lng: '76.5635',
    acc: '4.2',
    rem: 'Ground floor retail, first floor residential',
    date: '2026-10-12',
    units: {
      U1: {
        unitId: 'U1',
        label: 'Sharma General Store (GF)',
        use: 'Commercial',
        occupantType: 'Owner',
        occupant: 'Ramesh Chand Sharma',
        mobile: '9816012345',
        active: true,
        businessType: 'Retail Grocery',
        builtUp: 120,
      },
      U2: {
        unitId: 'U2',
        label: 'Residential Flat (1st Floor)',
        use: 'Residential',
        occupantType: 'Tenant',
        occupant: 'Vijay Kumar Verma',
        mobile: '9418054321',
        active: true,
        builtUp: 115,
        rentMonthly: 6500,
      },
    },
    photoIds: [],
    createdBy: 'system',
    createdAt: 1792248693779,
    updatedBy: 'system',
    updatedAt: 1792248693779,
  },
  {
    id: '1-0002',
    town: 'Bhota',
    ward: '1',
    sur: 'Field Surveyor 01',
    owner: 'Sunita Devi',
    hno: '22',
    addr: 'Ward 1 Link Road, Bhota',
    use: 'Residential',
    occ: 'Owner-occupied',
    str: 'Pucca',
    yr: '2010',
    floors: [95, 90],
    bu: 185,
    land: 140,
    act: '',
    zone: 'B',
    ncls: 'C',
    tenant: '',
    upn: 'HP-BHT-01-0022',
    lat: '31.6120',
    lng: '76.5642',
    acc: '3.8',
    rem: '2 storey private residence',
    date: '2026-10-13',
    photoIds: [],
    createdBy: 'system',
    createdAt: 1792248693785,
    updatedBy: 'system',
    updatedAt: 1792248693785,
  },
  {
    id: '1-0003',
    town: 'Bhota',
    ward: '2',
    sur: 'Field Surveyor 02',
    owner: 'Harish Chander Kapoor',
    hno: '45/A',
    addr: 'Cinema Road, Ward 2, Bhota',
    use: 'Commercial',
    occ: 'Tenant-occupied',
    str: 'RCC',
    yr: '2019',
    floors: [150, 150, 120],
    bu: 420,
    land: 200,
    act: 'Kapoor Diagnostic Lab & Pharmacy',
    zone: 'A',
    ncls: 'E',
    tenant: 'Dr. Vivek Kapoor',
    upn: 'HP-BHT-02-0045',
    lat: '31.6135',
    lng: '76.5620',
    acc: '5.0',
    rem: 'Commercial complex with pathology center',
    date: '2026-10-14',
    photoIds: [],
    createdBy: 'system',
    createdAt: 1792248693790,
    updatedBy: 'system',
    updatedAt: 1792248693790,
  },
  {
    id: '1-0004',
    town: 'Bhota',
    ward: '2',
    sur: 'Field Surveyor 02',
    owner: 'Gopal Krishan Sood',
    hno: '88',
    addr: 'Old Hospital Marg, Bhota',
    use: 'Residential',
    occ: 'Owner-occupied',
    str: 'Semi-pucca',
    yr: '2005',
    floors: [110],
    bu: 110,
    land: 130,
    act: '',
    zone: 'B',
    ncls: 'B',
    tenant: '',
    upn: 'HP-BHT-02-0088',
    lat: '31.6142',
    lng: '76.5651',
    acc: '4.5',
    rem: 'Single floor house with garden',
    date: '2026-10-15',
    photoIds: [],
    createdBy: 'system',
    createdAt: 1792248693795,
    updatedBy: 'system',
    updatedAt: 1792248693795,
  },
  {
    id: '1-0005',
    town: 'Bhota',
    ward: '3',
    sur: 'Field Surveyor 01',
    owner: 'Manjeet Singh Thakur',
    hno: '104',
    addr: 'Near Bus Stand, Ward 3, Bhota',
    use: 'Mixed use',
    occ: 'Owner-occupied',
    str: 'RCC',
    yr: '2021',
    floors: [130, 130],
    bu: 260,
    land: 175,
    act: 'Automobile Spares & Residence',
    zone: 'A',
    ncls: 'D',
    tenant: '',
    upn: 'HP-BHT-03-0104',
    lat: '31.6108',
    lng: '76.5612',
    acc: '3.5',
    rem: 'Ground floor auto shop, first floor owner residence',
    date: '2026-10-16',
    photoIds: [],
    createdBy: 'system',
    createdAt: 1792248693800,
    updatedBy: 'system',
    updatedAt: 1792248693800,
  },
];

/** Get town data from townsData.json */
export function getTownFromData(townKey: string): TownData | undefined {
  const allTowns = townsJson as unknown as Record<string, TownData>;
  for (const [key, t] of Object.entries(allTowns)) {
    if (t.n.toLowerCase() === townKey.toLowerCase() || key.toLowerCase() === townKey.toLowerCase()) {
      return t;
    }
  }
  return undefined;
}

/** Get pre-seeded properties for any town */
export function getInitialPropertiesForTown(townKey: string, townName: string): PropertyRecord[] {
  // Check localStorage first
  try {
    const saved = localStorage.getItem(KEY_TOWN_PROPS(townKey));
    if (saved) {
      const list = JSON.parse(saved);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch { /* ignore */ }

  // Check Bhota special seed
  if (townName === 'Bhota' || townKey === 'Bhota') {
    return BHOTA_SEED;
  }

  // Check properties_nested.json
  const nested = getNestedPropertiesForTown(townName);
  if (nested.length > 0) return nested;

  // Otherwise synthesize 4 realistic properties in available wards
  const town = getTownFromData(townKey) || getTownFromData(townName);
  const wards = town?.w && town.w.length > 0 ? town.w : [{ w: '1', rings: [] }, { w: '2', rings: [] }];
  const code = (town?.code || townKey.slice(0, 3)).toUpperCase();

  const names = ['Kalyan Singh Chauhan', 'Meena Kumari Verma', 'Ashwani Kumar Dogra', 'Rajendra Nath Kaushal'];
  const uses = ['Residential', 'Commercial', 'Mixed use', 'Residential'];
  const hnos = ['12', '45', '78/B', '102'];

  const generated: PropertyRecord[] = names.map((owner, idx) => {
    const wardNum = String(wards[idx % wards.length].w || (idx + 1));
    const id = `${code}-${wardNum.padStart(2, '0')}-${String(idx + 1).padStart(4, '0')}`;
    const use = uses[idx];
    const isComm = use === 'Commercial';
    const sampleLat = town?.w?.[0]?.rings?.[0]?.[0]?.[1] ?? 31.5;
    const sampleLng = town?.w?.[0]?.rings?.[0]?.[0]?.[0] ?? 77.0;
    return {
      id,
      town: townName,
      ward: wardNum,
      sur: 'Field Surveyor',
      owner,
      hno: hnos[idx],
      addr: `Ward ${wardNum}, ${townName}`,
      use,
      occ: 'Owner-occupied',
      str: idx % 2 === 0 ? 'RCC' : 'Pucca',
      yr: '2015',
      floors: isComm ? [140, 120] : [110, 100],
      bu: isComm ? 260 : 210,
      land: isComm ? 180 : 150,
      act: isComm ? 'Retail Store' : '',
      zone: 'A',
      ncls: 'D',
      tenant: '',
      upn: `HP-${code}-${wardNum.padStart(2, '0')}-${String(idx + 1).padStart(4, '0')}`,
      lat: String(sampleLat),
      lng: String(sampleLng),
      acc: '4.0',
      rem: 'Pre-seeded offline property record',
      date: '2026-10-15',
      photoIds: [],
      createdBy: 'system',
      createdAt: Date.now() - idx * 86400000,
      updatedBy: 'system',
      updatedAt: Date.now() - idx * 86400000,
    };
  });

  return generated;
}

/** Initial ledger seeding with demands and sample payment */
export function getInitialLedgerForTown(townKey: string, properties: PropertyRecord[]): Record<string, Record<string, Omit<LedgerEntry, 'id'>>> {
  // Check localStorage
  try {
    const saved = localStorage.getItem(KEY_RAW_LEDGER(townKey));
    if (saved) {
      const obj = JSON.parse(saved);
      if (obj && Object.keys(obj).length > 0) return obj;
    }
  } catch { /* ignore */ }

  const today = todayIso();
  const raw: Record<string, Record<string, Omit<LedgerEntry, 'id'>>> = {};

  properties.forEach((p, idx) => {
    // 1. Property Tax Demand for FY 2026-27
    const ptAmount = p.use === 'Commercial' ? 2450 : 1200;
    const ptKey = ledgerKey('property_tax', p.id);
    raw[ptKey] = {
      demand_2026_27: {
        type: 'demand',
        fy: '2026-27',
        amount: ptAmount,
        date: '2026-04-01',
        at: 1775000000000,
        by: 'system',
        note: `Property tax assessment demand FY 2026-27`,
      },
    };

    // If first property, simulate an earlier payment on property tax
    if (idx === 0) {
      raw[ptKey]['pay_initial'] = {
        type: 'payment',
        fy: '2026-27',
        amount: 1080,
        date: '2026-05-10',
        at: 1778400000000,
        by: 'CASHIER01',
        receiptNo: `${townKey.slice(0, 3).toUpperCase()}/2026-27/000001`,
        mode: 'cash',
        payer: p.owner,
        note: 'Counter cash payment',
      };
      raw[ptKey]['reb_initial'] = {
        type: 'rebate',
        fy: '2026-27',
        amount: 120,
        date: '2026-05-10',
        at: 1778400000000,
        by: 'CASHIER01',
        receiptNo: `${townKey.slice(0, 3).toUpperCase()}/2026-27/000001`,
        note: 'Early-payment rebate 10%',
      };
    }

    // 2. Garbage Collection Demand
    const gbKey = ledgerKey('garbage', p.id);
    const gbRate = p.use === 'Commercial' ? 150 : 60;
    raw[gbKey] = {
      demand_2026_27: {
        type: 'demand',
        fy: '2026-27',
        amount: gbRate * 12,
        date: '2026-04-01',
        at: 1775000000000,
        by: 'system',
        source: 'fixed',
        note: `Garbage collection charge (${p.use})`,
      },
    };

    // 3. Water Charges Demand
    const wtKey = ledgerKey('water', p.id);
    const wtRate = p.use === 'Commercial' ? 300 : 120;
    raw[wtKey] = {
      demand_2026_27: {
        type: 'demand',
        fy: '2026-27',
        amount: wtRate * 12,
        date: '2026-04-01',
        at: 1775000000000,
        by: 'system',
        source: 'fixed',
        note: `Water supply charges (${p.use})`,
      },
    };
  });

  try {
    localStorage.setItem(KEY_RAW_LEDGER(townKey), JSON.stringify(raw));
  } catch { /* ignore */ }

  return raw;
}

/** Initial assessments for a town */
export function getInitialAssessmentsForTown(townKey: string, properties: PropertyRecord[]): Record<string, Assessment> {
  const fy = '2026-27';
  try {
    const saved = localStorage.getItem(KEY_ASSESSMENTS(townKey, fy));
    if (saved) {
      const obj = JSON.parse(saved);
      if (obj && Object.keys(obj).length > 0) return obj;
    }
  } catch { /* ignore */ }

  const map: Record<string, Assessment> = {};
  properties.forEach((p, idx) => {
    const isComm = p.use === 'Commercial';
    const rateableValue = (p.bu || 150) * (isComm ? 18 : 10);
    const rebate = Math.round(rateableValue * 0.1);
    const netTaxableValue = rateableValue - rebate;
    const tax = Math.round(netTaxableValue * 0.1);

    map[p.id] = {
      propertyId: p.id,
      town: townKey,
      ward: p.ward,
      fy,
      rateTableId: '2026-04-01',
      rateStatus: 'approved',
      status: idx === 0 ? 'approved' : idx === 1 ? 'submitted' : 'draft',
      calc: {
        builtUp: p.bu || 150,
        lines: [
          { factor: 'F1', basis: `Zone ${p.zone || 'A'}`, value: 1.0 },
          { factor: 'F2', basis: p.str || 'RCC', value: 1.0 },
          { factor: 'F3', basis: 'Age < 10 yrs', value: 1.0 },
          { factor: 'F4', basis: p.occ || 'Owner', value: 1.0 },
          { factor: 'F5', basis: p.use, value: isComm ? 1.5 : 1.0 },
          { factor: 'Class', basis: `Class ${p.ncls || 'D'}`, value: 1.0 },
        ],
        rateableValue,
        rebate,
        netTaxableValue,
        tax,
        warnings: [],
      },
      assessedBy: 'DEMO-ASSESSOR',
      assessedAt: Date.now() - idx * 86400000,
      ...(idx === 0 ? { reviewedBy: 'DEMO-SUPERVISOR', reviewedAt: Date.now() - 3600000 } : {}),
    };
  });

  try {
    localStorage.setItem(KEY_ASSESSMENTS(townKey, fy), JSON.stringify(map));
  } catch { /* ignore */ }

  return map;
}

/** Pre-populate all offline local storage caches for a town */
export function ensureOfflineTownInitialized(townKey: string, townName: string): PropertyRecord[] {
  const props = getInitialPropertiesForTown(townKey, townName);
  try {
    localStorage.setItem(KEY_TOWN_PROPS(townKey), JSON.stringify(props));
    localStorage.setItem('gis_survey_properties_v2', JSON.stringify(props));
  } catch { /* ignore */ }

  getInitialLedgerForTown(townKey, props);
  getInitialAssessmentsForTown(townKey, props);

  // Initialize rate table if missing
  try {
    if (!localStorage.getItem(KEY_RATE_TABLE(townKey))) {
      localStorage.setItem(KEY_RATE_TABLE(townKey), JSON.stringify(placeholderRateTable(townKey)));
    }
  } catch { /* ignore */ }

  // Initialize collection settings if missing
  try {
    if (!localStorage.getItem(KEY_SETTINGS(townKey))) {
      localStorage.setItem(KEY_SETTINGS(townKey), JSON.stringify({
        ...placeholderSettings(),
        status: 'approved',
        rebatePct: 10,
        dueMonth: 3,
        dueDay: 31,
      }));
    }
  } catch { /* ignore */ }

  // Initialize payable rates if missing
  try {
    if (!localStorage.getItem(KEY_PAYABLE_RATES(townKey))) {
      localStorage.setItem(KEY_PAYABLE_RATES(townKey), JSON.stringify(defaultPayableRates));
    }
  } catch { /* ignore */ }

  return props;
}
