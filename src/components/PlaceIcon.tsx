// src/components/PlaceIcon.tsx
// Renders a Phosphor icon for a place/stop/booking emoji string.
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
  const { Icon, color: defaultColor } = entry;
  return <Icon size={size} weight={weight} color={color ?? defaultColor} />;
}
