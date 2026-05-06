import { useRef, useEffect, useState, useCallback } from 'react';
import { ref as dbRef, get, set } from 'firebase/database';
import { doc, setDoc } from 'firebase/firestore';
import type { Place, PlaceEnrichment } from '../types';
import { useFirestoreEnrichment } from './useFirestoreEnrichment';
import { db, firestore, authReady } from '../lib/firebase';

const ENRICHABLE_CATEGORIES = new Set([
  'restaurant', 'bar', 'attraction', 'museum',
  'sight', 'shop', 'beach', 'hotel', 'activity', 'other',
  'hike', // photos via Google Places; trail metadata handled separately by useTrailEnrichment
]);

export function usePlaceEnrichment(
  tripId: string,
  places: Place[],
): {
  enrichmentMap: Record<string, PlaceEnrichment>;
  saveOverride: (placeId: string, googlePlaceId: string) => Promise<void>;
} {
  // Keyed by place.id → google_place_id override from RTDB
  const overridesRef = useRef<Record<string, string>>({});
  // Local state for immediately-saved overrides (skips the TTL re-fetch cycle)
  const [localEnrichment, setLocalEnrichment] = useState<Record<string, PlaceEnrichment>>({});

  // Load RTDB place overrides once — used in buildPayload for the next enrichment batch.
  useEffect(() => {
    if (!tripId) return;
    authReady.then(() => {
      get(dbRef(db, `trips/${tripId}/place_overrides`)).then(snap => {
        if (snap.exists()) overridesRef.current = snap.val() as Record<string, string>;
      }).catch(() => {/* non-fatal */});
    });
  }, [tripId]);

  const baseEnrichmentMap = useFirestoreEnrichment<PlaceEnrichment, Place>(tripId, places, {
    rootCollection: 'place_enrichment',
    scoped: false,
    endpoint: '/.netlify/functions/place-details',
    ttlMs: 24 * 60 * 60 * 1000,
    filterEntities: ps => ps.filter(p => ENRICHABLE_CATEGORIES.has(p.category)),
    buildPayload: p => ({
      id: p.id,
      name: p.name,
      addr: p.addr ?? undefined,
      // Pass the verified Place ID when an override exists so text search is skipped.
      ...(overridesRef.current[p.id] ? { google_place_id: overridesRef.current[p.id] } : {}),
    }),
    label: 'usePlaceEnrichment',
  });

  // Saves a manual Google Place ID override, immediately re-fetches enrichment for that
  // place with the correct ID, and updates both local state and Firestore cache.
  const saveOverride = useCallback(async (placeId: string, googlePlaceId: string) => {
    const place = places.find(p => p.id === placeId);
    if (!place) throw new Error(`Place ${placeId} not found`);

    await authReady;

    // RTDB persists the override for future sessions; fetch uses the verified ID to bypass text search.
    overridesRef.current = { ...overridesRef.current, [placeId]: googlePlaceId };
    const [, res] = await Promise.all([
      set(dbRef(db, `trips/${tripId}/place_overrides/${placeId}`), googlePlaceId),
      fetch('/.netlify/functions/place-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Token': import.meta.env.VITE_APP_SECRET ?? '' },
        body: JSON.stringify({
          tripId,
          places: [{ id: placeId, name: place.name, addr: place.addr ?? undefined, google_place_id: googlePlaceId }],
        }),
      }),
    ]);
    if (!res.ok) throw new Error(`Enrichment fetch failed: ${res.status}`);
    const data: Record<string, PlaceEnrichment | null> = await res.json();
    const enrichment = data[placeId];
    if (!enrichment) throw new Error('No enrichment returned for this Place ID');

    await setDoc(doc(firestore, 'place_enrichment', placeId), enrichment);
    setLocalEnrichment(prev => ({ ...prev, [placeId]: enrichment })); // immediate update — no TTL wait
  }, [tripId, places]);

  return {
    enrichmentMap: { ...baseEnrichmentMap, ...localEnrichment },
    saveOverride,
  };
}
