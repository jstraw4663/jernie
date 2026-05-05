// src/design/EntryIcon.tsx
// Renders any IconEntry — either a Phosphor component or a masked flat icon.
// Image icons use CSS mask-image so entry.color (design token) fills the shape.
// IconWeight re-exported so callers never import directly from @phosphor-icons/react.

import type { CSSProperties } from 'react';
import type { IconWeight } from '@phosphor-icons/react';
import type { IconEntry } from './icons';

export type { IconWeight };

interface Props {
  entry: IconEntry;
  size?: number;
  weight?: IconWeight;
}

const maskStyle = (src: string, color: string, size: number): CSSProperties => ({
  display: 'inline-block',
  width: size,
  height: size,
  flexShrink: 0,
  backgroundColor: color,
  WebkitMaskImage: `url(${src})`,
  WebkitMaskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskImage: `url(${src})`,
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
});

export function EntryIcon({ entry, size = 16, weight = 'regular' }: Props) {
  if (entry.kind === 'image') {
    return <span style={maskStyle(entry.src, entry.color, size)} aria-hidden="true" />;
  }
  return <entry.Icon size={size} weight={weight} color={entry.color} />;
}
