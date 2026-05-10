// buildFlightDetailConfig — normalizes a flight Booking + its parent Stop into a DetailConfig.
// Called when booking.type === 'flight'.
//
// Airline logo: derived from IATA code (first two chars of flight number).
// Brand color: used for hero gradient when known.
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
import { Colors, Semantic, Spacing, Typography, Radius } from '../../../design/tokens';
import { iataFromFlightNum, airlineLogoUrl, brandColor } from '../brandAssets';
import { getAirportName, getAirportUrl, parseIataFromRoute, IATA_AIRPORTS } from '../../../domain/airports';
import type { FlightStatus } from '../../../domain/trip';
import { flightDuration, layoverDuration, parseFlightTime } from '../../../domain/trip';
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: `${Spacing.md}px`,
        padding: `${Spacing.sm}px 0`,
        borderBottom: `1px solid ${Colors.border}`,
      }}>
        <span style={{
          fontFamily: Typography.family.sans,
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

// ── JourneyTimeline ────────────────────────────────────────────────────────────

interface JourneyTimelineProps {
  booking: Booking;
  accent: string;
  flightStatus?: Record<string, FlightStatus>;
  onLegAircraftChange?: (legKey: string, value: string | null) => void;
}

function JourneyTimeline({ booking, accent, flightStatus, onLegAircraftChange }: JourneyTimelineProps) {
  const flights = booking.flights ?? [];
  if (flights.length === 0) return null;

  const legTypes = booking.aircraft_types ?? {};

  return (
    <div style={{ paddingTop: Spacing.xs }}>
      {flights.map((f, i) => {
        const isLastFlight = i === flights.length - 1;
        const hasLayover = i < flights.length - 1;

        const parsed = parseIataFromRoute(f.route);
        const originIata = parsed?.origin.toUpperCase() ?? f.route.split(' → ')[0].trim().toUpperCase();
        const destIata   = parsed?.dest.toUpperCase()   ?? f.route.split(' → ')[1].trim().toUpperCase();
        const originName = getAirportName(originIata);
        const destName   = getAirportName(destIata);

        const legLiveRaw  = flightStatus?.[f.key]?.aircraftType ?? null;
        const legAutoSlug = matchAircraftSlug(legLiveRaw);
        const legSlug     = legTypes[f.key] ?? legAutoSlug ?? null;
        const aircraft    = legSlug ? (AIRCRAFT_LABELS[legSlug] ?? legSlug) : (legLiveRaw ?? '—');
        const gate        = flightStatus?.[f.key]?.gate ?? 'TBD';
        const duration    = flightDuration(f.dep, f.arr);
        const layover     = hasLayover ? layoverDuration(f.arr, flights[i + 1].dep) : null;

        return (
          <div key={f.key}>
            {/* Leg pill (multi-leg only) */}
            {flights.length > 1 && (
              <div style={{ marginBottom: Spacing.sm }}>
                <span style={{
                  fontSize: Typography.size.xs,
                  fontWeight: Typography.weight.bold,
                  color: accent,
                  background: `${accent}1a`,
                  borderRadius: Radius.sm,
                  padding: '2px 8px',
                  fontFamily: Typography.family.sans,
                }}>
                  Leg {i + 1} · {f.num}
                </span>
              </div>
            )}

            {/* Departure row */}
            <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'flex-start' }}>
              {/* Left track column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                <div style={{ width: 2, flex: 1, background: accent, minHeight: 12, marginTop: 3 }} />
              </div>
              {/* Right content */}
              <div style={{ flex: 1, paddingBottom: Spacing.xs }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                  <div style={{ fontSize: 16, fontWeight: Typography.weight.bold, color: Colors.textPrimary, fontFamily: Typography.family.sans }}>{originIata}</div>
                  <div style={{ fontSize: 16, fontWeight: Typography.weight.bold, color: Colors.textPrimary, fontFamily: Typography.family.sans }}>{f.dep}</div>
                </div>
                <div style={{ fontSize: Typography.size.xs, color: Colors.textSecondary, fontFamily: Typography.family.sans }}>{originName}</div>
              </div>
            </div>

            {/* Info strip row */}
            <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'stretch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                <div style={{ width: 2, flex: 1, background: accent }} />
              </div>
              <div style={{ flex: 1, paddingTop: Spacing.xs, paddingBottom: Spacing.xs }}>
                {/* Info strip */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  background: Colors.surface2,
                  borderRadius: Radius.md,
                  overflow: 'hidden',
                  marginBottom: Spacing.xs,
                }}>
                  {[
                    { label: 'Duration', value: duration },
                    { label: 'Aircraft', value: aircraft },
                    { label: 'Gate',     value: gate },
                  ].map((col, ci) => (
                    <div key={ci} style={{
                      padding: `${Spacing.sm}px ${Spacing.xs}px`,
                      borderRight: ci < 2 ? `1px solid ${Colors.border}` : 'none',
                      textAlign: 'center' as const,
                    }}>
                      <div style={{ fontSize: 8, color: Colors.textMuted, fontFamily: Typography.family.sans, marginBottom: 2, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{col.label}</div>
                      <div style={{ fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, color: Colors.textPrimary, fontFamily: Typography.family.sans }}>{col.value}</div>
                    </div>
                  ))}
                </div>
                {/* Aircraft type picker */}
                <AircraftTypeField
                  value={legSlug}
                  onChange={onLegAircraftChange ? (v) => onLegAircraftChange(f.key, v) : () => {}}
                />
              </div>
            </div>

            {/* Arrival row */}
            <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'flex-start', marginBottom: hasLayover ? Spacing.xs : Spacing.base }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: isLastFlight ? Semantic.success : accent,
                  flexShrink: 0,
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                  <div style={{ fontSize: 16, fontWeight: Typography.weight.bold, color: isLastFlight ? Semantic.success : Colors.textPrimary, fontFamily: Typography.family.sans }}>{destIata}</div>
                  <div style={{ fontSize: 16, fontWeight: Typography.weight.bold, color: Colors.textPrimary, fontFamily: Typography.family.sans }}>{f.arr}</div>
                </div>
                <div style={{ fontSize: Typography.size.xs, color: Colors.textSecondary, fontFamily: Typography.family.sans }}>{destName}</div>
                {isLastFlight && (
                  <div style={{ fontSize: Typography.size.xs, color: Semantic.success, fontFamily: Typography.family.sans, marginTop: 2 }}>✓ Destination</div>
                )}
              </div>
            </div>

            {/* Layover block + dashed connector */}
            {hasLayover && layover && (
              <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'stretch', marginBottom: Spacing.base }}>
                <div style={{ width: 14, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 0, borderLeft: `2px dashed ${Colors.border}`, flex: 1 }} />
                </div>
                <div style={{
                  flex: 1,
                  background: Semantic.confirmedTint,
                  border: `1px solid rgba(201,150,58,0.2)`,
                  borderRadius: Radius.md,
                  padding: `${Spacing.sm}px ${Spacing.md}px`,
                  fontSize: Typography.size.xs,
                  color: Semantic.confirmedDark,
                  fontFamily: Typography.family.sans,
                }}>
                  ⏱ {layover} layover — Terminal change may be required
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── buildFlightDetailConfig ────────────────────────────────────────────────────

export function buildFlightDetailConfig(
  booking: Booking,
  stop: Stop,
  flightStatus?: Record<string, FlightStatus>,
  onLegAircraftChange?: (legKey: string, value: string | null) => void,
): DetailConfig {
  const firstFlight = booking.flights?.[0];
  const flights = booking.flights ?? [];

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
  const routeLabel = flights.length > 1
    ? flights.map(f => f.route.split(' → ')[0]).join(' → ') +
      ' → ' + flights[flights.length - 1].route.split(' → ')[1]
    : (firstFlight?.route ?? booking.label);

  const sections: DetailSectionConfig[] = [];

  // ── Journey section ────────────────────────────────────────────────────────

  if (flights.length > 0) {
    // Total journey time = sum of all leg durations + all layovers
    let totalMins = 0;
    flights.forEach((f, i) => {
      let legMins = parseFlightTime(f.arr) - parseFlightTime(f.dep);
      if (legMins < 0) legMins += 1440;
      totalMins += legMins;
      if (i < flights.length - 1) {
        let layMins = parseFlightTime(flights[i + 1].dep) - parseFlightTime(f.arr);
        if (layMins < 0) layMins += 1440;
        totalMins += layMins;
      }
    });
    const totalH = Math.floor(totalMins / 60);
    const totalM = totalMins % 60;
    const totalLabel = totalM === 0 ? `${totalH}h` : `${totalH}h ${totalM}m`;

    const journeyRows: DetailRow[] = [{
      label: '',
      value: '',
      component: (
        <JourneyTimeline
          booking={booking}
          accent={stop.accent}
          flightStatus={flightStatus}
          onLegAircraftChange={onLegAircraftChange}
        />
      ),
    }];

    const journeySection = section(`Journey · Total ${totalLabel}`, journeyRows);
    if (journeySection) sections.push(journeySection);
  } else {
    // No structured flights — fallback
    const fallbackRows: DetailRow[] = [];
    if (booking.label) fallbackRows.push({ label: 'Details', value: booking.label });
    if (booking.note)  fallbackRows.push({ label: 'Note',    value: booking.note });
    const s = section('Flight Info', fallbackRows);
    if (s) sections.push(s);
  }

  // ── Booking / confirmation section ─────────────────────────────────────────

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

  // ── Trip Details section ───────────────────────────────────────────────────

  const detailRows: DetailRow[] = [];

  if (firstFlight?.date) {
    detailRows.push({ label: 'Date', value: firstFlight.date });
  }

  // Total travel time
  if (flights.length > 0) {
    let totalMins = 0;
    flights.forEach((f, i) => {
      let legMins = parseFlightTime(f.arr) - parseFlightTime(f.dep);
      if (legMins < 0) legMins += 1440;
      totalMins += legMins;
      if (i < flights.length - 1) {
        let layMins = parseFlightTime(flights[i + 1].dep) - parseFlightTime(f.arr);
        if (layMins < 0) layMins += 1440;
        totalMins += layMins;
      }
    });
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    detailRows.push({ label: 'Total travel time', value: m === 0 ? `${h}h` : `${h}h ${m}m` });
  }

  // Great-circle distance (first leg only if single, or all legs summed)
  let totalMiles = 0;
  for (const f of flights) {
    const parsed = parseIataFromRoute(f.route);
    if (parsed) {
      const originRec = IATA_AIRPORTS[parsed.origin.toUpperCase()];
      const destRec   = IATA_AIRPORTS[parsed.dest.toUpperCase()];
      if (originRec && destRec) {
        totalMiles += Math.round(toMiles(haversineKm(originRec.lat, originRec.lon, destRec.lat, destRec.lon)));
      }
    }
  }
  if (totalMiles > 0) {
    detailRows.push({ label: 'Total distance', value: `~${totalMiles.toLocaleString()} mi` });
  }

  // FlightAware tracking link (first leg)
  if (firstFlight?.trackingUrl) {
    detailRows.push({ label: 'Track live', value: 'FlightAware ↗', link: firstFlight.trackingUrl });
  }

  // Destination airport map link
  const lastFlight = flights[flights.length - 1];
  if (lastFlight) {
    const lastParsed = parseIataFromRoute(lastFlight.route);
    if (lastParsed) {
      const destUrl = getAirportUrl(lastParsed.dest);
      if (destUrl) {
        detailRows.push({ label: 'Airport map', value: 'View airport →', link: destUrl });
      }
    }
  }

  const tripDetailsSection = section('Trip Details', detailRows);
  if (tripDetailsSection) sections.push(tripDetailsSection);

  return {
    kind: 'flight',
    title: routeLabel,
    subtitle: firstFlight
      ? `${firstFlight.airline} · ${firstFlight.date}`
      : booking.label,
    heroEmoji: <Icons.Flight size={32} weight="duotone" color={IconColors.travel} />,
    heroGradient,
    heroLogoUrl: logoUrl ?? undefined,
    categoryChip: flights.length > 1 ? 'Connecting Flight' : 'Flight',
    sections,
    externalUrl: firstFlight?.trackingUrl ?? (booking.url ?? undefined),
  };
}
