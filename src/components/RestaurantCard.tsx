// RestaurantCard — token-driven card for restaurant places.
// Rendered by PlaceCard when place.category === 'restaurant'.
//
// Layout: left column (Must badge or spacer) + content column.
// Content: emoji + name link + subcategory + badges, then rating + price row, then note.
//
// PLATFORM NOTE:
//   All values from design tokens — no hardcoded hex.
//   React Native migration: <View>/<Text>/<Pressable> with StyleSheet from same tokens.

import type { Place } from '../types';
import { Badge } from './Badge';
import { Colors, Shadow, Radius, Spacing, Typography } from '../design/tokens';

interface RestaurantCardProps {
  place: Place;
  accent: string;
  onAddToItinerary?: (place: Place) => void;
  onExpand?: (place: Place) => void; // future hook — not wired yet
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: `${Typography.size.xs - 1}px` }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          style={{ color: i <= full ? '#F59E0B' : i === full + 1 && half ? '#F59E0B' : Colors.border, fontSize: `${Typography.size.xs}px` }}
        >
          {i <= full ? '★' : i === full + 1 && half ? '⯨' : '★'}
        </span>
      ))}
      <span style={{ color: Colors.textMuted, marginLeft: 3, fontFamily: Typography.family }}>{rating}</span>
    </span>
  );
}

function PriceBadge({ price }: { price: string }) {
  const n = price.length;
  return (
    <span style={{ display: 'inline-flex', letterSpacing: '0.01em', fontSize: `${Typography.size.sm - 1}px` }}>
      {[1, 2, 3, 4].map(i => (
        <span key={i} style={{ color: i <= n ? Colors.success : Colors.border, fontWeight: i <= n ? Typography.weight.semibold : Typography.weight.regular }}>
          $
        </span>
      ))}
    </span>
  );
}

export function RestaurantCard({ place, accent, onAddToItinerary }: RestaurantCardProps) {
  return (
    <div
      style={{
        background: Colors.surface,
        borderRadius: `${Radius.md}px`,
        padding: `${Spacing.base}px ${Spacing.lg}px`,
        border: `1px solid ${place.must ? accent + '40' : Colors.border}`,
        display: 'flex',
        gap: `${Spacing.md}px`,
        alignItems: 'flex-start',
        boxShadow: place.must ? `0 2px 10px ${accent}12` : Shadow.cardResting,
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

      {/* Left column: Must badge or spacer */}
      {place.must
        ? <div style={{ flexShrink: 0, marginTop: 2 }}><Badge variant="confirmed" accentColor={accent} label="Must" /></div>
        : <div style={{ width: 36, flexShrink: 0 }} />
      }

      {/* Content */}
      <div style={{ flex: 1 }}>
        {/* Name row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: `${Spacing.sm}px`, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>{place.emoji}</span>
          {place.url
            ? <a href={place.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: Typography.weight.bold, fontSize: `${Typography.size.base - 1}px`, color: Colors.textPrimary, textDecoration: 'none', borderBottom: `1px dotted ${Colors.border}` }}>{place.name}</a>
            : <span style={{ fontWeight: Typography.weight.bold, fontSize: `${Typography.size.base - 1}px` }}>{place.name}</span>
          }
          <span style={{ fontSize: `${Typography.size.xs + 1}px`, color: Colors.textMuted, fontStyle: 'italic' }}>{place.subcategory.replace(/-/g, ' ')}</span>
          {place.attribution_handle === 'stacy' && <Badge variant="note" label="Stacy's Find" />}
          {place.flag && <Badge variant="alert" label={`⚠ ${place.flag}`} />}
        </div>

        {/* Rating + price row */}
        {place.rating != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: `${Spacing.sm}px`, marginBottom: `${Spacing.xs}px`, flexWrap: 'wrap' }}>
            <StarRating rating={place.rating} />
            {place.price && <PriceBadge price={place.price} />}
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
