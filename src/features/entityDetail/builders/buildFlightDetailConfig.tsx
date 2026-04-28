// buildFlightDetailConfig — normalizes a flight Booking + its parent Stop into a DetailConfig.
// Called when booking.type === 'flight'.
//
// Airline logo: derived from IATA code (first two chars of flight number).
// Brand color: used for hero gradient when known.
// Airport info: derived from static IATA_AIRPORTS table in src/domain/airports.ts.
// Aircraft image: auto-matched from FlightAware aircraftType in live status; PillSelect override
//   persisted to booking.aircraft_type.
//
// TODO (Phase 2): seat map / boarding pass deep-link
// TODO (Phase 2): per-leg aircraft_type persistence (currently booking-level only)

import { useState } from 'react';
import type { Booking, Stop } from '../../../types';
import type { DetailConfig, DetailRow, DetailSectionConfig } from '../detailTypes';
import { Icons } from '../../../design/icons';
import { IconColors } from '../../../design/tokens';
import { Colors, Spacing, Typography, Radius } from '../../../design/tokens';
import { iataFromFlightNum, airlineLogoUrl, brandColor } from '../brandAssets';
import { getAirportName, getAirportUrl, parseIataFromRoute, IATA_AIRPORTS } from '../../../domain/airports';
import type { FlightStatus } from '../../../domain/trip';
import { AIRCRAFT_OPTIONS, AIRCRAFT_LABELS, getAircraftImageUrl, matchAircraftSlug } from '../aircraftAssets';
import { PillSelect } from '../../../components/PillSelect';
import type { PillSelectOption } from '../../../components/PillSelect';
import { section } from './utils';
import { haversineKm, toMiles } from '../../../domain/geo';

// ── AircraftTypeField ──────────────────────────────────────────────────────────

const AIRCRAFT_PILL_OPTIONS: PillSelectOption[] = AIRCRAFT_OPTIONS.map(slug => ({
  id:    slug,
  value: slug,
  label: AIRCRAFT_LABELS[slug] ?? slug,
  icon:  <Icons.Flight size={14} weight="duotone" color={IconColors.travel} />,
}));

interface AircraftTypeFieldProps {
  value: string | null;
  onChange: (val: string | null) => void;
}

function AircraftTypeField({ value, onChange }: AircraftTypeFieldProps) {
  const imgUrl = getAircraftImageUrl(value);
  const [imgError, setImgError] = useState(false);

  return (
    <div>
      {/* Label + pill — matches DetailRowItem layout */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: `${Spacing.md}px`,
        padding: `${Spacing.sm}px 0`,
        borderBottom: `1px solid ${Colors.border}`,
      }}>
        <span style={{
          fontFamily: Typography.family,
          fontSize: `${Typography.size.sm}px`,
          color: Colors.textMuted,
          flexShrink: 0,
          minWidth: 80,
        }}>
          Aircraft type
        </span>
        <PillSelect
          title="Choose Aircraft Type"
          options={AIRCRAFT_PILL_OPTIONS}
          value={value}
          onChange={onChange}
          placeholder="Select aircraft…"
          align="right"
        />
      </div>

      {/* Image — full width below the row */}
      {imgUrl && !imgError && (
        <img
          src={imgUrl}
          alt={`${AIRCRAFT_LABELS[value ?? ''] ?? 'Aircraft'} representative image`}
          width={800}
          height={450}
          loading="lazy"
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            borderRadius: `${Radius.lg}px`,
            objectFit: 'contain' as const,
            maxHeight: 120,
            display: 'block',
            marginTop: `${Spacing.sm}px`,
          }}
        />
      )}
    </div>
  );
}


export function buildFlightDetailConfig(
  booking: Booking,
  stop: Stop,
  flightStatus?: Record<string, FlightStatus>,
  onLegAircraftChange?: (legKey: string, value: string | null) => void,
): DetailConfig {
  const firstFlight = booking.flights?.[0];

  // Airline logo from IATA code
  const iata = firstFlight ? iataFromFlightNum(firstFlight.num) : '';
  const logoUrl = iata ? airlineLogoUrl(iata) : null;

  // Brand color for gradient (navy fallback)
  const airlineDomain = firstFlight
    ? `${firstFlight.airline.toLowerCase().replace(/\s+/g, '')}.com`
    : null;
  const accentColor = (airlineDomain ? brandColor(airlineDomain) : null) ?? Colors.navyLight;
  const heroGradient = `linear-gradient(145deg, ${accentColor} 0%, ${Colors.navy} 100%)`;

  // Route label — e.g. "CLT → BWI → PWM" for multi-leg
  const routeLabel = booking.flights && booking.flights.length > 1
    ? booking.flights.map(f => f.route.split(' → ')[0]).join(' → ') +
      ' → ' + booking.flights[booking.flights.length - 1].route.split(' → ')[1]
    : (firstFlight?.route ?? booking.label);

  const sections: DetailSectionConfig[] = [];

  // Per-leg aircraft slugs — manual overrides keyed by Flight.key, auto-matched from live status.
  const legTypes = booking.aircraft_types ?? {};

  // One section per flight leg
  if (booking.flights && booking.flights.length > 0) {
    booking.flights.forEach((f, i) => {
      const legIata = iataFromFlightNum(f.num);
      const flightRows: DetailRow[] = [
        { label: 'Route', value: f.route },
        { label: 'Date',  value: f.date },
        { label: 'Departs', value: f.dep },
        { label: 'Arrives', value: f.arr },
        { label: 'Airline', value: f.airline },
        { label: 'Flight #', value: f.num },
      ].filter(r => r.value.trim() !== '');

      if (legIata) {
        flightRows.push({ label: 'IATA code', value: legIata });
      }

      if (f.trackingUrl) {
        flightRows.push({ label: 'Track live', value: 'FlightAware ↗', link: f.trackingUrl });
      }

      // Airport info from static IATA table
      const parsed = parseIataFromRoute(f.route);
      if (parsed) {
        const originName = getAirportName(parsed.origin);
        const destName   = getAirportName(parsed.dest);
        flightRows.push({ label: 'Origin airport', value: originName });
        flightRows.push({ label: 'Dest airport',   value: destName });

        const destUrl = getAirportUrl(parsed.dest);
        if (destUrl) {
          flightRows.push({ label: 'Airport map', value: 'View airport →', link: destUrl });
        }

        // Great-circle distance — omit silently if coords not available
        const originRec = IATA_AIRPORTS[parsed.origin.toUpperCase()];
        const destRec   = IATA_AIRPORTS[parsed.dest.toUpperCase()];
        if (originRec && destRec) {
          const miles = Math.round(toMiles(haversineKm(originRec.lat, originRec.lon, destRec.lat, destRec.lon)));
          flightRows.push({ label: 'Flight distance', value: `~${miles.toLocaleString()} mi` });
        }
      }

      // Per-leg aircraft type: manual override wins, live status auto-match is the fallback.
      const legLiveRaw = flightStatus?.[f.key]?.aircraftType ?? null;
      const legAutoSlug = matchAircraftSlug(legLiveRaw);
      const legSlug = legTypes[f.key] ?? legAutoSlug ?? null;
      flightRows.push({
        label: '', value: '',
        component: (
          <AircraftTypeField
            value={legSlug}
            onChange={onLegAircraftChange ? (v) => onLegAircraftChange(f.key, v) : () => {}}
          />
        ),
      });

      const title = booking.flights!.length > 1
        ? `Leg ${i + 1} — ${f.route}`
        : `Flight Details — ${f.route}`;

      const s = section(title, flightRows);
      if (s) sections.push(s);
    });
  } else {
    // No structured flights data — fall back to booking-level info
    const fallbackRows: DetailRow[] = [];
    if (booking.label) fallbackRows.push({ label: 'Details', value: booking.label });
    if (booking.note)  fallbackRows.push({ label: 'Note',    value: booking.note });
    const s = section('Flight Info', fallbackRows);
    if (s) sections.push(s);
  }

  // Booking / confirmation section
  const bookingRows: DetailRow[] = [];
  if (booking.confirmation) {
    bookingRows.push({ label: 'Confirmation', value: booking.confirmation });
  }
  if (booking.confirmation_link) {
    bookingRows.push({
      label: 'Manage booking',
      value: booking.confirmation_link.label,
      link: booking.confirmation_link.url,
    });
  }
  if (booking.note) {
    bookingRows.push({ label: 'Note', value: booking.note });
  }
  const bookingSection = section('Booking', bookingRows);
  if (bookingSection) sections.push(bookingSection);

  // Trip context
  const contextRows: DetailRow[] = [
    { label: 'Stop',     value: stop.city },
    { label: 'Trip leg', value: stop.dates },
  ];
  const contextSection = section('Trip Context', contextRows);
  if (contextSection) sections.push(contextSection);

  return {
    kind: 'flight',
    title: routeLabel,
    subtitle: firstFlight
      ? `${firstFlight.airline} · ${firstFlight.date}`
      : booking.label,
    heroEmoji: <Icons.Flight size={32} weight="duotone" color={IconColors.travel} />,
    heroGradient,
    heroLogoUrl: logoUrl ?? undefined,
    categoryChip: booking.flights && booking.flights.length > 1 ? 'Connecting Flight' : 'Flight',
    sections,
    externalUrl: firstFlight?.trackingUrl ?? (booking.url ?? undefined),
  };
}
