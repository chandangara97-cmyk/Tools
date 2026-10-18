import {
  AdminFeatureFlags,
  MunicipalityProfile,
  PaymentReceipt,
  Property,
  TaxRatesConfig,
} from '../types';

const STORAGE_KEYS = {
  PROFILE: 'civic_municipality_profile',
  FLAGS: 'civic_admin_flags',
  RATES: 'civic_tax_rates',
  PROPERTIES: 'civic_properties',
  RECEIPTS: 'civic_receipts',
  AUDIT_LOGS: 'civic_audit_logs',
};

export const DEFAULT_PROFILE: MunicipalityProfile = {
  name: 'Siliguri Municipal Corporation',
  state: 'West Bengal',
  district: 'Darjeeling & Jalpaiguri',
  pinCode: '734001',
  portalHelpline: '1800-345-3224',
  supportEmail: 'revenue@siligurimc.gov.in',
  commissionerTitle: 'Municipal Commissioner & Revenue Officer',
  officeAddress: 'Baghajatin Road, Siliguri, WB 734001',
  currencySymbol: '₹',
  wardCount: 47,
  bankCounters: ['State Bank of India - Main Branch', 'Punjab National Bank - Hill Cart Road', 'Municipal Collection Counters 1-4'],
};

export const DEFAULT_FLAGS: AdminFeatureFlags = {
  enableOnlineCitizenPayment: true,
  enableCitizenSelfAssessment: true,
  enableLatePaymentPenalty: true,
  enableEarlyBirdDiscount: true,
  enableCashierCounterPOS: true,
  enableWaterCharges: true,
  enableSanitationCess: true,
  enableDemandNoticeGeneration: true,
  enableDefaulterPublicList: true,
  enableSMSAlertsSimulation: true,
  maintenanceMode: false,
};

export const DEFAULT_RATES: TaxRatesConfig = {
  financialYear: '2026-2027',
  residentialBaseRatePerSqFt: 4.5, // ₹4.50 per sq.ft / year
  commercialMultiplier: 2.2, // 2.2x residential
  industrialMultiplier: 2.8,
  institutionalMultiplier: 1.5,
  vacantLandMultiplier: 0.8,
  zoneMultipliers: {
    'Zone-A': 1.30, // Prime commercial/residential arterial
    'Zone-B': 1.00, // Standard residential
    'Zone-C': 0.80, // Developing / suburban
  },
  sanitationCessRatePercent: 8, // 8% of holding tax
  lightingCessRatePercent: 5, // 5% of holding tax
  waterSupplyFlatFee: 450, // ₹450 flat annual charge
  earlyBirdRebatePercent: 5, // 5% rebate
  earlyBirdDeadlineDays: 45,
  latePenaltyPercentPerMonth: 1.5, // 1.5% per month overdue
  maxPenaltyPercent: 18,
};

export const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    holdingNo: 'HLD-1001',
    assessmentNo: 'ASS-2026-0841',
    ownerName: 'Subhashish Chakraborty',
    guardianName: 'Late B. K. Chakraborty',
    mobile: '9832014589',
    email: 'subhashish@example.com',
    address: 'Plot 42, Sevoke Road, Ward 10',
    wardNo: 10,
    zone: 'Zone-A',
    usage: 'residential',
    builtUpAreaSqFt: 1850,
    landAreaKatha: 3.5,
    annualRateableValue: 125000,
    currentYearDemand: 10822,
    arrearsDemand: 0,
    waterTaxDue: 450,
    sanitationCessDue: 865,
    status: 'unpaid',
    monthsOverdue: 0,
    lastPaymentDate: '2025-11-14',
    lastReceiptNo: 'RCP-2025-8821',
  },
  {
    id: 'prop-2',
    holdingNo: 'HLD-1002',
    assessmentNo: 'ASS-2026-1192',
    ownerName: 'Priya Agarwal & Sons',
    guardianName: 'M. L. Agarwal',
    mobile: '9434078123',
    email: 'accounts@agarwalenterprises.in',
    address: 'Shop #4, Hill Cart Road, Ward 08',
    wardNo: 8,
    zone: 'Zone-A',
    usage: 'commercial',
    builtUpAreaSqFt: 2400,
    landAreaKatha: 2.0,
    annualRateableValue: 340000,
    currentYearDemand: 30990,
    arrearsDemand: 15400,
    waterTaxDue: 450,
    sanitationCessDue: 2480,
    status: 'overdue',
    monthsOverdue: 8,
    lastPaymentDate: '2025-02-10',
    lastReceiptNo: 'RCP-2024-5112',
  },
  {
    id: 'prop-3',
    holdingNo: 'HLD-1003',
    assessmentNo: 'ASS-2026-3042',
    ownerName: 'Tenzing Norbu Sherpa',
    guardianName: 'D. Sherpa',
    mobile: '9733055412',
    address: '15 Bhanu Bhakta Sarani, Ward 14',
    wardNo: 14,
    zone: 'Zone-B',
    usage: 'residential',
    builtUpAreaSqFt: 1200,
    landAreaKatha: 2.5,
    annualRateableValue: 72000,
    currentYearDemand: 5400,
    arrearsDemand: 0,
    waterTaxDue: 450,
    sanitationCessDue: 432,
    status: 'paid',
    monthsOverdue: 0,
    lastPaymentDate: '2026-04-12',
    lastReceiptNo: 'RCP-2026-1049',
  },
  {
    id: 'prop-4',
    holdingNo: 'HLD-1004',
    assessmentNo: 'ASS-2026-4401',
    ownerName: 'Apex Health Diagnostic Clinic',
    guardianName: 'Dr. R. Sen (Managing Partner)',
    mobile: '9832299881',
    email: 'info@apexhealth.org',
    address: '89 Hakimpara Main Road, Ward 15',
    wardNo: 15,
    zone: 'Zone-A',
    usage: 'institutional',
    builtUpAreaSqFt: 3500,
    landAreaKatha: 5.0,
    annualRateableValue: 260000,
    currentYearDemand: 24570,
    arrearsDemand: 0,
    waterTaxDue: 450,
    sanitationCessDue: 1965,
    status: 'unpaid',
    monthsOverdue: 0,
    lastPaymentDate: '2025-08-20',
    lastReceiptNo: 'RCP-2025-4409',
  },
  {
    id: 'prop-5',
    holdingNo: 'HLD-1005',
    assessmentNo: 'ASS-2026-5590',
    ownerName: 'Kailash Textiles & Garments',
    guardianName: 'Kailash Chand Goel',
    mobile: '9434123456',
    address: 'Bidhan Market, Unit C-12, Ward 11',
    wardNo: 11,
    zone: 'Zone-A',
    usage: 'commercial',
    builtUpAreaSqFt: 1450,
    annualRateableValue: 185000,
    currentYearDemand: 18720,
    arrearsDemand: 34500,
    waterTaxDue: 450,
    sanitationCessDue: 1497,
    status: 'overdue',
    monthsOverdue: 14,
    lastPaymentDate: '2024-06-15',
    lastReceiptNo: 'RCP-2024-1188',
  },
  {
    id: 'prop-6',
    holdingNo: 'HLD-1006',
    assessmentNo: 'ASS-2026-6701',
    ownerName: 'Sunita Ghosh & Dilip Ghosh',
    guardianName: 'Late S. K. Ghosh',
    mobile: '9832456789',
    address: 'Flat 3B, Anandam Apts, Pradhan Nagar, Ward 02',
    wardNo: 2,
    zone: 'Zone-B',
    usage: 'residential',
    builtUpAreaSqFt: 980,
    annualRateableValue: 58000,
    currentYearDemand: 4410,
    arrearsDemand: 0,
    waterTaxDue: 450,
    sanitationCessDue: 352,
    status: 'unpaid',
    monthsOverdue: 0,
    lastPaymentDate: '2025-10-04',
    lastReceiptNo: 'RCP-2025-7788',
  },
  {
    id: 'prop-7',
    holdingNo: 'HLD-1007',
    assessmentNo: 'ASS-2026-7812',
    ownerName: 'North Bengal LogiHub Warehouse',
    guardianName: 'Vikramjit Singh',
    mobile: '9832990011',
    email: 'transport@northbengallogihub.com',
    address: 'Industrial Estate, Matigara Ext., Ward 45',
    wardNo: 45,
    zone: 'Zone-C',
    usage: 'industrial',
    builtUpAreaSqFt: 6200,
    landAreaKatha: 12.0,
    annualRateableValue: 420000,
    currentYearDemand: 62496,
    arrearsDemand: 85000,
    waterTaxDue: 900,
    sanitationCessDue: 5000,
    status: 'overdue',
    monthsOverdue: 18,
    lastPaymentDate: '2024-03-30',
    lastReceiptNo: 'RCP-2023-9021',
  },
  {
    id: 'prop-8',
    holdingNo: 'HLD-1008',
    assessmentNo: 'ASS-2026-8910',
    ownerName: 'Amitava Roy',
    guardianName: 'Bhabani Charan Roy',
    mobile: '9434771234',
    address: '22 Deshbandhu Para, Ward 28',
    wardNo: 28,
    zone: 'Zone-B',
    usage: 'residential',
    builtUpAreaSqFt: 1500,
    annualRateableValue: 90000,
    currentYearDemand: 6750,
    arrearsDemand: 0,
    waterTaxDue: 450,
    sanitationCessDue: 540,
    status: 'paid',
    monthsOverdue: 0,
    lastPaymentDate: '2026-05-18',
    lastReceiptNo: 'RCP-2026-2184',
  },
  {
    id: 'prop-9',
    holdingNo: 'HLD-1009',
    assessmentNo: 'ASS-2026-9055',
    ownerName: 'Sanjay Sharma',
    guardianName: 'D. N. Sharma',
    mobile: '9832112233',
    address: 'Khalpara Bazar, Wholesale Lane, Ward 09',
    wardNo: 9,
    zone: 'Zone-A',
    usage: 'commercial',
    builtUpAreaSqFt: 1100,
    annualRateableValue: 145000,
    currentYearDemand: 14157,
    arrearsDemand: 7200,
    waterTaxDue: 450,
    sanitationCessDue: 1132,
    status: 'overdue',
    monthsOverdue: 5,
    lastPaymentDate: '2025-05-22',
    lastReceiptNo: 'RCP-2025-3310',
  },
  {
    id: 'prop-10',
    holdingNo: 'HLD-1010',
    assessmentNo: 'ASS-2026-9400',
    ownerName: 'Manju Devi Poddar',
    guardianName: 'B. P. Poddar',
    mobile: '9434889900',
    address: 'Siliguri Town Station Road, Ward 32',
    wardNo: 32,
    zone: 'Zone-C',
    usage: 'vacant_land',
    builtUpAreaSqFt: 0,
    landAreaKatha: 6.0,
    annualRateableValue: 40000,
    currentYearDemand: 3200,
    arrearsDemand: 0,
    waterTaxDue: 0,
    sanitationCessDue: 256,
    status: 'unpaid',
    monthsOverdue: 0,
    lastPaymentDate: '2025-09-12',
    lastReceiptNo: 'RCP-2025-6124',
  },
];

export const INITIAL_RECEIPTS: PaymentReceipt[] = [
  {
    receiptNo: 'RCP-2026-1049',
    transactionId: 'TXN-9984128941',
    holdingNo: 'HLD-1003',
    ownerName: 'Tenzing Norbu Sherpa',
    wardNo: 14,
    paymentDate: '2026-04-12T11:24:00',
    paymentMethod: 'UPI',
    collectedBy: 'Citizen Online',
    financialYear: '2026-2027',
    holdingTaxAmount: 5400,
    arrearsAmount: 0,
    waterTaxAmount: 450,
    sanitationCessAmount: 432,
    lightingCessAmount: 270,
    penaltyAmount: 0,
    rebateDiscount: 312,
    totalPaid: 6240,
    notes: 'Online payment via UPI instant QR',
  },
  {
    receiptNo: 'RCP-2026-2184',
    transactionId: 'TXN-8841772910',
    holdingNo: 'HLD-1008',
    ownerName: 'Amitava Roy',
    wardNo: 28,
    paymentDate: '2026-05-18T14:40:00',
    paymentMethod: 'CASH',
    collectedBy: 'Counter Cashier',
    cashierName: 'Subhas Bose (Counter #2)',
    financialYear: '2026-2027',
    holdingTaxAmount: 6750,
    arrearsAmount: 0,
    waterTaxAmount: 450,
    sanitationCessAmount: 540,
    lightingCessAmount: 337,
    penaltyAmount: 0,
    rebateDiscount: 390,
    totalPaid: 7687,
    notes: 'Collected at Municipal Cash Counter 2',
  },
];

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface TaxBreakdown {
  baseHoldingTax: number;
  arrears: number;
  waterTax: number;
  sanitationCess: number;
  lightingCess: number;
  penaltySurcharge: number;
  earlyRebateDiscount: number;
  grossAmount: number;
  netPayable: number;
  usageMultiplier: number;
  zoneMultiplier: number;
}

// Compute bill liability dynamically with admin rates and feature switches
export function calculateTaxBreakdown(
  prop: Property,
  rates: TaxRatesConfig,
  flags: AdminFeatureFlags,
  simulatedPaymentDate?: Date
): TaxBreakdown {
  // Usage multiplier
  let usageMult = 1.0;
  if (prop.usage === 'commercial') usageMult = rates.commercialMultiplier;
  else if (prop.usage === 'industrial') usageMult = rates.industrialMultiplier;
  else if (prop.usage === 'institutional') usageMult = rates.institutionalMultiplier;
  else if (prop.usage === 'vacant_land') usageMult = rates.vacantLandMultiplier;

  // Zone multiplier
  const zoneMult = rates.zoneMultipliers[prop.zone] || 1.0;

  // Base holding tax = builtUpArea * residentialBaseRate * usageMult * zoneMult
  // Or if vacant land, area based calculation
  let calculatedHolding = 0;
  if (prop.builtUpAreaSqFt > 0) {
    calculatedHolding = Math.round(prop.builtUpAreaSqFt * rates.residentialBaseRatePerSqFt * usageMult * zoneMult);
  } else {
    // Land area estimation
    calculatedHolding = Math.round((prop.landAreaKatha || 1) * 720 * rates.residentialBaseRatePerSqFt * usageMult * zoneMult * 0.5);
  }

  // Use calculated holding tax
  const baseHoldingTax = calculatedHolding;
  const arrears = prop.arrearsDemand || 0;

  // Water tax (only if flag enabled)
  const waterTax = flags.enableWaterCharges ? (prop.usage === 'industrial' ? rates.waterSupplyFlatFee * 2 : rates.waterSupplyFlatFee) : 0;

  // Sanitation cess
  const sanitationCess = flags.enableSanitationCess
    ? Math.round((baseHoldingTax * rates.sanitationCessRatePercent) / 100)
    : 0;

  // Lighting cess
  const lightingCess = Math.round((baseHoldingTax * rates.lightingCessRatePercent) / 100);

  // Late penalty calculation
  let penaltySurcharge = 0;
  if (flags.enableLatePaymentPenalty && (prop.monthsOverdue > 0 || arrears > 0)) {
    const overdueBasis = arrears > 0 ? arrears : baseHoldingTax;
    const months = Math.max(1, prop.monthsOverdue);
    const calculatedRate = Math.min(rates.maxPenaltyPercent, months * rates.latePenaltyPercentPerMonth);
    penaltySurcharge = Math.round((overdueBasis * calculatedRate) / 100);
  }

  // Early bird rebate calculation
  let earlyRebateDiscount = 0;
  if (flags.enableEarlyBirdDiscount && prop.status !== 'overdue' && arrears === 0) {
    earlyRebateDiscount = Math.round((baseHoldingTax * rates.earlyBirdRebatePercent) / 100);
  }

  const grossAmount = baseHoldingTax + arrears + waterTax + sanitationCess + lightingCess + penaltySurcharge;
  const netPayable = Math.max(0, grossAmount - earlyRebateDiscount);

  return {
    baseHoldingTax,
    arrears,
    waterTax,
    sanitationCess,
    lightingCess,
    penaltySurcharge,
    earlyRebateDiscount,
    grossAmount,
    netPayable,
    usageMultiplier: usageMult,
    zoneMultiplier: zoneMult,
  };
}

class PortalStore {
  private profile: MunicipalityProfile = DEFAULT_PROFILE;
  private flags: AdminFeatureFlags = DEFAULT_FLAGS;
  private rates: TaxRatesConfig = DEFAULT_RATES;
  private properties: Property[] = INITIAL_PROPERTIES;
  private receipts: PaymentReceipt[] = INITIAL_RECEIPTS;
  private auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      actor: 'System Admin',
      action: 'Portal Initialized',
      details: 'CivicCollect tax engine initialized with standard municipal slabs.',
    },
  ];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const p = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (p) this.profile = JSON.parse(p);

      const f = localStorage.getItem(STORAGE_KEYS.FLAGS);
      if (f) this.flags = JSON.parse(f);

      const r = localStorage.getItem(STORAGE_KEYS.RATES);
      if (r) this.rates = JSON.parse(r);

      const props = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
      if (props) this.properties = JSON.parse(props);

      const rcps = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
      if (rcps) this.receipts = JSON.parse(rcps);

      const logs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (logs) this.auditLogs = JSON.parse(logs);
    } catch (e) {
      console.warn('Could not read from local storage, using initial defaults', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(this.profile));
      localStorage.setItem(STORAGE_KEYS.FLAGS, JSON.stringify(this.flags));
      localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(this.rates));
      localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(this.properties));
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(this.receipts));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs));
    } catch (e) {
      console.error('Failed to save to local storage', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // Getters
  public getProfile(): MunicipalityProfile {
    return { ...this.profile };
  }

  public getFlags(): AdminFeatureFlags {
    return { ...this.flags };
  }

  public getRates(): TaxRatesConfig {
    return { ...this.rates };
  }

  public getProperties(): Property[] {
    return [...this.properties];
  }

  public getReceipts(): PaymentReceipt[] {
    return [...this.receipts];
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  // Actions
  public updateProfile(newProfile: Partial<MunicipalityProfile>) {
    this.profile = { ...this.profile, ...newProfile };
    this.addAuditLog('Admin', 'Updated Municipality Profile', `Changed municipality information.`);
    this.saveToStorage();
  }

  public updateFlags(newFlags: Partial<AdminFeatureFlags>) {
    this.flags = { ...this.flags, ...newFlags };
    this.addAuditLog('Admin', 'Updated Feature Flags', `Toggled features: ${Object.keys(newFlags).join(', ')}`);
    this.saveToStorage();
  }

  public updateRates(newRates: Partial<TaxRatesConfig>) {
    this.rates = { ...this.rates, ...newRates };
    this.addAuditLog('Admin', 'Updated Tax Rate Slabs', `Modified tax rates/rules.`);
    this.saveToStorage();
  }

  public addProperty(prop: Omit<Property, 'id'>) {
    const newProp: Property = {
      ...prop,
      id: `prop-${Date.now()}`,
    };
    this.properties.unshift(newProp);
    this.addAuditLog('Admin', 'Added New Property', `Holding #${newProp.holdingNo} for ${newProp.ownerName}`);
    this.saveToStorage();
    return newProp;
  }

  public updateProperty(id: string, updates: Partial<Property>) {
    this.properties = this.properties.map((p) => (p.id === id ? { ...p, ...updates } : p));
    this.addAuditLog('Admin', 'Updated Property Details', `Property ID ${id}`);
    this.saveToStorage();
  }

  public recordPayment(params: {
    propertyId: string;
    amountPaid: number;
    paymentMethod: PaymentReceipt['paymentMethod'];
    collectedBy: PaymentReceipt['collectedBy'];
    cashierName?: string;
    notes?: string;
  }): PaymentReceipt {
    const prop = this.properties.find((p) => p.id === params.propertyId);
    if (!prop) throw new Error('Property not found');

    const breakdown = calculateTaxBreakdown(prop, this.rates, this.flags);
    const receiptNo = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const transactionId = `TXN-${Date.now().toString().slice(-10)}`;

    const newReceipt: PaymentReceipt = {
      receiptNo,
      transactionId,
      holdingNo: prop.holdingNo,
      ownerName: prop.ownerName,
      wardNo: prop.wardNo,
      paymentDate: new Date().toISOString(),
      paymentMethod: params.paymentMethod,
      collectedBy: params.collectedBy,
      cashierName: params.cashierName,
      financialYear: this.rates.financialYear,
      holdingTaxAmount: breakdown.baseHoldingTax,
      arrearsAmount: breakdown.arrears,
      waterTaxAmount: breakdown.waterTax,
      sanitationCessAmount: breakdown.sanitationCess,
      lightingCessAmount: breakdown.lightingCess,
      penaltyAmount: breakdown.penaltySurcharge,
      rebateDiscount: breakdown.earlyRebateDiscount,
      totalPaid: params.amountPaid || breakdown.netPayable,
      notes: params.notes || `Tax payment for FY ${this.rates.financialYear}`,
    };

    // Update property status
    this.properties = this.properties.map((p) => {
      if (p.id === prop.id) {
        return {
          ...p,
          status: 'paid',
          arrearsDemand: 0,
          currentYearDemand: 0,
          waterTaxDue: 0,
          sanitationCessDue: 0,
          monthsOverdue: 0,
          lastPaymentDate: newReceipt.paymentDate,
          lastReceiptNo: newReceipt.receiptNo,
        };
      }
      return p;
    });

    this.receipts.unshift(newReceipt);
    this.addAuditLog(
      params.collectedBy,
      'Payment Collected',
      `${params.paymentMethod} receipt #${receiptNo} of ₹${newReceipt.totalPaid.toLocaleString('en-IN')} for ${prop.holdingNo}`
    );
    this.saveToStorage();

    return newReceipt;
  }

  public resetToDefaults() {
    this.profile = { ...DEFAULT_PROFILE };
    this.flags = { ...DEFAULT_FLAGS };
    this.rates = { ...DEFAULT_RATES };
    this.properties = [...INITIAL_PROPERTIES];
    this.receipts = [...INITIAL_RECEIPTS];
    this.auditLogs = [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: 'Admin',
        action: 'Reset System to Defaults',
        details: 'Restored original demo dataset and configuration.',
      },
    ];
    this.saveToStorage();
  }

  private addAuditLog(actor: string, action: string, details: string) {
    this.auditLogs.unshift({
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
    });
    if (this.auditLogs.length > 80) {
      this.auditLogs = this.auditLogs.slice(0, 80);
    }
  }
}

export const portalStore = new PortalStore();
