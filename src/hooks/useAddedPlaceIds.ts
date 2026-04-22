import { useMemo } from 'react';
import type { CustomItem } from '../types';

interface TripDataMinimal {
  itinerary_items: Array<{ place_id?: string | null }>;
}

export function useAddedPlaceIds(
  data: TripDataMinimal | null | undefined,
  customItems: Record<string, CustomItem>,
): Set<string> {
  return useMemo(() => {
    const ids = new Set<string>();
    data?.itinerary_items.forEach(i => { if (i.place_id) ids.add(i.place_id); });
    Object.values(customItems).forEach(i => { if (i.source_place_id) ids.add(i.source_place_id); });
    return ids;
  }, [data, customItems]);
}
