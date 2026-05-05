// DESIGN TOKENS — Single source of truth for all visual constants.
//
// ── TOKEN LAYERS ────────────────────────────────────────────────────────────
//
//  1. Brand    — Global identity. Stable across all trips, marketing, app icon.
//               Never overridden by trip or stop themes.
//
//  2. Core     — Neutral app foundation. Surfaces, borders, text, spacing.
//               Stable across all trips. Most of the app lives here.
//
//  3. Semantic — Universal UI states (confirmed, error, success, etc.).
//               Gold = confirmed/completion ONLY. Never let trip colors
//               replace semantic states.
//
//  4. TypeColors — Category taxonomy. Used in Explore chips, category icons,
//               and filter labels. Stable across all trips.
//
//  5. Trip/Stop — Dynamic, per-trip. Delivered via TripThemeContext.
//               Never imported directly here — lives in tripPacks.ts +
//               contexts/TripThemeContext.tsx.
//
// ── BACKWARDS COMPAT ────────────────────────────────────────────────────────
//  Colors and IconColors are re-exported as aliases so existing imports
//  continue to work unchanged. Migrate to named layer exports over time.
//
// ── PLATFORM NOTE ───────────────────────────────────────────────────────────
//  Numeric spacing/radius values are unitless for React Native compatibility.
//  CSS consumers append "px". Native consumers use the number directly.

// ---------------------------------------------------------------------------
// Layer 1 — Brand
// ---------------------------------------------------------------------------

export const Brand = {
  navy:     '#0D2B3E',  // hero, PinGate, AppShell gradient — intentionally deep
  navySoft: '#2C5880',  // selected states, secondary brand moments
  gold:     '#C89A2B',  // brand attention color — drives Semantic.confirmed
} as const;

// ---------------------------------------------------------------------------
// Layer 2 — Core
// ---------------------------------------------------------------------------

export const Core = {
  bg:           '#F7F4EF',  // app background — warm off-white
  surface:      '#FCFAF7',  // card surfaces
  surfaceMuted: '#F1ECE4',  // nested elements inside cards / grouped sections
  surfaceRaised:'#FAFAF8',  // slightly elevated surface (modals, popovers)
  border:       '#DDD5CA',  // dividers, card borders
  text:         '#28231E',  // primary text
  textMuted:    '#6E665E',  // secondary text
  textFaint:    '#999591',  // placeholder, disabled, metadata
  textInverse:  '#FFFFFF',  // text on dark/colored backgrounds
  white:        '#FFFFFF',  // explicit white — use instead of hardcoded #fff
  // tint helpers (use when you need an opacity approximation as a solid color)
  navyTint10:   'rgba(13,43,62,0.10)',
  navyTint20:   'rgba(13,43,62,0.20)',
  overlay:      'rgba(0,0,0,0.45)',   // BottomSheet backdrop
  // action teal — DEFINED, NOT YET APPLIED to any component (reserved for future)
  action:       '#2F6F73',
} as const;

// ---------------------------------------------------------------------------
// Layer 3 — Semantic
// ---------------------------------------------------------------------------
//
// RULES:
//   - Gold (confirmed) is the ONLY completion language in the app.
//     Do not let stop or trip colors replace the confirmed state.
//   - Semantic tokens must not be overridden by trip packs.

export const Semantic = {
  confirmed:      '#C89A2B',  // gold — itinerary add, completion badges
  confirmedTint:  '#FDF0DC',  // gold badge background
  confirmedDark:  '#7A5810',  // gold badge text / dark mode
  selected:       '#2C5880',  // selected list items, active filter
  selectedTint:   '#EAF0F8',  // selected chip background
  saved:          '#2F6F73',  // saved / wishlisted (future)
  success:        '#3E7B52',  // positive status
  successTint:    '#D1F0DF',
  warning:        '#B56B00',  // flight delays, attention
  warningTint:    '#F5E8D0',
  error:          '#A3485F',  // destructive actions, errors
  errorTint:      '#F5E8EB',
} as const;

// ---------------------------------------------------------------------------
// Layer 4 — TypeColors
// ---------------------------------------------------------------------------
//
// Where to use: Explore category chips, category icons, filter labels.
// Where NOT to use: stop rail, add-to-itinerary buttons, card accents
//   (those use stop theme from TripThemeContext).

export const TypeColors = {
  flight:   '#2C5880',  // deep denim — was blue-500 (#3B82F6)
  car:      '#5A7082',  // granite — was grouped with travel
  stay:     '#465E7A',  // harbor slate — was violet-500 (#8B5CF6)
  food:     '#B44F1E',  // lobster terracotta — was amber-500 (#F59E0B)
  bars:     '#8E4E2F',  // same warm family as food, distinct hue
  hike:     '#2F6B47',  // spruce forest — was green-500 (#22C55E)
  activity: '#7A4F82',  // heather purple — was pink-500 (#EC4899)
  sight:    '#8A5A2B',  // coastal amber
  shopping: '#6B4A3A',  // cognac bark — was orange-500 (#F97316)
} as const;

// ---------------------------------------------------------------------------
// Weather colors (part of type taxonomy — not trip-themed)
// ---------------------------------------------------------------------------

export const WeatherColors = {
  clear:       '#E8A020',  // warm amber — sun
  mostlyClear: '#E8A020',
  partlyCloudy:'#94A3B8',  // slate-400
  cloudy:      '#94A3B8',
  fog:         '#94A3B8',
  rain:        '#60A5FA',  // blue-400
  snow:        '#BAE6FD',  // sky-200
  storm:       '#7C3AED',  // violet-600
} as const;

// ---------------------------------------------------------------------------
// Spacing — 4px base unit scale (unitless for RN compat)
// ---------------------------------------------------------------------------

export const Spacing = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
} as const;

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export const Radius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const Typography = {
  family: {
    serif: '"Newsreader", "Iowan Old Style", Georgia, serif',
    sans:  '"Geist", -apple-system, system-ui, sans-serif',
  },
  roles: {
    display:   { fontSize: 36, lineHeight: 40, fontWeight: '400' as const, fontFamily: 'serif' as const, letterSpacing: '-0.015em' },
    h1:        { fontSize: 28, lineHeight: 34, fontWeight: '400' as const, fontFamily: 'serif' as const },
    h2:        { fontSize: 22, lineHeight: 28, fontWeight: '400' as const, fontFamily: 'serif' as const },
    h3:        { fontSize: 18, lineHeight: 24, fontWeight: '600' as const, fontFamily: 'sans'  as const },
    body:      { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, fontFamily: 'sans'  as const },
    bodySoft:  { fontSize: 15, lineHeight: 23, fontWeight: '400' as const, fontFamily: 'serif' as const, fontStyle: 'italic' as const },
    label:     { fontSize: 13, lineHeight: 18, fontWeight: '600' as const, fontFamily: 'sans'  as const },
    labelCaps: { fontSize: 11, lineHeight: 16, fontWeight: '600' as const, fontFamily: 'sans'  as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const },
    meta:      { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, fontFamily: 'sans'  as const },
    button:    { fontSize: 15, lineHeight: 20, fontWeight: '600' as const, fontFamily: 'sans'  as const },
  },
  size: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   19,
    xl:   22,
    xxl:  26,
  },
  weight: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
  lineHeight: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.7,
  },
} as const;

// ---------------------------------------------------------------------------
// Elevation / Shadow
// ---------------------------------------------------------------------------

export const Shadow = {
  none:        'none',
  sm:          '0 1px 3px rgba(0,0,0,0.08)',
  md:          '0 4px 12px rgba(0,0,0,0.10)',
  lg:          '0 8px 24px rgba(0,0,0,0.14)',
  xl:          '0 16px 40px rgba(0,0,0,0.18)',
  cardResting: '0 2px 8px rgba(13,43,62,0.08)',
  cardHover:   '0 4px 16px rgba(13,43,62,0.12)',
  cardLifted:  '0 8px 32px rgba(13,43,62,0.18)',
  sheet:       '0 -4px 24px rgba(13,43,62,0.14)',
} as const;

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

export const Animation = {
  duration: {
    fast:   '175ms',
    normal: '300ms',
    slow:   '420ms',
    sheet:  '460ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enter:   'cubic-bezier(0, 0, 0.2, 1)',
    exit:    'cubic-bezier(0.4, 0, 1, 1)',
    spring:  'cubic-bezier(0.34, 1.72, 0.64, 1)',
  },
  mountFrames: 4,
  springs: {
    gentle:    { stiffness: 240, damping: 26 },
    snappy:    { stiffness: 340, damping: 28 },
    bouncy:    { stiffness: 260, damping: 20 },
    lazy:      { stiffness: 130, damping: 19 },
    cardExpand: { stiffness: 280, damping: 22 },
    settle: { stiffness: 140, damping: 20, mass: 1.05 },
    bloom:  { stiffness: 200, damping: 18 },
    trail:  { stiffness: 140, damping: 30 },
  },
  fm: {
    ease:    [0.4, 0, 0.2, 1] as [number, number, number, number],
    easeIn:  [0.4, 0, 1,   1] as [number, number, number, number],
    easeOut: [0,   0, 0.2, 1] as [number, number, number, number],
  },
} as const;

// ---------------------------------------------------------------------------
// BACKWARDS COMPAT — Colors
// ---------------------------------------------------------------------------
// Re-export as the original Colors shape so existing imports keep working.
// Migrate call sites to the named layer exports (Brand, Core, Semantic) over time.

export const Colors = {
  // Primary brand
  navy:          Brand.navy,
  navyLight:     Brand.navySoft,
  navyTint10:    Core.navyTint10,
  navyTint20:    Core.navyTint20,
  // Surface
  background:    Core.bg,
  surface:       Core.surface,
  surface2:      Core.surfaceMuted,
  surfaceRaised: Core.surfaceRaised,
  border:        Core.border,
  // Text
  textPrimary:   Core.text,
  textSecondary: Core.textMuted,
  textMuted:     Core.textFaint,
  textInverse:   Core.white,
  // Status
  red:           Semantic.error,
  redLight:      Semantic.errorTint,
  success:       Semantic.success,
  successLight:  Semantic.successTint,
  gold:          Semantic.confirmed,
  goldLight:     Semantic.confirmedTint,
  info:          Brand.navySoft,
  infoBg:        Semantic.selectedTint,
  // Selection
  selectedFill:   Semantic.selected,
  selectedBorder: Semantic.selected,
  unselectedFill:   'transparent',
  unselectedBorder: '#CCCCCC',
  // Misc
  tabBg:     Core.bg,
  tabBorder: 'transparent',
  overlay:   Core.overlay,
} as const;

// ---------------------------------------------------------------------------
// BACKWARDS COMPAT — IconColors
// ---------------------------------------------------------------------------
// Mapped to TypeColors. Migrate call sites to TypeColors over time.

export const IconColors = {
  travel:        TypeColors.flight,
  food:          TypeColors.food,
  nature:        TypeColors.hike,
  accommodation: TypeColors.stay,
  activity:      TypeColors.activity,
  shopping:      TypeColors.shopping,
  weatherClear:  WeatherColors.clear,
  weatherCloud:  WeatherColors.cloudy,
  weatherRain:   WeatherColors.rain,
  weatherStorm:  WeatherColors.storm,
  weatherSnow:   WeatherColors.snow,
  weatherFog:    WeatherColors.fog,
} as const;
