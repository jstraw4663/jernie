# Jernie — Project Instructions

## The Vision
Jernie is a personal travel guide platform. Name: portmanteau of Jer + nie = Journey.
Tagline: "Your personal travel guide."

The goal is a product that makes any trip feel like you have a local expert in your pocket —
curated restaurants, hikes, logistics, and itineraries, all in one place, available even when
you're offline in the Maine backcountry or a canyon with no signal.

---

## The POC
A Maine Coast Trip Guide (May 22–29, 2026) for Jeremy, Jennie, Stacy, Justin, and Ford.
This is the proving ground. If the POC demonstrates the concept works and is worth building,
we pivot to the full product. Every decision made during the POC should serve that transition.

The POC is not a throwaway. It is the foundation.

---

## The Product (Where This Is Going)
- **Wizard-driven trip builder** — answer a few questions, get a full trip guide
- **Per-trip JSON config** — each trip is a structured data file, not hardcoded UI
- **LLM recommendation engine** — personalized suggestions based on trip context
- **Multi-user support** — per-user settings, confirmations, packing state
- **Cross-platform** — PWA today, Expo (React Native) for iOS + Android + Web from one
  codebase in the future

---

## Architecture Principles — These Are Non-Negotiable

### 1. Build for the migration, not just the moment
Every structural decision should assume we will eventually move to a real backend
(Supabase or Firebase), a proper auth layer, and a native app shell. The migration
should be a swap, not a rewrite. If a shortcut today makes that harder tomorrow, we
don't take the shortcut.

### 2. Data structures must think relationally
Trip data should be modeled as if it's already a relational database — trips, stops,
restaurants, activities, bookings as separate concerns with clean foreign key relationships.
User state (checkbox completions, confirmations, packing) is always separated from trip
content. Content is shared. State belongs to the user.

### 3. Offline is a core feature, not an enhancement
A meaningful subset of the app must work with zero network connectivity. This is a key
differentiator. Offline support must be scoped carefully — we cache what matters (itinerary,
restaurants, activities, and map tiles for the trip area) and nothing more. Live data (weather,
flight status) degrades gracefully to last-cached values with a clear timestamp. App size must
stay reasonable. We are not storing gigabytes on a user's device.

### 4. PWA today, Expo tomorrow — no migration debt
The POC ships as a PWA. After the Maine trip validates the concept, the next milestone is
migrating to Expo (React Native) for a single codebase that runs on iOS, Android, and Web.
React component and architecture choices must be portable. Avoid PWA-specific patterns that
can't translate to React Native. Keep platform-specific logic (service workers, web manifest)
isolated in a platform layer so it can be swapped cleanly during the Expo migration.

### 5. No tech debt. No AI slop.
This is a real product with a real future. Every decision should reflect that. If something
feels like a shortcut, name it as such before proceeding. Jeremy understands architecture —
present options with tradeoffs on ambiguous decisions, don't make them unilaterally.

---

## Platform Strategy: PWA → Full App

**Phase 1 — POC (Now):** PWA deployed via Netlify Drop. Single trip, single group.
Validates the concept and the data model. Every structural decision made here must
survive the migration intact.

**Phase 2 — Post-POC (Post-May 2026):** Migrate to Expo (React Native). One codebase
for iOS, Android, and Web. Introduce real auth (Supabase or Firebase), move trip data
from local JSON to a proper database, and add multi-user state management. The trip.json
schema designed in Phase 1 should map directly to DB tables with minimal transformation.

**Phase 3 — Product (Scale):** Wizard-driven trip builder, LLM recommendation engine,
group collaboration features, affiliate integrations, and SEO-driven content engine.

The PWA is a vehicle, not the destination. Build it like it's already Phase 2.

---

## Market Strategy

The travel planning market is $622.6B and structurally broken for the segment Jernie
serves. The competitive analysis reveals clear white space.

### The Problem We're Solving
The average traveler uses 5–8 apps per trip (Wanderlog, TripIt, Splitwise, WhatsApp,
Google Maps, PackPoint) because no single product handles the full lifecycle: collaborative
planning → booking consolidation → on-trip navigation → post-trip memory. The most
dangerous competitor isn't Wanderlog or any AI planner — it's the combination of
Google Docs + WhatsApp + Splitwise that groups default to because no single app has
given them a reason to consolidate.

### The White Space
No app today is purpose-built for 2–6 person multi-destination collaborative trip planning.
TripCase shut down April 2025. Travefy pivoted fully to B2B. AI-native planners generate
itineraries users edit 50–80% of and have ~2.8% Day-30 retention. The white space is
curation × collaboration × full lifecycle — none of the 25+ competitors has assembled it.

### Jernie's Key Differentiators
1. **Curation over AI novelty** — 60% of travelers prefer human-curated recommendations
   over AI-generated suggestions. The winning formula is AI for efficiency + curated,
   community-validated recommendations for trust. Pure AI is a commodity. Curation is a moat.
2. **Built for groups, not solo travelers** — collaboration, shared state, group invite loop.
   When one person subscribes, the whole group benefits. (See: Lambus model.)
3. **Full lifecycle, not single function** — plan → book → experience → remember in one
   product. Switching costs and retention compound over time.
4. **Offline first** — a meaningful subset of the app works with no connectivity. This is
   a genuine differentiator; Wanderlog gates offline behind a paywall.
5. **Viral by design** — every trip created generates 2–5 invitations. Group invite is the
   primary growth mechanism. Target viral coefficient > 0.7.

### Revenue Model (Long-Term)
- **Subscriptions (30–40%)** — predictable floor; group plan extends Pro to all members
- **Affiliate commissions (40–50%)** — hotels, activities, car rentals, travel insurance
- **Advertising (10–20%)** — free tier monetization

### The Positioning
"Notion for travel" — flexible, collaborative, beautiful, modular. But more opinionated than
Notion: structured trip templates, smart defaults for group size, integrated maps and expense
splitting. Notion templates are the competitive risk; Jernie must be 10x better for the
specific use case.

---

## Who I'm Talking To
Jeremy. Builder. Understands architecture. Tends to overthink — redirect him to action.
Give him the truth directly, even when it stings. Challenge assumptions before they become
debt. Don't be a cheerleader. Help him move.

## Market Analysis
https://claude.ai/public/artifacts/ba239b61-5b57-40a3-a865-d93fbe7688fc
