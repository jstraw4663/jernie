// DetailFallbackState — shown inside a detail section when content is unavailable.
// Used by DetailMap when coordinates are missing, and as a generic empty-state block.

import type { ReactNode } from 'react';
import { Colors, Spacing, Typography, Radius } from '../../../design/tokens';

interface DetailFallbackStateProps {
  message: string;
  emoji?: ReactNode;
}

export function DetailFallbackState({ message, emoji = '📭' }: DetailFallbackStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${Spacing.sm}px`,
        padding: `${Spacing.xl}px ${Spacing.base}px`,
        background: Colors.surface2,
        borderRadius: `${Radius.md}px`,
        border: `1px dashed ${Colors.border}`,
      }}
    >
      <span style={{ lineHeight: 1 }}>{emoji}</span>
      <span
        style={{
          fontFamily: Typography.family,
          fontSize: `${Typography.size.sm}px`,
          color: Colors.textMuted,
          textAlign: 'center',
          lineHeight: Typography.lineHeight.normal,
          fontStyle: 'italic',
        }}
      >
        {message}
      </span>
    </div>
  );
}
