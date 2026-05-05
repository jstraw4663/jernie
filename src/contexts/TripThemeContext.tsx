// TripThemeContext — delivers trip and stop color tokens to components.
//
// ── USAGE ────────────────────────────────────────────────────────────────────
//
//   Inside the Jernie tab (single active stop):
//     const { stop, trip } = useTripTheme();
//     <div style={{ background: stop.addButtonBg, color: stop.addButtonText }}>
//       Add to {stopLabel}
//     </div>
//
//   In Overview (multiple stops rendered simultaneously):
//     const theme = getStopTheme('maine', stop.id);
//     <div style={{ color: theme.cardHeading }}>{stop.city}</div>
//
// ── RULES ────────────────────────────────────────────────────────────────────
//   - useTripTheme() is only valid inside a <TripThemeProvider> subtree.
//     The Jernie tab is the provider root; other tabs use getStopTheme().
//   - Semantic tokens (gold, error, etc.) are NOT overridden by trip packs.
//     Import Semantic from design/tokens.ts directly for confirmed/error states.
//   - Phase 2 (Expo): replace useContext with a React Native–compatible
//     equivalent; the TripTheme type and getStopTheme() helper are unchanged.

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Core, Semantic } from '../design/tokens';
import { getTripPack, getStopPack } from '../design/tripPacks';
import type { StopPack, TripPack } from '../design/tripPacks';

// ---------------------------------------------------------------------------
// Computed theme shapes
// ---------------------------------------------------------------------------

export interface StopTheme {
  // Raw pack values
  primary: string;
  tint:    string;
  // Component tokens — derived from primary/tint
  pillBg:        string;
  pillText:       string;
  timelineLine:   string;
  cardEdge:       string;
  cardHeading:    string;
  addButtonBg:    string;
  addButtonText:  string;
  sectionHeading: string;
}

export interface TripTheme {
  primary:    string;
  secondary:  string;
  headerBg:   string;
  headerText: string;
  navIcon:    string;
}

export interface TripThemeValue {
  tripId: string;
  stopId: string;
  stop:   StopTheme;
  trip:   TripTheme;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildStopTheme(pack: StopPack): StopTheme {
  return {
    primary:        pack.primary,
    tint:           pack.tint,
    pillBg:         pack.primary,
    pillText:       Core.white,
    timelineLine:   pack.primary,
    cardEdge:       pack.primary,
    cardHeading:    pack.primary,
    addButtonBg:    pack.primary,
    addButtonText:  Core.white,
    sectionHeading: pack.primary,
  };
}

function buildTripTheme(pack: TripPack): TripTheme {
  return {
    primary:    pack.trip.primary,
    secondary:  pack.trip.secondary,
    headerBg:   pack.trip.primary,
    headerText: Core.white,
    navIcon:    pack.trip.primary,
  };
}

// Fallback when pack is missing (dev safety net)
const FALLBACK_STOP_THEME: StopTheme = buildStopTheme({
  primary: '#2C5880',
  tint:    '#EAF0F8',
});

const FALLBACK_TRIP_THEME: TripTheme = {
  primary:    '#1E4F73',
  secondary:  '#2E6B6C',
  headerBg:   '#1E4F73',
  headerText: Core.white,
  navIcon:    '#1E4F73',
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TripThemeContext = createContext<TripThemeValue>({
  tripId: '',
  stopId: '',
  stop:   FALLBACK_STOP_THEME,
  trip:   FALLBACK_TRIP_THEME,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface TripThemeProviderProps {
  tripId:   string;
  stopId:   string;
  children: ReactNode;
}

export function TripThemeProvider({ tripId, stopId, children }: TripThemeProviderProps) {
  const value = useMemo<TripThemeValue>(() => {
    const tripPack = getTripPack(tripId);
    const stopPack = getStopPack(tripId, stopId);

    return {
      tripId,
      stopId,
      stop: stopPack ? buildStopTheme(stopPack) : FALLBACK_STOP_THEME,
      trip: tripPack ? buildTripTheme(tripPack) : FALLBACK_TRIP_THEME,
    };
  }, [tripId, stopId]);

  return (
    <TripThemeContext.Provider value={value}>
      {children}
    </TripThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook — use inside Jernie tab only
// ---------------------------------------------------------------------------

export function useTripTheme(): TripThemeValue {
  return useContext(TripThemeContext);
}

// ---------------------------------------------------------------------------
// Standalone helper — use in Overview (multiple stops at once)
// ---------------------------------------------------------------------------

export function getStopTheme(tripId: string, stopId: string): StopTheme {
  const pack = getStopPack(tripId, stopId);
  return pack ? buildStopTheme(pack) : FALLBACK_STOP_THEME;
}

// Re-export Semantic so consumers can import both from one place
export { Semantic };
