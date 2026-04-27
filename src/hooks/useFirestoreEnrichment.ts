import { useEffect, useState } from 'react';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { authReady, firestore } from '../lib/firebase';
import type { Place } from '../types';

interface EnrichmentOptions {
  /** Firestore collection path segments after the tripId, e.g. ['places'] or ['trails'] */
  subcollection: string[];
  /** Top-level Firestore collection name, e.g. 'place_enrichment' or 'trail_enrichment' */
  rootCollection: string;
  endpoint: string;
  ttlMs: number;
  filterPlaces: (places: Place[]) => Place[];
  buildPayload: (p: Place) => object;
  label: string;
}

export function useFirestoreEnrichment<T extends { cached_at: number }>(
  tripId: string,
  places: Place[],
  options: EnrichmentOptions,
): Record<string, T> {
  const [enrichmentMap, setEnrichmentMap] = useState<Record<string, T>>({});

  useEffect(() => {
    if (!tripId || places.length === 0) return;

    const filtered = options.filterPlaces(places);
    if (filtered.length === 0) return;

    let cancelled = false;

    async function load() {
      await authReady;
      const colRef = collection(firestore, options.rootCollection, tripId, ...options.subcollection);
      let snapshot;
      try {
        snapshot = await getDocs(colRef);
      } catch (err) {
        console.warn(`[${options.label}] Firestore read failed:`, err);
        return;
      }
      if (cancelled) return;

      const firestoreMap: Record<string, T> = {};
      snapshot.forEach(docSnap => {
        firestoreMap[docSnap.id] = docSnap.data() as T;
      });

      if (Object.keys(firestoreMap).length > 0) {
        setEnrichmentMap(prev => ({ ...prev, ...firestoreMap }));
      }

      const now = Date.now();
      const needsRefresh = filtered.filter(p => {
        const cached = firestoreMap[p.id];
        return !cached || (now - cached.cached_at) > options.ttlMs;
      });

      if (needsRefresh.length === 0) return;

      let freshData: Record<string, T | null>;
      try {
        const res = await fetch(options.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-App-Token': import.meta.env.VITE_APP_SECRET ?? '',
          },
          body: JSON.stringify({ tripId, places: needsRefresh.map(options.buildPayload) }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        freshData = await res.json();
      } catch (err) {
        console.warn(`[${options.label}] Fetch failed:`, err);
        return;
      }
      if (cancelled) return;

      const updates: Record<string, T> = {};
      const writes: Promise<void>[] = [];

      for (const [placeId, enrichment] of Object.entries(freshData)) {
        if (!enrichment) continue;
        updates[placeId] = enrichment;
        const docRef = doc(firestore, options.rootCollection, tripId, ...options.subcollection, placeId);
        writes.push(setDoc(docRef, enrichment, { merge: true }));
      }

      Promise.all(writes).catch(err =>
        console.warn(`[${options.label}] Firestore write failed:`, err)
      );

      if (Object.keys(updates).length > 0) {
        setEnrichmentMap(prev => ({ ...prev, ...updates }));
      }
    }

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, places.map(p => p.id).join(',')]);

  return enrichmentMap;
}
