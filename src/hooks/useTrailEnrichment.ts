import type { Place, TrailEnrichment } from '../types';
import { useFirestoreEnrichment } from './useFirestoreEnrichment';

export function useTrailEnrichment(
  tripId: string,
  places: Place[],
): Record<string, TrailEnrichment> {
  return useFirestoreEnrichment<TrailEnrichment>(tripId, places, {
    rootCollection: 'trail_enrichment',
    subcollection: ['trails'],
    endpoint: '/.netlify/functions/trail-details',
    ttlMs: 30 * 24 * 60 * 60 * 1000,
    filterPlaces: ps => ps.filter(p => p.category === 'hike'),
    buildPayload: p => ({ id: p.id, name: p.name, url: p.url ?? undefined }),
    label: 'useTrailEnrichment',
  });
}
