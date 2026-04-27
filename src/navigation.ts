export type FilterId = 'all' | 'restaurant' | 'hike' | 'bar' | 'sights' | 'activity';
export type ExploreDeepLink = { filter: FilterId; stopId?: string };

let _pending: ExploreDeepLink | null = null;

export const navigation = {
  scheduleExplore(link: ExploreDeepLink) { _pending = link; },
  consumeExplore(): ExploreDeepLink | null { const r = _pending; _pending = null; return r; },
};
