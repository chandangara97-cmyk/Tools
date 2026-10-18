export type PropertyUsage = 'residential' | 'commercial' | 'industrial' | 'institutional' | 'vacant_land';

export type ZoneType = 'Zone-A' | 'Zone-B' | 'Zone-C';

export type PaymentStatus = 'paid' | 'unpaid' | 'partial' | 'overdue';

export type PaymentMethod = 'UPI' | 'CASH' | 'CARD' | 'NET_BANKING' | 'CHEQUE';

export interface Property {
  id: string;
  holdingNo: string;
  assessmentNo: string;
  ownerName: string;
  guardianName: string;
  mobile: string;
  email?: string;
  address: string;
  wardNo: number;
  zone: ZoneType;
  usage: PropertyUsage;
  builtUpAreaSqFt: number;
  landAreaKatha?: number;
  annualRateableValue: number; // ARV in INR
  currentYearDemand: number;
  arrearsDemand: number;
  waterTaxDue: number;
  sanitationCessDue: number;
  lastPaymentDate?: string;
  lastReceiptNo?: string;
  status: PaymentStatus;
  monthsOverdue: number;
}

export interface TaxRatesConfig {
  financialYear: string;
  residentialBaseRatePerSqFt: number; // ₹ per sqft per year
  commercialMultiplier: number; // multiplier on base rate (e.g., 2.0x)
  industrialMultiplier: number;
  institutionalMultiplier: number;
  vacantLandMultiplier: number;
  zoneMultipliers: {
    'Zone-A': number; // e.g. 1.25 (Prime)
    'Zone-B': number; // e.g. 1.0 (Standard)
    'Zone-C': number; // e.g. 0.85 (Peripheral)
  };
  sanitationCessRatePercent: number; // % of holding tax
  lightingCessRatePercent: number; // % of holding tax
  waterSupplyFlatFee: number; // annual flat fee
  earlyBirdRebatePercent: number; // e.g., 5% discount
  earlyBirdDeadlineDays: number; // days from bill issue
  latePenaltyPercentPerMonth: number; // e.g., 1.5% per month
  maxPenaltyPercent: number; // cap at 18%
}

export interface AdminFeatureFlags {
  enableOnlineCitizenPayment: boolean;
  enableCitizenSelfAssessment: boolean;
  enableLatePaymentPenalty: boolean;
  enableEarlyBirdDiscount: boolean;
  enableCashierCounterPOS: boolean;
  enableWaterCharges: boolean;
  enableSanitationCess: boolean;
  enableDemandNoticeGeneration: boolean;
  enableDefaulterPublicList: boolean;
  enableSMSAlertsSimulation: boolean;
  maintenanceMode: boolean;
}

export interface MunicipalityProfile {
  name: string;
  state: string;
  district: string;
  pinCode: string;
  portalHelpline: string;
  supportEmail: string;
  commissionerTitle: string;
  officeAddress: string;
  currencySymbol: string;
  wardCount: number;
  bankCounters: string[];
}

export interface PaymentReceipt {
  receiptNo: string;
  transactionId: string;
  holdingNo: string;
  ownerName: string;
  wardNo: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  collectedBy: 'Citizen Online' | 'Counter Cashier' | 'Field Mobile POS';
  cashierName?: string;
  financialYear: string;
  
  // Breakdown
  holdingTaxAmount: number;
  arrearsAmount: number;
  waterTaxAmount: number;
  sanitationCessAmount: number;
  lightingCessAmount: number;
  penaltyAmount: number;
  rebateDiscount: number;
  totalPaid: number;
  
  notes?: string;
}

export interface DemandNotice {
  noticeNo: string;
  issueDate: string;
  holdingNo: string;
  ownerName: string;
  wardNo: number;
  address: string;
  totalOutstanding: number;
  principalDue: number;
  penaltySurcharge: number;
  deadlineDate: string;
  legalClause: string;
}
