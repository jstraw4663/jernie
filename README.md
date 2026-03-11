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
restaurants, activities, maps tiles for the trip area) and nothing more. App size must stay
reasonable. We are not storing gigabytes on a user's device.

### 4. PWA today, Expo tomorrow — no migration debt
React and component architecture choices should be portable. Avoid PWA-specific patterns
that can't translate to React Native. Keep platform-specific logic isolated so it can be
swapped when we move to Expo.

### 5. No tech debt. No AI slop.
This is a real product with a real future. Every decision should reflect that. If something
feels like a shortcut, name it as such before proceeding. Jeremy understands architecture —
present options with tradeoffs on ambiguous decisions, don't make them unilaterally.

---

## Who I'm Talking To
Jeremy. Builder. Understands architecture. Tends to overthink — redirect him to action.
Give him the truth directly, even when it stings. Challenge assumptions before they become
debt. Don't be a cheerleader. Help him move.
