// placeCache.ts — Firestore-backed cache for PlaceEntity documents.
//
// Single shared collection — the place catalog is environment-agnostic.
// Both local dev and production read/write the same 'places' collection.
// This is intentional: the catalog grows over time and env isolation would fragment it.
//
// Offline behavior: Firestore's persistentLocalCache (configured in firebase.ts)
// makes getCachedPlace() work transparently offline for any doc previously read
// while online — no additional offline logic needed here.
//
// Lookup convention: this is the single path for resolving any place reference —
// Place.id, ItineraryItem.place_id, and CustomItem.source_place_id all resolve here.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import type { PlaceEntity } from '../providers/providerTypes';
import type { PlaceCategory } from '../../types';

// Single collection — no env prefix (shared catalog)
export const PLACES_COLLECTION = 'places';

/**
 * Read a PlaceEntity from Firestore by id.
 * Returns null when the document does not exist or is stale.
 * Works offline when the document was previously fetched (IndexedDB cache).
 */
export async function getCachedPlace(placeId: string): Promise<PlaceEntity | null> {
  try {
    const ref = doc(firestore, PLACES_COLLECTION, placeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const entity = snap.data() as PlaceEntity;
    if (isStale(entity, entity.category)) return null;
    return entity;
  } catch {
    return null;
  }
}

/**
 * Write a PlaceEntity to Firestore at /places/{entity.id}.
 * Overwrites any existing document for the same id.
 */
export async function setCachedPlace(entity: PlaceEntity): Promise<void> {
  const ref = doc(firestore, PLACES_COLLECTION, entity.id);
  await setDoc(ref, entity);
}

/**
 * Returns true when the entity's staleAfter timestamp has passed.
 * Uses the entity's category to cross-reference STALENESS_TTL for logging context
 * but the staleAfter field is authoritative (set at write time by the adapter).
 */
export function isStale(entity: PlaceEntity, category: PlaceCategory): boolean {
  // staleAfter is an absolute ms timestamp set by the adapter at write time
  void category; // category retained for Phase 2 logging/override use
  return Date.now() > entity.staleAfter;
}
