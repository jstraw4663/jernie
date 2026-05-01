// ActionButton — token-driven button with Framer Motion press animation.
// Variants: default, active (navy fill), danger (red fill), disabled.
// whileTap scale: 0.97 with snappy spring — feels native.
//
// PLATFORM NOTE:
//   whileTap → Pressable + Animated.spring on React Native
//   All colors from design tokens.

import { motion } from 'framer-motion';
import { Colors, Typography, Spacing, Radius, Animation, Shadow } from '../design/tokens';

export type ButtonVariant = 'default' | 'active' | 'danger' | 'disabled';

interface VariantConfig {
  bg: string;
  color: string;
  border: string;
  shadow: string;
}

const VARIANTS: Record<ButtonVariant, VariantConfig> = {
  default: {
    bg:     Colors.surface,
    color:  Colors.textPrimary,
    border: `1px solid ${Colors.border}`,
    shadow: Shadow.sm,
  },
  active: {
    bg:     Colors.navy,
    color:  Colors.textInverse,
    border: 'none',
    shadow: Shadow.cardResting,
  },
  danger: {
    bg:     Colors.red,
    color:  '#fff',
    border: 'none',
    shadow: Shadow.sm,
  },
  disabled: {
    bg:     Colors.surface2,
    color:  Colors.textMuted,
    border: `1px solid ${Colors.border}`,
    shadow: Shadow.none,
  },
};

export interface ActionButtonProps {
  variant?: ButtonVariant;
  label: string;
  /** Optional leading icon / emoji */
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Stretch to container width */
  fullWidth?: boolean;
  /** Extra style overrides */
  style?: React.CSSProperties;
}

export function ActionButton({
  variant = 'default',
  label,
  icon,
  onClick,
  disabled = false,
  fullWidth = false,
  style: extraStyle,
}: ActionButtonProps) {
  const effectiveVariant: ButtonVariant = disabled ? 'disabled' : variant;
  const cfg = VARIANTS[effectiveVariant];

  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', ...Animation.springs.snappy }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${Spacing.xs}px`,
        background: cfg.bg,
        color: cfg.color,
        border: cfg.border,
        borderRadius: `${Radius.md}px`,
        boxShadow: cfg.shadow,
        padding: `${Spacing.sm}px ${Spacing.base}px`,
        fontSize: `${Typography.size.sm}px`,
        fontFamily: Typography.family.sans,
        fontWeight: Typography.weight.semibold,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.55 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...extraStyle,
      }}
    >
      {icon && <span style={{ fontSize: '1em', lineHeight: 1 }}>{icon}</span>}
      {label}
    </motion.button>
  );
}
