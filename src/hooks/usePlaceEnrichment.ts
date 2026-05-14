import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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

// Place with a confirmed google_place_id — required for the reviews phase.
interface ReviewablePlace extends Place {
  google_place_id: string;
}

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

  // Phase 1 — Core: Pro-tier fields, 14-day TTL.
  // Includes rating, hours, phone, photos, website. No Enterprise fields.
  const baseEnrichmentMap = useFirestoreEnrichment<PlaceEnrichment, Place>(tripId, places, {
    rootCollection: 'place_enrichment',
    scoped: true,
    subcollection: ['places'],
    endpoint: '/.netlify/functions/place-details',
    ttlMs: 14 * 24 * 60 * 60 * 1000,
    filterEntities: ps => ps.filter(p => ENRICHABLE_CATEGORIES.has(p.category)),
    buildPayload: p => ({
      id: p.id,
      name: p.name,
      addr: p.addr ?? undefined,
      // Pass the verified Place ID when known — skips Text Search entirely.
      // Sources in priority order: RTDB override (Fix Match), trip.json provider_id.
      google_place_id: overridesRef.current[p.id] ?? p.provider_id ?? undefined,
    }),
    label: 'usePlaceEnrichment:core',
  });

  // Phase 2 — Reviews: Enterprise-tier fields only, 60-day TTL.
  // Fetched separately so they don't elevate the core phase to Enterprise billing.
  // Only fires for places where google_place_id is already resolved (no Text Search).
  const reviewablePlaces = useMemo<ReviewablePlace[]>(() => {
    return places.flatMap(p => {
      const gid =
        overridesRef.current[p.id] ??
        baseEnrichmentMap[p.id]?.google_place_id ??
        p.provider_id ??
        null;
      if (!gid || !ENRICHABLE_CATEGORIES.has(p.category)) return [];
      return [{ ...p, google_place_id: gid }];
    });
  // baseEnrichmentMap included so reviews phase activates after core resolves google_place_id
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, baseEnrichmentMap]);

  const reviewsEnrichmentMap = useFirestoreEnrichment<PlaceEnrichment, ReviewablePlace>(
    tripId,
    reviewablePlaces,
    {
      rootCollection: 'place_enrichment',
      scoped: true,
      subcollection: ['places'],
      endpoint: '/.netlify/functions/place-details',
      ttlMs: 60 * 24 * 60 * 60 * 1000,
      ttlField: 'reviews_cached_at',
      sessionKey: 'place_enrichment_reviews',
      extraBody: { mode: 'reviews' },
      filterEntities: ps => ps,
      buildPayload: p => ({
        id: p.id,
        google_place_id: p.google_place_id,
      }),
      label: 'usePlaceEnrichment:reviews',
    },
  );

  // Merge all three sources per-entity. Reviews data is sparse (only Enterprise fields)
  // so it must be merged into base rather than replacing it.
  const enrichmentMap = useMemo<Record<string, PlaceEnrichment>>(() => {
    const merged: Record<string, PlaceEnrichment> = { ...baseEnrichmentMap };
    for (const [id, reviews] of Object.entries(reviewsEnrichmentMap)) {
      if (reviews) merged[id] = { ...(merged[id] ?? {} as PlaceEnrichment), ...reviews };
    }
    for (const [id, local] of Object.entries(localEnrichment)) {
      if (local) merged[id] = { ...(merged[id] ?? {} as PlaceEnrichment), ...local };
    }
    return merged;
  }, [baseEnrichmentMap, reviewsEnrichmentMap, localEnrichment]);

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

    await setDoc(doc(firestore, 'place_enrichment', tripId, 'places', placeId), enrichment, { merge: true });
    setLocalEnrichment(prev => ({ ...prev, [placeId]: enrichment })); // immediate update — no TTL wait
  }, [tripId, places]);

  return { enrichmentMap, saveOverride };
}
