# CiteSite Security Audit

**Date:** 2026-07-01
**Scope:** Full codebase — Cloudflare Workers (`index.js`, `workers/*`), React SPA (`src/`), build tooling (`scripts/`), CMS/admin config, and deployment.
**Method:** Manual source review of every worker and the SPA, plus dependency and configuration inspection. (`npm audit` could not run — the registry is outside this environment's network allowlist — so dependency CVEs were assessed by version, not by live audit.)

## Executive summary

The application is a static React SPA served through a Cloudflare Worker, backed by four API Workers (audit, checkout, Stripe webhook, OAuth proxy) and a D1 database. The security fundamentals that matter most are in good shape: the Stripe webhook verifies signatures with a timing-safe compare and is idempotent, blog HTML is sanitised with `sanitize-html` at build time, SSRF has a real allow/deny filter with redirect re-validation, and no secrets are committed to the repo.

The dominant risk class is **abuse of unauthenticated, unmetered endpoints that spend money** — the audit-api Worker has no rate limiter at all, yet several of its routes trigger paid Anthropic API calls, outbound fetches, transactional emails, and database writes. A single script can run up the Anthropic bill or flood the inbox/DB. The highest-priority fixes are cheap (add a rate-limiter binding, gate one endpoint) and should be done first.

Findings are ordered below by **priority weighted against ease of implementation** — the top items are both high-impact and low-effort.

---

## Priority 1 — High impact, low effort (do first)

### 1.1 `/api/audit/schema-forge` is unauthenticated and calls a paid, web-search-enabled model
**Severity:** High (financial abuse / cost DoS)
**File:** `workers/audit-api/index.js:1277-1331`

The endpoint accepts any URL and forwards it to the Anthropic API with the `web_search` tool enabled (`workers/audit-api/index.js:1305`). There is **no admin check, no order check, and no rate limit** — the UI merely hides the feature behind a `sessionStorage` flag (`src/App.jsx:3194`), which is trivially bypassed by calling the API directly. Each call bills Anthropic tokens *plus* web-search usage.

**Fix:** Require the rate limiter (see 1.2) on this route at minimum, and ideally gate it behind a real signal (paid order, admin key, or a server-issued token) rather than a client-side `sessionStorage` value. Consider dropping `web_search` if not essential.

### 1.2 audit-api Worker has no rate limiting on any endpoint
**Severity:** High (financial abuse / cost DoS / spam)
**Files:** `workers/audit-api/wrangler.toml` (no `[[unsafe.bindings]]` rate limiter), `workers/audit-api/index.js` (all routes)

The checkout Worker has a `CHECKOUT_RATE_LIMITER` binding (`workers/checkout/wrangler.toml`), but the audit-api Worker has none. Every expensive route is exposed unauthenticated:
- `POST /api/audit` — runs Anthropic + up to ~5 outbound fetches per call. Repeat-URL dedup exists (`index.js:1540`) but an attacker just varies the URL.
- `POST /api/audit/schema-forge` — see 1.1.
- `POST /api/newsletter` — unbounded DB writes.
- `POST /api/contact` — DB write **and** a transactional email to the admin per request (`index.js:1438-1466`) → inbox-flood / email-cost amplification.
- `POST /api/coupon/validate` (checkout Worker, `workers/checkout/index.js:52`) — one Stripe API call per request, enabling promo-code enumeration; not covered by the checkout rate limiter, which only runs on the main checkout path.

**Fix:** Add a `ratelimit` binding to `workers/audit-api/wrangler.toml` and apply `env.RATE_LIMITER.limit({ key: clientIp })` (keyed on `CF-Connecting-IP`) at the top of the POST handler for the audit/newsletter/contact/schema-forge routes. Add the rate-limit check to `/api/coupon/validate` in the checkout Worker as well.

### 1.3 Decap CMS loaded from a public CDN with a version range and no SRI
**Severity:** Medium-High (supply-chain → admin account/token compromise)
**File:** `public/admin/index.html:11`

```html
<script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
```

The `^3.0.0` range means the exact bytes served are not pinned, and there is no Subresource Integrity hash. The `/admin` route is deliberately exempted from the site CSP (`index.js:349-351`), so this third-party script runs with no CSP restriction — in the same context that holds a GitHub OAuth token with `repo` scope (see 3.2). A compromise of unpkg or the package would run arbitrary JS with access to that token.

**Fix:** Pin an exact version (`decap-cms@3.x.y`), add an `integrity="sha384-…"` + `crossorigin` attribute, or vendor the file into `public/admin/` and serve it first-party under the normal CSP.

---

## Priority 2 — High/medium impact, medium effort

### 2.1 SSRF filter can be bypassed via DNS rebinding and non-dotted-decimal IP encodings
**Severity:** Medium (SSRF to internal/metadata endpoints)
**File:** `workers/audit-api/index.js:391-446` (`validateAuditUrl`), `:450-464` (`safeFetch`)

`validateAuditUrl` blocks `localhost`, `.internal`/`.local`, and private IPs — but only when the host is a **literal dotted-decimal IPv4 or bracketed IPv6**. Two residual gaps:

1. **DNS rebinding / hostname-to-private-IP:** a normal domain name (e.g. `evil.example.com`) that resolves to `169.254.169.254`, `10.x.x.x`, or another internal address passes validation, because the check runs on the hostname string, not the resolved IP. `fetch()` then resolves and connects. Redirect hops are re-validated (good) but the *initial* resolution is not IP-checked.
2. **Alternate IP encodings:** hex-dotted forms like `http://0x7f.0x0.0x0.0x1` contain dots (so they pass the "must include a domain" check) but don't match the decimal-IPv4 regex (so the private-range check is skipped), then resolve to `127.0.0.1`. Octal forms behave similarly.

The blast radius on Cloudflare Workers is smaller than on a VM (no cloud metadata service on the same path), but internal/origin services reachable from the Worker's egress are still exposed.

**Fix:** After `new URL()`, reject hosts that parse as an IP in *any* base (normalise via a strict parser rather than a decimal-only regex). For defence against rebinding, prefer resolving the host and validating the resulting IP before fetch where the platform allows, or route outbound audit fetches through a proxy/binding that enforces an egress allowlist.

### 2.2 Admin-key comparison is not constant-time
**Severity:** Medium (timing side-channel on the admin credential)
**File:** `workers/audit-api/index.js:973`

```js
const adminKeyValid = !!env.ADMIN_KEY && submittedKey === env.ADMIN_KEY;
```

`===` on strings short-circuits on the first differing byte, leaking length/prefix information through response timing. The parallel JWT path already uses `crypto.subtle.verify` (constant-time); the admin key path should match. `ADMIN_KEY` unlocks full paid audits and all admin GET/POST endpoints, so it is worth protecting.

**Fix:** Compare with a timing-safe routine (the repo already has one — reuse the `timingSafeEqualStr` pattern from `workers/oauth-proxy/index.js:13`, or HMAC both sides and compare digests).

### 2.3 GitHub OAuth token is over-scoped for a blog CMS
**Severity:** Medium (excessive privilege if token leaks)
**File:** `workers/oauth-proxy/index.js:29`

```js
authUrl.searchParams.set("scope", "repo,user");
```

`repo` grants full read/write to **all** of the user's private and public repositories; the CMS only edits Markdown in `content/blog` of one repo. The token is passed to the browser via `postMessage` and held in the Decap session, so any XSS in `/admin` (see 1.3) exfiltrates a full-account repo token.

**Fix:** Use the least privilege Decap needs (`public_repo` if the content repo is public), or migrate to a GitHub App / fine-grained PAT scoped to the single repository and `contents` permission.

### 2.4 Paid audit results are protected only by an unguessable order ID (capability URL)
**Severity:** Low-Medium (broken access control if the ID leaks)
**File:** `workers/audit-api/index.js:1089-1131` (`GET /api/audit/results?orderId=…`)

Anyone who presents a valid `orderId` gets the full paid report. The ID is a random UUID (unguessable), but it travels in URLs (`?orderId=` links emailed to users, `src/App.jsx:694`) and `sessionStorage`, so it can leak via referrer headers, browser history, shared links, or logs — with no second factor (email match, signed token) to contain the exposure.

**Fix:** Bind report access to something the requester must also possess (e.g. require the associated email, or issue a short-lived signed token instead of a bare UUID in links). At minimum, set `Referrer-Policy: no-referrer` on report pages (the SPA currently uses `strict-origin-when-cross-origin`, `index.js:329`).

---

## Priority 3 — Lower impact / defence-in-depth

### 3.1 CSP allows `'unsafe-inline'` for scripts
**Severity:** Low-Medium (weakens XSS mitigation)
**File:** `index.js:313`

`script-src 'self' 'unsafe-inline' …` permits inline scripts, so the CSP would not stop an injected inline `<script>`. It is required today by the inline GTM bootstrap in `index.html:19`. Stored-XSS is currently mitigated at the source (blog HTML is sanitised at build, `scripts/generate-manifest.js:181`), but the CSP is not a backstop.

**Fix:** Move GTM to a nonce-based policy (`'nonce-…'` generated per response in the Worker) and drop `'unsafe-inline'`. Medium effort because the nonce must be injected into both the inline tag and the CSP header on every response.

### 3.2 Stripe `checkout.session.completed` handler doesn't confirm `payment_status`
**Severity:** Low
**File:** `workers/stripe-webhook/index.js:220-256`

The handler marks the order `paid` on receiving the event without checking `session.payment_status === 'paid'`. For asynchronous/delayed payment methods, `checkout.session.completed` can fire before funds settle. Card-only is configured today (`workers/checkout/index.js:170`), so the practical risk is low, but the check is cheap insurance.

**Fix:** Verify `session.payment_status === 'paid'` (and optionally that `amount_total` matches the expected price) before flipping status.

### 3.3 Upstream API error text is reflected to clients
**Severity:** Low (information disclosure)
**File:** `workers/audit-api/index.js:766`

```js
return { error: `Anthropic API error: ${response.status} — ${err}` };
```

Raw upstream error bodies are returned to the caller, which can expose internal detail. Other paths already return generic messages (e.g. schema-forge at `:1316`).

**Fix:** Log the detail server-side (`console.error`) and return a generic message to the client.

### 3.4 Contact/admin emails build HTML by string concatenation
**Severity:** Low (the risky fields are already escaped — keep it that way)
**Files:** `workers/audit-api/index.js:1452-1459` (escaped via `escHtml`), `:1200-1208` and `:1658-1666` (audit URL / customer email interpolated without escaping)

The contact email correctly runs user input through `escHtml`. The approval and review-notification emails interpolate `audit.url` / `body.url` / `order.email` directly into HTML. These originate from a validated URL and a validated email, so exploitability is low, but the pattern is inconsistent and a future change to validation could open HTML injection into the admin's mailbox.

**Fix:** Run every interpolated value through `escHtml` in all email templates.

### 3.5 Dependency freshness could not be verified in-environment
**Severity:** Informational
**File:** `package.json`, `package-lock.json` / `pnpm-lock.yaml`

`npm audit` is blocked by the network allowlist here, and the repo ships **both** `package-lock.json` and `pnpm-lock.yaml`, which can drift and resolve to different trees for different installers.

**Fix:** Run `npm audit` (or `pnpm audit`) in CI where the registry is reachable, and standardise on a single lockfile/package manager to keep the resolved dependency set deterministic.

---

## What's already done well

- **Stripe webhook:** signature verified with timing-safe compare and a replay-tolerance window; idempotency via `processed_events` with rollback on failure (`workers/stripe-webhook/index.js`).
- **SQL:** all D1 queries use bound parameters — no string-built SQL, so no SQL injection surface.
- **XSS at the source:** blog Markdown is rendered then run through `sanitize-html` at build time with an explicit tag/attribute allowlist (`scripts/generate-manifest.js:10-21`).
- **CF Access JWT validation:** refuses to validate unless both `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` are set, checks signature, `exp`, and `aud` (`workers/audit-api/index.js:17-76`).
- **OAuth proxy:** CSRF-protected via a `state` cookie compared timing-safely; `postMessage` is scoped to a fixed target origin (`workers/oauth-proxy/index.js`).
- **Security headers:** CSP, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `frame-ancestors 'none'` applied to responses (`index.js:311-344`).
- **Secrets hygiene:** no live keys committed; `.env.example` holds placeholders only; secrets are managed as Wrangler secrets.

---

## Suggested remediation order

| # | Finding | Impact | Effort |
|---|---------|--------|--------|
| 1 | 1.2 Add rate limiting to audit-api (covers 1.1) | High | Low |
| 2 | 1.1 Authenticate / gate `schema-forge` | High | Low |
| 3 | 1.3 Pin + SRI (or vendor) Decap CMS | Med-High | Low |
| 4 | 2.2 Constant-time admin-key compare | Med | Low |
| 5 | 2.3 Reduce GitHub OAuth scope | Med | Low-Med |
| 6 | 2.1 Harden SSRF (IP encodings + rebinding) | Med | Med |
| 7 | 2.4 Strengthen paid-report access control | Low-Med | Med |
| 8 | 3.2 Verify Stripe `payment_status` | Low | Low |
| 9 | 3.3 / 3.4 Generic errors + escape all email fields | Low | Low |
| 10 | 3.1 Nonce-based CSP, drop `'unsafe-inline'` | Low-Med | Med |
| 11 | 3.5 Wire up `audit` in CI, single lockfile | Info | Low |
