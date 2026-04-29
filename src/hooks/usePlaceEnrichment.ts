import type { Place, PlaceEnrichment } from '../types';
import { useFirestoreEnrichment } from './useFirestoreEnrichment';

const ENRICHABLE_CATEGORIES = new Set([
  'restaurant', 'bar', 'attraction', 'museum',
  'sight', 'shop', 'beach', 'hotel', 'activity', 'other',
  'hike', // photos via Google Places; trail metadata handled separately by useTrailEnrichment
]);

export function usePlaceEnrichment(
  tripId: string,
  places: Place[],
): Record<string, PlaceEnrichment> {
  return useFirestoreEnrichment<PlaceEnrichment, Place>(tripId, places, {
    rootCollection: 'place_enrichment',
    scoped: false,
    endpoint: '/.netlify/functions/place-details',
    ttlMs: 24 * 60 * 60 * 1000,
    filterEntities: ps => ps.filter(p => ENRICHABLE_CATEGORIES.has(p.category)),
    buildPayload: p => ({ id: p.id, name: p.name, addr: p.addr ?? undefined }),
    label: 'usePlaceEnrichment',
  });
}
