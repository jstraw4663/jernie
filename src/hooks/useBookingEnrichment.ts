import { useRef, useEffect, useState, useCallback } from 'react';
import { ref as dbRef, get, set } from 'firebase/database';
import { doc, setDoc } from 'firebase/firestore';
import type { Booking, PlaceEnrichment } from '../types';
import { useFirestoreEnrichment } from './useFirestoreEnrichment';
import { db, firestore, authReady } from '../lib/firebase';

export function useBookingEnrichment(
  tripId: string,
  bookings: Booking[],
): {
  enrichmentMap: Record<string, PlaceEnrichment>;
  saveOverride: (bookingId: string, googlePlaceId: string) => Promise<void>;
} {
  const overridesRef = useRef<Record<string, string>>({});
  const [localEnrichment, setLocalEnrichment] = useState<Record<string, PlaceEnrichment>>({});

  useEffect(() => {
    if (!tripId) return;
    authReady.then(() => {
      get(dbRef(db, `trips/${tripId}/booking_place_overrides`)).then(snap => {
        if (snap.exists()) overridesRef.current = snap.val() as Record<string, string>;
      }).catch(() => {/* non-fatal */});
    });
  }, [tripId]);

  const baseEnrichmentMap = useFirestoreEnrichment<PlaceEnrichment, Booking>(tripId, bookings, {
    rootCollection: 'place_enrichment',
    scoped: true,
    subcollection: ['places'],
    endpoint: '/.netlify/functions/place-details',
    ttlMs: 14 * 24 * 60 * 60 * 1000,
    filterEntities: bs => bs.filter(b => b.type === 'accommodation'),
    buildPayload: b => ({
      id: b.id,
      name: b.label.split(' — ')[0].trim(),
      addr: b.addr ?? undefined,
      ...(overridesRef.current[b.id] ? { google_place_id: overridesRef.current[b.id] } : {}),
    }),
    label: 'useBookingEnrichment',
  });

  const saveOverride = useCallback(async (bookingId: string, googlePlaceId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    await authReady;

    // RTDB persists the override for future sessions; fetch uses the verified ID to bypass text search.
    overridesRef.current = { ...overridesRef.current, [bookingId]: googlePlaceId };
    const [, res] = await Promise.all([
      set(dbRef(db, `trips/${tripId}/booking_place_overrides/${bookingId}`), googlePlaceId),
      fetch('/.netlify/functions/place-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Token': import.meta.env.VITE_APP_SECRET ?? '' },
        body: JSON.stringify({
          tripId,
          places: [{ id: bookingId, name: booking.label, addr: booking.addr ?? undefined, google_place_id: googlePlaceId }],
        }),
      }),
    ]);
    if (!res.ok) throw new Error(`Enrichment fetch failed: ${res.status}`);
    const data: Record<string, PlaceEnrichment | null> = await res.json();
    const enrichment = data[bookingId];
    if (!enrichment) throw new Error('No enrichment returned for this Place ID');

    await setDoc(doc(firestore, 'place_enrichment', tripId, 'places', bookingId), enrichment, { merge: true });
    setLocalEnrichment(prev => ({ ...prev, [bookingId]: enrichment })); // immediate update — no TTL wait
  }, [tripId, bookings]);

  return {
    enrichmentMap: { ...baseEnrichmentMap, ...localEnrichment },
    saveOverride,
  };
}
