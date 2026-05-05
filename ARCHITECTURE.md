# Jernie — Architecture Reference

> Read this when: adding a major feature, refactoring state or API boundaries,
> mapping the repo, choosing between design approaches, or planning Phase 2 Expo migration.

---

## Architecture Principles — Non-Negotiable

### 1. Build for the migration, not just the moment
Every structural decision assumes we'll eventually move to a real backend (Supabase or Firebase),
a proper auth layer, and a native app shell. Migration = swap, not rewrite. If a shortcut today
makes that harder tomorrow, we don't take it.

### 2. Data structures must think relationally
Trip data is modeled as a relational DB: trips, stops, restaurants, activities, bookings as
separate concerns with clean foreign key relationships. User state (confirmations, packing,
custom items) is always separated from trip content. Content is shared. State belongs to the user.

### 3. Offline is a core feature, not an enhancement
A meaningful subset must work with zero connectivity. Cache what matters (itinerary, restaurants,
activities). Live data (weather, flight status) degrades gracefully to last-cached values with a
clear timestamp. App size stays reasonable.

### 4. PWA today, Expo tomorrow — no migration debt
React component choices must be portable to React Native. Keep platform-specific logic (service
workers, web manifest, CSS transitions) isolated so it can be swapped cleanly during migration.
`src/platform/` is the isolation point — **exists as of v0.7.0** (Google Places + AllTrails adapters). Phase 2 will wire live API calls.

### 5. No tech debt. No AI slop.
This is a real product with a real future. If something feels like a shortcut, name it before
proceeding. Present options with tradeoffs on ambiguous decisions — don't decide unilaterally.

### 6. Smart API calls — no gratuitous refreshes
All live data must be cache-first and proximity-triggered or user-initiated.
- Flight status: auto-fetch only within 48hr of departure; Refresh button otherwise
- Weather: 3-hour client-side cache; re-fetch only if stale
- Always show last-cached timestamp; never blank/spinner if cached data exists

---

## src/ Directory Map

```
src/
├── App.tsx                    Entry point → renders MaineGuide
├── Jernie-PWA.tsx             Main component: section layout, data loading, stop nav
├── types.ts                   All TypeScript interfaces (Trip, Stop, Place, Booking, etc.)
├── index.css                  Global styles (edge-to-edge, text-size-adjust fix)
├── design/
│   ├── tokens.ts              Design token source of truth — 5-layer hierarchy (Brand/Core/Semantic/TypeColors + compat aliases)
│   └── tripPacks.ts           Trip/stop color data (TRIP_PACKS) — source of truth for per-stop accent colors
├── domain/                    Pure helpers — no React, no side-effects, fully testable
│   ├── trip.ts                Weather, flights, places, stops, URLs
│   └── trip.test.ts           23 unit tests (Vitest, node env)
├── hooks/
│   ├── useSharedTripState.ts  Firebase sync + offline write queue
│   ├── useLongPress.ts        Cross-platform 500ms long-press
│   └── useTripData.ts         Lightweight trip data access
├── contexts/
│   ├── TripThemeContext.tsx    TripThemeProvider + useTripTheme() hook — per-stop color delivery
│   └── SheetContext.tsx       Tracks open sheet count; StopNavigator consults it
├── lib/
│   └── firebase.ts            Firebase initialization (reads VITE_FIREBASE_* env vars)
├── utils/
│   └── parseItemText.ts       Parses "Title · Blurb" format used in trip.json
├── assets/                    Static assets (images, SVGs)
└── components/                28 components — see hotspots + full list below
```

---

## Data Model

Trip content (`public/trip.json`) is static and structured relationally:
- **Trip** — container (name, dates, travelers, stops)
- **Stop** — city within the trip (id, city, dates)
- **Place** — restaurant or activity (stop-scoped, category, rating, links)
- **Booking** — hotel, flight, or reservation (stop-scoped, confirmation #, links)
- **ItineraryDay** — day container within a stop
- **ItineraryItem** — curated activity/meal entry (category, time, text)

User state (Firebase Realtime DB + localStorage):
- Confirmations, packing, itinerary order, custom items, reservation times
- `VITE_TRIP_ID` scopes all Firebase paths — dev and prod use separate paths

---

## Token System

Colors follow a 5-layer hierarchy. Each layer has a clear ownership boundary — never skip layers or mix concerns.

| Layer | Export | Purpose | Override? |
|-------|--------|---------|-----------|
| 1 — Brand | `Brand` | Global identity (navy, navySoft, gold) | Never |
| 2 — Core | `Core` | Neutral app foundation (bg, surface, border, text, white) | Never |
| 3 — Semantic | `Semantic` | Universal UI states (confirmed=gold, selected, saved, success, warning, error + tints) | Never |
| 4 — Type | `TypeColors` | Category taxonomy (flight, stay, food, bars, hike, activity, sight, shopping) | Never |
| 5 — Trip/Stop | `TripThemeContext` | Dynamic per-trip accent colors delivered via React context | Per-trip |

**Key rules:**
- `Semantic.confirmed` (#C89A2B gold) = completion language only. Never use it as a stop/trip accent.
- Semantic states are universal — trip packs cannot override them.
- Components in the Jernie tab consume stop colors via `useTripTheme()`. Overview uses `getStopTheme(tripId, stopId)` (standalone helper — renders multiple stops simultaneously, single context can't serve them).
- `Colors` and `IconColors` are kept as backwards-compat re-exports — don't add new usages.

**How to add a new trip pack:**
```ts
// src/design/tripPacks.ts
miami: {
  id: 'miami',
  trip: { primary: '#C0392B', secondary: '#E67E22' },
  stops: {
    southBeach: { primary: '#C0392B', tint: '#FCEAE8' },
    wynwood:    { primary: '#8E44AD', tint: '#F4E8FB' },
  },
},
// Stop IDs must match Stop.id values in trip.json exactly.
// Then pass tripId="miami" to TripThemeProvider. No component changes needed.
```

---

## Key Abstractions

| Abstraction | File | Purpose |
|---|---|---|
| `useSharedTripState` | `src/hooks/useSharedTripState.ts` | Firebase sync, offline write queue, null guards |
| `SheetContext` | `src/contexts/SheetContext.tsx` | Prevents stop swipe while any sheet is open |
| `TripThemeContext` | `src/contexts/TripThemeContext.tsx` | Per-stop accent color delivery; `getStopTheme()` for Overview |
| `ScrollReveal` | `src/components/ScrollReveal.tsx` | Standard scroll-triggered entrance for all below-fold cards |
| Design tokens | `src/design/tokens.ts` | 5-layer color hierarchy + spacing, animation — no hardcoded values |
| Trip packs | `src/design/tripPacks.ts` | Per-trip/stop color data; add new trips here, not in trip.json |
| Domain helpers | `src/domain/trip.ts` | Pure logic extracted for testability and Phase 2 portability |

---

## Hotspots — Read Before Editing

| File | Lines | Risk | Why |
|------|-------|------|-----|
| `src/components/EditableItinerary.tsx` | 919 | **CRITICAL** | Drag-reorder, edit mode, custom items, iOS scroll-anchor fix. Interdependent state. Every change risks itinerary UX regression. |
| `src/components/TimelineItem.tsx` | 498 | **HIGH** | Complex animation state, category chips, confirm/badge logic, scroll-driven entrance. |
| `src/components/TravelSection.tsx` | 446 | **HIGH** | Bookings, hotel, flight rows. Substantial new component (untracked as of April 13). |
| `src/Jernie-PWA.tsx` | 453 | **HIGH** | Main component: section rendering, data loading, stop nav, PIN unlock sequence. |
| `src/hooks/useSharedTripState.ts` | 258 | **HIGH** | Firebase sync with 6 `onValue` listeners, offline write queue, reconnection logic. One mistake = data loss. |
| `src/components/BottomSheet.tsx` | 287 | **MEDIUM** | Velocity-aware swipe dismiss, mountFrames pattern. Core interaction primitive. |

---

## Phase 2 Migration Readiness

**Portable now:**
- All components use React-only APIs (no DOM-specific patterns except where noted below)
- All styles use design tokens (no hardcoded CSS hex values)
- Domain helpers (`src/domain/trip.ts`) have no React or browser dependencies
- Data model in `trip.json` maps directly to relational DB tables

**Requires migration work:**
- CSS transitions → Reanimated 3
- `@dnd-kit` → react-native-reanimated + Gesture Handler
- `drag="x"` (StopNavigator) → `Gesture.Pan()` via Gesture Handler
- `localStorage` / `sessionStorage` → cross-platform abstraction
- Service worker → `expo-updates`
- `src/platform/` isolation point — not yet created; web-specific logic should move here before migration

---

## "Look Here First" Guide

| Task | Start here |
|------|-----------|
| Change itinerary behavior | `src/components/EditableItinerary.tsx` + `src/hooks/useSharedTripState.ts` |
| Add/modify a place card | `src/components/RestaurantCard.tsx` or `ActivityCard.tsx` + `src/design/tokens.ts` |
| Change stop navigation | `src/components/StopNavigator.tsx` + `src/contexts/SheetContext.tsx` |
| Change header behavior | `src/components/StickyHeader.tsx` |
| Add a bottom sheet or modal | `src/components/BottomSheet.tsx` (reference impl for mountFrames pattern) |
| Change Firebase state | `src/hooks/useSharedTripState.ts` — review all 6 `onValue` paths |
| Add a pure helper function | `src/domain/trip.ts` + add tests to `src/domain/trip.test.ts` |
| Change trip content | `public/trip.json` — **content changes require explicit approval; see DEPLOYMENT.md** |
| Change animation or style | `src/design/tokens.ts` + `DESIGN-SYSTEM-PLAN.md` |
| Add a new component | Check `DESIGN-SYSTEM-PLAN.md` for scroll-reveal + mountFrames rules first |
| Add stop/trip accent color | `src/design/tripPacks.ts` → consumed via `useTripTheme()` or `getStopTheme()` |
| Add a future trip pack | `src/design/tripPacks.ts` — see "Token System" section above for steps |
