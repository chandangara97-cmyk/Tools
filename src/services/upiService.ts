import QRCode from 'qrcode';

export interface UpiPaymentOptions {
  vpa?: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
  transactionRef?: string;
}

/**
 * Generates an official UPI deep-link URL conforming to NPCI UPI specifications.
 * Format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
 */
export function generateUpiUrl(opts: UpiPaymentOptions): string {
  const vpa = opts.vpa || 'hp.municipal.tax@sbi';
  const payee = encodeURIComponent(opts.payeeName);
  const amount = opts.amount.toFixed(2);
  const note = encodeURIComponent(opts.transactionNote.slice(0, 50));
  const ref = opts.transactionRef ? `&tr=${encodeURIComponent(opts.transactionRef)}` : '';

  return `upi://pay?pa=${vpa}&pn=${payee}&am=${amount}&cu=INR&tn=${note}${ref}`;
}

/**
 * Generates a Data URL (base64 image/png) for a QR code string.
 */
export async function generateQrDataUrl(text: string, size = 260): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return '';
  }
}

/**
 * Default Municipal VPA for Himachal Pradesh ULBs.
 */
export function defaultTownVpa(townName: string): string {
  const clean = townName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `ulb.${clean}.rev@sbi`;
}

/**
 * Generates a Verification QR code URL for Certificates, Receipts, and Form 4 Notices.
 */
export async function generateVerificationQr(
  type: 'noc' | 'receipt' | 'demand',
  id: string,
  town: string,
  extra?: string,
): Promise<string> {
  const payload = JSON.stringify({
    sys: 'CivicCollect-HP',
    type: type.toUpperCase(),
    ref: id,
    town,
    ...(extra ? { meta: extra } : {}),
    ts: Date.now(),
  });
  return generateQrDataUrl(payload, 180);
}
