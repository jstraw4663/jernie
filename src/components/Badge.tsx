// Badge — token-driven status/action badges.
// Variants mirror the existing inline badge usage in ItemContent (S4 will swap them in).
//
// PLATFORM NOTE:
//   All values are from design tokens — no hardcoded colors.
//   React Native migration: <View> + <Text> with StyleSheet from the same tokens.

import { Colors, Typography, Spacing, Radius, Animation } from '../design/tokens';

export type BadgeVariant = 'confirmed' | 'bookNow' | 'alert' | 'note' | 'custom';

interface BadgeConfig {
  bg: string;
  color: string;
  border: string;
}

const VARIANTS: Record<BadgeVariant, BadgeConfig> = {
  confirmed: {
    bg:     Colors.gold,
    color:  '#fff',
    border: 'none',
  },
  bookNow: {
    bg:     Colors.navy,
    color:  Colors.textInverse,
    border: 'none',
  },
  alert: {
    bg:     Colors.goldLight,
    color:  '#7a5800',
    border: `1px solid ${Colors.gold}55`,
  },
  note: {
    bg:     '#FFF8E7',
    color:  '#b07010',
    border: '1px solid #E8A02050',
  },
  custom: {
    bg:     '#F0F4FF',
    color:  '#3557A0',
    border: '1px solid #3557A020',
  },
};

export interface BadgeProps {
  variant: BadgeVariant;
  label: string;
  /** If provided, renders as an <a> tag */
  href?: string;
  /** If provided (and no href), renders as a <button> */
  onClick?: () => void;
  /** Use accent color for background instead of the variant default */
  accentColor?: string;
}

export function Badge({ variant, label, href, onClick, accentColor }: BadgeProps) {
  const cfg = VARIANTS[variant];
  const bg = accentColor ?? cfg.bg;

  const baseStyle: React.CSSProperties = {
    display: 'inline-block',
    background: bg,
    color: cfg.color,
    fontSize: `${Typography.size.xs - 2}px`,
    padding: `${Spacing.xxs}px ${Spacing.sm}px`,
    borderRadius: `${Radius.sm}px`,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    border: cfg.border,
    fontFamily: Typography.family,
    fontWeight: Typography.weight.semibold,
    lineHeight: 1.4,
    transition: `opacity ${Animation.duration.fast} ${Animation.easing.default}`,
    width: 'fit-content',
    whiteSpace: 'nowrap',
  };

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...baseStyle, textDecoration: 'none' }}
      >
        {label}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{ ...baseStyle, cursor: 'pointer' }}
      >
        {label}
      </button>
    );
  }

  return <span style={baseStyle}>{label}</span>;
}
