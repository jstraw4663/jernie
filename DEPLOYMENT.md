# Jernie — Deployment Guide

> Read this when: deploying to production, running the pre-deploy checklist,
> reviewing Netlify config, or working with environment variables.

---

## Deployment Flow

```
local build + test → user approval → push to dev → PR to main → Netlify auto-deploys
```

1. Build and test locally: `npm run build` + `npm test`
2. Verify locally at `localhost:5173` (`npm run dev`) or `npm run preview`
3. **Get explicit approval from Jeremy before touching git push or GitHub**
4. Push feature branch → PR to `dev` first
5. After validation, PR `dev` → `main`
6. Netlify detects the `main` push and auto-deploys — no manual trigger needed

**Never auto-deploy. Never push to main without explicit go-ahead.**

---

## Pre-Deploy Checklist

Run through every item before creating a PR to `main`:

1. **`npm run build`** — must pass cleanly (TypeScript compile + Vite bundle, no errors)
2. **`npm test`** — all 23 tests must pass (exit code 0)
3. **`git ls-files public/trip.json`** — must output `public/trip.json` (Netlify build requires it)
4. **`git status`** — no untracked files that should be committed; no accidental `.env` staged
5. **`CLAUDE.md` is current** — reflects every shipped feature, changed file, or new pattern in this PR
6. **Review `trip.json` diff** — if `trip.json` changed, confirm it's a schema addition (OK) not a content/data change (requires explicit approval — see below)
7. **Netlify env vars match** — confirm `VITE_TRIP_ID=maine-2026` and `ANTHROPIC_API_KEY` are set in Netlify dashboard (not the dev values)
8. **Never push directly to `main`** — always PR from feature branch or dev

---

## trip.json — Production Content Protection

`public/trip.json` holds the actual trip data: place details, itinerary items, restaurant info,
booking details, flight info.

- **Schema/structural changes** (adding a new JSON field, new section type, schema evolution) — OK to deploy; review the diff before merging.
- **Content/data changes** (place names, descriptions, addresses, itinerary text, reservation details) — **must NOT be deployed via a code push.** Production trip data is immutable unless Jeremy explicitly approves a dedicated content update commit.

When in doubt: flag the `trip.json` diff and ask before merging.

---

## Firebase Data Isolation

Dev and prod use **separate Firebase Realtime DB paths**, scoped by `VITE_TRIP_ID`:

| Environment | VITE_TRIP_ID | Firebase path |
|---|---|---|
| Local dev (`.env`) | `dev-maine-2026` | `/trips/dev-maine-2026/...` |
| Production (Netlify) | `maine-2026` | `/trips/maine-2026/...` |

**Rules:**
- Never run `npm run dev` with `VITE_TRIP_ID=maine-2026` — dev writes go to prod Firebase.
- The prod value (`maine-2026`) lives in the Netlify dashboard only — never in `.env` or committed to git.
- Before merging to `main`, confirm Netlify dashboard has `VITE_TRIP_ID=maine-2026`.

---

## Environment Variables

### Local dev (`.env` — gitignored, never commit)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_TRIP_ID=dev-maine-2026
VITE_FLIGHT_STATUS_URL=http://localhost:8888/.netlify/functions/flight-status
```

### Production (Netlify dashboard — never in git)
```
VITE_FIREBASE_*       same Firebase project as dev
VITE_TRIP_ID          maine-2026
VITE_FLIGHT_STATUS_URL  (not set — defaults to /.netlify/functions/flight-status)
ANTHROPIC_API_KEY     required for flight-status serverless function
```

---

## Netlify Configuration

**`netlify.toml`:**
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

**`public/_headers`** — prevents CDN from caching service worker files:
```
/sw.js
  Cache-Control: no-cache, no-store, must-revalidate
/workbox-*.js
  Cache-Control: no-cache, no-store, must-revalidate
```
Without this, stale `sw.js` means browsers never discover new deployments.

**Netlify functions:**
- `netlify/functions/flight-status.js` — calls Anthropic API with `web_search` tool to fetch live flight status. Requires `ANTHROPIC_API_KEY` in Netlify dashboard.

---

## Service Worker Behavior

- `registerType: 'prompt'` — new service worker waits; app does NOT auto-reload on deploy.
- After a deploy, users will see a prompt to reload. This is intentional.
- Pre-caches: all `.js`, `.css`, `.html`, `.ico`, `.png`, `.svg`, `.json`, `.woff2` on first load.
- Runtime cache: `trip.json` uses `StaleWhileRevalidate` — serves cached version instantly, revalidates in background.

---

## Post-Deploy Verification

After Netlify shows a successful build:
- [ ] Live site loads and responds correctly
- [ ] Test on mobile (PWA install prompt, offline behavior)
- [ ] Clear browser cache + reload to trigger SW update prompt
- [ ] Test offline: DevTools → Network → Offline → reload — app should load from cache
- [ ] Confirm Firebase writes go to `maine-2026` path (not dev path)

---

## npm Scripts Reference

```bash
npm run dev          # dev server at localhost:5173 (add --host for network access)
npm run build        # tsc -b && vite build → dist/
npm run preview      # preview production build locally
npm test             # vitest run (single pass — use before any PR to main)
npm run test:watch   # vitest (watch mode — use during development)
npm run lint         # eslint
```
