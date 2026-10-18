# Razorpay online payments (citizen checkout)

Scheme Hub can take **citizen self-service payments** through Razorpay Checkout.

Staff collection (cash / UPI / cheque) is unchanged. Online pay is available on **Search dues** when the signed-in role is `citizen`, `cashier`, or `admin`.

## What is already in the app

| Piece | Location |
|--------|----------|
| Role `citizen` | `src/services/auth.tsx`, `src/services/access.ts` (Search dues only) |
| Pay mode `razorpay` | `src/services/collection.ts` + database rules |
| Client helpers | `src/services/razorpay.ts` |
| Checkout UI | `src/components/CitizenPay.tsx` on Search dues |
| Key env | `VITE_RAZORPAY_KEY_ID` (public key only) |

## What you must deploy (required)

Razorpay **key_secret** must never ship in the web/app bundle. Deploy two **Firebase Callable Functions** (region `asia-south1` to match the client):

### 1. `createRazorpayOrder`

1. Require Auth.
2. Re-read ledger dues for `propertyId` + selected heads; reject if client amount does not match.
3. For role `citizen`, allow only properties linked to that user (e.g. `users/{uid}/properties` or matching owner phone/ID).
4. Create Razorpay order (`amount` in **paise**, currency `INR`).
5. Return `{ orderId, amountPaise, currency, keyId, receipt }`.

### 2. `confirmRazorpayPayment` (and/or webhook)

1. Verify `razorpay_signature` with `key_secret`.
2. Idempotent: if this `razorpay_payment_id` was already posted, return the existing receipt.
3. Post ledger `payment` entries with `mode: "razorpay"`, `ref: payment_id`, receipt number.
4. Write audit log.

Prefer a **Razorpay webhook** (`payment.captured`) as the source of truth; use the callable as a fast path for the UI.

## Firebase config sketch

```bash
# functions/
npm i razorpay firebase-admin firebase-functions

# secrets
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
```

```ts
// Pseudocode — implement in functions/src/index.ts
import Razorpay from 'razorpay';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const keyId = defineSecret('RAZORPAY_KEY_ID');
const keySecret = defineSecret('RAZORPAY_KEY_SECRET');

export const createRazorpayOrder = onCall(
  { region: 'asia-south1', secrets: [keyId, keySecret] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in required');
    const { townKey, propertyId, amount, lines } = req.data;
    // TODO: recompute dues; enforce citizen property link; amount in paise
    const rzp = new Razorpay({ key_id: keyId.value(), key_secret: keySecret.value() });
    const order = await rzp.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `SH-${townKey}-${propertyId}`.slice(0, 40),
    });
    return {
      orderId: order.id,
      amountPaise: order.amount,
      currency: 'INR',
      keyId: keyId.value(),
      receipt: order.receipt,
    };
  },
);
```

## App env

```env
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxx   # or rzp_test_… for sandbox
```

## Creating citizen logins

1. Create Firebase Auth user (same User ID pattern as staff, or email).
2. In RTDB `users/{uid}` set:
   - `role: "citizen"`
   - `ulb: "<TownSlug>"`
   - `name: "<Owner name>"`
   - optionally `properties: { "<propertyId>": true }` for strict linking
3. Citizen sees only **Search dues** and the **Pay online** panel.

## Test checklist

1. Test key + small amount in Razorpay test mode.
2. Citizen signs in → Search dues → select building → Checkout.
3. Complete test payment → receipt appears; head status becomes **Paid** / **Partially paid**.
4. Confirm ledger entry has `mode: "razorpay"` and payment id in `ref`.

## Compliance notes

- Use Razorpay’s India merchant onboarding and settlement for municipal use.
- Show clear bill breakdown before pay (CitizenPay does this).
- Keep webhook verification and amount checks server-side only.
