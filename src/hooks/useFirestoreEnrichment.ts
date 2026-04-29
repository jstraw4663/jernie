import { useEffect, useState } from 'react';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { authReady, firestore } from '../lib/firebase';

interface EnrichmentOptions<E extends { id: string }> {
  /** Top-level Firestore collection name, e.g. 'place_enrichment' or 'trail_enrichment' */
  rootCollection: string;
  /**
   * When true (default), tripId is included in the Firestore path for per-trip isolation.
   * When false, the collection is flat: rootCollection/{entityId} — shared across all trips
   * and environments. Use false for place/trail enrichment (data is location-level, not
   * trip-level). Use true for weather (forecasts are date-specific to a trip window).
   */
  scoped?: boolean;
  /** Path segments appended after tripId when scoped=true. Unused when scoped=false. */
  subcollection?: string[];
  endpoint: string;
  ttlMs: number;
  filterEntities: (entities: E[]) => E[];
  buildPayload: (e: E) => object;
  label: string;
}

// Prevents duplicate API calls when a component remounts while a fetch is in progress.
const inFlight = new Set<string>();

export function useFirestoreEnrichment<T extends { cached_at: number }, E extends { id: string }>(
  tripId: string,
  entities: E[],
  options: EnrichmentOptions<E>,
): Record<string, T> {
  const [enrichmentMap, setEnrichmentMap] = useState<Record<string, T>>({});

  useEffect(() => {
    if (!tripId || entities.length === 0) return;

    const filtered = options.filterEntities(entities);
    if (filtered.length === 0) return;

    let cancelled = false;

    async function load() {
      await authReady;
      const scoped = options.scoped !== false;
      const sub = options.subcollection ?? [];
      const colRef = scoped
        ? collection(firestore, options.rootCollection, tripId, ...sub)
        : collection(firestore, options.rootCollection);
      const inflightPrefix = scoped ? `${tripId}:${options.rootCollection}` : options.rootCollection;

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
      const needsRefresh = filtered.filter(e => {
        const cached = firestoreMap[e.id];
        return !cached || (now - cached.cached_at) > options.ttlMs;
      });

      if (needsRefresh.length === 0) return;

      const dedupedNeedsRefresh = needsRefresh.filter(e =>
        !inFlight.has(`${inflightPrefix}:${e.id}`)
      );
      if (dedupedNeedsRefresh.length === 0) return;
      dedupedNeedsRefresh.forEach(e =>
        inFlight.add(`${inflightPrefix}:${e.id}`)
      );

      let freshData: Record<string, T | null>;
      try {
        const res = await fetch(options.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-App-Token': import.meta.env.VITE_APP_SECRET ?? '',
          },
          body: JSON.stringify({ tripId, places: dedupedNeedsRefresh.map(options.buildPayload) }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        freshData = await res.json();
      } catch (err) {
        console.warn(`[${options.label}] Fetch failed:`, err);
        return;
      } finally {
        dedupedNeedsRefresh.forEach(e =>
          inFlight.delete(`${inflightPrefix}:${e.id}`)
        );
      }
      if (cancelled) return;

      const updates: Record<string, T> = {};
      const writes: Promise<void>[] = [];

      for (const [entityId, enrichment] of Object.entries(freshData)) {
        if (!enrichment) continue;
        updates[entityId] = enrichment;
        const docRef = scoped
          ? doc(firestore, options.rootCollection, tripId, ...sub, entityId)
          : doc(firestore, options.rootCollection, entityId);
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
  }, [tripId, entities.map(e => e.id).join(',')]);

  return enrichmentMap;
}
