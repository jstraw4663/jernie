// src/domain/trip.ts
// Pure, side-effect-free helpers for trip domain logic.
// No React imports. All functions are unit-testable in isolation.

import type { Booking, CustomItem, ItineraryDay, ItineraryItem, Place, Stop } from '../types';

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

/**
 * Resolve the linked Place for an itinerary item.
 * ItineraryItem links via place_id; CustomItem links via source_place_id.
 * Returns null when no link is set or the place is not found.
 */
export function findPlaceForItem(
  item: ItineraryItem | CustomItem,
  places: Place[],
): Place | null {
  const placeId = 'source_place_id' in item
    ? item.source_place_id
    : (item.place_id ?? null);
  return placeId ? (places.find(p => p.id === placeId) ?? null) : null;
}

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
  aircraftType?: string; // e.g. "Boeing 737-800" — as reported by FlightAware
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

// ── Itinerary lookup ──────────────────────────────────────────

export interface ItineraryLocation {
  itemId: string;
  dayId: string;
  stopId: string;
}

/**
 * Find where a place has been added to the itinerary.
 * Checks curated ItineraryItems (via place_id) first, then user-added CustomItems
 * (via source_place_id + itineraryOrder canonical map).
 * Returns null if the place is not in the itinerary.
 */
export function findEntityInItinerary(
  placeId: string,
  itineraryItems: ItineraryItem[],
  customItems: Record<string, CustomItem>,
  itineraryOrder: Record<string, string[]>,
  itineraryDays: ItineraryDay[],
): ItineraryLocation | null {
  const curatedItem = itineraryItems.find(i => i.place_id === placeId);
  if (curatedItem) {
    const day = itineraryDays.find(d => d.id === curatedItem.day_id);
    if (day) return { itemId: curatedItem.id, dayId: day.id, stopId: day.stop_id };
  }

  const ci = Object.values(customItems).find(c => c.source_place_id === placeId);
  if (!ci) return null;
  for (const [dayId, ids] of Object.entries(itineraryOrder)) {
    if ((ids as string[]).includes(ci.id)) {
      const day = itineraryDays.find(d => d.id === dayId);
      if (day) return { itemId: ci.id, dayId, stopId: day.stop_id };
    }
  }
  return null;
}

// ── Booking helpers ───────────────────────────────────────────

const RENTAL_CAR_KEYWORDS = [
  'rental', 'rent a car', 'avis', 'hertz', 'enterprise',
  'national', 'budget', 'alamo', 'sixt', 'dollar', 'thrifty',
];

/**
 * Returns true when a transportation booking is a rental car.
 * Detects by: explicit car_type field set, or recognisable brand/keyword in label.
 */
export function isRentalCar(booking: Booking): boolean {
  if (booking.type !== 'transportation') return false;
  if (booking.car_type != null) return true;
  const label = booking.label.toLowerCase();
  return RENTAL_CAR_KEYWORDS.some(k => label.includes(k));
}

// ── Flight time helpers ───────────────────────────────────────

/** Parse "8:20 AM" or "10:40 AM" → minutes since midnight. */
export function parseFlightTime(t: string): number {
  const [timePart, period] = t.trim().split(' ');
  const [h, m] = timePart.split(':').map(Number);
  let hours = h;
  if (period === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return hours * 60 + m;
}

/** Returns "Xh Ym" (or "Xm" / "Xh") from two dep/arr time strings. Same-day assumed. */
export function flightDuration(dep: string, arr: string): string {
  let mins = parseFlightTime(arr) - parseFlightTime(dep);
  if (mins < 0) mins += 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Returns "Xm" layover between end of one leg and start of the next. */
export function layoverDuration(leg1Arr: string, leg2Dep: string): string {
  let mins = parseFlightTime(leg2Dep) - parseFlightTime(leg1Arr);
  if (mins < 0) mins += 1440;
  return `${mins}m`;
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
