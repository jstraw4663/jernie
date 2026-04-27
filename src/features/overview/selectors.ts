// Overview selectors — pure grouping helpers, no React imports.
import type { Booking, Group, Place, Stop } from '../../types';
import { isRentalCar } from '../../domain/trip';

export type SectionId =
  | 'flights'
  | 'accommodations'
  | 'rental-car'
  | 'restaurants'
  | 'activities';

// ---------------------------------------------------------------------------
// Shared — resolve the display name for a booking's group_ids
// ---------------------------------------------------------------------------

function travelerGroupName(booking: Booking, groups: Group[]): string {
  if (!booking.group_ids?.length) return 'Everyone';
  const names = booking.group_ids
    .map(id => groups.find(g => g.id === id)?.name)
    .filter(Boolean) as string[];
  return names.join(' & ') || 'Everyone';
}

function travelerGroupOrder(booking: Booking, groups: Group[]): number {
  if (!booking.group_ids?.length) return 0; // "Everyone" first
  const first = groups.find(g => g.id === booking.group_ids![0]);
  return first?.display_order ?? 99;
}

// ---------------------------------------------------------------------------
// Flights — grouped by traveler group, sorted chronologically within each group
// ---------------------------------------------------------------------------

export interface TravelerGroup {
  groupName: string;
  bookings: Booking[];
}

export function groupFlightsByTraveler(
  bookings: Booking[],
  groups: Group[],
): TravelerGroup[] {
  const flights = bookings
    .filter(b => b.type === 'flight' && b.flights?.length)
    .sort((a, b) => {
      const tA = a.flights?.[0]?.date ? new Date(a.flights[0].date).getTime() : 0;
      const tB = b.flights?.[0]?.date ? new Date(b.flights[0].date).getTime() : 0;
      return tA - tB;
    });

  const map = new Map<string, { order: number; bookings: Booking[] }>();
  flights.forEach(b => {
    const name = travelerGroupName(b, groups);
    if (!map.has(name)) map.set(name, { order: travelerGroupOrder(b, groups), bookings: [] });
    map.get(name)!.bookings.push(b);
  });

  return [...map.entries()]
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([groupName, { bookings }]) => ({ groupName, bookings }));
}

// Flat list for counts / backward-compat use
export function selectFlightBookings(bookings: Booking[]): Booking[] {
  return bookings
    .filter(b => b.type === 'flight' && b.flights?.length)
    .sort((a, b) => {
      const tA = a.flights?.[0]?.date ? new Date(a.flights[0].date).getTime() : 0;
      const tB = b.flights?.[0]?.date ? new Date(b.flights[0].date).getTime() : 0;
      return tA - tB;
    });
}

// ---------------------------------------------------------------------------
// Accommodations — grouped by traveler group, chronological within each group
// ---------------------------------------------------------------------------

export function groupAccommodationsByTraveler(
  bookings: Booking[],
  groups: Group[],
  stops: Stop[],
): TravelerGroup[] {
  const stopOrder = Object.fromEntries(stops.map((s, i) => [s.id, i]));

  const accoms = bookings
    .filter(b => b.type === 'accommodation')
    .sort((a, b) => {
      // Primary sort: checkin_date (ISO string compares correctly lexicographically)
      if (a.checkin_date && b.checkin_date) return a.checkin_date.localeCompare(b.checkin_date);
      if (a.checkin_date) return -1;
      if (b.checkin_date) return 1;
      // Fallback: trip stop order
      return (stopOrder[a.stop_id] ?? 99) - (stopOrder[b.stop_id] ?? 99);
    });

  const map = new Map<string, { order: number; bookings: Booking[] }>();
  accoms.forEach(b => {
    const name = travelerGroupName(b, groups);
    if (!map.has(name)) map.set(name, { order: travelerGroupOrder(b, groups), bookings: [] });
    map.get(name)!.bookings.push(b);
  });

  return [...map.entries()]
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([groupName, { bookings }]) => ({ groupName, bookings }));
}

// ---------------------------------------------------------------------------
// Rental cars — primary bookings only (linked_booking_id = return leg, excluded)
// ---------------------------------------------------------------------------


export interface RentalCarEntry {
  booking: Booking;
  coverage: string; // "Full Trip" | "Portland" | "Portland → Bar Harbor"
}

export function selectRentalCars(
  bookings: Booking[],
  stops: Stop[],
): RentalCarEntry[] {
  return bookings
    .filter(b => isRentalCar(b) && !b.linked_booking_id)
    .map(b => ({ booking: b, coverage: deriveRentalCarCoverage(b, stops) }));
}

function deriveRentalCarCoverage(booking: Booking, stops: Stop[]): string {
  if (stops.length === 0) return 'Full Trip';
  if (!booking.pickup_date || !booking.return_date) return 'Full Trip';

  const tripStart = stops.map(s => s.weather_start).sort()[0];
  const tripEnd   = stops.map(s => s.weather_end).sort().at(-1)!;

  if (booking.pickup_date <= tripStart && booking.return_date >= tripEnd) return 'Full Trip';

  const covered = stops.filter(
    s => !(booking.return_date! < s.weather_start || booking.pickup_date! > s.weather_end)
  );
  if (covered.length === stops.length) return 'Full Trip';
  if (covered.length === 0) return 'Partial';
  if (covered.length === 1) return covered[0].city;
  return `${covered[0].city} → ${covered[covered.length - 1].city}`;
}

// ---------------------------------------------------------------------------
// Places — generic grouping by stop for restaurants / activities
// ---------------------------------------------------------------------------

export type PlaceCategory = Place['category'];

export interface PlaceGroup {
  stop: Stop;
  places: Place[];
}

export const ACTIVITY_CATEGORIES = new Set<PlaceCategory>([
  'hike', 'attraction', 'museum', 'sight', 'bar', 'shop', 'beach', 'activity', 'other',
]);

export function groupRestaurantsByStop(places: Place[], stops: Stop[], addedPlaceIds?: Set<string>): PlaceGroup[] {
  const restaurants = places.filter(p =>
    p.category === 'restaurant' && (!addedPlaceIds || addedPlaceIds.has(p.id))
  );
  return stops
    .map(stop => ({ stop, places: restaurants.filter(p => p.stop_id === stop.id) }))
    .filter(g => g.places.length > 0);
}

export function groupActivitiesByStop(places: Place[], stops: Stop[], addedPlaceIds?: Set<string>): PlaceGroup[] {
  const activities = places.filter(p =>
    ACTIVITY_CATEGORIES.has(p.category) && (!addedPlaceIds || addedPlaceIds.has(p.id))
  );
  return stops
    .map(stop => ({ stop, places: activities.filter(p => p.stop_id === stop.id) }))
    .filter(g => g.places.length > 0);
}
