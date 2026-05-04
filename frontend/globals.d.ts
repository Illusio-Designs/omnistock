// Side-effect CSS imports (e.g. `import 'react-loading-skeleton/dist/skeleton.css'`).
// `moduleResolution: "bundler"` doesn't resolve these by default — declaring them
// here lets TypeScript accept the import without affecting runtime.
declare module '*.css';

// Razorpay checkout.js attaches a global `Razorpay` constructor to `window`.
// Declared here so call-sites can use `new window.Razorpay({...})` without
// `(window as any)` casts.
interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  razorpay_subscription_id?: string;
}

interface RazorpayOptions {
  key: string;
  amount?: number;
  currency?: string;
  name?: string;
  description?: string;
  order_id?: string;
  subscription_id?: string;
  customer_id?: string;
  handler?: (response: RazorpayPaymentResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void; escape?: boolean };
  // Razorpay accepts additional vendor-specific keys we don't model here.
  [k: string]: unknown;
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
}

interface Window {
  Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
}
