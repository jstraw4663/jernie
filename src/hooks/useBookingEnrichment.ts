// useBookingEnrichment — loads Google Places enrichment for accommodation bookings.
//
// Parallel to usePlaceEnrichment but keyed to Booking objects (type === 'accommodation').
// Firestore path: place_enrichment/{tripId}/bookings/{bookingId}
//
// Data flow:
//   1. Read Firestore collection place_enrichment/{tripId}/bookings (one read)
//   2. Identify stale (>24hr) or missing entries
//   3. POST stale/missing bookings to /.netlify/functions/place-details
//   4. Write results back to Firestore
//   5. Return enrichment map keyed by booking.id
//
// Offline: Firestore persistentLocalCache() handles reads from IndexedDB automatically.

import { useEffect, useState } from 'react';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { authReady, firestore } from '../lib/firebase';
import type { Booking, PlaceEnrichment } from '../types';

const PLACE_DETAILS_URL = '/.netlify/functions/place-details';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useBookingEnrichment(
  tripId: string,
  bookings: Booking[],
): Record<string, PlaceEnrichment> {
  const [enrichmentMap, setEnrichmentMap] = useState<Record<string, PlaceEnrichment>>({});

  useEffect(() => {
    if (!tripId || bookings.length === 0) return;

    let cancelled = false;

    async function load() {
      await authReady;
      // 1. Read all existing enrichment docs for this trip's bookings in one collection read
      const colRef = collection(firestore, 'place_enrichment', tripId, 'bookings');
      let snapshot;
      try {
        snapshot = await getDocs(colRef);
      } catch (err) {
        console.warn('[useBookingEnrichment] Firestore read failed:', err);
        return;
      }
      if (cancelled) return;

      // Build map from Firestore
      const firestoreMap: Record<string, PlaceEnrichment> = {};
      snapshot.forEach(docSnap => {
        firestoreMap[docSnap.id] = docSnap.data() as PlaceEnrichment;
      });

      // Immediately surface what we have (cached data shows instantly)
      if (Object.keys(firestoreMap).length > 0) {
        setEnrichmentMap(prev => ({ ...prev, ...firestoreMap }));
      }

      // 2. Find stale or missing bookings to refresh
      const now = Date.now();
      const needsRefresh = bookings.filter(b => {
        const cached = firestoreMap[b.id];
        return !cached || (now - cached.cached_at) > TTL_MS;
      });

      if (needsRefresh.length === 0) return;

      // 3. Fetch from Netlify function
      let freshData: Record<string, PlaceEnrichment | null>;
      try {
        const res = await fetch(PLACE_DETAILS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId,
            places: needsRefresh.map(b => ({ id: b.id, name: b.label, addr: b.addr ?? undefined })),
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        freshData = await res.json();
      } catch (err) {
        console.warn('[useBookingEnrichment] Fetch failed:', err);
        return;
      }
      if (cancelled) return;

      // 4. Write successful results back to Firestore and update state
      const updates: Record<string, PlaceEnrichment> = {};
      const writes: Promise<void>[] = [];

      for (const [bookingId, enrichment] of Object.entries(freshData)) {
        if (!enrichment) continue;
        updates[bookingId] = enrichment;
        const docRef = doc(firestore, 'place_enrichment', tripId, 'bookings', bookingId);
        writes.push(setDoc(docRef, enrichment, { merge: true }));
      }

      // Fire-and-forget Firestore writes — don't block UI on them
      Promise.all(writes).catch(err =>
        console.warn('[useBookingEnrichment] Firestore write failed:', err)
      );

      if (Object.keys(updates).length > 0) {
        setEnrichmentMap(prev => ({ ...prev, ...updates }));
      }
    }

    load();
    return () => { cancelled = true; };
  // Re-run when the stop changes (new set of bookings)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, bookings.map(b => b.id).join(',')]);

  return enrichmentMap;
}
