# Auth Token Storage — Decision Record

**Status**: Accepted
**Date**: 2026-05-05
**Owners**: Backend + Frontend leads
**Supersedes**: —

---

## Context

JWTs (7-day expiry, signed with `JWT_SECRET`) are issued by `POST /auth/login`
and `POST /auth/google` and consumed by every authenticated request via the
`Authorization: Bearer <token>` header.

Today the frontend stores the token in `localStorage`:

```ts
// frontend/store/auth.store.ts
localStorage.setItem('token', token);
// frontend/lib/api.ts
config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
```

The two options on the table:

| Option | Storage | XSS impact | CSRF impact | Mobile reuse |
|---|---|---|---|---|
| **A. Stay on `localStorage`** | JS-readable | XSS = full account takeover | Immune (no ambient creds) | Same code as web |
| **B. Move to `httpOnly` cookie + CSRF token** | JS-can't-read | XSS can't steal token; can still ride session | Need double-submit / SameSite=Strict | Can't share — mobile ships native code with a bearer header anyway |

---

## Decision

**Stay on `localStorage` — Option A — for now**, paired with hard XSS mitigations:

1. **CSP report-only shipped** in `next.config.js`, scoped to the origins we
   actually use. Promote to enforcing once reports show zero violations across
   one release cycle.
2. **Markdown sanitizer** on all user-controlled rich content
   (`safeHref()` in `app/resources/blog/[slug]/page.tsx`). Allow-list scheme
   not block-list — `javascript:` and `data:` are rejected.
3. **No `dangerouslySetInnerHTML` on user input** without going through the
   sanitizer.
4. **Sentry** wired client + server so a real XSS incident generates an alert
   instead of a quiet exfiltration.
5. **Token rotation on logout** — invalidate server-side via the cache reset
   in `auth.middleware.js` so a stolen token has a finite blast radius.
6. **Subresource Integrity (SRI)** on the two third-party scripts that handle
   payment data (Razorpay `checkout.js`) and analytics (GA, FB Pixel, Clarity)
   — TODO, see backlog item P1.

---

## Why not Option B today

- **Mobile parity matters.** The Expo app ships its own bearer-header request
  flow against the same `/api/v1` endpoints. Cookies don't help mobile —
  switching the web frontend to cookies forces us to maintain two auth shapes
  in `auth.middleware.js` (`Authorization` header *and* cookie parsing) for
  every protected route.
- **Cross-origin pain.** Frontend is on `kartriq.vercel.app` (or a custom
  domain), backend is on `api.kartriq.com`. `httpOnly` cookies across origins
  require `SameSite=None; Secure` plus a CORS `credentials: include` policy
  *and* explicit allow-list on the server — easy to misconfigure in a way
  that breaks login for a subset of users (Safari ITP, Brave shields).
- **CSRF surface re-emerges.** Once the browser sends credentials ambiently,
  every state-changing endpoint needs a CSRF token (double-submit cookie or
  per-request nonce). That is real engineering, not a flag flip.
- **The XSS mitigations above are the actual fix.** Cookies just relocate the
  blast radius — a stored XSS that can `fetch('/api/v1/...', {credentials: 'include'})`
  has the same account-takeover potential as one that reads `localStorage`.
  The real defense is "no XSS in the first place," and that's where we put the
  effort.

---

## Trip-wires that flip this decision

We will revisit and migrate to `httpOnly` cookies + CSRF if **any** of the
following becomes true:

- **A real XSS makes it to production.** One incident, regardless of severity.
- **CSP report-only shows we can't enforce.** If after 4 weeks we still have
  inline-eval reports we can't remove (e.g. third-party widget hard requirement),
  the cookie route gets cheaper than tightening CSP further.
- **Compliance demand.** SOC2 auditor or a B2B prospect explicitly requires
  `httpOnly` token storage in their security questionnaire.
- **Mobile path divergence.** If we add web-only sessions (e.g. SSO via SAML
  for enterprise), the mobile-parity argument weakens and cookies become viable
  for the web surface only.

---

## Backlog (P1 follow-ups already accepted)

- Add SRI hashes to `checkout.razorpay.com/v1/checkout.js` and the analytics
  bundles in `components/Analytics.tsx`.
- Add a CSP `report-uri` endpoint (or use Sentry's CSP ingest) so we get
  visibility on violations instead of relying on browser console.
- Audit `dangerouslySetInnerHTML` usage repo-wide — currently the only
  call site is the blog renderer, which is sanitized.
- Shorten JWT TTL from 7d to 1h with refresh tokens, so a stolen token has
  a 1-hour usable window. (Refresh token *can* live in an `httpOnly` cookie
  even while the access token stays in memory — best of both worlds for the
  web surface, and a no-op for mobile which will ignore the cookie.)

---

## Implementation status

| Mitigation | Status | File |
|---|---|---|
| CSP report-only | ✅ Shipped | `frontend/next.config.js` |
| Markdown sanitizer | ✅ Shipped | `frontend/app/resources/blog/[slug]/page.tsx` |
| Sentry client + server | ✅ Shipped | `frontend/sentry.*.config.ts`, `instrumentation.ts` |
| Server token rotation on logout | ✅ Existing | `backend/src/middleware/auth.middleware.js` (cache invalidate) |
| SRI on third-party scripts | ⏳ Backlog | `frontend/components/Analytics.tsx`, `wallet/TopupModal.tsx` |
| Refresh-token rotation | ⏳ Backlog | `backend/src/routes/auth.routes.js` |

---

## References

- OWASP — [HTML5 Local Storage cheat sheet](https://owasp.org/www-project-cheat-sheets/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage)
- `docs/FRONTEND_REVIEW.md` — section 3 (Security)
- `docs/BACKEND_REVIEW.md` — section 4 (Auth & RBAC)
