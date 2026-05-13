// buildRentalCarDetailConfig — normalizes a transportation Booking (rental car) into a DetailConfig.
//
// Detection: booking.type === 'transportation'. This catches all transportation bookings,
// not just rental cars. See deliverables flag — a booking.subtype field (Phase 2) would
// allow more precise discrimination between rental cars, shuttles, ferries, etc.
//
// Embeds a vertical JourneyTimeline (Pickup → Drop-off), DateTimeRangeModule (pickup/return),
// car type selector, and airport toggle. All user edits go through onBookingChange — the caller
// owns the Firebase write queue mutation.

import { useState, useEffect } from 'react';
import type { Booking, Stop } from '../../../types';
import { Icons } from '../../../design/icons';
import { IconColors } from '../../../design/tokens';
import type { DetailConfig, DetailRow, DetailSectionConfig } from '../detailTypes';
import { Colors, Semantic, Spacing, Radius, Typography } from '../../../design/tokens';
import {
  domainFromUrl, brandLogoUrl, brandColor, labelToBrandDomain,
  brandSupportPhone, brandAccountUrl,
} from '../brandAssets';
import { DateTimeRangeModule } from '../components/DateTimeRangeModule';
import { CAR_TYPE_OPTIONS, CAR_TYPE_LABELS, getCarImageUrl } from '../carAssets';
import { getAirportName } from '../../../domain/airports';
import { PillSelect } from '../../../components/PillSelect';
import type { PillSelectOption } from '../../../components/PillSelect';
import { section } from './utils';

const CAR_OPTIONS: PillSelectOption[] = CAR_TYPE_OPTIONS.map(slug => ({
  id:    slug,
  value: slug,
  label: CAR_TYPE_LABELS[slug] ?? slug,
  icon:  <Icons.Car size={12} weight="duotone" color={IconColors.travel} />,
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
  const [localValue, setLocalValue] = useState<boolean | null>(value);
  useEffect(() => { setLocalValue(value); }, [value]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: `${Spacing.sm}px`,
      padding: `${Spacing.sm}px 0`,
    }}>
      <span style={{
        fontFamily: Typography.family.sans,
        fontSize: `${Typography.size.sm}px`,
        color: Colors.textMuted,
        flexShrink: 0,
        minWidth: 80,
      }}>
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
                fontFamily: Typography.family.sans,
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

// ── JourneyTimeline — vertical PWM → BGR layout ────────────────────────────

interface InfoChipProps { label: string }
function InfoChip({ label }: InfoChipProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: Colors.surface2,
      border: `1px solid ${Colors.border}`,
      borderRadius: `${Radius.sm}px`,
      padding: '2px 8px',
      fontSize: 11,
      fontFamily: Typography.family.sans,
      color: Colors.textMuted,
      whiteSpace: 'nowrap' as const,
    }}>
      {label}
    </span>
  );
}

interface JourneyTimelineProps {
  booking: Booking;
  returnBooking: Booking | null;
  domain: string | null;
}

function JourneyTimeline({ booking, returnBooking, domain }: JourneyTimelineProps) {
  const pickupCode = booking.pickup_airport ?? null;
  const dropoffCode = (returnBooking?.dropoff_airport ?? booking.dropoff_airport) ?? null;
  const pickupName = pickupCode ? getAirportName(pickupCode) : null;
  const dropoffName = dropoffCode ? getAirportName(dropoffCode) : null;
  const brandName = domain?.split('.')[0].toUpperCase() ?? null;
  const carLabel = booking.car_type ? (CAR_TYPE_LABELS[booking.car_type] ?? booking.car_type) : null;

  function fmtTime(t: string | null | undefined): string {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ?? '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  }

  function fmtDate(d: string | null | undefined): string {
    if (!d) return '';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  }

  const lineStyle: React.CSSProperties = {
    width: 1.5,
    background: Colors.border,
    margin: '4px auto',
    minHeight: 24,
    flexShrink: 0,
  };

  const nodeCol: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };

  const dotSize = 10;

  return (
    <div style={{ padding: `${Spacing.sm}px 0` }}>
      {/* Pickup node */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
          <div style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            border: `2px solid ${Colors.textMuted}`,
            background: Colors.surfaceRaised,
            flexShrink: 0,
          }} />
        </div>
        <div style={nodeCol}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontFamily: Typography.family.sans,
              fontSize: `${Typography.size.lg}px`,
              fontWeight: Typography.weight.bold,
              color: Colors.textPrimary,
              lineHeight: 1,
            }}>
              {pickupCode ?? '—'}
            </span>
            <span style={{
              fontFamily: Typography.family.sans,
              fontSize: `${Typography.size.sm}px`,
              color: Colors.textMuted,
            }}>
              {fmtDate(booking.pickup_date)}
            </span>
          </div>
          {pickupName && (
            <div style={{
              fontFamily: Typography.family.sans,
              fontSize: `${Typography.size.sm}px`,
              color: Colors.textSecondary,
              marginBottom: 4,
            }}>
              {pickupName}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
            {booking.pickup_time && <InfoChip label={fmtTime(booking.pickup_time)} />}
            {booking.airport_pickup != null && (
              <InfoChip label={booking.airport_pickup ? 'On Airport' : 'Off Airport'} />
            )}
            {brandName && <InfoChip label={brandName} />}
          </div>
        </div>
      </div>

      {/* Connector track */}
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ width: dotSize, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={lineStyle} />
          <Icons.Car size={14} color={Colors.textMuted} weight="duotone" />
          <div style={lineStyle} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, alignSelf: 'center', paddingBottom: 2 }}>
          {carLabel && <InfoChip label={carLabel} />}
        </div>
      </div>

      {/* Drop-off node */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
          <div style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: Semantic.success,
            flexShrink: 0,
          }} />
        </div>
        <div style={nodeCol}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontFamily: Typography.family.sans,
              fontSize: `${Typography.size.lg}px`,
              fontWeight: Typography.weight.bold,
              color: Semantic.success,
              lineHeight: 1,
            }}>
              {dropoffCode ?? '—'}
            </span>
            <span style={{
              fontFamily: Typography.family.sans,
              fontSize: `${Typography.size.sm}px`,
              color: Colors.textMuted,
            }}>
              {fmtDate(booking.return_date)}
            </span>
          </div>
          {dropoffName && (
            <div style={{
              fontFamily: Typography.family.sans,
              fontSize: `${Typography.size.sm}px`,
              color: Colors.textSecondary,
              marginBottom: 4,
            }}>
              {dropoffName}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
            {(returnBooking?.return_time ?? booking.return_time) && (
              <InfoChip label={fmtTime(returnBooking?.return_time ?? booking.return_time)} />
            )}
            {booking.airport_pickup != null && (
              <InfoChip label={booking.airport_pickup ? 'On Airport' : 'Off Airport'} />
            )}
            {brandName && <InfoChip label={brandName} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── VehicleCard wrapper ────────────────────────────────────────────────────

interface VehicleCardProps {
  value: string | null;
  airportPickup: boolean | null;
  onCarTypeChange: (val: string | null) => void;
  onAirportPickupChange: (val: boolean) => void;
}

function VehicleCard({ value, airportPickup, onCarTypeChange, onAirportPickupChange }: VehicleCardProps) {
  return (
    <div style={{
      background: Colors.surfaceRaised,
      borderRadius: `${Radius.lg}px`,
      overflow: 'hidden',
      border: `1px solid ${Colors.border}`,
    }}>
      <div style={{ padding: `0 ${Spacing.base}px` }}>
        <CarTypeField value={value} onChange={onCarTypeChange} />
        <AirportToggle value={airportPickup} onChange={onAirportPickupChange} />
      </div>
    </div>
  );
}

// ── Builder ───────────────────────────────────────────────────────────────

export function buildRentalCarDetailConfig(
  booking: Booking,
  stop: Stop,
  _stops: Stop[],
  onBookingChange: (field: keyof Booking, value: string | null | boolean) => void,
  returnBooking: Booking | null = null,
  isReturnContext = false,
): DetailConfig {
  const domain = (booking.url ? domainFromUrl(booking.url) : null)
    ?? labelToBrandDomain(booking.label);
  const logoUrl = domain ? brandLogoUrl(domain) : null;
  const accent = (domain ? brandColor(domain) : null) ?? '#5B3FA6';
  const heroGradient = `linear-gradient(145deg, ${accent} 0%, ${Colors.navy} 100%)`;

  // ── Your Vehicle section ──────────────────────────────────────
  const vehicleRows: DetailRow[] = [
    {
      label: '', value: '',
      component: (
        <VehicleCard
          value={booking.car_type ?? null}
          airportPickup={booking.airport_pickup ?? null}
          onCarTypeChange={v => onBookingChange('car_type', v)}
          onAirportPickupChange={v => onBookingChange('airport_pickup', v)}
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
          startIcon={<Icons.Key size={16} weight="duotone" color={IconColors.travel} />}
          endIcon={<Icons.Car size={16} weight="duotone" color={IconColors.travel} />}
          durationUnit="days"
          startDate={booking.pickup_date ?? null}
          startTime={booking.pickup_time ?? null}
          endDate={booking.return_date ?? null}
          endTime={booking.return_time ?? null}
          onStartDateChange={v => onBookingChange('pickup_date', v)}
          onStartTimeChange={v => onBookingChange('pickup_time', v)}
          onEndDateChange={v => onBookingChange('return_date', v)}
          onEndTimeChange={v => onBookingChange('return_time', v)}
          pillVariant="soft"
        />
      ),
    },
  ];

  // ── Journey section (replaces Pickup/Return Location) ─────────
  const journeyRows: DetailRow[] = [
    {
      label: '', value: '',
      component: (
        <JourneyTimeline
          booking={booking}
          returnBooking={returnBooking}
          domain={domain}
        />
      ),
    },
  ];

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
    section('Journey', journeyRows),
    section('Booking', bookingRows),
  ].filter((s): s is DetailSectionConfig => s !== null);

  if (sections.length === 0) {
    sections.push({ title: 'Info', rows: [{ label: 'Type', value: 'Transportation' }, { label: 'Stop', value: stop.city }] });
  }

  return {
    kind: 'booking',
    title: 'Rental Car',
    subtitle: `Transportation · ${stop.city}`,
    titleLogoUrl: logoUrl ?? undefined,
    heroEmoji: <Icons.Car size={36} weight="duotone" color={IconColors.travel} />,
    heroGradient,
    heroLogoUrl: logoUrl ?? undefined,
    categoryChip: 'Rental Car',
    mapAddr: (isReturnContext ? returnBooking?.addr : booking.addr) ?? undefined,
    phone: brandSupportPhone(domain) ?? undefined,
    externalUrl: (brandAccountUrl(domain) ?? booking.url) ?? undefined,
    externalUrlLabel: 'Manage',
    sections,
  };
}
