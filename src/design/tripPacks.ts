// TRIP PACKS — Per-trip design theme data.
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
      portland:  { primary: '#B44F1E', tint: '#F8E4D7' },  // lobster terracotta
      barharbor: { primary: '#2F6B47', tint: '#E0EDDF' },  // spruce forest
      swh:       { primary: '#5A7082', tint: '#DFE5EE' },  // granite harbor
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

export function getTripPack(tripId: string): TripPack | undefined {
  return TRIP_PACKS[tripId];
}

export function getStopPack(tripId: string, stopId: string): StopPack | undefined {
  return TRIP_PACKS[tripId]?.stops[stopId];
}
