# Jernie — Dev Context

> Operational hub. Detailed context lives in supporting docs — load them only when the task requires.
> Last updated: April 13, 2026 — v0.4.0

---

## Who You're Talking To

Jeremy. Builder. Understands architecture. Tends to overthink — redirect him to action.
Give him the truth directly, even when it stings. Challenge assumptions before they become debt.
Don't be a cheerleader. Help him move. When planning is done, push toward execution.

---

## What You're Building

**Jernie** — personal travel guide PWA. POC: Maine Coast trip, May 22–29, 2026.
Main component: `src/Jernie-PWA.tsx` (exported as `MaineGuide` via `src/App.tsx`).
Firebase Realtime DB for shared state. `public/trip.json` for static content. Netlify deploy.

## Stack

Vite 5 + React 19 + TypeScript · Framer Motion · @dnd-kit · Firebase · vite-plugin-pwa (Workbox)
APIs: Open-Meteo (weather, 3hr cache) · Anthropic + web_search (flight status, 48hr guard)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/Jernie-PWA.tsx` | Main component — section layout, data loading, stop nav |
| `src/App.tsx` | Entry point |
| `src/design/tokens.ts` | Design token source of truth — colors, spacing, animation |
| `src/types.ts` | All TypeScript interfaces (Trip, Stop, Place, Booking, etc.) |
| `src/domain/trip.ts` | Pure domain helpers — weather, flights, places, stops, URLs |
| `src/hooks/useSharedTripState.ts` | Firebase sync + offline write queue (critical — read before editing) |
| `src/hooks/useTripData.ts` | Lightweight trip data access |
| `src/lib/firebase.ts` | Firebase initialization |
| `src/contexts/SheetContext.tsx` | Tracks open sheet count; StopNavigator consults before drag |
| `src/components/EditableItinerary.tsx` | Itinerary — drag-reorder, edit mode, custom items (919 lines — hotspot) |
| `src/components/TimelineItem.tsx` | Timeline cards — animation state, category chips, confirm logic (hotspot) |
| `src/components/TravelSection.tsx` | Bookings + hotel + flight rows (446 lines — hotspot) |
| `src/components/BottomSheet.tsx` | Swipe-dismiss sheet — reference impl for mountFrames pattern |
| `src/components/ScrollReveal.tsx` | Standard scroll-triggered entrance — wrap all below-fold cards |
| `netlify/functions/flight-status.js` | Anthropic API serverless function for flight status |
| `public/trip.json` | Trip content — must stay git-tracked; see content rules in DEPLOYMENT.md |
| `CLAUDE.md` | This file |

---

## Running Locally

```bash
npm run dev          # localhost:5173 (add --host for network access from other devices)
npm run build        # production build — must pass before any deploy
npm test             # vitest run (single pass — required before any PR to main)
npm run test:watch   # vitest watch mode (use during development)
npm run preview      # preview production build
```

---

## Git Rules — Non-Negotiable

These rules exist because ignoring them once caused 4 emergency hotfix PRs and permanent file loss.

1. Never commit to `main` or `dev` directly. Cut a feature branch from `dev` first.
2. New files: commit in the same session they're created — `git clean` will destroy untracked files permanently.
3. Before branch switch: commit first (WIP commit is fine); never use `git stash` during active work.
4. Before `git clean` or `git checkout .`: run the dry-run first (`git clean -nd`, `git status`).
5. `npm test` must pass before any PR to `main`.
6. Verify `public/trip.json` is tracked: `git ls-files public/trip.json`.
7. Never commit `.env` or secrets. `ANTHROPIC_API_KEY` lives in Netlify dashboard only.
8. Update `CLAUDE.md` in the same PR as any shipped feature, changed file, or new pattern.
9. Never run local dev with prod `VITE_TRIP_ID`. Local dev uses `dev-maine-2026`; prod value (`maine-2026`) is in Netlify dashboard only.
10. `trip.json` content is immutable in production. Schema additions (new fields) OK with diff review. Data/content changes (place names, descriptions, items) require explicit approval as a dedicated commit.

---

## Operational Principles

- **Offline-first:** all UI works offline; live data (weather, flight) shows last-cached value + timestamp
- **Token-driven:** all colors, spacing, animation via `src/design/tokens.ts` — no hardcoded hex
- **Scroll-reveal:** every discrete card or list item below the fold must be wrapped in `<ScrollReveal>` — this is a design language rule, not optional polish
- **mountFrames:** any component that mounts then animates in must chain `Animation.mountFrames` RAF calls before setting visible state — see `BottomSheet.tsx` for the pattern
- **No tech debt:** name shortcuts before taking them; present tradeoffs on ambiguous decisions
- **Build for Phase 2:** every decision assumes Expo migration; avoid PWA-only patterns

---

## Current Status & Known Issues

- **v0.3.0 shipped:** live PWA, all core features QA'd; current work is uncommitted refactoring
- **V1-Maine target:** May 15, 2026
- **Bug 1 (deferred):** colored bar visible at bottom of all screens on iOS (viewport-fit=cover)
- **No offline state indicator:** silent failure when refresh attempted without network
- **Flight status dedup:** navigating between stops can re-trigger fetches despite 48hr guard

---

## When to Read What

| Doc | Read when |
|-----|-----------|
| `ARCHITECTURE.md` | Adding major feature, refactoring state/API, mapping repo, choosing between design approaches, planning Expo migration |
| `DESIGN-SYSTEM-PLAN.md` | Building or modifying a component, animation patterns, scroll-reveal rules, token usage |
| `TESTING-NOTES.md` | Adding a test, understanding test philosophy, pre-deploy test run, identifying coverage gaps |
| `product.md` | Roadmap decisions, Phase 2 scope, product guardrails, v0.3.0 feature history, market context |
| `DEPLOYMENT.md` | Deploying to production, pre-deploy checklist, Netlify config, env vars, branch/release process |
