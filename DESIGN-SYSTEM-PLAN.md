# Jernie Design System Overhaul — Session Tracker

Branch strategy: one branch per session, PR to `dev` when verified locally.

---

## Session 1 — Foundation + Quick Wins
**Branch:** `feature/design-system-s1`
**Status:** ✅ Implemented, build clean — awaiting local QA

### Changes made
| File | Change |
|------|--------|
| `package.json` | Added `framer-motion` |
| `src/design/tokens.ts` | `danger→red (#8B3A3A)`, `warning→gold (#C9963A)`, added `surface2 (#EDEAE4)`, new shadow aliases (`cardResting/cardHover/cardLifted/sheet`), Framer Motion spring configs (`gentle/snappy/bouncy`) |
| `index.html` | viewport `maximum-scale=1.0, user-scalable=no`; title → "Jernie — Maine Coast Jernie" |
| `src/index.css` | `touch-action: manipulation`, `position: fixed` on html/body, `overflow: hidden`, `overscroll-behavior: none`, `#root` scrolls |
| `src/components/ActionBar.tsx` | `Colors.danger → Colors.red`, `Colors.dangerLight → Colors.redLight` |
| `src/components/ConfirmDialog.tsx` | `Colors.danger → Colors.red` |
| `src/components/AddToItinerarySheet.tsx` | **NEW** — BottomSheet-based add-to-jernie; filters days to `place.stop_id` only |
| `src/Jernie-PWA.tsx` | Replaced global `DayPickerModal` (addPlace mode) with `AddToItinerarySheet`; `SecHead` now uses `Colors.gold` + Georgia, removed `color` prop; header → "Maine Coast Jernie"; "Daily Jernie" label |

### QA checklist (verify before commit)
- [ ] App loads at localhost:5174, no zoom on mobile/DevTools device mode
- [ ] Tap + on a Portland restaurant → sheet slides up showing ONLY Portland days
- [ ] Tap + on a Bar Harbor hike → sheet shows ONLY Bar Harbor days
- [ ] Section headers are gold + uppercase
- [ ] Edit Mode delete button still shows deep red (not bright red)
- [ ] `npm run build` passes clean ✅

---

## Session 2 — Navigation Layer
**Branch:** `feature/design-system-s1` (built on same branch, not yet PRed)
**Status:** ✅ Implemented, build clean — awaiting local QA

### Changes made
| File | Change |
|------|--------|
| `src/design/tokens.ts` | Added `Animation.fm` — Framer Motion easing arrays (same curves as `Animation.easing` but as `[number, number, number, number]` tuples, required because FM's `Easing` type rejects CSS cubic-bezier strings) |
| `src/index.css` | `#root` changed from `overflow-y: auto` → `overflow: hidden`; scrolling moved to inner wrapper div in `MaineGuide` |
| `src/components/StickyHeader.tsx` | **NEW** — sticky header with `useScroll`/`useTransform`: title 24→17px, dates fade out, tagline+pills+countdown collapse; tab bar with `layoutId="tab-indicator"` sliding active indicator; `LayoutGroup` wraps tabs |
| `src/components/StopNavigator.tsx` | **NEW** — `drag="x"` with `dragDirectionLock`; commit threshold 80px offset or 300px/s velocity; spring snap-back via `dragConstraints={{ left:0, right:0 }}`; edge-aware elastic |
| `src/Jernie-PWA.tsx` | Added `scrollRef = useRef<HTMLDivElement>()` on outer wrapper div; outer div is now the scroll container (`overflow-y: auto, height: 100%`); replaced inline header + tabs with `<StickyHeader>`; main content wrapped in `<StopNavigator>`; added `activeIndex` + `handleSwipe` |

### Design deviations from plan
- **Tab padding compression (not scale):** Plan specified `tab scale 0.88`. Implemented as tab button height/padding compression instead to avoid `transform: scale()` hit-target issues. Deferred true scale option to S4.
- **Tab padding interpolation deferred:** `tabPaddingY` MotionValue was defined but not wired to tab buttons (FM's `padding` shorthand doesn't accept MotionValues). Full tab padding animation left for S4 inline style migration.

### QA checklist
- [ ] Scroll down → header compresses (title shrinks, dates/tagline fade)
- [ ] Tap a tab → active indicator slides (no jump)
- [ ] Swipe left on content → navigates to next stop
- [ ] Swipe right on content → navigates to previous stop
- [ ] Swipe on last stop leftward → minimal elastic bounce, no navigation
- [ ] Swipe threshold: short gentle swipe snaps back; firm swipe commits
- [ ] Header stays sticky while content scrolls
- [ ] `npm run build` passes clean ✅

---

## Session 3 — Card System
**Branch:** `feature/design-system-s1` (built on same branch)
**Status:** ✅ Implemented, build clean — awaiting local QA

### Changes made
| File | Change |
|------|--------|
| `src/components/Badge.tsx` | **NEW** — variants: `confirmed` (gold), `bookNow` (navy), `alert`, `note`, `custom`; renders as `<span>`, `<button>`, or `<a>` based on props; fully token-driven |
| `src/components/ActionButton.tsx` | **NEW** — variants: `default`, `active`, `danger`, `disabled`; Framer Motion `whileTap={{ scale: 0.97 }}`; `icon` prop; `fullWidth` prop |
| `src/components/DayCard.tsx` | **NEW** — floating card with token shadow/radius; staggered entrance via `shouldAnimate` prop; `AnimatePresence` height/opacity collapse; Framer Motion animated `borderColor`/`boxShadow` via `animate` prop (no CSS transition mixing); animated chevron via `motion.span` |
| `src/components/ItineraryItem.tsx` | **NEW** — thin motion wrapper: `whileTap={{ scale: 0.99 }}`, `useLongPress` hook; padding/gap via `Spacing` tokens; easing via `Animation.fm.ease` |
| `src/components/EditableItinerary.tsx` | Removed `useLongPress` import (moved into `ItineraryItem`); added `DayCard` + `ItineraryItem as ItineraryItemRow` imports; `SortableItem` now wraps `ItemContent` in `<ItineraryItemRow>`; day rendering uses `<DayCard shouldAnimate={isFirstVisit}>`; `seenStops = useRef(new Set<string>())` prevents stagger from re-firing on tab switch |

### Key architecture decisions
- **`shouldAnimate` prop on DayCard:** Parent (`EditableItinerary`) tracks which stop IDs have been visited via `seenStops` ref. First visit = stagger; revisit = instant render. Prevents visible jank on tab switching.
- **ItineraryItem as separate component:** `SortableItem` owns dnd-kit concerns (`setNodeRef`, transform); `ItineraryItem` owns interaction + animation. Clean separation of concerns; aligned with S4 full item refactor.
- **DayCard animation via Framer Motion `animate` (not CSS transition):** Border color + box-shadow are Framer Motion properties so animation timing is unified with enter/exit transitions. No mixed-paradigm animation.
- **`Animation.fm` in tokens:** Framer Motion requires bezier curves as `[number, number, number, number]` tuples; CSS `cubic-bezier()` strings are rejected by FM's type system. Added `Animation.fm.ease/easeIn/easeOut` to centralize this.
- **S4 scope:** `Badge` and `ActionButton` are built but not yet wired into `ItemContent`. Full inline-style-to-token migration of `ItemContent`, `PlaceCard`, `WeatherStrip`, etc. is S4.

### QA checklist
- [ ] Day cards animate in with stagger on first visit to each stop
- [ ] Switch to Bar Harbor, switch back to Portland → Portland days appear instantly (no stagger repeat)
- [ ] Tap a day header → content expands/collapses with spring animation
- [ ] Chevron rotates smoothly on expand/collapse
- [ ] Long-press an itinerary item → Edit Mode sheet opens (still works)
- [ ] Tap + hold feedback (scale 0.99) visible on items
- [ ] Locked/confirmed items have no tap feedback (whileTap disabled)
- [ ] Card border and shadow animate when opening/closing
- [ ] Edit mode (select, delete, move) still works correctly
- [ ] `npm run build` passes clean ✅

---

## Session 4 — Place Cards + Full Refactor
**Branch:** `feature/design-system-s4`
**Status:** 🔜 Not started

### Deliverables
- `src/components/RestaurantCard.tsx` + `ActivityCard.tsx` — `layoutId` shared element expand
- Full `Jernie-PWA.tsx` refactor — all inline styles → tokens, use new components
- `EditableItinerary.tsx` — token migration (replace hardcoded hex colors)
- Wire `Badge` + `ActionButton` into `ItemContent`
- Tab padding animation (full MotionValue wiring in `StickyHeader`)
- Move trip-specific strings (tagline, pills) from `StickyHeader` into trip data
- Update `CLAUDE.md` to v0.3.0

---

## Token Reference (post-S3)

```
Colors.navy          #0D2B3E
Colors.background    #F7F4EF
Colors.surface       #F7F4EF
Colors.surface2      #EDEAE4
Colors.gold          #C9963A   ← was warning
Colors.goldLight     #FDF0DC
Colors.red           #8B3A3A   ← was danger
Colors.redLight      #F5E8E8
Colors.textSecondary #6B7280
Colors.textInverse   #F7F4EF

Shadow.cardResting   0 2px 8px rgba(13,43,62,0.08)
Shadow.cardHover     0 4px 16px rgba(13,43,62,0.12)
Shadow.cardLifted    0 8px 32px rgba(13,43,62,0.18)
Shadow.sheet         0 -4px 24px rgba(13,43,62,0.14)

Animation.springs.gentle  { stiffness: 280, damping: 32 }
Animation.springs.snappy  { stiffness: 400, damping: 36 }
Animation.springs.bouncy  { stiffness: 320, damping: 24 }

Animation.fm.ease    [0.4, 0, 0.2, 1]   ← FM-compatible, matches Animation.easing.default
Animation.fm.easeIn  [0.4, 0, 1,   1]
Animation.fm.easeOut [0,   0, 0.2, 1]
```

## Branding Rule
Replace in UI strings only — not Firebase keys, localStorage keys, `trip.json` keys, or TypeScript type names.
- "Trip Guide" → "Jernie"
- "Daily Itinerary" → "Daily Jernie"
- Preserve: `tripId`, `trip_id`, `data.trip`, Firebase paths, `trip.json`
