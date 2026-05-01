// Jernie — Trip Data Types
// Schema designed for direct Supabase/Firebase migration (Phase 2).
// All nullable fields map to optional DB columns; arrays map to junction tables.

export interface Trip {
  id: string;
  name: string;
  title?: string;
  tagline?: string;
  pills?: [string, string][];
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

  // Hotel / accommodation
  checkin_date?: string | null;    // ISO date string "YYYY-MM-DD"
  checkin_time?: string | null;    // "HH:MM" 24-hour
  checkout_date?: string | null;
  checkout_time?: string | null;
  room_type?: string | null;       // user-editable free text
  room_number?: string | null;     // user-editable free text

  // Rental car / transportation
  car_type?: string | null;        // user-editable dropdown value
  pickup_date?: string | null;     // ISO date string
  pickup_time?: string | null;     // "HH:MM" 24-hour
  return_date?: string | null;
  return_time?: string | null;
  airport_pickup?: boolean | null; // true = on-airport, false = off-airport

  // Flight — per-leg aircraft slugs keyed by Flight.key
  aircraft_types?: Record<string, string | null> | null;

  // Linked booking — secondary (return) card points to the primary (pickup) booking.
  // Used for rental cars that span multiple stops: e.g. pickup in Portland, return in Bangor.
  // Both cards open the same unified detail sheet; all writes go to the primary booking's path.
  linked_booking_id?: string | null;
}

export interface ItineraryDay {
  id: string;
  stop_id: string;
  trip_id: string;
  date: string;
  label: string;
  emoji: string;
}

// Category for curated itinerary items — separate from PlaceCategory (custom items).
// Covers logistics, meals, outdoor activities, sights, and downtime.
export type ItineraryCategory =
  | "restaurant"  // any meal, food stop, coffee
  | "hike"        // trails, summit walks
  | "sight"       // lighthouses, scenic spots, landmarks
  | "activity"    // cruises, tours, sails, spa, events
  | "travel"      // flights, drives, check-in/out logistics
  | "lodging"     // hotel check-in / check-out
  | "leisure"     // free time, walks, relaxed exploration
  | "other";

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
  category: ItineraryCategory | null;
  place_id?: string | null;    // links to Place.id or Firestore placeId
  booking_id?: string | null;  // links to Booking.id for travel/lodging timeline items
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
  | "hotel"     // lodging places (distinct from booking records)
  | "activity"  // Viator/GetYourGuide activities (matches ItineraryCategory)
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
  difficulty: string | null;    // hikes only
  duration: string | null;     // hikes only
  distance: string | null;     // hikes only
  elevation_gain?: string | null; // hikes only — e.g. "520 ft"
  route_type?: 'loop' | 'out-and-back' | 'point-to-point' | null; // hikes only
  dogs_allowed?: boolean | null;  // hikes only
  features?: string[] | null;     // hikes only — ["ocean views", "iron rungs", ...]
  photos?: string[] | null;       // hikes only — carousel photo URLs (separate from hero photo_url)
  // Optional enrichment fields — populate in trip.json as available
  photo_url?: string | null;  // hero image URL (direct image link)
  phone?: string | null;      // formatted phone number e.g. "(207) 555-0123"
  addr?: string | null;       // street address for maps deep-link
  // Phase 2: provider-fetched precise coordinates (stop coords used as fallback)
  lat?: number | null;
  lon?: number | null;
  provider_id?: string | null; // Google Place ID, AllTrails trail ID, etc.
  provider?: 'google_places' | 'alltrails' | 'manual' | null;
}

// ── Trail enrichment — manually curated, served by trail-details Netlify function ─
// Cached in Firestore at trail_enrichment/{tripId}/trails/{placeId}.
// Populated by the trail-details Netlify function; read by useTrailEnrichment.
// Photos are scraped from the AllTrails og:image on first enrichment (30-day cache).

export interface TrailEnrichment {
  trail_id: string;              // AllTrails slug derived from place.url
  elevation_gain: string | null; // e.g. "520 ft"
  route_type: 'loop' | 'out-and-back' | 'point-to-point' | null;
  dogs_allowed: boolean | null;
  features: string[] | null;     // ["ocean views", "scrambling", "iron rungs"]
  photos: string[] | null;       // og:image from AllTrails page
  cached_at: number;             // Date.now() ms
}

// ── Place enrichment from Google Places API ───────────────────────────────
// Cached in Firestore at place_enrichment/{tripId}/{placeId}.
// Populated by the place-details Netlify function; read by usePlaceEnrichment.

export interface PlaceReview {
  author: string;
  rating: number;
  text: string;
  time: string; // human-readable relative time from Google
}

export interface PlaceEnrichment {
  google_place_id: string;
  rating: number | null;
  user_ratings_total: number | null;
  price_level: string | null;       // "$" | "$$" | "$$$" | "$$$$"
  phone: string | null;
  addr: string | null;
  website: string | null;
  open_now: boolean | null;
  hours: string[] | null;           // ["Monday: 9:00 AM – 9:00 PM", ...]
  photos: string[] | null;          // direct CDN photo URLs, up to 10
  reviews: PlaceReview[] | null;    // up to 5 Google reviews
  editorial_summary: string | null;
  cached_at: number;                // Date.now() ms — used for 24hr TTL check
}

export interface Alert {
  id: string;
  stop_id: string;
  type: "warning" | "info" | "tip";
  text: string;
  link: { label: string; url: string } | null;
}

export interface CustomItem {
  id: string;              // "custom-{random8}"
  day_id: string;          // current day (kept in sync on moves)
  time: string;
  text: string;
  category?: PlaceCategory; // optional — set when user picks a type on add
  source_place_id: string | null;  // set when created from a PlaceCard +
  addr?: string | null;    // user-entered address for maps deep-link
  created_at: number;      // Date.now()
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
