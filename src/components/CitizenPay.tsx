import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import type { HeadId } from '../services/heads';
import type { HeadLiability } from '../services/liability';
import { BILL_NAME } from './WorkMenu';
import { money } from './CollectionPanel';
import {
  createRazorpayOrder,
  confirmRazorpayPayment,
  openRazorpayCheckout,
  type CheckoutLine,
} from '../services/razorpay';
import { useAuth } from '../services/auth';

interface Props {
  townKey: string;
  townName: string;
  propertyId: string;
  ownerName: string;
  /** Heads with outstanding balance to offer for payment. */
  heads: HeadLiability[];
  onPaid?: () => void;
}

/**
 * Citizen (or staff-assisted) Razorpay checkout for selected dues on one property.
 * Requires deployed Cloud Functions — see RAZORPAY_SETUP.md.
 */
export const CitizenPay: React.FC<Props> = ({
  townKey,
  townName,
  propertyId,
  ownerName,
  heads,
  onPaid,
}) => {
  const { displayName, user } = useAuth();
  const payable = heads.filter((h) => h.total > 0.004);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(payable.map((h) => [h.head, true])),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const lines: CheckoutLine[] = payable
    .filter((h) => selected[h.head])
    .map((h) => ({
      head: h.head as HeadId,
      propertyId,
      amount: Math.round(h.total * 100) / 100,
      label: BILL_NAME[h.head],
    }));
  const total = lines.reduce((a, l) => a + l.amount, 0);

  const pay = async () => {
    setMsg(null);
    if (!lines.length || total < 1) {
      setMsg({ type: 'err', text: 'Select at least ₹1 of dues to pay.' });
      return;
    }
    setBusy(true);
    try {
      const order = await createRazorpayOrder({
        townKey,
        propertyId,
        amount: total,
        lines,
        payerName: ownerName || displayName || undefined,
        payerEmail: user?.email || undefined,
      });

      await openRazorpayCheckout({
        order,
        name: townName || 'Scheme Hub',
        description: `Municipal dues · ${propertyId}`,
        prefill: {
          name: ownerName || displayName || undefined,
          email: user?.email || undefined,
        },
        onSuccess: (payment) => {
          void (async () => {
            try {
              const conf = await confirmRazorpayPayment({
                townKey,
                propertyId,
                ...payment,
                lines,
              });
              if (!conf.ok) {
                setMsg({ type: 'err', text: conf.error || 'Payment received but ledger update failed. Contact the ULB with your payment ID.' });
              } else {
                setMsg({ type: 'ok', text: `Paid successfully. Receipt ${conf.receiptNo || payment.razorpay_payment_id}` });
                onPaid?.();
              }
            } catch (e) {
              setMsg({
                type: 'err',
                text: e instanceof Error ? e.message : 'Could not confirm payment. Keep your Razorpay payment ID and contact the ULB.',
              });
            } finally {
              setBusy(false);
            }
          })();
        },
        onDismiss: () => setBusy(false),
      });
    } catch (e) {
      const text =
        e instanceof Error
          ? e.message
          : 'Could not start checkout. Online payments may not be enabled yet for this ULB.';
      setMsg({ type: 'err', text });
      setBusy(false);
    }
  };

  if (!payable.length) return null;

  return (
    <div className="mt-4 rounded-2xl border border-[#e8b84a]/25 bg-[#e8b84a]/[0.06] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-[#e8b84a]" />
        <h4 className="text-sm font-semibold text-[#f7df9a]">Pay online (Razorpay)</h4>
      </div>
      <p className="text-[12px] text-[#7d8ba3] leading-relaxed">
        Choose which bills to clear. Amount is verified on the server before the payment window opens.
      </p>
      <div className="space-y-1.5">
        {payable.map((h) => (
          <label key={h.head} className="flex items-center gap-3 text-sm text-white py-1.5">
            <input
              type="checkbox"
              checked={!!selected[h.head]}
              onChange={(e) => setSelected({ ...selected, [h.head]: e.target.checked })}
              className="w-4 h-4 accent-[#e8b84a]"
            />
            <span className="flex-1">{BILL_NAME[h.head]}</span>
            <span className="tabular-nums text-[#f7df9a] font-semibold">{money(h.total)}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-sm text-[#7d8ba3]">
          Pay <b className="text-lg text-[#f7df9a] tabular-nums">{money(total)}</b>
        </span>
        <button
          type="button"
          disabled={busy || total < 1}
          onClick={() => void pay()}
          className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          {busy ? 'Opening…' : 'Checkout'}
        </button>
      </div>
      {msg && (
        <p className={`text-[13px] ${msg.type === 'ok' ? 'text-[#34d399]' : 'text-[#ff8d89]'}`}>{msg.text}</p>
      )}
    </div>
  );
};
