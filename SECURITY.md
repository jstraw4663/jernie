# Jernie — Security Architecture

> Read this when: debugging auth or Firebase permission errors, reviewing security configuration,
> adding new Firebase collections or Netlify functions, or planning Phase 2 migration.
> Last updated: 2026-04-22

---

## Threat Model

Jernie is a personal travel guide PWA shared among a small group of travel companions. It is not a public-facing SaaS. The realistic threats are:

- **Itinerary vandalism** — a stranger modifying trip data after discovering the trip ID in the JS bundle
- **API quota abuse** — someone calling Netlify functions (Google Places, Anthropic) to exhaust quotas or run up bills
- **Enrichment cache corruption** — writing bad data to Firestore to poison place/trail details
- **Data exposure** — trip data (itinerary, bookings, hotel info) readable by anyone

Not in scope: data exfiltration by sophisticated attackers, DDoS, supply chain attacks.

---

## Authentication

### Anonymous Auth

The app uses Firebase Anonymous Authentication — no login UI, no user accounts. On every page load, `signInAnonymously()` is called automatically in `src/lib/firebase.ts`. Firebase persists the anonymous session in localStorage, so returning visitors reuse the same UID.

Anonymous auth satisfies `request.auth != null` rules without requiring users to log in. It is NOT a substitute for real user identity — any visitor to the site gets an auth token. The real protection comes from App Check (see below).

### `authReady` Pattern

Firestore operations must not run before the anonymous auth token is established. `firebase.ts` exports a `authReady` promise that resolves only after `onAuthStateChanged` fires with a non-null user. All Firestore hooks (`useFirestoreEnrichment`, `useBookingEnrichment`) await this before making any Firestore calls.

```typescript
// src/lib/firebase.ts
export const authReady: Promise<void> = new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) { unsubscribe(); resolve(); }
  });
  signInAnonymously(auth).catch(() => resolve());
});
```

**Why `onAuthStateChanged` and not the `signInAnonymously` promise?**
The `signInAnonymously` promise resolves when `auth.currentUser` is set, but the Firestore SDK propagates auth tokens via its own internal `onAuthStateChanged` listener. Awaiting the sign-in promise directly leaves a window where `auth.currentUser` is set but Firestore hasn't applied the token yet, causing permission errors on first load.

---

## Firebase App Check

App Check validates that requests come from your actual deployed app, not from scripts, curl, or other sites. It wraps every Firebase request with a short-lived token signed by reCAPTCHA v3.

### How it works

1. On page load, `initializeAppCheck()` in `firebase.ts` initializes App Check with the reCAPTCHA v3 site key
2. Firebase SDK automatically attaches App Check tokens to all Firestore and RTDB requests
3. Firebase validates the token server-side before evaluating security rules
4. Requests without a valid token are rejected before rules run

### Configuration

| Setting | Value | Where |
|---------|-------|-------|
| Provider | reCAPTCHA v3 | Firebase App Check console |
| Site key | `VITE_RECAPTCHA_SITE_KEY` | `.env` + Netlify dashboard |
| App ID | `VITE_FIREBASE_APP_ID` | `.env` + Netlify dashboard |
| RTDB enforcement | Enabled | Firebase console (App Check → APIs → Enforce) |
| Firestore enforcement | Via rules (`request.app.token.valid`) | `firestore.rules` |

### Local Dev Debug Token

reCAPTCHA v3 doesn't work on non-public IP addresses (Tailscale dev server). In dev mode, App Check uses a pre-registered debug token instead:

```typescript
if (import.meta.env.DEV) {
  (globalThis as any).FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
}
```

The debug token (`VITE_APPCHECK_DEBUG_TOKEN`) is registered in Firebase console → App Check → your app → Manage debug tokens. It must **never** be added to Netlify dashboard or any production environment.

**Confirming App Check is working locally:** the RTDB long-polling URL in the Network tab will include `&ac=eyJ...` — a JWT whose payload contains `"provider":"debug"`. The console will also log `App Check debug token: <uuid>` on every load (informational only — it logs this even when the token is already registered).

---

## Firebase Security Rules

### Realtime Database (`database.rules.json`)

```json
{
  "rules": {
    "trips": {
      "$tripId": {
        ".read":  "auth != null",
        ".write": "auth != null"
      }
    },
    ".read":  false,
    ".write": false
  }
}
```

- **Read** requires anonymous auth (auto-established on page load)
- **Write** requires anonymous auth — App Check enforcement at the service level (enabled in Firebase console) adds the real protection; a write without a valid App Check token is rejected before rules are evaluated
- Root is fully locked — only `trips/*` is accessible
- Deploy: `firebase deploy --only database`

### Firestore (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /place_enrichment/{tripId}/{document=**} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null
                   && request.app.token.valid
                   && request.resource.data.cached_at is number;
    }
    match /trail_enrichment/{tripId}/{document=**} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null
                   && request.app.token.valid
                   && request.resource.data.cached_at is number;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- `request.app.token.valid` — Firestore's native App Check check (different syntax from RTDB)
- `cached_at is number` — prevents malformed writes from corrupting TTL logic
- `{document=**}` recursive wildcard covers all subcollections (e.g. `place_enrichment/{tripId}/bookings/`)
- All other collections are fully locked by the catch-all rule
- Deploy: `firebase deploy --only firestore:rules`

---

## Netlify Function Protection

All three serverless functions (`place-details.js`, `flight-status.js`, `trail-details.js`) validate the HTTP `Origin` header:

```js
const origin = event.headers.origin || '';
const allowed = new Set(['http://100.123.229.87:8888', 'http://localhost:8888', process.env.URL].filter(Boolean));
if (origin && !allowed.has(origin)) {
  return { statusCode: 403, body: 'Forbidden' };
}
```

- `process.env.URL` is automatically set by Netlify to the production site URL on every deploy
- `origin && ...` — empty Origin is allowed because same-origin browser fetch requests may omit it
- Blocks requests from other domains and simple curl abuse that sets a foreign Origin
- Does not block a determined attacker who spoofs the Origin header — the defense-in-depth layer for that is App Check on Firebase and API key restrictions on Google Cloud

**API keys in functions:**
- `GOOGLE_PLACES_API_KEY` — server-side only, never in client bundle, stored in `.env` and Netlify dashboard
- `ANTHROPIC_API_KEY` — server-side only, Netlify dashboard only (never in `.env`)

---

## Client-Side API Keys

Some keys must be in the client bundle by design:

| Key | Env var | Why it's client-side | Protection |
|-----|---------|---------------------|------------|
| Firebase config | `VITE_FIREBASE_*` | Firebase Auth, RTDB, Firestore SDK | App Check + security rules |
| Google Maps Embed | `VITE_GOOGLE_MAPS_KEY` | Maps Embed API requires browser key | HTTP referrer restricted in Google Cloud Console to production domain only |
| reCAPTCHA site key | `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 requires public site key | By design — site keys are public |

Keys that must **never** be in the client bundle: `GOOGLE_PLACES_API_KEY`, `ANTHROPIC_API_KEY`, `VITE_APPCHECK_DEBUG_TOKEN`.

---

## Security Headers

Set via `netlify.toml` — active on all production responses:

| Header | Value | Protects against |
|--------|-------|-----------------|
| `X-Frame-Options` | `DENY` | Clickjacking — prevents the app being embedded in iframes on other sites |
| `X-Content-Type-Options` | `nosniff` | MIME-type sniffing attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | URL leakage — sends origin only (no path) to third parties |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS for 1 year after first visit |

Note: Content-Security-Policy is not set. The combination of reCAPTCHA v3 iframes, Firebase long-polling iframes, Google Maps embeds, and AllTrails embeds makes a safe CSP complex to configure without breaking the app. Deferred to Phase 2.

---

## Environment Separation

Dev and prod share one Firebase project, separated by `VITE_TRIP_ID`:

| Environment | `VITE_TRIP_ID` | Firebase RTDB path | Firestore path |
|-------------|---------------|-------------------|----------------|
| Local dev | `dev-maine-2026` | `trips/dev-maine-2026` | `place_enrichment/dev-maine-2026/...` |
| Production | `maine-2026` | `trips/maine-2026` | `place_enrichment/maine-2026/...` |

**Never set `VITE_TRIP_ID=maine-2026` locally** — dev writes will pollute production data.

Known limitation: both environments share Firestore quotas and billing. A separate Firebase project for dev is the correct long-term fix (tracked as a Medium risk item from the security audit, deferred until Phase 2 to avoid migration complexity before the Maine trip).

---

## Troubleshooting

### `Missing or insufficient permissions` on Firestore

1. **Anonymous auth hasn't resolved yet** — check that the hook is awaiting `authReady` before calling `getDocs`/`setDoc`. Both `useFirestoreEnrichment.ts` and `useBookingEnrichment.ts` must import `authReady` from `firebase.ts`.
2. **Anonymous Auth disabled** — check Firebase console → Authentication → Sign-in providers → Anonymous is enabled.
3. **Wrong collection name** — check the `rootCollection` and `subcollection` options match the paths in `firestore.rules`.

### App Check `apps/undefined` error

`VITE_FIREBASE_APP_ID` is missing from `.env`. App Check requires the app ID to identify which registered app is requesting a token. Add the App ID from Firebase console → Project settings → Your apps → Web app.

### App Check 400 on debug token exchange

The debug token (`VITE_APPCHECK_DEBUG_TOKEN`) is not registered in Firebase console. Go to App Check → your app → Manage debug tokens and add the token value.

### RTDB `Invalid appcheck token` warning

App Check enforcement for Realtime Database was just enabled — it can take up to 15 minutes to activate. Also check that `VITE_FIREBASE_APP_ID` is set (see above).

### Netlify function returns 403

The request has an `Origin` header that isn't in the allowed list. For local dev, ensure you're accessing via `100.123.229.87:8888` or `localhost:8888`. For production, `process.env.URL` must match your Netlify site URL exactly (Netlify sets this automatically).

### `signInAnonymously` returns 400

Anonymous Authentication is not enabled in the Firebase console. Go to Authentication → Sign-in providers → Anonymous → Enable.

---

## Security Audit Log — 2026-04-22

Changes made during initial security hardening pass:

| # | Change | File(s) | Severity addressed |
|---|--------|---------|-------------------|
| 1 | Created Firestore security rules | `firestore.rules`, `firebase.json` | Critical |
| 2 | Fixed auth race — `authReady` uses `onAuthStateChanged` | `src/lib/firebase.ts` | Critical |
| 3 | Added `await authReady` to Firestore hooks | `useFirestoreEnrichment.ts`, `useBookingEnrichment.ts` | Critical |
| 4 | Enabled Anonymous Auth in Firebase console | Firebase console | Critical |
| 5 | Tightened RTDB read rule from `true` to `auth != null` | `database.rules.json` | High |
| 6 | Added origin check to all Netlify functions | `flight-status.js`, `place-details.js`, `trail-details.js` | High |
| 7 | Integrated Firebase App Check (reCAPTCHA v3) | `src/lib/firebase.ts`, `firestore.rules`, `database.rules.json` | High |
| 8 | Added `appId` to Firebase config | `src/lib/firebase.ts`, `.env` | High |
| 9 | Added `VITE_FIREBASE_APP_ID` and `VITE_RECAPTCHA_SITE_KEY` to Netlify | Netlify dashboard | High |
| 10 | Added `.firebaserc` with default project | `.firebaserc` | Ops |
| 11 | Added security headers to Netlify | `netlify.toml` | Low |
| 12 | Verified `VITE_GOOGLE_MAPS_KEY` is HTTP-referrer restricted | Google Cloud Console | Medium |
| 13 | Added dev IP to Maps key allowed referrers | Google Cloud Console | Ops |

Open issues:
- **Separate Firebase project for dev** — deferred; shared project is acceptable for Phase 1 Maine trip
- **Content Security Policy** — deferred; requires careful tuning around reCAPTCHA/Firebase/Maps iframes
- **Phase 2 auth migration** — tracked in GitHub issue #73

---

## Phase 2 Security Migration

When Jernie migrates to Expo with provider-based login (Google/Apple/Facebook):

1. **Replace `signInAnonymously`** with `GoogleAuthProvider` / `OAuthProvider` in `firebase.ts`. Remove the `authReady` promise — Firebase SDK handles auth state natively.

2. **Update Firebase rules** to scope access to the trip owner's UID:
```json
{
  "rules": {
    "trips": {
      "$tripId": {
        ".read":  "auth != null && root.child('tripOwners').child($tripId).val() == auth.uid",
        ".write": "auth != null && root.child('tripOwners').child($tripId).val() == auth.uid"
      }
    }
  }
}
```

3. **Re-evaluate App Check** — with real user auth, App Check becomes optional. reCAPTCHA v3 may be worth keeping for API abuse prevention, but is no longer the primary auth protection.

4. **Add trip sharing model** — `tripOwners/{tripId}` maps trip IDs to owner UIDs. `tripMembers/{tripId}/{uid}` grants read-only access to companions.

Full spec in GitHub issue #73.
