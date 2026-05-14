import { useMemo } from 'react';
import type { CustomItem } from '../types';

interface TripDataMinimal {
  itinerary_items: Array<{ id: string; place_id?: string | null }>;
}

export function useAddedPlaceIds(
  data: TripDataMinimal | null | undefined,
  customItems: Record<string, CustomItem>,
  itineraryOrder: Record<string, string[]>,
): Set<string> {
  return useMemo(() => {
    const ids = new Set<string>();
    // Only count curated items that are still in the live display order.
    // When itineraryOrder is empty (pre-hydration), fall back to static data so there's no flash.
    const orderHydrated = Object.keys(itineraryOrder).length > 0;
    const activeIds = orderHydrated ? new Set(Object.values(itineraryOrder).flat()) : null;
    data?.itinerary_items.forEach(i => {
      if (i.place_id && (!activeIds || activeIds.has(i.id))) ids.add(i.place_id);
    });
    Object.values(customItems).forEach(i => { if (i.source_place_id) ids.add(i.source_place_id); });
    return ids;
  }, [data, customItems, itineraryOrder]);
}
