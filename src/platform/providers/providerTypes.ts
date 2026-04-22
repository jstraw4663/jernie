// providerTypes.ts — canonical schema for enriched place data and provider adapters.
//
// PlaceEntity is the single normalized record written to and read from Firestore.
// ProviderAdapters produce PlaceEntity from their respective APIs.
// StalenessConfig controls how long a cached record is considered fresh by category.

import type { Place, PlaceCategory } from '../../types';

// ── PlaceEntity ───────────────────────────────────────────────────────────────
// Mirrors all Place fields plus provider-fetched enrichment.
// Stored in Firestore /places/{id}. Keyed by Place.id.

export interface PlaceEntity {
  // Core identity — mirrors Place
  id: string;
  stop_id: string;
  category: PlaceCategory;
  subcategory: string;
  name: string;
  emoji: string;
  note: string | null;
  url: string | null;
  must: boolean;
  rating: number | null;
  source: 'guide' | 'community';
  attribution_handle: string | null;
  group_ids: string[] | null;
  flag: string | null;
  price: string | null;
  difficulty: string | null;
  duration: string | null;
  distance: string | null;
  // Enrichment fields (from trip.json or provider)
  photo_url?: string | null;
  phone?: string | null;
  addr?: string | null;
  lat?: number | null;
  lon?: number | null;
  provider_id?: string | null;
  provider?: 'google_places' | 'alltrails' | 'manual' | null;
  // Provider-fetched enrichment
  heroImage?: string | null;   // full-resolution hero photo URL
  photos?: string[];            // additional photo URLs
  // Category-specific extensions
  hike?: {
    trailhead?: string;
    elevationGain?: string;
    surface?: string;
    routeType?: 'loop' | 'out-and-back' | 'point-to-point';
    dogsAllowed?: boolean;
    features?: string[];
  };
  dining?: {
    cuisine?: string;
    reservations?: boolean;
    openHours?: string;
  };
  lodging?: {
    checkIn?: string;
    checkOut?: string;
    amenities?: string[];
  };
  activity?: {
    bookingRequired?: boolean;
    minAge?: number;
  };
  // Cache metadata — managed by placeCache.ts, not by providers
  fetchedAt: number;    // Date.now() at write time
  updatedAt: number;    // Date.now() at last provider update
  staleAfter: number;   // absolute ms timestamp: fetchedAt + TTL ms
}

// ── ProviderAdapter ───────────────────────────────────────────────────────────
// Implemented by GooglePlacesAdapter and AllTrailsAdapter.
// search() and fetchDetail() are Phase 2 — stubs throw until wired.
// normalize() is available now — converts local Place data to PlaceEntity shape.

export interface ProviderAdapter {
  search(query: string, stopId: string): Promise<PlaceEntity[]>;
  fetchDetail(providerId: string): Promise<PlaceEntity>;
  normalize(place: Place): PlaceEntity;
}

// ── StalenessConfig ───────────────────────────────────────────────────────────
// TTL in seconds. isStale() in placeCache converts to ms for comparison.

export type StalenessConfig = Partial<Record<PlaceCategory, number>>;

export const STALENESS_TTL: StalenessConfig = {
  restaurant:  604800,   // 7 days
  bar:         604800,   // 7 days
  activity:    604800,   // 7 days
  shop:        1209600,  // 14 days
  hotel:       1209600,  // 14 days
  hike:        2592000,  // 30 days
  attraction:  2592000,  // 30 days
  museum:      2592000,  // 30 days
  sight:       5184000,  // 60 days
  beach:       5184000,  // 60 days
  other:       2592000,  // 30 days
};
