// src/components/PlaceIcon.tsx
// Renders a flat icon for a place/stop/booking emoji string.
// Image icons use CSS mask-image so entry.color (design token) fills the shape.
// Falls back to the raw emoji if no mapping exists.

import type { IconWeight } from '@phosphor-icons/react';
import { EMOJI_ICON_MAP } from '../design/icons';

// IconWeight imported from Phosphor — PlaceIcon is the one allowed exception since
// it needs to accept the weight prop type. All icon rendering still routes through icons.ts.

interface Props {
  emoji: string;
  size?: number;
  weight?: IconWeight;
  color?: string;
}

export function PlaceIcon({ emoji, size = 20, weight = 'duotone', color }: Props) {
  const entry = EMOJI_ICON_MAP[emoji];
  if (!entry) return <span style={{ fontSize: size * 0.8 }}>{emoji}</span>;
  if (entry.kind === 'image') {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          flexShrink: 0,
          backgroundColor: color ?? entry.color,
          WebkitMaskImage: `url(${entry.src})`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: `url(${entry.src})`,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        }}
      />
    );
  }
  return <entry.Icon size={size} weight={weight} color={color ?? entry.color} />;
}
