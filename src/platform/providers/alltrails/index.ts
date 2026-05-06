// AllTrailsAdapter — stub implementation for Phase 2.
//
// search() and fetchDetail() are not yet wired to the AllTrails API.
// normalize() converts local Place (hike category) data to a PlaceEntity
// using only fields already available in trip.json — no network call.
//
// TODO (Phase 2): implement search() via AllTrails API
// TODO (Phase 2): implement fetchDetail() via AllTrails API
// TODO (Phase 2): add AllTrails API credentials to .env and Netlify dashboard

import type { Place } from '../../../types';
import type { PlaceEntity, ProviderAdapter } from '../providerTypes';
import { STALENESS_TTL } from '../providerTypes';

export const AllTrailsAdapter: ProviderAdapter = {
  search(_query: string, _stopId: string): Promise<PlaceEntity[]> {
    throw new Error('TODO Phase 2: AllTrails API');
  },

  fetchDetail(_providerId: string): Promise<PlaceEntity> {
    throw new Error('TODO Phase 2: AllTrails API');
  },

  normalize(place: Place): PlaceEntity {
    const now = Date.now();
    const ttl = (STALENESS_TTL[place.category] ?? STALENESS_TTL.other ?? 2592000) * 1000;
    return {
      id: place.id,
      stop_id: place.stop_id,
      category: place.category,
      subcategory: place.subcategory,
      name: place.name,
      emoji: place.emoji,
      note: place.note,
      url: place.url,
      must: place.must,
      rating: place.rating,
      source: place.source,
      attribution_handle: place.attribution_handle,
      group_ids: place.group_ids,
      flag: place.flag,
      price: place.price,
      difficulty: place.difficulty,
      duration: place.duration,
      distance: place.distance,
      photo_url: place.photo_url,
      addr: place.addr,
      lat: place.lat,
      lon: place.lon,
      provider_id: place.provider_id,
      provider: 'alltrails',
      // Hike-specific fields from trip.json enrichment
      hike: {
        trailhead: undefined,
        elevationGain: undefined,
        surface: undefined,
      },
      fetchedAt: now,
      updatedAt: now,
      staleAfter: now + ttl,
    };
  },
};
