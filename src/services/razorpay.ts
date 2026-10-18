/**
 * Razorpay online checkout for citizen (and optional staff-assisted) payments.
 *
 * SECURITY: Order creation and payment verification MUST run on a trusted backend
 * (Firebase Cloud Functions). Never put the Razorpay key_secret in the browser.
 *
 * Setup: see RAZORPAY_SETUP.md
 */

import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '../firebase';
import type { HeadId } from './heads';
import type { PayMode } from './collection';

export const RAZORPAY_MODE: PayMode = 'razorpay';

/** Public key only — safe in the client. Override via VITE_RAZORPAY_KEY_ID. */
export const razorpayKeyId = () =>
  (import.meta as ImportMeta & { env: Record<string, string> }).env?.VITE_RAZORPAY_KEY_ID || '';

export interface CheckoutLine {
  head: HeadId;
  propertyId: string;
  /** Outstanding amount in rupees for this head (will be converted to paise server-side). */
  amount: number;
  label?: string;
}

export interface CreateOrderRequest {
  townKey: string;
  propertyId: string;
  /** Total rupees to charge (must match sum of lines). */
  amount: number;
  lines: CheckoutLine[];
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  receipt: string;
}

export interface ConfirmPaymentRequest {
  townKey: string;
  propertyId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  lines: CheckoutLine[];
}

export interface ConfirmPaymentResponse {
  ok: boolean;
  receiptNo?: string;
  error?: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/** Load Razorpay Checkout.js once. */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(!!window.Razorpay);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function functionsClient() {
  // Default region; change if your functions are deployed elsewhere.
  return getFunctions(app, 'asia-south1');
}

/**
 * Ask the backend to create a Razorpay order after re-checking dues.
 * Requires Cloud Function `createRazorpayOrder`.
 */
export async function createRazorpayOrder(req: CreateOrderRequest): Promise<CreateOrderResponse> {
  const fn = httpsCallable<CreateOrderRequest, CreateOrderResponse>(functionsClient(), 'createRazorpayOrder');
  const res = await fn(req);
  return res.data;
}

/**
 * After Checkout success, ask the backend to verify the signature and post ledger payments.
 * Requires Cloud Function `confirmRazorpayPayment` (webhook is preferred in production).
 */
export async function confirmRazorpayPayment(req: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> {
  const fn = httpsCallable<ConfirmPaymentRequest, ConfirmPaymentResponse>(functionsClient(), 'confirmRazorpayPayment');
  const res = await fn(req);
  return res.data;
}

export interface OpenCheckoutOptions {
  order: CreateOrderResponse;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess: (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  onDismiss?: () => void;
}

/** Open Razorpay Checkout modal for an existing order. */
export async function openRazorpayCheckout(opts: OpenCheckoutOptions): Promise<void> {
  const ok = await loadRazorpayScript();
  if (!ok || !window.Razorpay) throw new Error('Could not load Razorpay Checkout. Check your network.');

  const key = opts.order.keyId || razorpayKeyId();
  if (!key) throw new Error('Razorpay key is not configured (VITE_RAZORPAY_KEY_ID or order.keyId).');

  const rzp = new window.Razorpay({
    key,
    amount: opts.order.amountPaise,
    currency: opts.order.currency || 'INR',
    name: opts.name,
    description: opts.description,
    order_id: opts.order.orderId,
    prefill: opts.prefill || {},
    theme: { color: '#e8b84a' },
    handler: (response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      opts.onSuccess(response);
    },
    modal: {
      ondismiss: () => opts.onDismiss?.(),
    },
  });
  rzp.open();
}
