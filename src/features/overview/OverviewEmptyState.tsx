import type { ReactNode } from 'react';
import { Colors, Typography, Spacing, Radius } from '../../design/tokens';

interface OverviewEmptyStateProps {
  icon: ReactNode;
  text: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function OverviewEmptyState({ icon, text, ctaLabel, onCta }: OverviewEmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: Spacing.sm,
      padding: `${Spacing.xl}px ${Spacing.base}px`,
      textAlign: 'center',
    }}>
      <span style={{ lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontFamily: Typography.family.sans,
        fontSize: `${Typography.size.sm}px`,
        color: Colors.textMuted,
        lineHeight: Typography.lineHeight.relaxed,
      }}>
        {text}
      </span>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          style={{
            marginTop: Spacing.xs,
            padding: `${Spacing.xs}px ${Spacing.md}px`,
            borderRadius: `${Radius.full}px`,
            border: `1px dashed ${Colors.border}`,
            background: 'transparent',
            color: Colors.textSecondary,
            fontFamily: Typography.family.sans,
            fontSize: `${Typography.size.sm}px`,
            cursor: 'pointer',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
