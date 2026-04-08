// ActivityCard — token-driven card for non-restaurant places (hikes, attractions, etc).
// Rendered by PlaceCard when place.category !== 'restaurant'.
//
// Layout: emoji column + content column.
// Content: name link + badges row, then difficulty/distance/duration chips, then note.
//
// PLATFORM NOTE:
//   All values from design tokens — no hardcoded hex.
//   React Native migration: <View>/<Text>/<Pressable> with StyleSheet from same tokens.

import type { Place } from '../types';
import { Badge } from './Badge';
import { Colors, Shadow, Radius, Spacing, Typography } from '../design/tokens';

interface ActivityCardProps {
  place: Place;
  accent: string;
  onAddToItinerary?: (place: Place) => void;
  onExpand?: (place: Place) => void; // future hook — not wired yet
}

const DIFFICULTY_STYLES: Record<string, { bg: string; color: string }> = {
  strenuous: { bg: Colors.redLight,     color: Colors.red },
  moderate:  { bg: Colors.goldLight,    color: Colors.gold },
  easy:      { bg: Colors.successLight, color: Colors.success },
};

export function ActivityCard({ place, accent, onAddToItinerary }: ActivityCardProps) {
  const isAllTrails = place.url?.includes('alltrails.com');
  const isHike = place.category === 'hike';
  const difficultyStyle = place.difficulty
    ? (DIFFICULTY_STYLES[place.difficulty.toLowerCase()] ?? DIFFICULTY_STYLES.easy)
    : null;

  return (
    <div
      style={{
        background: Colors.surface,
        borderRadius: `${Radius.md}px`,
        padding: `${Spacing.base}px ${Spacing.lg}px`,
        border: `1px solid ${Colors.border}`,
        display: 'flex',
        gap: `${Spacing.md}px`,
        alignItems: 'flex-start',
        boxShadow: Shadow.cardResting,
        position: 'relative',
      }}
    >
      {onAddToItinerary && (
        <button
          onClick={() => onAddToItinerary(place)}
          title="Add to itinerary"
          style={{
            position: 'absolute',
            top: `${Spacing.sm}px`,
            right: `${Spacing.sm}px`,
            width: 24,
            height: 24,
            borderRadius: `${Radius.full}px`,
            background: accent,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            zIndex: 1,
          }}
        >
          +
        </button>
      )}

      {/* Left column: emoji */}
      <div style={{ fontSize: '1.2rem', flexShrink: 0, lineHeight: 1, marginTop: 1, width: 22, textAlign: 'center' }}>
        {place.emoji}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {/* Name + badge row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: `${Spacing.sm}px`, flexWrap: 'wrap', marginBottom: 3 }}>
          {place.url
            ? <a href={place.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: Typography.weight.bold, fontSize: `${Typography.size.sm + 1}px`, color: Colors.textPrimary, textDecoration: 'none', borderBottom: `1px dotted ${Colors.border}` }}>{place.name}</a>
            : <span style={{ fontWeight: Typography.weight.bold, fontSize: `${Typography.size.sm + 1}px` }}>{place.name}</span>
          }
          {isHike && isAllTrails && <Badge variant="bookNow" href={place.url!} label="🌿 AllTrails" />}
          {place.flag && <Badge variant="alert" label={`⚠ ${place.flag}`} />}
        </div>

        {/* Difficulty / distance / duration chips */}
        {isHike && (place.difficulty || place.duration || place.distance) && (
          <div style={{ display: 'flex', gap: `${Spacing.sm}px`, flexWrap: 'wrap', marginBottom: `${Spacing.xs}px` }}>
            {place.difficulty && difficultyStyle && (
              <span style={{ fontSize: `${Typography.size.xs - 1}px`, background: difficultyStyle.bg, color: difficultyStyle.color, padding: `1px ${Spacing.sm}px`, borderRadius: `${Radius.full}px`, fontWeight: Typography.weight.bold, letterSpacing: '0.04em', textTransform: 'capitalize' }}>
                {place.difficulty}
              </span>
            )}
            {place.distance && (
              <span style={{ fontSize: `${Typography.size.xs - 1}px`, background: '#F0F4FF', color: '#3557A0', padding: `1px ${Spacing.sm}px`, borderRadius: `${Radius.full}px`, letterSpacing: '0.04em' }}>
                📏 {place.distance}
              </span>
            )}
            {place.duration && (
              <span style={{ fontSize: `${Typography.size.xs - 1}px`, background: '#F5F0FF', color: '#5B3FA6', padding: `1px ${Spacing.sm}px`, borderRadius: `${Radius.full}px`, letterSpacing: '0.04em' }}>
                ⏱ {place.duration}
              </span>
            )}
          </div>
        )}

        {/* Note */}
        {place.note && (
          <div style={{ color: Colors.textSecondary, fontSize: `${Typography.size.sm}px`, lineHeight: Typography.lineHeight.normal, marginTop: 3 }}>
            {place.note}
          </div>
        )}
      </div>
    </div>
  );
}
