// src/platform/index.ts — barrel re-export for all platform abstractions.
//
// Import from 'src/platform' rather than deep paths when consuming in feature code.

export type { PlaceEntity, ProviderAdapter, StalenessConfig } from './providers/providerTypes';
export { STALENESS_TTL } from './providers/providerTypes';
export { resolveProvider } from './providers/resolveProvider';
export { getCachedPlace, setCachedPlace, isStale, PLACES_COLLECTION } from './cache/placeCache';
