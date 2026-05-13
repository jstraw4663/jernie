import { useEffect, useState } from 'react';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { authReady, firestore } from '../lib/firebase';
import { shouldReadFirestore, markRead } from '../lib/refreshScheduler';

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

// Prevents duplicate API calls when a component remounts or multiple hook instances
// (Jernie-PWA + OverviewScreen + ExploreScreen) run concurrently for the same place.
const inFlight = new Set<string>();

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// Netlify function accepts max 20 places per request.
const BATCH_SIZE = 20;

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

      let firestoreMap: Record<string, T> = {};

      if (shouldReadFirestore(inflightPrefix)) {
        let snapshot;
        try {
          snapshot = await getDocs(colRef);
        } catch (err) {
          console.warn(`[${options.label}] Firestore read failed:`, err);
          return;
        }
        if (cancelled) return;

        snapshot.forEach(docSnap => {
          firestoreMap[docSnap.id] = docSnap.data() as T;
        });

        markRead(inflightPrefix);

        if (Object.keys(firestoreMap).length > 0) {
          setEnrichmentMap(prev => ({ ...prev, ...firestoreMap }));
        }
      }

      if (!navigator.onLine) return;

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
      dedupedNeedsRefresh.forEach(e => inFlight.add(`${inflightPrefix}:${e.id}`));

      // Fetch in parallel batches of BATCH_SIZE — Netlify function caps at 20 per request.
      const batches = chunkArray(dedupedNeedsRefresh, BATCH_SIZE);
      const batchResults = await Promise.all(
        batches.map(batch =>
          fetch(options.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-App-Token': import.meta.env.VITE_APP_SECRET ?? '',
            },
            body: JSON.stringify({ tripId, places: batch.map(options.buildPayload) }),
          })
            .then(r => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.json() as Promise<Record<string, T | null>>;
            })
            .catch(err => {
              console.warn(`[${options.label}] Fetch failed:`, err);
              return {} as Record<string, T | null>;
            })
        )
      );

      dedupedNeedsRefresh.forEach(e => inFlight.delete(`${inflightPrefix}:${e.id}`));

      if (cancelled) return;

      const freshData: Record<string, T | null> = Object.assign({}, ...batchResults);
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
