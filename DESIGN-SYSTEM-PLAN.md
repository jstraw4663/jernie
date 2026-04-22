# Jernie Design System — Reference

> **Status: v0.3.0 — All sessions complete. Shipped to production April 8, 2026.**
>
> This document tracks what was built, why decisions were made, and the current
> state of every design system primitive. It is the authoritative reference for
> the Jernie design language.

---

## Sessions Overview

| Session | Focus | Status |
|---------|-------|--------|
| S1 | Foundation tokens, AddToItinerarySheet, viewport fixes | ✅ Shipped |
| S2 | StickyHeader, StopNavigator (swipe navigation) | ✅ Shipped |
| S3 | DayCard, ItineraryItem, Badge, ActionButton | ✅ Shipped |
| S4 | RestaurantCard, ActivityCard, full token migration, trip data props | ✅ Shipped |
| S5 | Card design language v2, TimelineItem, scroll reveal, animations | ✅ Shipped |

---

## Token Reference

Source of truth: `src/design/tokens.ts`

### Colors
```
Colors.navy          #0D2B3E   — primary brand, nav background
Colors.navyLight     #1A3F58
Colors.background    #F7F4EF   — warm off-white app background
Colors.surface       #F7F4EF   — card surfaces (same as background)
Colors.surface2      #EDEAE4   — nested elements inside cards
Colors.surfaceRaised #FAFAF8   — elevated cards (timeline, hotel, booking)
Colors.border        #E5E0D8

Colors.textPrimary   #1A1A1A
Colors.textSecondary #6B7280
Colors.textMuted     #999999
Colors.textInverse   #F7F4EF

Colors.gold          #C9963A   — confirm, accents, star ratings
Colors.goldLight     #FDF0DC
Colors.red           #8B3A3A   — danger/delete
Colors.redLight      #F5E8E8
Colors.success       #1B7A4A
Colors.successLight  #D1FAE5
Colors.info          #3557A0
Colors.infoBg        #F0F4FF
```

### Spacing (4px base, unitless for React Native compatibility)
```
Spacing.xxs   2
Spacing.xs    4
Spacing.sm    8
Spacing.md    12
Spacing.base  16
Spacing.lg    20
Spacing.xl    24
Spacing.xxl   32
Spacing.xxxl  48
```

### Radius
```
Radius.sm    4
Radius.md    8
Radius.lg    12   ← standard card radius
Radius.xl    16
Radius.full  9999
```

### Shadows
```
Shadow.cardResting  0 2px 8px rgba(13,43,62,0.08)
Shadow.cardHover    0 4px 16px rgba(13,43,62,0.12)
Shadow.cardLifted   0 8px 32px rgba(13,43,62,0.18)
Shadow.sheet        0 -4px 24px rgba(13,43,62,0.14)
```

Card-level shadow (used on TimelineItem, HotelCard, BookingCard):
```
0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)
```

### Animation Springs (Framer Motion)
```
Animation.springs.gentle   { stiffness: 280, damping: 32 }   — entrances, most transitions
Animation.springs.snappy   { stiffness: 400, damping: 36 }   — press feedback, badges
Animation.springs.bouncy   { stiffness: 320, damping: 24 }   — energetic with slight bounce
Animation.springs.lazy     { stiffness: 160, damping: 24 }   — DayCard expand, breathing room
```

### Animation Durations + Easings
```
Animation.duration.fast    150ms
Animation.duration.normal  250ms
Animation.duration.slow    350ms
Animation.duration.sheet   380ms

Animation.easing.default   cubic-bezier(0.4, 0, 0.2, 1)
Animation.easing.enter     cubic-bezier(0, 0, 0.2, 1)
Animation.easing.exit      cubic-bezier(0.4, 0, 1, 1)
Animation.easing.spring    cubic-bezier(0.34, 1.56, 0.64, 1)

Animation.fm.ease     [0.4, 0, 0.2, 1]   ← FM-compatible tuples
Animation.fm.easeIn   [0.4, 0, 1,   1]
Animation.fm.easeOut  [0,   0, 0.2, 1]

Animation.mountFrames  4   ← RAF chain count before CSS enter transition fires
```

---

## Card Design Language

Every discrete piece of content follows this pattern:

### Elevated card (TimelineItem, HotelCard, BookingCard, LegSummary, AlertBox)
```tsx
style={{
  background: Colors.surfaceRaised,
  borderRadius: `${Radius.lg}px`,
  boxShadow: '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
  borderLeft: `3px solid ${accent}`,   // full opacity for primary cards
  // or: borderLeft: `3px solid ${accent}60` for secondary booking cards
  padding: `${Spacing.md}px ${Spacing.base}px`,
}}
```

### Section label (inside card, above content)
```tsx
style={{
  fontSize: `${Typography.size.xs}px`,
  fontWeight: Typography.weight.bold,
  color: accent,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontFamily: Typography.family,
  marginBottom: `${Spacing.sm}px`,
}}
```

### DayCard (collapsible day block)
- `Colors.surface` background (not surfaceRaised)
- `Shadow.cardResting / Shadow.cardHover` via Framer Motion `animate`
- `borderColor` animated via FM (not CSS transition)
- `AnimatePresence` + `springs.lazy` for height:auto expand

### RestaurantCard / ActivityCard
- Token-driven throughout
- Must badge, Stacy pill, star rating, price tier
- AllTrails badge, difficulty/distance/duration chips for hikes

---

## Scroll Reveal — Design Language Rule

**Every discrete card or list item that appears below the fold must be wrapped in `<ScrollReveal>`.**

```tsx
import { ScrollReveal } from '../components/ScrollReveal';

// Single card
<ScrollReveal>
  <MyCard />
</ScrollReveal>

// List — index prop adds 0.025s stagger per item
{items.map((item, i) => (
  <ScrollReveal key={item.id} index={i}>
    <MyCard item={item} />
  </ScrollReveal>
))}
```

Props:
- `index` — stagger offset; delay = `0.08 + index × 0.025s` (default `0`)
- `margin` — IO root margin before triggering (default `'-30px'`; use `'-60px'` for tall cards)
- `style` — forwarded to the `motion.div` wrapper

**`viewport={{ once: true }}`** — fires exactly once per mount. Never re-triggers on scroll.

Components with complex internal animation (DayCard, TimelineItem) use `whileInView` directly
rather than ScrollReveal since they also animate non-entrance properties (borderColor, boxShadow, dot state).

---

## Entrance Animation System

### Post-unlock (section-level)
Defined in `Jernie-PWA.tsx` as `contentContainerVariants` + `contentSectionVariants`.
- Container: `staggerChildren: 0.045s`
- Each section: `opacity: 0→1, y: 18→0`, `springs.gentle`
- Fires once on first mount after PIN unlock. Stop swipes do NOT re-trigger it.

### Scroll reveal (card-level)
`ScrollReveal` component. Fires once per mount via `whileInView + once:true`.
Base delay: `0.08s`. Per-item stagger: `+0.025s × index`.

### Sheet entrance
BottomSheet: `springs.gentle` slide from off-screen. Exit: `0.65s tween, [0.4,0,0.55,1]`.
`Animation.mountFrames` RAF chain ensures painted start state before spring fires.

### Press feedback
`ItineraryItem`, `ActionButton`: `whileTap={{ scale: 0.97 }}`, `springs.snappy`.
Disabled for locked/confirmed items.

---

## Screen Layout — Safe Area Rule

Every screen in the app must respect the iOS notch / Dynamic Island. The content of a screen begins directly below the status bar — the same vertical position as the compacted trip date that sits above the title in the Jernie tab.

**Rule:** Any screen that owns a sticky header must include a safe-area spacer as its first child:
```tsx
<div style={{ height: 'env(safe-area-inset-top, 0px)' }} />
```

This spacer sits inside the header's background div so the background color fills the notch area seamlessly. Never add `padding-top: env(safe-area-inset-top)` to the scrollable content area — only to the fixed/sticky header.

**Reference implementations:**
- `src/components/StickyHeader.tsx:90` — original pattern (Jernie tab)
- `src/features/explore/ExploreScreen.tsx` — same pattern applied to Explore sticky header

**On Expo migration:** replace with `useSafeAreaInsets().top` from `react-native-safe-area-context`, applied as `paddingTop` on the header View.

### EntityDetailSheet top boundary — `data-sticky-nav`

`EntityDetailSheet` (the full-height vaul drawer) measures `[data-sticky-nav].getBoundingClientRect().bottom` to set its `top` position — this ensures the sheet never covers the nav header. **Every screen that can open an EntityDetailSheet must add `data-sticky-nav` to its sticky header element.**

- Jernie tab: `StickyHeader.tsx` outermost div (line 67)
- Explore tab: `ExploreScreen.tsx` sticky header div

Fallback: if no `[data-sticky-nav]` is found, EntityDetailSheet falls back to `--sat` (`env(safe-area-inset-top)`) defined in `index.css :root`, so it never goes behind the notch even on screens without a nav bar.

`AddToItinerarySheet` (smaller BottomSheet-based panel) slides from the bottom and is **not** affected by `data-sticky-nav`.

---

## Component Inventory

| Component | File | Animation |
|-----------|------|-----------|
| StickyHeader | `src/components/StickyHeader.tsx` | useScroll/useTransform compression, layoutId tab indicator |
| StopNavigator | `src/components/StopNavigator.tsx` | drag="x", parallax exit, elastic bounce, SheetContext guard |
| DayCard | `src/components/DayCard.tsx` | whileInView entrance, springs.lazy expand, FM borderColor/boxShadow |
| TimelineItem | `src/components/TimelineItem.tsx` | whileInView entrance, dot/connector spring, AnimatePresence confirm swap |
| BottomSheet | `src/components/BottomSheet.tsx` | useMotionValue/useVelocity swipe, springs.gentle enter, 0.65s tween exit |
| SelectableListItem | `src/components/SelectableListItem.tsx` | Card-style edit row, drag handle inside card |
| RestaurantCard | `src/components/RestaurantCard.tsx` | Token-driven, Must badge, Stacy pill |
| ActivityCard | `src/components/ActivityCard.tsx` | Token-driven, AllTrails badge, difficulty chips |
| ScrollReveal | `src/components/ScrollReveal.tsx` | whileInView, once:true — standard scroll entrance |
| Badge | `src/components/Badge.tsx` | scale pop-in via springs.snappy |
| ActionButton | `src/components/ActionButton.tsx` | whileTap scale 0.97 |
| ItineraryItem | `src/components/ItineraryItem.tsx` | whileTap scale 0.97, useLongPress |
| DayCard | `src/components/DayCard.tsx` | height:auto AnimatePresence, springs.lazy |
| AddToItinerarySheet | `src/components/AddToItinerarySheet.tsx` | BottomSheet-based, stop-scoped day picker |
| ConfirmDialog | `src/components/ConfirmDialog.tsx` | CSS translateY slide, easeIn |
| ActionBar | `src/components/ActionBar.tsx` | Edit mode delete/move actions |

---

## Platform Migration Notes (Expo)

| Web | React Native / Expo |
|-----|---------------------|
| `motion.div` | `Animated.View` + `useAnimatedStyle` (Reanimated) |
| `whileInView` | `useSharedValue` + IO polyfill or `useAnimatedScrollHandler` |
| `useMotionValue/useVelocity` | `useSharedValue` + `useAnimatedGestureHandler` |
| `AnimatePresence` | Conditional render + `useAnimatedStyle` height |
| `drag="x"` (StopNavigator) | `Gesture.Pan()` via Gesture Handler |
| `@dnd-kit` (itinerary) | `react-native-reanimated` drag handles |
| CSS transitions | `withTiming`, `withSpring` |
| `springs.gentle` | `{ damping: 32, stiffness: 280 }` in `withSpring` |
| Service worker | Expo offline-first via expo-updates |

---

## Branding Rules

Replace in UI strings only — not Firebase keys, localStorage keys, `trip.json` keys, or TypeScript type names.
- "Trip Guide" → "Jernie"
- "Daily Itinerary" → "Daily Jernie"
- Preserve: `tripId`, `trip_id`, `data.trip`, Firebase paths, `trip.json`
