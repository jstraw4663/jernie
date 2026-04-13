// src/domain/trip.ts
// Pure, side-effect-free helpers for trip domain logic.
// No React imports. All functions are unit-testable in isolation.

import type { Booking, Place, Stop } from '../types';

// ── Weather types ─────────────────────────────────────────────

/** Shape of Open-Meteo's daily forecast response. */
export interface WeatherDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  weathercode: number[];
}

// ── Weather ───────────────────────────────────────────────────

const WMO_MAP: Record<number, { e: string; d: string }> = {
  0:{e:"☀️",d:"Clear"},1:{e:"🌤️",d:"Mostly Clear"},2:{e:"⛅",d:"Partly Cloudy"},3:{e:"☁️",d:"Overcast"},
  45:{e:"🌫️",d:"Foggy"},48:{e:"🌫️",d:"Foggy"},51:{e:"🌦️",d:"Drizzle"},53:{e:"🌦️",d:"Drizzle"},
  55:{e:"🌧️",d:"Rain"},61:{e:"🌧️",d:"Light Rain"},63:{e:"🌧️",d:"Rain"},65:{e:"🌧️",d:"Heavy Rain"},
  71:{e:"🌨️",d:"Snow"},73:{e:"🌨️",d:"Snow"},75:{e:"❄️",d:"Heavy Snow"},80:{e:"🌦️",d:"Showers"},
  81:{e:"🌧️",d:"Showers"},82:{e:"⛈️",d:"Storms"},95:{e:"⛈️",d:"Thunderstorm"},99:{e:"⛈️",d:"Severe Storm"},
};

/** Resolve a WMO weather code to an emoji + description. */
export const wmo = (code: number): { e: string; d: string } =>
  WMO_MAP[code] ?? { e: "🌡️", d: "—" };

export const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;

// ── URLs ──────────────────────────────────────────────────────

/** Build an Apple Maps deep-link for a freeform address string. */
export const appleMapsUrl = (addr: string): string =>
  "https://maps.apple.com/?q=" + encodeURIComponent(addr);

// ── Stop navigation ───────────────────────────────────────────

/** Return the active Stop object, or undefined if not found. */
export function getActiveStop(stops: Stop[], activeId: string): Stop | undefined {
  return stops.find(s => s.id === activeId);
}

// ── Places ────────────────────────────────────────────────────

/** Filter trip places to only those belonging to a given stop. */
export function filterStopPlaces(places: Place[], stopId: string): Place[] {
  return places.filter(p => p.stop_id === stopId);
}

/** Map a Place to its activity display group label for grouped list headers. */
export function getActivityDisplayGroup(place: Place): string {
  if (place.category === "hike") return "Hikes";
  if (place.subcategory === "on-the-water") return "On the Water";
  if (place.category === "sight") return "Walks & Views";
  return "Nature & Culture";
}

// ── Flight status ─────────────────────────────────────────────

/** Live flight status shape returned by the Netlify proxy function. */
export interface FlightStatus {
  status?: string;
  delayMin?: number;
  actualDep?: string;
  actualArr?: string;
  gate?: string;
  terminal?: string;
}

// ── Flights ───────────────────────────────────────────────────

export interface FlightGroupEntry {
  key: string;
  flight: string;    // "United 123"
  route: string;
  date: string;
  schedDep: string;
  schedArr: string;
}

export interface FlightGroup {
  dateKey: string;   // "YYYY-MM-DD"
  flights: FlightGroupEntry[];
}

/**
 * Collapse a flat bookings array into a map of date → flight list.
 * Deduplicates by flight key so multi-leg bookings don't double-count.
 */
export function deriveFlightGroups(bookings: Booking[]): Record<string, FlightGroup> {
  const groups: Record<string, FlightGroup> = {};
  bookings
    .filter(b => b.type === "flight" && b.flights)
    .forEach(b => {
      b.flights!.forEach(f => {
        const dateKey = new Date(f.date).toISOString().split("T")[0];
        if (!groups[dateKey]) groups[dateKey] = { dateKey, flights: [] };
        if (!groups[dateKey].flights.find(x => x.key === f.key)) {
          groups[dateKey].flights.push({
            key: f.key,
            flight: f.airline + " " + f.num.replace(" ", ""),
            route: f.route,
            date: f.date,
            schedDep: f.dep,
            schedArr: f.arr,
          });
        }
      });
    });
  return groups;
}

/**
 * Returns true when now is within the auto-fetch window:
 * 48 hours before earliest departure through 24 hours after.
 */
export function isWithinFlightWindow(
  dateKey: string,
  flights: Pick<FlightGroupEntry, "schedDep">[],
): boolean {
  let earliest = Infinity;
  flights.forEach(f => {
    const t = Date.parse(dateKey + " " + f.schedDep);
    if (!isNaN(t) && t < earliest) earliest = t;
  });
  if (!isFinite(earliest)) return false;
  const now = Date.now();
  return now >= earliest - 48 * 3600_000 && now <= earliest + 24 * 3600_000;
}
