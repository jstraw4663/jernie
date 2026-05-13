# Jernie — Dev Context

> Operational hub. Detailed context lives in supporting docs — load them only when the task requires.
> Last updated: May 13, 2026 — v0.7.5

---

## Who You're Talking To

Jeremy. Builder. Understands architecture. Tends to overthink — redirect him to action.
Give him the truth directly, even when it stings. Challenge assumptions before they become debt.
Don't be a cheerleader. Help him move. When planning is done, push toward execution.

---

## What You're Building

**Jernie** — personal travel guide PWA. POC: Maine Coast trip, May 22–29, 2026.
Main component: `src/Jernie-PWA.tsx` (exported as `MaineGuide` via `src/App.tsx`).
Firebase Realtime DB for shared state. Firestore for enrichment cache. `public/trip.json` for static content. Netlify deploy.

## Stack

Vite 7 + React 19 + TypeScript · Framer Motion · @dnd-kit · Firebase (RTDB + Firestore) · vite-plugin-pwa (Workbox)
APIs: Open-Meteo (weather, 3hr cache) · Anthropic + web_search (flight status, 48hr guard) · Google Places (enrichment, 24hr Firestore cache)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/Jernie-PWA.tsx` | Main component — section layout, data loading, stop nav |
| `src/App.tsx` | Entry point |
| `src/design/tokens.ts` | Design token source of truth — colors, spacing, animation |
| `src/types.ts` | All TypeScript interfaces (Trip, Stop, Place, Booking, PlaceEnrichment, TrailEnrichment, etc.) |
| `src/domain/trip.ts` | Pure domain helpers — weather, flights, places, stops, URLs |
| `src/domain/airports.ts` | Airport code → name/city mapping |
| `src/domain/geo.ts` | Haversine distance helpers |
| `src/domain/hike.ts` | Hike difficulty/stat formatting helpers |
| `src/hooks/useSharedTripState.ts` | Firebase RTDB sync — delegates write queue to `src/lib/writeQueue.ts` |
| `src/hooks/useConnectivity.ts` | `{ isOnline, wasOffline }` — listens to online/offline events; React Native: swap window events for NetInfo |
| `src/hooks/useTripData.ts` | Lightweight trip data access |
| `src/hooks/useFirestoreEnrichment.ts` | Generic Firestore TTL-cache hook — session-guarded via `refreshScheduler`; skips external API when offline |
| `src/hooks/usePlaceEnrichment.ts` | Google Places enrichment per stop (ratings, photos, hours, reviews) |
| `src/hooks/useTrailEnrichment.ts` | Trail enrichment per stop (elevation, route type, dogs, features) |
| `src/hooks/useBookingEnrichment.ts` | User-editable booking fields from RTDB (check-in/out, room type, car type) |
| `src/lib/firebase.ts` | Firebase init — RTDB, Firestore, App Check, `authReady` promise |
| `src/lib/writeQueue.ts` | Persistent offline write queue — module-level singleton; `enqueue/enqueueMany/removeWhere/flush/subscribe`; React Native: swap localStorage in readRaw/persistRaw only |
| `src/lib/refreshScheduler.ts` | Session-level Firestore read guard — `shouldReadFirestore/markRead/invalidate`; 30min debounce prevents redundant `getDocs()` on tab remount |
| `src/utils/cacheAge.ts` | `formatCacheAge(cachedAt)` — pure formatter, zero deps, identical in React Native |
| `src/navigation.ts` | Module-level one-shot Explore deep-link signal + `FilterId` / `ExploreDeepLink` types |
| `src/contexts/NavigationContext.tsx` | `navigateToExplore(link)` context — AppShell provides, any screen consumes via `useNavigation()` |
| `src/contexts/SheetContext.tsx` | Tracks open sheet count; StopNavigator consults before drag |
| `src/contexts/ConnectivityContext.tsx` | `ConnectivityProvider` + `useConnectivityState()` — provides `{ isOnline, wasOffline, pendingWriteCount }`; owns queue flush on reconnect |
| `src/contexts/TripThemeContext.tsx` | `TripThemeProvider` + `useTripTheme()` hook — delivers stop/trip color theme to Jernie tab components; `getStopTheme()` standalone helper for Overview |
| `src/components/OfflineBanner.tsx` | Persistent offline banner below sticky nav — shows on `!isOnline` or `wasOffline`; amber=offline, green=reconnecting |
| `src/design/tripPacks.ts` | Trip/stop color data (`TRIP_PACKS`) — source of truth for per-stop accent colors; add new trips here, not in trip.json |
| `src/components/ItineraryBadge.tsx` | Shared gold-checkmark / blue-plus badge — used by RestaurantCard, ActivityCard, PlaceCarouselCard |
| `src/features/entityDetail/` | Full-height detail sheets — place, hike, hotel, flight, booking, rental car |
| `src/features/entityDetail/EntityDetailSheet.tsx` | Vaul sheet wrapper — z-index 300, anchors below sticky nav |
| `src/features/entityDetail/builders/` | One builder per entity type (buildPlaceDetailConfig, buildHikeDetailConfig, etc.) |
| `src/features/entityDetail/components/FloatingAddCTA.tsx` | Add-to-itinerary CTA anchored at the bottom of EntityDetail sheets — always visible above keyboard |
| `src/features/entityDetail/components/QuickActions.tsx` | Contextual quick-action row in EntityDetail (directions, call, website, etc.) |
| `src/features/explore/ExploreScreen.tsx` | Explore tab — carousels, search, filter, sort across all places |
| `src/features/overview/OverviewScreen.tsx` | Overview tab — trip-wide management grouped by type (flights, stays, rental car, restaurants, activities) |
| `src/features/overview/selectors.ts` | Pure grouping helpers — `groupFlightsByStop`, `groupAccommodationsByStop` (shared `StopBookingGroup` type + factory), `selectRentalCars`, etc. |
| `src/features/overview/OverviewAnchorNav.tsx` | Sticky horizontal category jump row with IntersectionObserver scroll tracking |
| `src/platform/` | Provider abstraction layer (Google Places, AllTrails) |
| `src/components/EditableItinerary.tsx` | Itinerary — drag-reorder, edit mode, custom items (hotspot) |
| `src/components/TimelineItem.tsx` | Timeline cards — animation state, category chips, confirm logic (hotspot) |
| `src/components/TravelSection.tsx` | Bookings + hotel + flight rows (hotspot) |
| `src/components/FlightGroupCard.tsx` | Consolidated flight card — one card per stop, shared gradient header (city + date), one row per flight booking (group label, route, times, status chip); each row taps to open detail sheet |
| `src/components/RentalCard.tsx` | Dedicated rental car booking card — navy header, CSS-grid h-timeline with car icon, context-aware pickup/drop-off footer label |
| `src/components/HotelGroupCard.tsx` | Consolidated hotel card — one card per stop, shared gradient header (city + date range), one row per accommodation booking (group label, hotel name, rating, amenity icons); each row taps to open detail sheet |
| `src/components/ConfirmTimeSheet.tsx` | Confirm/unconfirm bottom sheet with time input + AM/PM toggle — opened from TimelineItem |
| `src/components/NavigationSelectorSheet.tsx` | Map app picker sheet (Apple Maps / Google Maps / Uber) — opened from TimelineItem Navigate CTA |
| `src/design/ActionIcons.tsx` | Inline SVG icons: NavigateIcon, CheckmarkIcon, EllipsisIcon |
| `src/utils/mapNavigation.ts` | Shared map deep-link construction + fallback App Store launcher — used by QuickActions and NavigationSelectorSheet |
| `src/components/BottomSheet.tsx` | Swipe-dismiss sheet — reference impl for mountFrames pattern |
| `src/components/ScrollReveal.tsx` | Standard scroll-triggered entrance — wrap all below-fold cards |
| `netlify/functions/flight-status.js` | Anthropic API serverless function for flight status |
| `netlify/functions/place-details.js` | Google Places API proxy — requires `GOOGLE_PLACES_API_KEY` in Netlify dashboard |
| `netlify/functions/trail-details.js` | Static trail metadata for 6 Maine trails (Phase 1; no API key) |
| `firestore.rules` | Firestore security rules — deploy via `firebase deploy --only firestore:rules` |
| `database.rules.json` | RTDB security rules — deploy via `firebase deploy --only database` |
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

- **Offline-first:** all UI works offline; live data (weather, flight) shows last-cached value + timestamp. `OfflineBanner` appears below sticky nav when offline; pending writes shown as count. `ConnectivityContext` owns flush-on-reconnect.
- **Cache hierarchy (Firestore-first):** detail sheet → Firestore (persistent IndexedDB, instant, works offline) → external API via Netlify function (only if missing or stale) → write back with `cached_at`. TTL schedule: weather 3h, place/hotel enrichment 24h, trail 30d, flight localStorage 72h. Session guard (`refreshScheduler`) prevents redundant `getDocs()` on tab remount (30min debounce). `useFirestoreEnrichment` skips external API call when `!navigator.onLine`.
- **Write queue:** all RTDB writes go through `writeQueue.enqueue/enqueueMany` in `src/lib/writeQueue.ts`. Queue persists to localStorage (`jernie_write_queue`). React Native migration: swap storage adapter in `readRaw`/`persistRaw` only. Do not use direct `localStorage` for write queuing — always use the module.
- **Token-driven:** all colors, spacing, animation via `src/design/tokens.ts` — no hardcoded hex
- **Scroll-reveal:** every discrete card or list item below the fold must be wrapped in `<ScrollReveal>` — this is a design language rule, not optional polish. Screens with a custom `overflow:auto` scroll container (Overview, Explore, any non-window scroll) must pass `root={scrollRef}` and `margin="80px"` to `<ScrollReveal>` and `scrollRoot`/`revealMargin` to `<PlaceList>` — without `root`, the IO uses the browser viewport and fires on mount for all elements
- **mountFrames:** any component that mounts then animates in must chain `Animation.mountFrames` RAF calls before setting visible state — see `BottomSheet.tsx` for the pattern
- **Safe-area top:** every screen's sticky header must start with `<div style={{ height: 'env(safe-area-inset-top, 0px)' }} />` as its first child — content begins below the notch, same visual position as the compact date above the Jernie tab title. See `StickyHeader.tsx:90` and `ExploreScreen.tsx` for the pattern.
- **Safe-area bottom (BottomBar):** `env(safe-area-inset-bottom)` is ~34px on modern iPhones (home indicator). The BottomBar caps this at 5px via `min(env(safe-area-inset-bottom, 0px), 5px)` in `src/index.css` under `@media (display-mode: standalone)` — this only applies in PWA mode; Safari browser handles the safe area implicitly through the visual viewport. If moving or replacing the BottomBar, update both the `.bottom-bar-shell` padding rule in `index.css` AND the `OfflineBanner` bottom calc in `OfflineBanner.tsx` (which mirrors the same cap so the banner stays flush above the nav). The full `env(safe-area-inset-bottom)` (~34px) is Apple's recommended clearance; 5px is intentionally aggressive but tested and looks correct on device.
- **authReady:** all Firestore operations must await `authReady` from `src/lib/firebase.ts` before making any calls — prevents permission errors on first load before anonymous auth token propagates.
- **NavigationContext:** cross-tab navigation (e.g., Overview → Explore with filter) uses `useNavigation()` from `NavigationContext.tsx`; the one-shot payload travels via `navigation.ts` module state (safe because Explore remounts on tab switch via AnimatePresence key).
- **ItineraryBadge:** use `<ItineraryBadge>` from `components/ItineraryBadge.tsx` for all add-to-itinerary / view-detail badges; never inline badge button logic in card components.
- **ACTIVITY_CATEGORIES:** use the exported Set from `features/overview/selectors.ts` when filtering activities — never use `category !== 'restaurant'` (includes hotels).
- **useTripTheme():** components inside the Jernie tab must consume stop/trip accent colors via `useTripTheme()` from `TripThemeContext.tsx`. Overview (multiple stops rendered simultaneously) uses `getStopTheme(tripId, stopId)` standalone helper. All other components (cards, builders, sheets) call `resolveStopColor(stop)` from `tripPacks.ts` — this is the single call site for primary stop color with navy fallback. `Stop.accent` was removed from the type; stop colors live exclusively in `src/design/tripPacks.ts`.
- **Token layers:** `Brand` (global identity) → `Core` (neutral foundation) → `Semantic` (universal UI states, never overridden) → `TypeColors` (category taxonomy) → trip/stop (dynamic, via `TripThemeContext`). Gold (`Semantic.confirmed`) is completion language only — never used as a stop/trip accent.
- **Data split — trip.json vs Firestore vs RTDB:** trip.json = editorial identity (name, category, emoji, curator notes, must flag, hike metadata, itinerary schedule). Firestore = operational contact data (phone, addr, hours, website, rating, photos, reviews) fetched from Google Places, 24hr TTL. RTDB = live user state (reorder, time overrides, custom items, confirms). Never add phone to trip.json place objects — that belongs in Firestore enrichment. `addr` is the only contact field allowed in trip.json, and only for hike places (trailhead/parking address; AllTrails enrichment doesn't populate it).
- **DetailConfig.rating / ratingCount / price:** rendered directly in the body title area of `EntityDetail.tsx` (right-aligned, same row as title/subtitle) — not in the Info section. Set from enrichment in `buildPlaceDetailConfig.tsx`.
- **No tech debt:** name shortcuts before taking them; present tradeoffs on ambiguous decisions
- **Build for Phase 2:** every decision assumes Expo migration; avoid PWA-only patterns

---

## Current Status & Known Issues

- **v0.7.5 shipped:** Issue #80 — offline-first cache engine; `writeQueue.ts` portable queue module (replaces inline impl in `useSharedTripState`); `refreshScheduler.ts` 30-min session debounce for Firestore reads; `useConnectivity.ts` + `ConnectivityContext` + `OfflineBanner`; `cacheAge.ts` + "Updated X ago" on WeatherStrip + "Checked X ago" on FlightGroupCard; flight refresh button shows "Offline" when disconnected; `navigator.onLine` guard in `useFirestoreEnrichment`; `initializeConfirms()` seeds RTDB confirms for locked itinerary items; HotelGroupCard header "Stays" + inline room count + city subtitle; RentalCard car label inline + city subtitle; FlightGroupCard timeline row restructure + gate info + airline logo; 2 new trip.json places (Lucky Catch Lobstering, Glisten Oyster Farm); `booking_id` wired on 7 itinerary items
- **v0.7.4 shipped:** FlightGroupCard + HotelGroupCard + RentalCard — stop-grouped consolidated cards replacing per-booking cards; `Stop.accent` removed from type and trip.json, all color resolution now via `resolveStopColor(stop)` in `tripPacks.ts`; `StopBookingGroup` unified interface + `groupBookingsByStop` shared factory in selectors; `buildHotelDetailConfig` StayTimeline + AmenityPills; `buildRentalCarDetailConfig` JourneyTimeline, VehicleCard, Call/Navigate/Manage quick actions; `brandSupportPhone`/`brandAccountUrl`/`brandShortName` in brandAssets; `titleLogoUrl`/`externalUrlLabel` in DetailConfig; `pillVariant=soft` on DateTimeRangeModule; hotel amenities from Google Places API
- **v0.7.3 shipped:** TimelineItem redesign — CTA state machine (Confirm/Details/Navigate per trip phase + confirmed status); ConfirmTimeSheet + NavigationSelectorSheet new components; ActionIcons SVGs; mapNavigation util extracted from QuickActions; EditableItinerary slot-group headers + requestOpenDayId/requestScrollToItemId deep-link from Overview; PlaceMetaRow compact StarRating + subcategory; DayCard safe-area-aware scrollMarginTop
- **v0.7.2 shipped:** detail sheet rating/price in title area; `phone` removed from `Place` schema + all trip.json places; `addr` kept for hike trailheads only; data split enforced (editorial in trip.json, operational in Firestore)
- **v0.7.1 shipped:** 5-layer color token refactor — `Brand/Core/Semantic/TypeColors` in `tokens.ts`; Maine trip pack in `tripPacks.ts`; `TripThemeContext` + `useTripTheme()`; stop accent colors wired through StopsBar, TimelineItem, FloatingAddCTA, OverviewScreen
- **v0.7.0 shipped:** StopsBar/Trailhead (trail line, carved pill, scaling nodes); trail photos from AllTrails og:image (scraped on first enrichment, 30-day cache); FloatingAddCTA + QuickActions in EntityDetail; design system refresh across all components; flat shared Firestore enrichment; eager batch enrichment
- **v0.6.0 shipped:** Overview itinerary-only restaurant/activity filter; Overview → Explore deep-link navigation; Explore stop-filter pill row + carousel badge; Jernie tab 5-item cap + Explore More buttons; ItineraryBadge shared component; NavigationContext
- **v0.5.0 shipped:** Explore screen, EntityDetail system, enrichment pipeline, security hardening, PIN persistence fix
- **v1-Maine feature scope: COMPLETE** — Overview (#87), Search & Add / custom items (#43), drag-reorder (#63), offline engine (#80) all shipped; only open items are 2 tracked bugs below
- **V1-Maine target:** May 15, 2026
- **Bug 2 (deferred):** timeline node circles show correct stop accent color but white icon is missing — `NodeIcon` rendering needs investigation; likely `EntryIcon` kind discriminant not reached for the node icon path in `TimelineItem.tsx`
- **Bug 1 (deferred):** colored bar visible at bottom of all screens on iOS (viewport-fit=cover)
- **Flight status dedup:** navigating between stops can re-trigger fetches despite 48hr guard

---

## When to Read What

| Doc | Read when |
|-----|-----------|
| `ARCHITECTURE.md` | Adding major feature, refactoring state/API, mapping repo, choosing between design approaches, planning Expo migration |
| `DESIGN-SYSTEM-PLAN.md` | Building or modifying a component, animation patterns, scroll-reveal rules, token usage |
| `TESTING-NOTES.md` | Adding a test, understanding test philosophy, pre-deploy test run, identifying coverage gaps |
| `product.md` | Roadmap decisions, Phase 2 scope, product guardrails, feature history, market context |
| `DEPLOYMENT.md` | Deploying to production, pre-deploy checklist, Netlify config, env vars, branch/release process |
| `SECURITY.md` | Debugging auth/permission errors, adding Firebase collections or Netlify functions, reviewing security model, planning Phase 2 auth migration |
