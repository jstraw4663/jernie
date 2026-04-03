// Jernie — Trip Data Types
// Schema designed for direct Supabase/Firebase migration (Phase 2).
// All nullable fields map to optional DB columns; arrays map to junction tables.

export interface Trip {
  id: string;
  name: string;
  dates: string;
  departure: string; // ISO 8601 with timezone offset
  member_handles: string[];
  owner_user_id: null; // populated in Phase 2 with auth
  status: "draft" | "active" | "completed" | "archived";
  visibility: "private" | "invite_only" | "public";
  invites: string[];
}

export interface Group {
  id: string;
  trip_id: string;
  name: string;
  members: string[];
  member_user_ids: null; // UUID array in Phase 2
  display_order: number;
}

export interface Stop {
  id: string;
  trip_id: string;
  city: string;
  dates: string;
  emoji: string;
  accent: string; // Phase 2: moves to UI config, not stops table
  summary: string;
  lat: number;
  lon: number;
  weather_start: string; // YYYY-MM-DD
  weather_end: string;
  status: "confirmed" | "tentative" | "cancelled";
}

export interface Flight {
  key: string;
  num: string;
  airline: string;
  route: string;
  dep: string;
  arr: string;
  date: string; // "Month DD YYYY" — includes year for unambiguous parsing
  trackingUrl: string;
}

export interface ConfirmationLink {
  label: string;
  url: string;
}

export interface Booking {
  id: string;
  stop_id: string;
  trip_id: string;
  display_order: number; // render order within a stop; maps to bookings.display_order in Phase 2
  group_ids: string[] | null; // null = party-wide
  type: "flight" | "accommodation" | "transportation" | "reservation" | "other";
  icon: string;
  label: string;
  url: string | null;
  addr: string | null;
  note: string | null;
  confirmation: string | null;
  lines: string[] | null;
  confirmation_link: ConfirmationLink | null;
  flights: Flight[] | null;
}

export interface ItineraryDay {
  id: string;
  stop_id: string;
  trip_id: string;
  date: string;
  label: string;
  emoji: string;
}

export interface ItineraryItem {
  id: string;
  day_id: string;
  time: string;
  text: string;
  locked: boolean; // content-level: editorial/confirmed booking. NOT the user toggle.
  alert: boolean;
  book_now: boolean;
  addr: string | null;
  addr_label: string | null;
  tide_url: string | null;
  booking_url: string | null;
}

export type PlaceCategory =
  | "restaurant"
  | "hike"
  | "attraction"
  | "museum"
  | "sight"
  | "bar"
  | "shop"
  | "beach"
  | "other";

export interface Place {
  id: string;
  stop_id: string;
  category: PlaceCategory;
  subcategory: string; // free-form — no schema change needed for new types
  name: string;
  emoji: string;
  note: string | null;
  url: string | null;
  must: boolean;
  rating: number | null;
  source: "guide" | "community";
  attribution_handle: string | null; // Phase 2: attribution_user_id UUID
  group_ids: string[] | null; // null = visible to all
  flag: string | null;
  price: string | null; // "$" | "$$" | "$$$" | "$$$$"
  difficulty: string | null; // hikes only
  duration: string | null; // hikes only
  distance: string | null; // hikes only
}

export interface Alert {
  id: string;
  stop_id: string;
  type: "warning" | "info" | "tip";
  text: string;
  link: { label: string; url: string } | null;
}

export interface PackingItem {
  id: string; // stable slug — maps to user_packing_state.item_id in Phase 2
  text: string;
}

export interface PackingList {
  id: string;
  category: string;
  stop_id: string | null; // null = trip-wide
  items: PackingItem[];
}

export interface TripData {
  trip: Trip;
  groups: Group[];
  stops: Stop[];
  bookings: Booking[];
  itinerary_days: ItineraryDay[];
  itinerary_items: ItineraryItem[];
  places: Place[];
  alerts: Alert[];
  packing_lists: PackingList[];
}
