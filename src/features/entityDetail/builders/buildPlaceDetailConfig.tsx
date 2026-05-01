// buildPlaceDetailConfig — normalizes a Place + its parent Stop into a DetailConfig.
//
// Photo: uses place.photo_url when present (populate in trip.json to enable).
// Map coordinates: prefer place.lat/lon (precise) when available; fall back to stop coords.
// Map fallback: when no coords exist but place.addr is set, passes mapAddr for a
//   "View on Maps" deep-link in DetailMap (never shows a blank map section).
//
// TODO (Phase 2): populate place.lat/lon via provider fetch (Google Places / AllTrails)
// TODO (Phase 2): nearby places search

import type { Place, Stop, PlaceEnrichment } from '../../../types';
import type { DetailConfig, DetailRow, DetailSectionConfig } from '../detailTypes';
import { Colors } from '../../../design/tokens';
import { appleMapsUrl } from '../../../domain/trip';
import { section } from './utils';
import { DistanceModule } from '../components/DistanceModule';
import { ReviewCarousel } from '../components/ReviewCarousel';

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  hike:       'Hike',
  attraction: 'Attraction',
  museum:     'Museum',
  sight:      'Sight',
  bar:        'Bar & Drinks',
  shop:       'Shopping',
  beach:      'Beach',
  hotel:      'Hotel',
  activity:   'Activity',
  other:      'Place',
};

export function buildPlaceDetailConfig(place: Place, stop: Stop, stops: Stop[] = [], enrichment?: PlaceEnrichment): DetailConfig {
  // Hero gradient: stop accent → navy
  const heroGradient =
    `linear-gradient(145deg, ${stop.accent} 0%, ${Colors.navy} 100%)`;

  // ── Info section ───────────────────────────────────────────────
  const infoRows: DetailRow[] = [];

  if (place.subcategory) {
    infoRows.push({ label: 'Type', value: place.subcategory.replace(/-/g, ' ') });
  }

  const displayRating = enrichment?.rating ?? place.rating;
  const ratingCount = enrichment?.user_ratings_total ?? null;
  if (displayRating != null) {
    const full = Math.floor(displayRating);
    const half = displayRating - full >= 0.3;
    const stars = '★'.repeat(full) + (half ? '½' : '') + '  ' + String(displayRating);
    const ratingStr = ratingCount != null ? `${stars}  (${ratingCount.toLocaleString()} reviews)` : stars;
    infoRows.push({ label: 'Rating', value: ratingStr });
  }

  const displayPrice = enrichment?.price_level ?? place.price;
  if (displayPrice) {
    const priceLabels: Record<string, string> = {
      '$': '$ · Budget',
      '$$': '$$ · Moderate',
      '$$$': '$$$ · Upscale',
      '$$$$': '$$$$ · Fine Dining',
    };
    infoRows.push({ label: 'Price', value: priceLabels[displayPrice] ?? displayPrice });
  }
  if (place.must) {
    infoRows.push({ label: 'Curated', value: '⭐ Must-visit pick' });
  }
  if (place.source === 'community' && place.attribution_handle) {
    infoRows.push({ label: 'Recommended by', value: `@${place.attribution_handle}` });
  }
  if (enrichment?.editorial_summary) {
    infoRows.push({ label: 'About', value: enrichment.editorial_summary });
  }

  // ── Contact / location section ─────────────────────────────────
  // Prefer enrichment data from Google Places; fall back to trip.json values.
  const contactRows: DetailRow[] = [];
  const phone = enrichment?.phone ?? place.phone ?? null;
  const addr = enrichment?.addr ?? place.addr ?? null;
  const website = enrichment?.website ?? place.url ?? null;

  if (phone) {
    contactRows.push({ label: 'Phone', value: phone, link: `tel:${phone.replace(/\D/g, '')}` });
  }
  if (addr) {
    contactRows.push({ label: 'Address', value: addr, link: appleMapsUrl(addr) });
  } else {
    contactRows.push({ label: 'Area', value: stop.city });
  }
  if (website) {
    contactRows.push({ label: 'Website', value: 'Open website', link: website });
  }

  // 3c: DistanceModule slot — display-only, no write-back
  const destinationOptions = stops.map(s => ({
    id: s.id,
    label: s.city,
    lat: s.lat,
    lon: s.lon,
    addr: s.city,
  }));
  contactRows.push({
    label: '',
    value: '',
    component: (
      <DistanceModule
        originAddr={place.addr ?? null}
        originLat={place.lat ?? null}
        originLon={place.lon ?? null}
        destinationOptions={destinationOptions}
        defaultDestinationId={stop.id}
      />
    ),
  });

  // ── Notes section ─────────────────────────────────────────────
  const noteRows: DetailRow[] = [];
  if (place.note) {
    noteRows.push({ label: 'Guide notes', value: place.note });
  }
  if (place.flag) {
    noteRows.push({ label: 'Heads up', value: `⚠ ${place.flag}` });
  }

  // ── Hours section ─────────────────────────────────────────────
  const hoursRows: DetailRow[] = [];
  if (enrichment?.open_now != null) {
    hoursRows.push({
      label: 'Status',
      value: enrichment.open_now ? '🟢 Open now' : '🔴 Closed now',
    });
  }
  if (enrichment?.hours?.length) {
    enrichment.hours.forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        hoursRows.push({ label: line.slice(0, colonIdx), value: line.slice(colonIdx + 2) });
      } else {
        hoursRows.push({ label: '', value: line });
      }
    });
  }

  // ── Reviews section ───────────────────────────────────────────
  const reviewRows: DetailRow[] = [];
  if (enrichment?.reviews?.length) {
    reviewRows.push({
      label: '', value: '',
      component: (
        <ReviewCarousel
          reviews={enrichment.reviews}
          googlePlaceId={enrichment.google_place_id}
          placeName={place.name}
        />
      ),
    });
  }

  const sections: DetailSectionConfig[] = [
    section('Info', infoRows),
    section('Hours', hoursRows),
    section('Contact & Location', contactRows),
    section('Notes', noteRows),
    section('Reviews', reviewRows),
  ].filter((s): s is DetailSectionConfig => s !== null);

  const photos = enrichment?.photos ?? (place.photo_url ? [place.photo_url] : undefined);

  return {
    kind: 'place',
    title: place.name,
    subtitle: stop.city + ' · ' + (place.subcategory.replace(/-/g, ' ') || CATEGORY_LABELS[place.category] || 'Place'),
    heroEmoji: place.emoji,
    heroGradient,
    heroPhotoUrl: photos?.[0] ?? undefined,
    photos: photos && photos.length > 1 ? photos.slice(1) : undefined,
    categoryChip: CATEGORY_LABELS[place.category] ?? 'Place',
    mapLat: place.lat ?? stop.lat,
    mapLon: place.lon ?? stop.lon,
    mapAddr: addr ?? undefined,
    sections,
    externalUrl: website ?? undefined,
    phone: phone ?? undefined,
    stopAccent: stop.accent,
    stopLabel: stop.city,
  };
}
