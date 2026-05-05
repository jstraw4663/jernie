// buildBookingDetailConfig — generic fallback builder for non-flight, non-hotel,
// non-rental-car bookings (type: 'reservation' | 'other').
//
// Accommodation → buildHotelDetailConfig
// Transportation (rental car) → buildRentalCarDetailConfig
// Flight → buildFlightDetailConfig
// Everything else → this builder (reservation, other)
//
// Routing lives in the useMemo in Jernie-PWA.tsx — do not add routing here.
//
// Brand logo: derived from booking.url via Clearbit Logo API.
// Brand color: used for hero gradient when known, otherwise type-based defaults.
//
// TODO (Phase 2): Firebase-backed notes persistence for booking.note
// TODO (Phase 2): native map deep-link (Apple Maps / Google Maps) for booking.addr

import type { Booking, Stop } from '../../../types';
import type { DetailConfig, DetailRow, DetailSectionConfig } from '../detailTypes';
import { Colors, TypeColors, Brand } from '../../../design/tokens';
import { domainFromUrl, brandLogoUrl, brandColor, labelToBrandDomain } from '../brandAssets';
import { appleMapsUrl } from '../../../domain/trip';
import { section } from './utils';

const TYPE_LABELS: Record<string, string> = {
  accommodation:  'Accommodation',
  transportation: 'Transportation',
  reservation:    'Reservation',
  other:          'Booking',
};

// Default accent colors by booking type when no brand color is available
const TYPE_ACCENTS: Record<string, string> = {
  accommodation:  TypeColors.stay,
  transportation: TypeColors.flight,
  reservation:    Colors.success,
  other:          Brand.navySoft,
};

export function buildBookingDetailConfig(booking: Booking, stop: Stop): DetailConfig {
  const typeLabel = TYPE_LABELS[booking.type] ?? 'Booking';

  // Brand logo: prefer URL-derived domain, fall back to label keyword detection
  // (rental cars often have url: null but a recognisable brand name in the label)
  const domain = (booking.url ? domainFromUrl(booking.url) : null)
    ?? labelToBrandDomain(booking.label);
  const logoUrl = domain ? brandLogoUrl(domain) : null;

  // Brand color → gradient
  const accent = (domain ? brandColor(domain) : null) ?? TYPE_ACCENTS[booking.type] ?? Colors.navyLight;
  const heroGradient = `linear-gradient(145deg, ${accent} 0%, ${Colors.navy} 100%)`;

  const sections: DetailSectionConfig[] = [];

  // ── Details section — structured lines[] ───────────────────────
  if (booking.lines && booking.lines.length > 0) {
    const lineRows: DetailRow[] = booking.lines
      .map(line => line.replace(/^(?:📍|⏰|📅|✈️|🚗|🏠)\s*/u, '').trim())
      .filter(v => v !== '')
      .map((value, i) => ({ label: i === 0 ? 'Details' : '↳', value }));

    const s = section('Details', lineRows);
    if (s) sections.push(s);
  }

  // ── Address / location section ──────────────────────────────────
  const locationRows: DetailRow[] = [];
  if (booking.addr) {
    locationRows.push({
      label: 'Address',
      value: booking.addr,
      link: appleMapsUrl(booking.addr),
    });
  }
  locationRows.push({ label: 'Stop', value: stop.city });
  locationRows.push({ label: 'Dates', value: stop.dates });
  const locationSection = section('Location', locationRows);
  if (locationSection) sections.push(locationSection);

  // ── Confirmation section ────────────────────────────────────────
  const confirmRows: DetailRow[] = [];
  if (booking.confirmation) {
    confirmRows.push({ label: 'Confirmation #', value: booking.confirmation });
  }
  if (booking.confirmation_link) {
    confirmRows.push({
      label: 'View booking',
      value: booking.confirmation_link.label,
      link: booking.confirmation_link.url,
    });
  }
  if (booking.url) {
    confirmRows.push({ label: 'Website', value: 'Open booking site', link: booking.url });
  }
  const confirmSection = section('Confirmation', confirmRows);
  if (confirmSection) sections.push(confirmSection);

  // ── Notes section ───────────────────────────────────────────────
  const noteRows: DetailRow[] = [];
  if (booking.note) {
    noteRows.push({ label: 'Notes', value: booking.note });
  }
  const noteSection = section('Notes', noteRows);
  if (noteSection) sections.push(noteSection);

  // Safety net — never render zero sections
  if (sections.length === 0) {
    sections.push({
      title: 'Info',
      rows: [{ label: 'Type', value: typeLabel }, { label: 'Stop', value: stop.city }],
    });
  }

  return {
    kind: 'booking',
    title: booking.label,
    subtitle: `${typeLabel} · ${stop.city}`,
    heroEmoji: booking.icon,
    heroGradient,
    heroLogoUrl: logoUrl ?? undefined,
    categoryChip: typeLabel,
    // Location map: accommodation uses stop coords; others have no meaningful pin
    mapLat: booking.type === 'accommodation' ? stop.lat : undefined,
    mapLon: booking.type === 'accommodation' ? stop.lon : undefined,
    sections,
    externalUrl: booking.url ?? undefined,
  };
}
