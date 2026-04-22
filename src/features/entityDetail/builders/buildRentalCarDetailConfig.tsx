// buildRentalCarDetailConfig — normalizes a transportation Booking (rental car) into a DetailConfig.
//
// Detection: booking.type === 'transportation'. This catches all transportation bookings,
// not just rental cars. See deliverables flag — a booking.subtype field (Phase 2) would
// allow more precise discrimination between rental cars, shuttles, ferries, etc.
//
// Embeds DateTimeRangeModule (pickup/return), car type selector, airport toggle,
// and DistanceModule. All user edits go through onBookingChange — the caller owns
// the Firebase write queue mutation.

import { useState, useEffect } from 'react';
import type { Booking, Stop } from '../../../types';
import type { DetailConfig, DetailRow, DetailSectionConfig } from '../detailTypes';
import { Colors, Spacing, Radius, Typography } from '../../../design/tokens';
import { domainFromUrl, brandLogoUrl, brandColor, labelToBrandDomain } from '../brandAssets';
import { appleMapsUrl } from '../../../domain/trip';
import { DateTimeRangeModule } from '../components/DateTimeRangeModule';
import { DistanceModule } from '../components/DistanceModule';
import { CAR_TYPE_OPTIONS, CAR_TYPE_LABELS, getCarImageUrl } from '../carAssets';
import { PillSelect } from '../../../components/PillSelect';
import type { PillSelectOption } from '../../../components/PillSelect';
import { section } from './utils';

// ── Car type emoji map ─────────────────────────────────────────────────────

const CAR_EMOJI: Record<string, string> = {
  economy:      '🚗',
  compact:      '🚙',
  midsize:      '🚗',
  fullsize:     '🚘',
  fullsize_suv: '🚐',
  suv:          '🛻',
  minivan:      '🚐',
  convertible:  '🏎',
  pickup:       '🛻',
  luxury:       '✨',
  electric:     '⚡',
};

const CAR_OPTIONS: PillSelectOption[] = CAR_TYPE_OPTIONS.map(slug => ({
  id:    slug,
  value: slug,
  label: CAR_TYPE_LABELS[slug] ?? slug,
  icon:  CAR_EMOJI[slug],
}));

// ── CarTypeField — PillSelect + car image preview ──────────────────────────

interface CarTypeFieldProps {
  value: string | null;
  onChange: (val: string | null) => void;
}

function CarTypeField({ value, onChange }: CarTypeFieldProps) {
  const imgUrl = getCarImageUrl(value);
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
          Vehicle type
        </span>
        <PillSelect
          title="Choose Vehicle Type"
          options={CAR_OPTIONS}
          value={value}
          onChange={onChange}
          placeholder="Choose type"
          align="right"
        />
      </div>

      {/* Image — full width below the row */}
      {imgUrl && !imgError && (
        <img
          src={imgUrl}
          alt={`${CAR_TYPE_LABELS[value ?? ''] ?? 'Vehicle'} representative image`}
          width={800}
          height={400}
          loading="lazy"
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            borderRadius: `${Radius.lg}px`,
            objectFit: 'cover' as const,
            maxHeight: 160,
            display: 'block',
            marginTop: `${Spacing.sm}px`,
          }}
        />
      )}
    </div>
  );
}

// ── Airport pickup toggle ──────────────────────────────────────────────────

interface AirportToggleProps {
  value: boolean | null;
  onChange: (val: boolean) => void;
}

function AirportToggle({ value, onChange }: AirportToggleProps) {
  // Local state for optimistic UI — Firebase write fires on change but the parent
  // re-renders asynchronously. Resync when the prop settles so the toggle doesn't
  // get stuck showing a stale value after a Firebase round-trip.
  const [localValue, setLocalValue] = useState<boolean | null>(value);
  useEffect(() => { setLocalValue(value); }, [value]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: `${Spacing.sm}px`,
        padding: `${Spacing.sm}px 0`,
        borderBottom: `1px solid ${Colors.border}`,
      }}
    >
      <span
        style={{
          fontFamily: Typography.family,
          fontSize: `${Typography.size.sm}px`,
          color: Colors.textMuted,
          flexShrink: 0,
          minWidth: 80,
        }}
      >
        Pickup
      </span>
      <div style={{ display: 'flex', gap: `${Spacing.xs}px` }}>
        {[
          { label: 'On Airport', val: true },
          { label: 'Off Airport', val: false },
        ].map(opt => {
          const isActive = localValue === opt.val;
          return (
            <button
              key={String(opt.val)}
              type="button"
              aria-label={opt.label}
              aria-pressed={isActive}
              onClick={() => {
                setLocalValue(opt.val);
                onChange(opt.val);
              }}
              style={{
                padding: `${Spacing.xxs + 2}px ${Spacing.sm}px`,
                minHeight: 44,
                borderRadius: Radius.full,
                border: 'none',
                background: isActive ? Colors.navy : Colors.surface2,
                color: isActive ? Colors.textInverse : Colors.textMuted,
                fontFamily: Typography.family,
                fontSize: `${Typography.size.xs}px`,
                fontWeight: Typography.weight.medium,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Builder ───────────────────────────────────────────────────────────────

export function buildRentalCarDetailConfig(
  booking: Booking,
  stop: Stop,
  stops: Stop[],
  onBookingChange: (field: keyof Booking, value: string | null | boolean) => void,
  returnBooking: Booking | null = null,
): DetailConfig {
  const domain = (booking.url ? domainFromUrl(booking.url) : null)
    ?? labelToBrandDomain(booking.label);
  const logoUrl = domain ? brandLogoUrl(domain) : null;
  const accent = (domain ? brandColor(domain) : null) ?? '#5B3FA6';
  const heroGradient = `linear-gradient(145deg, ${accent} 0%, ${Colors.navy} 100%)`;

  const destinationOptions = stops.map(s => ({
    id: s.id,
    label: s.city,
    lat: s.lat,
    lon: s.lon,
    addr: s.city,
  }));

  // ── Your Vehicle section ──────────────────────────────────────
  const vehicleRows: DetailRow[] = [
    {
      label: '', value: '',
      component: (
        <CarTypeField
          value={booking.car_type ?? null}
          onChange={v => onBookingChange('car_type', v)}
        />
      ),
    },
    {
      label: '', value: '',
      component: (
        <AirportToggle
          value={booking.airport_pickup ?? null}
          onChange={v => onBookingChange('airport_pickup', v)}
        />
      ),
    },
  ];

  // ── Rental Period section ─────────────────────────────────────
  const rentalRows: DetailRow[] = [
    {
      label: '', value: '',
      component: (
        <DateTimeRangeModule
          startLabel="Pickup"
          endLabel="Return"
          startIcon="🔑"
          endIcon="🚗"
          durationUnit="days"
          startDate={booking.pickup_date ?? null}
          startTime={booking.pickup_time ?? null}
          endDate={booking.return_date ?? null}
          endTime={booking.return_time ?? null}
          onStartDateChange={v => onBookingChange('pickup_date', v)}
          onStartTimeChange={v => onBookingChange('pickup_time', v)}
          onEndDateChange={v => onBookingChange('return_date', v)}
          onEndTimeChange={v => onBookingChange('return_time', v)}
        />
      ),
    },
  ];

  // ── Pickup Location section ───────────────────────────────────
  const pickupRows: DetailRow[] = [];
  if (booking.addr) {
    pickupRows.push({
      label: 'Address',
      value: booking.addr,
      link: appleMapsUrl(booking.addr),
    });
  }
  pickupRows.push({
    label: '', value: '',
    component: (
      <DistanceModule
        originAddr={booking.addr ?? null}
        originLat={null}
        originLon={null}
        destinationOptions={destinationOptions}
        defaultDestinationId={stop.id}
      />
    ),
  });

  // ── Return Location section (only when linked return booking exists) ─────
  const returnRows: DetailRow[] = [];
  if (returnBooking) {
    const returnStop = stops.find(s => s.id === returnBooking.stop_id) ?? stop;
    if (returnBooking.addr) {
      returnRows.push({
        label: 'Address',
        value: returnBooking.addr,
        link: appleMapsUrl(returnBooking.addr),
      });
    }
    returnRows.push({
      label: '', value: '',
      component: (
        <DistanceModule
          originAddr={returnBooking.addr ?? null}
          originLat={null}
          originLon={null}
          destinationOptions={destinationOptions}
          defaultDestinationId={returnStop.id}
        />
      ),
    });
  }

  // ── Booking section ───────────────────────────────────────────
  const bookingRows: DetailRow[] = [];
  if (booking.confirmation) {
    bookingRows.push({ label: 'Confirmation #', value: booking.confirmation });
  }
  if (booking.confirmation_link) {
    bookingRows.push({
      label: 'Manage booking',
      value: booking.confirmation_link.label,
      link: booking.confirmation_link.url,
    });
  }
  if (booking.note) {
    bookingRows.push({ label: 'Notes', value: booking.note });
  }

  const sections: DetailSectionConfig[] = [
    section('Your Vehicle', vehicleRows),
    section('Rental Period', rentalRows),
    section('Pickup Location', pickupRows),
    returnBooking ? section('Return Location', returnRows) : null,
    section('Booking', bookingRows),
  ].filter((s): s is DetailSectionConfig => s !== null);

  if (sections.length === 0) {
    sections.push({ title: 'Info', rows: [{ label: 'Type', value: 'Transportation' }, { label: 'Stop', value: stop.city }] });
  }

  return {
    kind: 'booking',
    title: booking.label,
    subtitle: `Transportation · ${stop.city}`,
    heroEmoji: booking.icon,
    heroGradient,
    heroLogoUrl: logoUrl ?? undefined,
    categoryChip: 'Rental Car',
    mapLat: stop.lat,
    mapLon: stop.lon,
    mapAddr: booking.addr ?? undefined,
    sections,
    externalUrl: booking.url ?? undefined,
  };
}
