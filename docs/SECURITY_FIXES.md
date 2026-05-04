# Backend security & bug-fix changelog

This document covers the two audit-driven fix passes shipped on `main`:

| Commit | Date (UTC) | Scope |
|---|---|---|
| `8370558` | 2026-05-02 | First audit — correctness bugs in Razorpay autopay + idempotency |
| _pending_ | 2026-05-02 | Second audit — security & flow-break fixes |

The audits were focused on code added in the recent payment / billing / autopay / OAuth / Amazon work (commits `82c4fc1`, `bea1014`, `01538a2`, `c33f7ab`, `9af22c0`, `73375ce`).

---

## Round 1 — Correctness bugs (8 issues, commit `8370558`)

### High severity

#### 1. `/billing/usage` returned `autoRenew: undefined`
- **File:** `backend/src/routes/billing.routes.js:152-160`
- **Effect:** The auto-renew toggle on the Billing page always rendered OFF and the `lastRenewalError` banner never appeared, because the auth middleware's `req.subscription` projection only carries `{id, status, payAsYouGo, currentPeriodEnd}`.
- **Fix:** Load the full subscription row directly in the route handler.

#### 2. `chargeRecurringToken` called a non-existent SDK method
- **File:** `backend/src/services/payment.service.js`
- **Effect:** Every autopay/auto-renew charge failed with "createRecurringPayment is not a function" on SDK versions that don't expose the helper. Body shape was also wrong (`recurring: '1'` instead of boolean `true`).
- **Fix:** Feature-detect the SDK helper, fall back to a raw `axios.post('/v1/payments/create/recurring', ...)`, drop the `description` field Razorpay rejects, fail fast when `customerId` is missing.

#### 3 + 6. Missing unique constraints → double-credit / duplicate token rows
- **Files:** `backend/src/bootstrap/initDb.js` (schema), `backend/src/services/wallet.service.js` (idempotent topup)
- **Effect:** Concurrent webhook + sync-verify deliveries could both miss the dedup pre-check and credit the wallet twice. Webhook retries could insert duplicate saved-method rows.
- **Fix:**
  - Added `UNIQUE (tenantId, paymentRef)` to `wallet_transactions`
  - Added `UNIQUE (tenantId, providerTokenId)` to `tenant_payment_methods`
  - Idempotent retrofit migration that de-dupes existing rows before adding the constraint
  - `wallet.topup()` pre-checks then catches `ER_DUP_ENTRY` and returns the existing row

#### 5. `setDefault` race could set two `isDefault=1` rows
- **File:** `backend/src/routes/payment.routes.js`
- **Effect:** Two concurrent calls each zero disjoint rows then set their own to 1, both committing → multiple defaults per tenant.
- **Fix:** `SELECT ... FOR UPDATE` locks every payment-method row for the tenant at the start of the transaction.

#### 7. `PAST_DUE` subscriptions never retried
- **File:** `backend/src/jobs/billing.job.js`
- **Effect:** A failed renewal charge moved the sub to `PAST_DUE`, but `rollForwardSubscriptions` filters on `ACTIVE + TRIALING` only — so it never came back. Even after the user fixed their card, manual intervention was required.
- **Fix:** New `retryFailedRenewals()` step in `runBillingJob` with the same exponential back-off (1h → 6h → 1d → 1w) the wallet autopay uses.

### Medium severity

#### 8. Post-charge invoice update failure was swallowed
- **File:** `backend/src/jobs/billing.job.js`
- **Effect:** If `prisma.billingInvoice.update` failed after a successful charge, the customer was charged but the invoice stayed `DUE` silently — no log, no breadcrumb.
- **Fix:** Log loudly + stash the Razorpay payment id on `subscription.providerSubscriptionId` as a reconciliation breadcrumb.

#### 10. Amazon region select listed only IN/US/EU
- **Files:** `backend/src/data/channel-catalog.js`, `frontend/lib/channel-schemas.ts`
- **Effect:** Sellers in CA/MX/JP/SG/etc. picking the generic AMAZON entry fell through to IN default and hit the wrong marketplace.
- **Fix:** Expanded to all 21 regions the SP-API adapter supports.

#### 15. autopay terminally failed when `customerId` was missing
- **File:** `backend/src/jobs/autopay.job.js`
- **Effect:** Saved methods with no `customerId` (rare — token captured before webhook hardening) caused Razorpay to reject every charge, bumping `failureCount` until permanently stuck.
- **Fix:** Now disables the row up-front with a clear failure reason. Also restructured `findCandidates()` to use a per-tenant fetch+pick instead of JOIN+GROUP BY so multiple-default races (now prevented by #5) couldn't ever produce duplicate rows.

### Webhook token-persist path rewrite
The previous `db('tenant_payment_methods').insert(...).onConflict([...]).ignore?.()` chain depended on a unique index that didn't exist (was a no-op). Now uses the new `pm_provider_token_unique` index plus an explicit pre-check + `ER_DUP_ENTRY` catch.

---

## Round 2 — Security & flow-break fixes (12 issues)

### HIGH severity

#### 1. Webhook signature was broken (re-stringified body) AND fail-open in stub mode
- **File:** `backend/src/index.js`, `backend/src/services/payment.service.js`, `backend/src/routes/payment.routes.js`
- **Effect:** `JSON.stringify(req.body)` after `express.json()` had already parsed it produced a different byte string than what Razorpay HMACed — so legitimate webhooks were always rejected. Worse, when `webhookSecret` was unset (stub mode), `verifyWebhookSignature` returned `true` unconditionally — anyone could forge `payment.captured` events.
- **Fix:**
  - `index.js`: `express.json({ verify: (req,_,buf) => { req.rawBody = buf.toString('utf8'); }})` captures the unparsed bytes
  - `payment.routes.js webhook` uses `req.rawBody` (refuses to verify if missing)
  - `payment.service.js`: `verifyWebhookSignature` returns `false` in production when no secret is configured (fail-closed)

#### 2. Webhook trusted `notes.tenantId` without ownership check
- **File:** `backend/src/routes/payment.routes.js`
- **Effect:** A signed webhook with notes pointing at another tenant's `subscriptionId` / `invoiceId` would flip that tenant's invoice to PAID or subscription to ACTIVE.
- **Fix:** Look up the invoice/subscription first; refuse to update when its `tenantId !== notes.tenantId`. Logged as a `tenant mismatch — refusing update` warning.

#### 3. `/billing/wallet/topup` was a free-money endpoint
- **File:** `backend/src/routes/billing.routes.js`
- **Effect:** Any tenant admin (`billing.manage` permission) could call this with any amount + invented `paymentRef` and credit their wallet for free, bypassing Razorpay entirely.
- **Fix:**
  - Platform admins can still use it for manual credits (clearly audited as `wallet.topup.admin`)
  - Tenant admins MUST provide a `paymentRef` that the backend then verifies against Razorpay (`client.payments.fetch(paymentRef)`):
    1. Status must be `captured`
    2. Amount must match the requested credit (in paise)
    3. Order's `notes.tenantId` must match the calling tenant
  - In production, refuses if no Razorpay client is configured

#### 4. Stub-mode signature verification accepted `'stub'` literal in any environment
- **File:** `backend/src/services/payment.service.js`
- **Effect:** A request with `razorpay_signature: 'stub'` was always trusted regardless of `NODE_ENV`. In production with no keys set, `verifyWebhookSignature` returned `true` for everything.
- **Fix:** Both functions now gate stub paths on `process.env.NODE_ENV !== 'production'`. In prod with no keys, return `false` and let the route 401.

#### 5. `enforceLimit` middleware failed OPEN
- **File:** `backend/src/middleware/auth.middleware.js`
- **Effect:** The `try { ... } catch (e) { console.error(); next(); }` swallowed every failure, so on any DB error tenants on capped plans burst past their limits.
- **Fix:** Fail closed — return `503 { error: 'Plan limit check temporarily unavailable. Please retry shortly.' }` on caught errors.

#### 6. Timing-unsafe HMAC comparison
- **File:** `backend/src/services/payment.service.js`
- **Effect:** Both `verifySignature` and `verifyWebhookSignature` used `===` instead of `crypto.timingSafeEqual`. Combined with the lack of per-route rate limiting (#11), this was a forge-via-timing-oracle vector.
- **Fix:** Added `safeHexEqual()` helper that uses `crypto.timingSafeEqual` with a length pre-check; both verifiers now use it.

### MEDIUM severity

#### 7. OAuth callback error path updated channels by id only
- **File:** `backend/src/routes/oauth.routes.js`
- **Effect:** The HMAC-signed state can't be tampered with externally, but if `JWT_SECRET` ever leaked one tenant's failed-OAuth handler could write `syncError` strings to another tenant's channel. Defence-in-depth.
- **Fix:** All 9 catch-block `prisma.channel.update({where: {id: parsed.channelId}})` calls converted to `prisma.channel.updateMany({where: {id: parsed.channelId, tenantId: parsed.tenantId}})`.

#### 8. `/billing/usage` and `/billing/subscription` had no permission check
- **File:** `backend/src/routes/billing.routes.js`
- **Effect:** Any user in the tenant — including read-only viewers and invited collaborators — could see plan, billing cycle, wallet balance, overage charges. CLAUDE.md explicitly calls out that wallet endpoints need `billing.read`.
- **Fix:** Both routes now `requirePermission('billing.read')`.

#### 9. `payment.failed` webhook updated saved methods without tenant filter
- **File:** `backend/src/routes/payment.routes.js`
- **Effect:** `db('tenant_payment_methods').where({ providerTokenId: tokenId }).update(...)` updated by token id only. If two tenants ever shared a token (rare but possible with seed-data bugs / customer-id swaps), both rows would get failure-bumped on a single failure.
- **Fix:** `andWhere({ tenantId: tenantIdForFail })` — only mutates the row belonging to the tenant in the notes.

#### 10. `GET /payments/methods` returned `providerTokenId` and `providerCustomerId`
- **File:** `backend/src/routes/payment.routes.js`
- **Effect:** The recurring-charge token was shipped to the client. An XSS or leaked browser cache would expose enough to drive recurring charges from a malicious page.
- **Fix:** Project only display-safe columns: `id, method, brand, last4, expiryMonth, expiryYear, upiVpa, label, isDefault, failureCount, lastUsedAt, lastFailureAt, lastFailureReason, createdAt`.

#### 11. No per-route rate limit on payment endpoints; webhook on wrong path for limiter
- **File:** `backend/src/index.js`
- **Effect:** `/api/v1/payments/*` (including `/webhook`) only had the 200/15min global limiter. Razorpay can legitimately exceed 200 events in a 15-min window during payouts; legitimate webhooks would 429. `/payments/verify` was brute-forceable for a timing oracle.
- **Fix:**
  - Mounted `webhookLimiter` (120/min) on `/api/v1/payments/webhook` directly
  - New `paymentLimiter` (60/min, skip-successful) on `/payments/verify`, `/payments/wallet-verify`, `/payments/checkout`, `/payments/wallet-checkout`

#### 12. `applyTestMode` accepted any caller-supplied creds + leaky error logs
- **File:** `backend/src/services/payment.service.js`, `backend/src/routes/payment.routes.js`
- **Effect:**
  - A platform admin who'd been phished or whose CSRF protections failed could swap creds to attacker-controlled ones, redirecting all subsequent webhook events
  - `console.error('[payment.checkout]', err)` and similar dumped full axios error objects which include `err.config` — the outgoing request body and headers, occasionally including `key_id` headers
- **Fix:**
  - `applyTestMode` now creates a tiny test order against Razorpay (`amount: 100, currency: 'INR'`) BEFORE persisting; rejects bad keys with the SDK's own error message
  - New `safeErrLog()` helper scrubs `err.config`, `err.request`, `err.response.config` and only logs `{name, message, code, status, rzpDescription, rzpReason}`. Wrapped around all four `console.error` sites in `payment.routes.js`

---

## Files touched (Round 2 only)

```
backend/src/index.js                           — raw body capture + payment limiter
backend/src/middleware/auth.middleware.js      — enforceLimit fail-closed
backend/src/services/payment.service.js        — fail-closed verify + timingSafeEqual + applyTestMode validation
backend/src/routes/payment.routes.js           — webhook ownership checks + safeErrLog + safe /methods projection + payment.failed tenant filter
backend/src/routes/billing.routes.js           — wallet.topup gateway-verify + permission gates on /usage and /subscription
backend/src/routes/oauth.routes.js             — tenantId filter on 9 catch-block channel updates
```

## Files touched (Round 1)

```
backend/src/services/payment.service.js        — chargeRecurringToken feature detection + HTTP fallback
backend/src/services/wallet.service.js         — idempotent topup with ER_DUP_ENTRY catch
backend/src/routes/payment.routes.js           — setDefault row-locking + webhook token-persist rewrite
backend/src/routes/billing.routes.js           — full subscription load on /usage
backend/src/jobs/autopay.job.js                — restructured candidate query + customerId guard
backend/src/jobs/billing.job.js                — retryFailedRenewals + invoice update logging
backend/src/bootstrap/initDb.js                — wallet_txn unique + tenant_payment_methods unique + retrofit migration
backend/src/data/channel-catalog.js            — Amazon 21 region list
frontend/lib/channel-schemas.ts                — Amazon 21 region list
```

---

## Items deliberately not addressed

These were flagged in the audits but skipped — listed here so they don't get lost.

| Item | Why deferred |
|---|---|
| JWT revocation on logout (only clears in-process permission cache) | Acceptable per CLAUDE.md; worth a token blacklist if compromise resilience matters |
| OAuth callback `renderPage(title, body)` HTML-injects unsanitised upstream error strings | No user-controlled error path was found in the audit, but worth a follow-up pass |
| Webhook fundamentally trusts `notes.tenantId` even after the ownership check | The ownership check is defence-in-depth; the order itself was created by the legitimate tenant via `/checkout`, so the trust chain is sound. A future hardening pass could match `payment.order_id` against locally-stored orders to remove the trust on `notes` entirely |
| Audit log writes `keyId` (public) on `applyTestMode` | This is the public half of the credential pair; safe to audit |

---

## Migration safety

The Round 1 unique-constraint migration:
1. Detects existing duplicates first
2. Deletes older copies (keeping the lowest `id`) so `ALTER TABLE ADD UNIQUE` succeeds
3. Idempotent — won't re-run once the index exists

Round 2 migrations are pure code changes; no DB schema impact. Restart the dev backend and everything applies automatically.

## Test plan (for whoever validates these)

| Scenario | Expected |
|---|---|
| Send a real Razorpay test webhook | Now verifies (Round 2 #1) — was rejecting before |
| Send a webhook with no `webhookSecret` set in production | 401 (Round 2 #1, #4) — was 200/credited before |
| Tenant admin POSTs `/billing/wallet/topup` with fake paymentRef | 400 / "Failed to verify payment" (Round 2 #3) |
| Two concurrent `setDefault` calls | One wins, the other waits then re-zeroes its row (Round 1 #5) |
| Webhook delivers same `payment.captured` twice | Wallet credited once (Round 1 #3+6) |
| Failed renewal charge | Sub goes PAST_DUE, retried daily with backoff (Round 1 #7) |
| Read-only user hits `/billing/usage` | 403 (Round 2 #8) |
| Hit `/payments/verify` >60 times/min | 429 (Round 2 #11) |
| `applyTestMode` with bogus secret | 400 with Razorpay's rejection reason (Round 2 #12) |
| `enforceLimit` with DB unavailable | 503 (Round 2 #5) — was unbounded create before |

## Razorpay test credentials reminder

- Test mode keys must start with `rzp_test_`
- Test card: `4111 1111 1111 1111`, CVV `100`, any future expiry, OTP `123456`
- Test UPI: `success@razorpay`
- Backend installs them via `POST /api/v1/payments/test-config` (platform admin)
