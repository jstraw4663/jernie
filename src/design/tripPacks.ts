// TRIP PACKS — Per-trip design theme data.
// resolveStopColor(stop) is the canonical way to get a stop's primary color in any component.
//
// This file is the single source of truth for trip and stop colors.
// It is intentionally separate from trip.json (content data) and
// tokens.ts (universal design system).
//
// ── HOW TO ADD A FUTURE TRIP PACK ────────────────────────────────────────────
//
//  1. Add a new key to TRIP_PACKS below (e.g., "miami").
//  2. Define trip.primary + trip.secondary (the trip shell/header colors).
//  3. Define one entry per stop under stops: { primary, tint }.
//     - primary: the stop's identity color (used for rail, pills, add-buttons)
//     - tint:    a light wash of that color (used for badge backgrounds, card edges)
//  4. Pass tripId="miami" to <TripThemeProvider> — no component changes needed.
//
//  Future: primary + tint will be auto-derived from a single stop seed color.
//          For now, specify both manually to maintain full control.
//
// ── STOP ID CONVENTION ───────────────────────────────────────────────────────
//  Stop IDs here must match Stop.id values in trip.json exactly.
//  (e.g., trip.json "id": "barharbor" → stops.barharbor here)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StopPack {
  primary: string;  // stop identity color
  tint:    string;  // light wash for badge/card backgrounds
}

export interface TripPack {
  id:      string;
  trip: {
    primary:   string;  // trip hero / header background
    secondary: string;  // trip secondary accent (overview, nav)
  };
  stops: Record<string, StopPack>;
}

// ---------------------------------------------------------------------------
// Trip Packs
// ---------------------------------------------------------------------------

export const TRIP_PACKS: Record<string, TripPack> = {
  // ── Maine Coast ────────────────────────────────────────────────────────────
  maine: {
    id: 'maine',
    trip: {
      primary:   '#1E4F73',  // deep coastal blue — trip shell / hero
      secondary: '#2E6B6C',  // teal — overview accents
    },
    stops: {
      portland:  { primary: '#2D6A8F', tint: '#DCE9F2' },  // coastal blue
      barharbor: { primary: '#2F6B47', tint: '#E0EDDF' },  // spruce forest
      swh:       { primary: '#7B3F2B', tint: '#F0E5E1' },  // russet maroon
    },
  },

  // ── Future trips (add packs here) ─────────────────────────────────────────
  // miami: {
  //   id: 'miami',
  //   trip: { primary: '#C0392B', secondary: '#E67E22' },
  //   stops: {
  //     southBeach: { primary: '#C0392B', tint: '#FCEAE8' },
  //     wynwood:    { primary: '#8E44AD', tint: '#F4E8FB' },
  //   },
  // },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Strip 'dev-' prefix and '-YYYY' year suffix so 'maine-2026' and
// 'dev-maine-2026' both resolve to the 'maine' pack key.
function normalizeTripId(tripId: string): string {
  return tripId.replace(/^dev-/, '').replace(/-\d{4}$/, '');
}

export function getTripPack(tripId: string): TripPack | undefined {
  return TRIP_PACKS[normalizeTripId(tripId)];
}

export function getStopPack(tripId: string, stopId: string): StopPack | undefined {
  return TRIP_PACKS[normalizeTripId(tripId)]?.stops[stopId];
}

/** Resolve the primary color for a stop, falling back to design-system navy. */
export function resolveStopColor(stop: { trip_id: string; id: string } | null | undefined): string {
  if (!stop) return '#0D2B3E'; // Colors.navy — avoids circular import
  return TRIP_PACKS[normalizeTripId(stop.trip_id)]?.stops[stop.id]?.primary ?? '#0D2B3E';
}
