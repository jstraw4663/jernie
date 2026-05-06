// buildPlaceDetailConfig — normalizes a Place + its parent Stop into a DetailConfig.
//
// Map: prefers place.lat/lon when set; falls back to stop coords, then addr-only deep-link.

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

export function buildPlaceDetailConfig(place: Place, stop: Stop, _stops: Stop[] = [], enrichment?: PlaceEnrichment): DetailConfig {
  // Hero gradient: stop accent → navy
  const heroGradient =
    `linear-gradient(145deg, ${stop.accent} 0%, ${Colors.navy} 100%)`;

  // ── Rating / price — rendered in body title area, not in Info section ─────
  const displayRating = enrichment?.rating ?? place.rating;
  const ratingCount = enrichment?.user_ratings_total ?? null;
  const displayPrice = enrichment?.price_level ?? place.price;

  // ── Info section — About, Curated, Recommended only ───────────────────────
  const infoRows: DetailRow[] = [];

  if (enrichment?.editorial_summary) {
    infoRows.push({ label: 'About', value: enrichment.editorial_summary });
  }
  if (place.must) {
    infoRows.push({ label: 'Curated', value: '⭐ Must-visit pick' });
  }
  if (place.source === 'community' && place.attribution_handle) {
    infoRows.push({ label: 'Recommended by', value: `@${place.attribution_handle}` });
  }

  // ── Contact / location section ─────────────────────────────────
  // Prefer enrichment data from Google Places; fall back to trip.json values.
  const contactRows: DetailRow[] = [];
  const phone = enrichment?.phone ?? null;
  const addr = enrichment?.addr ?? null;
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

  contactRows.push({
    label: '',
    value: '',
    component: (
      <DistanceModule
        originAddr={addr}
        originLat={place.lat ?? null}
        originLon={place.lon ?? null}
        stopId={stop.id}
        excludePlaceId={place.id}
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
    section('Notes', noteRows),
    section('Reviews', reviewRows),
    section('Contact & Location', contactRows),
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
    hoursData: enrichment?.hours?.length ? enrichment.hours : undefined,
    rating: displayRating ?? undefined,
    ratingCount: ratingCount ?? undefined,
    price: displayPrice ?? undefined,
    placeId: place.id,
    googlePlaceId: enrichment?.google_place_id ?? undefined,
  };
}
