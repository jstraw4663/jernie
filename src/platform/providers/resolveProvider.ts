// resolveProvider — maps a PlaceCategory to the appropriate provider name.
//
// hike → alltrails (trail-specific data: elevation, surface, trailhead)
// everything else → google_places (business info, photos, hours)

import type { PlaceCategory } from '../../types';

export function resolveProvider(category: PlaceCategory): 'google_places' | 'alltrails' {
  return category === 'hike' ? 'alltrails' : 'google_places';
}
