import type { Place } from '../types';
import { Colors, Spacing, Radius } from '../design/tokens';

interface ItineraryBadgeProps {
  place: Place;
  isAdded?: boolean;
  accent: string;
  onAdd: (place: Place) => void;
  top?: number;
  right?: number;
  zIndex?: number;
}

export function ItineraryBadge({ place, isAdded, accent, onAdd, top = Spacing.sm, right = Spacing.sm, zIndex = 1 }: ItineraryBadgeProps) {
  return (
    <button
      onClick={(e) => { if (!isAdded) { e.stopPropagation(); onAdd(place); } }}
      title={isAdded ? 'View details' : 'Add to itinerary'}
      style={{
        position: 'absolute',
        top: `${top}px`,
        right: `${right}px`,
        width: 24,
        height: 24,
        borderRadius: `${Radius.full}px`,
        background: isAdded ? Colors.gold : accent,
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontSize: isAdded ? '0.75rem' : '1rem',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        zIndex,
      }}
    >
      {isAdded ? '✓' : '+'}
    </button>
  );
}
