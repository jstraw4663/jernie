// detailTypes.ts — normalized entity detail config types.
//
// All entity types (Place, Booking, Flight) are normalized into
// DetailConfig before rendering. Components only know about DetailConfig —
// they never import domain types directly.

import type { ReactNode } from 'react';

export interface DetailRow {
  label: string;
  value: string;
  link?: string;       // renders value as a tappable anchor
  copyable?: boolean;  // TODO: long-press to copy (Phase 2)
  // When present, DetailSection renders `component` directly instead of the text row.
  // Pass label: '' and value: '' for module rows — the section() filter in builders
  // treats component !== undefined as "always filled".
  component?: ReactNode;
}

export interface DetailSectionConfig {
  title: string;
  rows: DetailRow[];
}


export interface DetailConfig {
  kind: 'place' | 'flight' | 'booking' | 'generic';
  title: string;
  subtitle?: string;
  heroEmoji?: ReactNode;
  heroGradient: string;    // always present — gradient fallback when no photo
  heroPhotoUrl?: string;   // direct image URL — shown full-bleed when present
  photos?: string[];       // additional photos for strip (index 0 = hero, 1+ = strip)
  heroLogoUrl?: string;    // brand/airline logo — shown in hero alongside title
  titleLogoUrl?: string;   // brand logo shown on right side of body title row (+ collapsed overlay)
  categoryChip?: string;   // e.g. "Restaurant", "Hike", "Accommodation"
  mapLat?: number;         // present only when meaningful coordinates are available
  mapLon?: number;
  mapAddr?: string;        // address fallback for "View on Maps" when coords absent
  trailEmbedUrl?: string;  // AllTrails widget embed URL — when present, DetailMap renders iframe instead of pin
  sections: DetailSectionConfig[];
  externalUrl?: string;    // primary CTA link (opens in new tab)
  externalUrlLabel?: string; // override "Website" label in QuickActions (e.g. "Manage")
  phone?: string;          // formatted phone number — drives Call quick action
  stopAccent?: string;     // stop hex color — CTA button background + icon tint
  stopLabel?: string;      // short stop name e.g. "Bar Harbor" — CTA copy
  hoursData?: string[];    // raw hours strings for inline HoursAccordion (place only)
  rating?: number;         // numeric rating — rendered as StarRating in body title area
  ratingCount?: number;    // number of reviews shown alongside stars
  price?: string;          // price level string e.g. "$$", "$$$"
  placeId?: string;        // trip.json place id — Fix Match RTDB override key
  googlePlaceId?: string;  // currently enriched Google Place ID — Fix Match reference
}

// SelectedEntity — state shape held in Jernie-PWA.tsx.
// Carries the bounding rect of the tapped card so the sheet can
// animate from that origin.
export interface SelectedEntity {
  kind: 'place' | 'booking';
  id: string;
  originRect?: DOMRect;
  accent: string;
}
