/**
 * WhatsApp message generation and dispatch for municipal civic operations.
 */

export interface DemandNoticeWhatsApp {
  town: string;
  propertyId: string;
  ownerName: string;
  ward: string;
  houseNo?: string;
  duesBreakdown: { headName: string; amount: number }[];
  totalDue: number;
  dueDate: string;
  rebateAmount?: number;
  rebateDeadline?: string;
}

export interface ReceiptWhatsApp {
  town: string;
  receiptNo: string;
  date: string;
  propertyId: string;
  ownerName: string;
  payerName?: string;
  headName: string;
  amount: number;
  mode: string;
  balanceDueAfter: number;
  advanceCredit?: number;
}

export function formatDemandNoticeWhatsApp(d: DemandNoticeWhatsApp): string {
  const lines = d.duesBreakdown
    .map((b) => `• ${b.headName}: ₹${b.amount.toLocaleString('en-IN')}`)
    .join('\n');

  let msg = `🏛️ *${d.town.toUpperCase()} MUNICIPAL COUNCIL / NAGAR PANCHAYAT*\n`;
  msg += `*हिमाचल प्रदेश नगरीय स्थानीय निकाय (HP ULB)*\n\n`;
  msg += `Dear *${d.ownerName}*,\n`;
  msg += `This is the official municipal dues notice for Property ID: *${d.propertyId}* (Ward ${d.ward}${d.houseNo ? `, House: ${d.houseNo}` : ''}).\n\n`;
  msg += `📋 *Bill Summary / देय विवरण:*\n${lines}\n\n`;
  msg += `💰 *Total Amount Due:* ₹${d.totalDue.toLocaleString('en-IN')}\n`;
  msg += `📅 *Due Date:* ${d.dueDate}\n`;

  if (d.rebateAmount && d.rebateAmount > 0 && d.rebateDeadline) {
    msg += `✨ *Early Bird Rebate:* Pay in full by ${d.rebateDeadline} to save ₹${d.rebateAmount.toLocaleString('en-IN')}!\n`;
  }

  msg += `\nPay at municipal cashier counter or scan UPI QR code on your bill.\n`;
  msg += `_Municipal Revenue Office, ${d.town}_`;

  return msg;
}

export function formatReceiptWhatsApp(r: ReceiptWhatsApp): string {
  let msg = `🏛️ *${r.town.toUpperCase()} MUNICIPAL COUNCIL*\n`;
  msg += `*MUNICIPAL RECEIPT / रसीद*\n\n`;
  msg += `✅ *Receipt No:* ${r.receiptNo}\n`;
  msg += `📅 *Date:* ${r.date}\n`;
  msg += `🏠 *Property ID:* ${r.propertyId}\n`;
  msg += `👤 *Owner:* ${r.ownerName}\n`;
  if (r.payerName && r.payerName !== r.ownerName) {
    msg += `💳 *Paid by:* ${r.payerName}\n`;
  }
  msg += `📋 *Service Head:* ${r.headName}\n`;
  msg += `💵 *Amount Received:* ₹${r.amount.toLocaleString('en-IN')} (${r.mode.toUpperCase()})\n`;

  if (r.advanceCredit && r.advanceCredit > 0) {
    msg += `🌟 *Advance Credit Held:* ₹${r.advanceCredit.toLocaleString('en-IN')}\n`;
  }

  msg += `⚖️ *Balance Due After:* ₹${r.balanceDueAfter.toLocaleString('en-IN')}\n\n`;
  msg += `Thank you for supporting municipal civic development!\n`;
  msg += `_Authorized Municipal Collector, ${r.town}_`;

  return msg;
}

/**
 * Clean phone number and open WhatsApp web or app link
 */
export function openWhatsAppChat(phone: string, text: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  const target = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const url = `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
