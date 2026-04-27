// src/components/WeatherIcon.tsx
// Renders a Phosphor icon for a WMO weather emoji string (from wmo(code).e).
// Falls back to the raw emoji if no mapping exists.

import { WEATHER_ICON_MAP } from '../design/icons';

interface Props {
  emoji: string;
  size?: number;
}

export function WeatherIcon({ emoji, size = 18 }: Props) {
  const entry = WEATHER_ICON_MAP[emoji];
  if (!entry) return <span>{emoji}</span>;
  const { Icon, color } = entry;
  return <Icon size={size} weight="duotone" color={color} />;
}
