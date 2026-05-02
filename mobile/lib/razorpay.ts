// Razorpay payment bridge.
//
// Two flows:
//   subscribeToPlan()  → calls /payments/checkout to create a Razorpay order
//                        for a plan upgrade, opens the native Razorpay modal,
//                        and finalises the subscription via /payments/verify.
//   topupWallet()      → same flow but credits the wallet on success.
//
// Both use the `react-native-razorpay` native module. The module ships native
// code so the app must be a development build (or production EAS build) — it
// will not work in Expo Go. We lazy-require so the app boots either way.

import { Alert } from 'react-native';
import { paymentApi, billingApi } from './api';

type CheckoutResponse = {
  order: { id: string; amount: number; currency: string };
  keyId: string;
  plan: { code: string; name: string; amount: number };
  prefill: { email: string; name: string };
};

function loadRazorpay(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-razorpay').default;
  } catch {
    return null;
  }
}

function buildOptions(co: CheckoutResponse, description: string) {
  return {
    description,
    image: 'https://kartriq.vercel.app/og-image.png',
    currency: co.order.currency,
    key: co.keyId,
    amount: co.order.amount,        // already in paise from backend
    order_id: co.order.id,
    name: 'Kartriq',
    prefill: {
      email: co.prefill.email,
      contact: '',
      name: co.prefill.name,
    },
    theme: { color: '#06D4B8' },
  };
}

/** Upgrade / change subscription plan via Razorpay. */
export async function subscribeToPlan(planCode: string, billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY') {
  const RazorpayCheckout = loadRazorpay();
  if (!RazorpayCheckout) {
    Alert.alert(
      'Razorpay not available',
      'Run `npx expo install react-native-razorpay` and rebuild the dev client to enable in-app payments.'
    );
    return { ok: false };
  }

  let co: CheckoutResponse;
  try {
    const r = await paymentApi.checkout({ planCode, billingCycle });
    co = r.data;
  } catch (err: any) {
    Alert.alert('Checkout failed', err?.response?.data?.error || err.message);
    return { ok: false };
  }

  try {
    const result: any = await RazorpayCheckout.open(buildOptions(co, `${co.plan.name} (${billingCycle})`));
    await paymentApi.verify({
      razorpay_order_id: result.razorpay_order_id,
      razorpay_payment_id: result.razorpay_payment_id,
      razorpay_signature: result.razorpay_signature,
      planCode,
      billingCycle,
    });
    Alert.alert('Subscription updated', `You're now on ${co.plan.name}.`);
    return { ok: true };
  } catch (err: any) {
    if (err?.code === 0 || err?.code === 'PAYMENT_CANCELLED') return { ok: false, cancelled: true };
    Alert.alert('Payment failed', err?.description || err?.message || 'Unknown error');
    return { ok: false };
  }
}

/**
 * Top up the tenant wallet by `amount`. The backend currently only exposes
 * a direct credit endpoint (`/billing/wallet/topup`), so we credit on the
 * server side without an actual Razorpay charge. When a dedicated
 * `/payments/wallet-checkout` endpoint ships, swap this for the same
 * Razorpay open → verify → credit pattern used by subscribeToPlan().
 */
export async function topupWallet(amount: number, paymentRef?: string) {
  try {
    await billingApi.topupWallet(amount, paymentRef);
    return { ok: true };
  } catch (err: any) {
    Alert.alert('Top-up failed', err?.response?.data?.error || err.message);
    return { ok: false };
  }
}
