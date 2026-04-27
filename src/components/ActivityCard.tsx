// ActivityCard — token-driven card for non-restaurant places (hikes, attractions, etc).
// Rendered by PlaceCard when place.category !== 'restaurant'.
//
// Layout: emoji column + content column.
// Content: name link + badges row, then difficulty/distance/duration chips, then note.
//
// PLATFORM NOTE:
//   All values from design tokens — no hardcoded hex.
//   React Native migration: <View>/<Text>/<Pressable> with StyleSheet from same tokens.

import type { Place, PlaceEnrichment, TrailEnrichment } from '../types';
import { Badge } from './Badge';
import { Icons } from '../design/icons';
import { Colors, Shadow, Radius, Spacing, Typography } from '../design/tokens';
import { ItineraryBadge } from './ItineraryBadge';
import { ROUTE_TYPE_LABELS } from '../domain/hike';
import { PlaceIcon } from './PlaceIcon';

interface ActivityCardProps {
  place: Place;
  accent: string;
  enrichment?: PlaceEnrichment;
  trailEnrichment?: TrailEnrichment;
  isAdded?: boolean;
  hideNote?: boolean;
  onAddToItinerary?: (place: Place) => void;
  onExpand?: (place: Place, rect: DOMRect) => void;
}

const DIFFICULTY_STYLES: Record<string, { bg: string; color: string }> = {
  strenuous: { bg: Colors.redLight,     color: Colors.red },
  moderate:  { bg: Colors.goldLight,    color: Colors.gold },
  easy:      { bg: Colors.successLight, color: Colors.success },
};

export function ActivityCard({ place, accent, enrichment, trailEnrichment, isAdded, hideNote, onAddToItinerary, onExpand }: ActivityCardProps) {
  const isAllTrails = place.url?.includes('alltrails.com');
  const isHike = place.category === 'hike';
  const displayRating = enrichment?.rating ?? place.rating;
  const ratingCount = enrichment?.user_ratings_total ?? null;
  const displayPrice = enrichment?.price_level ?? place.price;
  const difficultyStyle = place.difficulty
    ? (DIFFICULTY_STYLES[place.difficulty.toLowerCase()] ?? DIFFICULTY_STYLES.easy)
    : null;

  return (
    <div
      onClick={onExpand ? (e) => onExpand(place, (e.currentTarget as HTMLElement).getBoundingClientRect()) : undefined}
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
        cursor: onExpand ? 'pointer' : 'default',
      }}
    >
      {onAddToItinerary && (
        <ItineraryBadge place={place} isAdded={isAdded} accent={accent} onAdd={onAddToItinerary} />
      )}

      {/* Left column: category icon */}
      <div style={{ flexShrink: 0, lineHeight: 1, marginTop: 1, width: 22, textAlign: 'center' }}>
        <PlaceIcon emoji={place.emoji} size={22} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {/* Name + badge row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: `${Spacing.sm}px`, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontWeight: Typography.weight.bold, fontSize: `${Typography.size.sm + 1}px` }}>{place.name}</span>
          {isHike && isAllTrails && <Badge variant="bookNow" href={undefined} label="AllTrails" />}
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
              <span style={{ fontSize: `${Typography.size.xs - 1}px`, background: '#F0F4FF', color: '#3557A0', padding: `1px ${Spacing.sm}px`, borderRadius: `${Radius.full}px`, letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Icons.Ruler size={10} weight="regular" /> {place.distance}
              </span>
            )}
            {place.duration && (
              <span style={{ fontSize: `${Typography.size.xs - 1}px`, background: '#F5F0FF', color: '#5B3FA6', padding: `1px ${Spacing.sm}px`, borderRadius: `${Radius.full}px`, letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Icons.Timer size={10} weight="regular" /> {place.duration}
              </span>
            )}
            {(() => {
              const rt = place.route_type ?? trailEnrichment?.route_type;
              return rt && ROUTE_TYPE_LABELS[rt] ? (
                <span style={{ fontSize: `${Typography.size.xs - 1}px`, background: '#F0F4FF', color: '#3557A0', padding: `1px ${Spacing.sm}px`, borderRadius: `${Radius.full}px`, letterSpacing: '0.04em' }}>
                  {ROUTE_TYPE_LABELS[rt]}
                </span>
              ) : null;
            })()}
          </div>
        )}

        {/* Google rating + price — shown for non-hike enrichable places */}
        {!isHike && displayRating != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: `${Spacing.sm}px`, marginBottom: `${Spacing.xs}px`, flexWrap: 'wrap' }}>
            <span style={{ fontSize: `${Typography.size.xs}px`, color: '#F59E0B' }}>
              {'★'.repeat(Math.round(displayRating))}{'★'.repeat(5 - Math.round(displayRating)).replace(/★/g, '☆')}
            </span>
            <span style={{ color: Colors.textMuted, fontSize: `${Typography.size.xs}px` }}>
              {displayRating}
              {ratingCount != null && ` (${ratingCount.toLocaleString()})`}
            </span>
            {displayPrice && (
              <span style={{ color: Colors.textMuted, fontSize: `${Typography.size.xs}px` }}>{displayPrice}</span>
            )}
          </div>
        )}

        {/* Note */}
        {!hideNote && place.note && (
          <div style={{ color: Colors.textSecondary, fontSize: `${Typography.size.sm}px`, lineHeight: Typography.lineHeight.normal, marginTop: 3 }}>
            {place.note}
          </div>
        )}
      </div>
    </div>
  );
}
