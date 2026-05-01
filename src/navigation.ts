export type FilterId = 'all' | 'restaurant' | 'hike' | 'bar' | 'sights' | 'activity';
export type ExploreDeepLink = { filter: FilterId; stopId?: string };
export type JernieDeepLink = { stopId?: string; dayId?: string; itemId?: string };

let _pending: ExploreDeepLink | null = null;
let _pendingJernie: JernieDeepLink | null = null;

export const navigation = {
  scheduleExplore(link: ExploreDeepLink) { _pending = link; },
  consumeExplore(): ExploreDeepLink | null { const r = _pending; _pending = null; return r; },
  scheduleJernie(link: JernieDeepLink) { _pendingJernie = link; },
  consumeJernie(): JernieDeepLink | null { const r = _pendingJernie; _pendingJernie = null; return r; },
};
