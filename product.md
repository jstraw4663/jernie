# Jernie — Product

> Read this when: making roadmap-sensitive decisions, evaluating Phase 2 scope,
> referencing shipped features, or understanding market positioning.

---

## What It Is

**Jernie** — a personal travel guide platform. Name: portmanteau of Jer + nie = Journey.
Tagline: "Your personal travel guide."

The goal: make any trip feel like you have a local expert in your pocket — curated restaurants,
hikes, logistics, and itineraries, all in one place, available even when offline.

---

## The POC

Maine Coast Trip Guide, **May 22–29, 2026**, for Jeremy, Jennie, Stacy, Justin, and Ford.
This is the proving ground. If it demonstrates the concept works, we pivot to the full product.

**The POC is not a throwaway. It is the foundation.**

Every structural decision made during the POC must survive migration to Phase 2.

---

## Roadmap

### Phase 1 — POC (Now, V1-Maine milestone — target May 15, 2026)
PWA deployed via Netlify. Single trip, single group. Validates the concept and data model.

### Phase 2 — Product Foundation (H2 2026)
GitHub cleanup, trip.json API separation, email parser, map integration, notifications.

**Booking state reads** — add `onValue` listener for `trips/${tripId}/state/bookings/` in
`useSharedTripState`; merge with `trip.json` bookings so edits (room type, car type, etc.)
persist across sessions. Currently writes go to Firebase but UI reflects only trip.json values.

**API providers** — wire Google Places API (hotel amenities, phone number, hours); AllTrails
API (elevation gain, route type, difficulty); MapKit JS or a geocoding API for DistanceModule
address search with Haversine results on custom destinations.

### Phase 3 — Jernie as a Product (Q4 2026–Q1 2027)
Expo (React Native) migration — one codebase for iOS, Android, Web. Real auth (Supabase or
Firebase). Trip data moves from static JSON to a proper database. Multi-user state management,
wizard-driven trip builder, templates, mobile-native UX.

### Phase 4 — Scale (2027+)
LLM recommendation engine, group collaboration, affiliate integrations, SEO content engine,
social moments, marketplace.

---

## v0.5.0 — Shipped Features (April 22, 2026)

**Explore tab**
- Browse every place on the trip: restaurants, hikes, activities, hotels
- Horizontal carousels by theme — Stacy's Finds (pinned), Outdoor Adventures, Waterfront Dining, etc.
- Seeded 4-hour shuffle — carousel order is stable per session, rotates on next app open
- Search by name, filter by category, sort by distance / rating / name
- Wired into AppShell, replaces the Explore placeholder

**Entity detail sheets**
- Full-height vaul sheet for every entity type: place, hike, hotel, rental car, flight, booking
- DetailHero with photo carousel, DetailPhotoStrip, ReviewCarousel (Google reviews)
- DistanceModule (Haversine distance from stop coords), DetailMap (Google Maps embed)
- DateTimeRangeModule for check-in/out; rental car type picker
- Per-entity builders: buildPlaceDetailConfig, buildHikeDetailConfig, buildFlightDetailConfig, buildBookingDetailConfig, buildHotelDetailConfig, buildRentalCarDetailConfig

**Live enrichment**
- Google Places data (ratings, photos, hours, reviews, phone, address) via place-details Netlify function — 24hr Firestore cache
- Trail metadata (elevation, route type, dogs allowed, features) via trail-details Netlify function — static curated data for 6 Maine trails, 30-day Firestore cache
- useBookingEnrichment — user-editable booking fields (check-in/out, room type, car type) from Firebase RTDB

**Security hardening**
- Firebase App Check (reCAPTCHA v3) — protects all RTDB and Firestore operations
- Firestore security rules live: `request.auth != null && request.app.token.valid && cached_at is number`
- RTDB rules tightened: read/write require `auth != null`
- Origin header validation on all 3 Netlify functions
- `authReady` promise pattern in firebase.ts prevents Firestore calls before anonymous auth propagates
- SECURITY.md documents full threat model, rules, troubleshooting, and Phase 2 migration path

**PIN persistence fix**
- Unlock state moved from sessionStorage to localStorage with 24hr TTL
- Fixes iOS re-showing PIN gate on every app switch (iOS clears sessionStorage when PWA is backgrounded)

**Infrastructure**
- 2 new Netlify functions: place-details (Google Places proxy), trail-details (static trail data)
- Firebase CLI config: .firebaserc, firebase.json — enables `firebase deploy` for rules
- Platform layer (src/platform/): provider abstraction for Google Places + AllTrails
- Asset library: public/assets/aircraft/ (40+ webp), public/assets/cars/ (12 jpg)

## v0.4.0 — Shipped Features (April 22, 2026)

Component refactor, domain layer, Vitest suite, documentation architecture.
(See git log for details — no product-facing changes.)

---

## v0.3.0 — Shipped Features (April 8, 2026)

**Core UX**
- Tabs: Portland / Bar Harbor / Southwest Harbor
- PIN gate (0824 — "Happy Birthday Ford")
- Live weather per stop (Open-Meteo, 3-hour cache)
- Live flight status (Anthropic API + web_search, 48hr proximity guard)
- Confirmed / bookNow / alert badges + Confirm toggle (Firebase, real-time sync)

**Itinerary**
- Drag-and-drop itinerary reordering (within-day and cross-day, @dnd-kit)
- Custom itinerary items (add, edit, delete, move — stored in Firebase)
- Soft time labels on drag ("Morning", "Afternoon", "Evening" — midpoint inference)
- Reservation time prompt on Confirm — saves time sub-label, editable, auto-formats "700" → "7:00 PM"
- Add-to-itinerary from PlaceCard (AddToItinerarySheet — BottomSheet day picker)
- Edit Mode — long-press any item → BottomSheet with multi-select, drag reorder, delete, move day
- Category badges on custom items (10 types, token colors)

**Places**
- Restaurants (must/also, Stacy pill, price tier, emoji)
- Activities (AllTrails badges on hikes, difficulty/distance/duration chips, grouped Bar Harbor)
- Tide chart links

**Travel section**
- Hotel links (website, Maps, confirmation #s)
- Booking cards with confirmation #s
- Flight rows + status badges
- Collapsible section layout

**Design System (S1–S5)**
- Token-driven design: all colors, spacing, animation via `src/design/tokens.ts`
- StickyHeader: scroll-driven title compression (24px→17px), always-visible dates
- StopNavigator: swipe between stops, parallax, 45% threshold, elastic bounce
- DayCard: Framer Motion height:auto expand, springs.lazy, iOS scroll-anchor fix
- BottomSheet: velocity-aware swipe dismiss, safe-area insets, mountFrames pattern
- TimelineItem: timeline-style cards, category chips, animated dot/connector, confirm swap
- ScrollReveal: standard scroll-triggered entrance for all below-fold cards
- Card design language: surfaceRaised bg, layered shadow, 3px accent border, token typography

**Offline + PWA**
- Service worker (vite-plugin-pwa, Workbox) — full offline load after first visit
- localStorage write queue (`jernie_write_queue`) — Firebase writes survive offline, flush on reconnect
- Active stop persisted to sessionStorage — survives iOS PWA cold-start reloads

**What to Pack**
- 6 categories, ~41 items, Firebase real-time sync

**Countdown**

---

## Market Context

The travel planning market is $622.6B. The white space: no app is purpose-built for
2–6 person multi-destination collaborative trip planning.

- TripCase shut down April 2025
- Travefy pivoted fully to B2B
- AI-native planners: ~2.8% Day-30 retention; users edit AI itineraries 50–80%
- Most dangerous "competitor": Google Docs + WhatsApp + Splitwise (groups default to this)

### Key differentiators
1. **Curation over AI novelty** — 60% of travelers prefer human-curated recommendations
2. **Built for groups** — collaboration, shared state, group invite loop; one subscriber benefits the whole group
3. **Full lifecycle** — plan → book → experience → remember in one product
4. **Offline first** — free, always, no paywall (Wanderlog gates offline behind a paywall)
5. **Viral by design** — every trip created generates 2–5 invitations; target viral coefficient > 0.7

### Revenue model (long-term)
- Subscriptions (30–40%) — predictable floor; group plan extends Pro to all members
- Affiliate commissions (40–50%) — hotels, activities, car rentals, travel insurance
- Advertising (10–20%) — free tier monetization

---

## Product Guardrails for Claude

- This is a real product with a real future. Every decision should reflect that.
- When choosing between "works for now" and "works for Phase 2", default to Phase 2.
- Don't introduce patterns that only make sense as a PWA if they'll be a liability in Expo.
- Don't add features not on the roadmap without flagging them as out of scope.
- Keep the data model relational — don't flatten or denormalize for convenience.
- Offline support is non-negotiable — don't ship a feature that silently fails offline.

---

## Known Active Risks

- **Bug 1 (deferred)** — Colored bar visible at bottom of every screen on iOS (viewport-fit=cover + position:fixed interaction). Deferred past V1-Maine deploy.
- **No offline state indicator** — Silent failure when weather/flight refresh is attempted without network.
- **Flight status in-session dedup** — 48hr proximity guard exists but navigating between stops can re-trigger fetches. Needs investigation.
