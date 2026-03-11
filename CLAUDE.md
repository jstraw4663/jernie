# Jernie — Project Intelligence

> This file is the single source of truth for AI context across Claude Code and Claude Web.
> Repo: https://github.com/jstraw4663/jernie
> Last updated: March 2026

---

## Who You're Talking To

Jeremy. Builder. Understands architecture. Tends to overthink — redirect him to action.
Give him the truth directly, even when it stings. Challenge assumptions before they become
debt. Don't be a cheerleader. Help him move. When planning is done, push toward execution.

---

## The Product

**Jernie** — a personal travel guide platform.
Name: portmanteau of Jer + nie = Journey.
Tagline: "Your personal travel guide."

The goal is a product that makes any trip feel like you have a local expert in your pocket —
curated restaurants, hikes, logistics, and itineraries, all in one place, available even when
offline in the Maine backcountry or a canyon with no signal.

---

## The POC

A Maine Coast Trip Guide (May 22–29, 2026) for Jeremy, Jennie, Stacy, Justin, and Ford.
This is the proving ground. If the POC demonstrates the concept works and is worth building,
we pivot to the full product. Every decision made during the POC should serve that transition.

**The POC is not a throwaway. It is the foundation.**

### Current tech stack
- Vite 5 + React 18 + TypeScript
- Single component: `src/Jernie-PWA.tsx` (exported as `MaineGuide`, wired via `src/App.tsx`)
- Trip data: `trip.json` at project root
- PWA with manifest, `sw.js`, lobster icon, navy theme (`#0D2B3E`)
- Deployed via Netlify Drop
- PIN gate: `0824` ("Happy Birthday Ford")

### APIs in use
- Live weather: Open-Meteo
- Live flight status: Anthropic API + `web_search` tool
- `localStorage` for confirm toggles and packing checklist

### Features shipped (QA)
- Tabs: Portland / Bar Harbor / Southwest Harbor
- Live weather + flight status with refresh
- Collapsible Travel section (hotel website links, Maps, confirmation #s)
- Leg summaries and daily itinerary (collapsible)
- Confirmed / bookNow / alert badges + Confirm toggle (localStorage)
- Restaurants (must/also, Stacy pill, price, emoji)
- Activities (AllTrails badges on hikes, grouped Bar Harbor)
- What to Pack (6 categories, ~41 items, localStorage)
- Tide chart links
- Countdown

---

## The Product Vision (Where This Is Going)

**Phase 1 — POC (Now):** PWA deployed via Netlify. Single trip, single group.
Validates the concept and data model. Every structural decision must survive migration.

**Phase 2 — Post-POC (Post-May 2026):** Migrate to Expo (React Native). One codebase
for iOS, Android, and Web. Introduce real auth (Supabase or Firebase), move trip data
from local JSON to a proper database, add multi-user state management. The `trip.json`
schema designed in Phase 1 should map directly to DB tables with minimal transformation.

**Phase 3 — Product (Scale):** Wizard-driven trip builder, LLM recommendation engine,
group collaboration features, affiliate integrations, SEO-driven content engine.

**The PWA is a vehicle, not the destination. Build it like it's already Phase 2.**

---

## Architecture Principles — Non-Negotiable

### 1. Build for the migration, not just the moment
Every structural decision assumes we will eventually move to a real backend (Supabase or
Firebase), a proper auth layer, and a native app shell. Migration = swap, not rewrite.

### 2. Data structures must think relationally
Trip data modeled as a relational DB: trips, stops, restaurants, activities, bookings as
separate concerns with clean foreign key relationships. User state (checkboxes,
confirmations, packing) always separated from trip content. Content is shared. State
belongs to the user.

### 3. Offline is a core feature, not an enhancement
A meaningful subset must work with zero connectivity. Cache what matters (itinerary,
restaurants, activities, map tiles). Live data (weather, flight status) degrades gracefully
to last-cached values with a clear timestamp. App size stays reasonable.

### 4. PWA today, Expo tomorrow — no migration debt
React component and architecture choices must be portable to React Native. Avoid
PWA-specific patterns that can't translate. Keep platform-specific logic (service workers,
web manifest) isolated in a platform layer.

### 5. No tech debt. No AI slop.
This is a real product with a real future. If something feels like a shortcut, name it as
such before proceeding. Present options with tradeoffs on ambiguous decisions — don't
make them unilaterally.

### 6. Smart API calls — no gratuitous refreshes
All live data calls must be cache-first and proximity-triggered or user-initiated.
- Flight status: auto-fetch only within 48hr of departure; Refresh button otherwise
- Weather: 3-hour client-side cache; re-fetch only if stale
- Always show last-cached timestamp; never blank/spinner if cached data exists

---

## Market Context

The travel planning market is $622.6B. The white space: no app is purpose-built for
2–6 person multi-destination collaborative trip planning. TripCase shut down April 2025.
Travefy pivoted fully to B2B. AI-native planners have ~2.8% Day-30 retention.

### Key differentiators
1. **Curation over AI novelty** — 60% of travelers prefer human-curated recommendations
2. **Built for groups** — collaboration, shared state, group invite loop
3. **Full lifecycle** — plan → book → experience → remember in one product
4. **Offline first** — free, always, no paywall (Wanderlog gates offline behind paywall)
5. **Viral by design** — every trip created generates 2–5 invitations. Target viral coefficient > 0.7

### Revenue model (long-term)
- Subscriptions (30–40%) — group plan extends Pro to all members
- Affiliate commissions (40–50%) — hotels, activities, car rentals, travel insurance
- Advertising (10–20%) — free tier monetization

---

## Branch & Deploy Strategy

```
main        ← production (Netlify deploys from here)
  └── dev   ← active development
        └── feature/xxx  ← one branch per feature
```

- Cut feature branches from `dev`
- PR `dev` → `main` when milestone is complete
- Never commit directly to `main`
- Milestones tracked in GitHub Issues

---

## GitHub Label Taxonomy

| Label | Meaning |
|-------|---------|
| `type:ux` | User experience / interface issue |
| `type:bug` | Something broken |
| `type:feature` | New capability |
| `type:architecture` | Infrastructure / structural work |
| `priority:critical` | Blocking — must ship |
| `priority:high` | Strong differentiator |
| `priority:medium` | Useful, not blocking |
| `priority:low` | Polish / nice-to-have |
| `phase:v1-maine` | Maine Trip POC scope |
| `phase:foundation` | Product Foundation milestone |
| `phase:product` | Jernie as a Product milestone |
| `phase:long-term` | Post-product / monetization |

---

## Active Milestones

| Milestone | Focus | Target |
|-----------|-------|--------|
| V1-Maine | Live POC, alpha with 2 couples | May 15, 2026 |
| Product Foundation | GitHub, trip.json separation, email parser, map, notifications | H2 2026 |
| Jernie as a Product | Multi-user, wizard, mobile-native, templates, offline | Q4 2026–Q1 2027 |
| Long-Term | Monetization, marketplace, social moments | 2027+ |

---

## Known Issues / Active Risks

- **Inline styles throughout** — every `style={{...}}` is Expo migration debt. Needs
  refactor to Tailwind (web) before Phase 2. Tracked in GitHub Issues.
- **No offline state indicator** — silent failure when refresh attempted without network.
- **Flight status fetches on every page load** — needs proximity-based guard (see API
  call logic engine issue).
- **Activity cards lack signal differentiation** — difficulty, duration, type missing.
  Beehive Trail and Old Port render identically.
- **PROD/QA drift** — Netlify Drop deployment is manual. QA source is ahead of PROD.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/Jernie-PWA.tsx` | Main PWA component (exported as `MaineGuide`) |
| `src/App.tsx` | App entry point — renders `MaineGuide` |
| `trip.json` | Trip data (to be separated from UI — tracked in issues) |
| `CLAUDE.md` | This file — AI context for Claude Code + Claude Web |
| `jernie-issues.csv` | GitHub issues batch upload source |
| `GITHUB-SETUP.md` | GitHub + Claude Code setup guide |
| `create-issues.sh` | Script to create labels, milestones, and issues in GitHub |

---

## Claude Code Dev Workflow

```
npm run dev      # start dev server at localhost:5173
npm run build    # production build
npm run preview  # preview production build locally
```

- Always ask before committing or pushing
- Commit to `dev` branch, never directly to `main`
- Use `gh` CLI for GitHub operations (already authenticated as jstraw4663)
