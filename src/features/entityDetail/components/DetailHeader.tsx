// DetailHeader — external link bar, shown only when externalUrl is present.
// Close is now handled by the X overlay button in DetailHero.

import { Colors, Spacing, Typography, Radius, Shadow } from '../../../design/tokens';

interface DetailHeaderProps {
  externalUrl?: string;
}

export function DetailHeader({ externalUrl }: DetailHeaderProps) {
  if (!externalUrl) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: `${Spacing.sm}px ${Spacing.base}px`,
        borderBottom: `1px solid ${Colors.border}`,
        background: Colors.surface,
        flexShrink: 0,
        boxShadow: Shadow.sm,
      }}
    >
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: `${Spacing.xs}px`,
          background: Colors.navy,
          borderRadius: `${Radius.full}px`,
          padding: `${Spacing.xs}px ${Spacing.md}px`,
          textDecoration: 'none',
          color: Colors.textInverse,
          fontFamily: Typography.family.sans,
          fontSize: `${Typography.size.sm}px`,
          fontWeight: Typography.weight.medium,
        }}
      >
        <span>Open ↗</span>
      </a>
    </div>
  );
}
