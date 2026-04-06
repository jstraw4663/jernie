// DESIGN TOKENS — Single source of truth for all visual constants.
// All components must reference these values. No hardcoded colors, spacing,
// font sizes, or animation values anywhere in new or migrated code.
//
// PLATFORM NOTE: Numeric spacing/radius values are unitless so they translate
// directly to React Native StyleSheet values in Phase 2 (Expo migration).
// CSS consumers append "px". Native consumers use the number directly.

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const Colors = {
  // Primary
  navy:          '#0D2B3E',
  navyLight:     '#1A3F58',
  navyTint10:    'rgba(13,43,62,0.10)',
  navyTint20:    'rgba(13,43,62,0.20)',

  // Surface
  background:    '#F5F0E8',   // warm cream — app background
  surface:       '#FFFFFF',
  surfaceRaised: '#FAFAF8',
  border:        '#E5E0D8',

  // Text hierarchy
  textPrimary:   '#1A1A1A',
  textSecondary: '#666666',
  textMuted:     '#999999',
  textInverse:   '#FFFFFF',

  // Status
  danger:        '#EF4444',
  dangerLight:   '#FEE2E2',
  success:       '#1B7A4A',
  successLight:  '#D1FAE5',
  warning:       '#E8A020',
  warningLight:  '#FEF3C7',

  // Selection — used by SelectableListItem bubble
  selectedFill:    '#0D2B3E',
  selectedBorder:  '#0D2B3E',
  unselectedFill:  'transparent',
  unselectedBorder:'#CCCCCC',

  // Overlay — BottomSheet backdrop
  overlay: 'rgba(0,0,0,0.45)',
} as const;

// ---------------------------------------------------------------------------
// Spacing — 4px base unit scale
// Numeric values (unitless) for React Native compatibility.
// CSS: append "px". Native: use directly in StyleSheet.
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
  family: 'Georgia, serif',
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
  none: 'none',
  sm:   '0 1px 3px rgba(0,0,0,0.08)',
  md:   '0 4px 12px rgba(0,0,0,0.10)',
  lg:   '0 8px 24px rgba(0,0,0,0.14)',
  xl:   '0 16px 40px rgba(0,0,0,0.18)',
} as const;

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

export const Animation = {
  duration: {
    fast:   '150ms',
    normal: '250ms',
    slow:   '350ms',
    sheet:  '380ms',  // BottomSheet enter/exit
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enter:   'cubic-bezier(0, 0, 0.2, 1)',
    exit:    'cubic-bezier(0.4, 0, 1, 1)',
    spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  // Number of requestAnimationFrame chains to wait before triggering a CSS
  // enter transition. Gives the browser time to commit the start-state paint
  // so the transition has a real starting frame to animate from.
  // ~67ms at 60fps / ~33ms at 120Hz.
  // Apply this to any component that mounts-then-animates-in (sheets, toasts, drawers).
  mountFrames: 4,
} as const;
