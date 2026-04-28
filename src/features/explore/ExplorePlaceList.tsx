import { useMemo } from 'react';
import type React from 'react';
import type { Place, PlaceEnrichment, Stop } from '../../types';
import { RestaurantCard } from '../../components/RestaurantCard';
import { ActivityCard } from '../../components/ActivityCard';
import { ScrollReveal } from '../../components/ScrollReveal';
import { Colors, Spacing, Typography, Radius } from '../../design/tokens';

type SortKey = 'rating' | 'price-asc' | 'price-desc' | 'name';

const PRICE_RANK: Record<string, number> = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };

function sortPlaces(places: Place[], enrichmentMap: Record<string, PlaceEnrichment>, sort: SortKey): Place[] {
  return [...places].sort((a, b) => {
    if (sort === 'rating') {
      const ra = enrichmentMap[a.id]?.rating ?? a.rating ?? 0;
      const rb = enrichmentMap[b.id]?.rating ?? b.rating ?? 0;
      return rb - ra;
    }
    if (sort === 'price-asc' || sort === 'price-desc') {
      const pa = PRICE_RANK[enrichmentMap[a.id]?.price_level ?? a.price ?? ''] ?? 99;
      const pb = PRICE_RANK[enrichmentMap[b.id]?.price_level ?? b.price ?? ''] ?? 99;
      return sort === 'price-asc' ? pa - pb : pb - pa;
    }
    return a.name.localeCompare(b.name);
  });
}

interface ExplorePlaceListProps {
  places: Place[];
  stopMap: Record<string, Stop>;
  enrichmentMap: Record<string, PlaceEnrichment>;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onExpand?: (place: Place, rect: DOMRect) => void;
  onAddToItinerary?: (place: Place) => void;
  addedPlaceIds?: Set<string>;
  scrollRoot?: React.RefObject<Element | null>;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rating',     label: 'Top Rated' },
  { value: 'price-asc',  label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'name',       label: 'A – Z' },
];

export function ExplorePlaceList({ places, stopMap, enrichmentMap, sort, onSortChange, onExpand, onAddToItinerary, addedPlaceIds, scrollRoot }: ExplorePlaceListProps) {
  const sorted = useMemo(() => sortPlaces(places, enrichmentMap, sort), [places, enrichmentMap, sort]);

  return (
    <div style={{ paddingBottom: Spacing.xxxl }}>
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${Spacing.lg}px ${Spacing.base}px ${Spacing.sm}px`,
        borderTop: `1px solid ${Colors.border}`,
      }}>
        <span style={{
          fontFamily: Typography.family,
          fontWeight: Typography.weight.bold,
          fontSize: `${Typography.size.base}px`,
          color: Colors.textPrimary,
        }}>
          All Places
          <span style={{ fontWeight: Typography.weight.regular, color: Colors.textMuted, fontSize: `${Typography.size.sm}px`, marginLeft: Spacing.xs }}>
            {sorted.length}
          </span>
        </span>

        {/* Sort selector */}
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value as SortKey)}
          style={{
            fontSize: `${Typography.size.xs + 1}px`,
            color: Colors.textSecondary,
            background: Colors.surface2,
            border: `1px solid ${Colors.border}`,
            borderRadius: `${Radius.md}px`,
            padding: `${Spacing.xs}px ${Spacing.sm}px`,
            cursor: 'pointer',
            fontFamily: Typography.family,
            outline: 'none',
          }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm, padding: `0 ${Spacing.base}px` }}>
        {sorted.map((place, i) => {
          const stop = stopMap[place.stop_id];
          const accent = stop?.accent ?? Colors.navy;
          const enrichment = enrichmentMap[place.id];
          return (
            <ScrollReveal key={place.id} index={i} root={scrollRoot} margin="80px">
              {place.category === 'restaurant'
                ? <RestaurantCard place={place} accent={accent} enrichment={enrichment} isAdded={addedPlaceIds?.has(place.id)} onExpand={onExpand} onAddToItinerary={onAddToItinerary} />
                : <ActivityCard   place={place} accent={accent} enrichment={enrichment} isAdded={addedPlaceIds?.has(place.id)} onExpand={onExpand} onAddToItinerary={onAddToItinerary} />
              }
            </ScrollReveal>
          );
        })}

        {sorted.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: Colors.textMuted,
            fontSize: `${Typography.size.sm}px`,
            padding: `${Spacing.xxl}px 0`,
            fontFamily: Typography.family,
          }}>
            No places match this filter.
          </div>
        )}
      </div>
    </div>
  );
}

export type { SortKey };
