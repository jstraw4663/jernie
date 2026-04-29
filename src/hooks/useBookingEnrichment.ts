import type { Booking, PlaceEnrichment } from '../types';
import { useFirestoreEnrichment } from './useFirestoreEnrichment';

export function useBookingEnrichment(
  tripId: string,
  bookings: Booking[],
): Record<string, PlaceEnrichment> {
  return useFirestoreEnrichment<PlaceEnrichment, Booking>(tripId, bookings, {
    rootCollection: 'place_enrichment',
    scoped: false,
    endpoint: '/.netlify/functions/place-details',
    ttlMs: 24 * 60 * 60 * 1000,
    filterEntities: bs => bs.filter(b => b.type === 'accommodation'),
    buildPayload: b => ({ id: b.id, name: b.label, addr: b.addr ?? undefined }),
    label: 'useBookingEnrichment',
  });
}
