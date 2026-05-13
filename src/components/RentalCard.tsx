import type { Booking, Stop } from '../types';
import { Icons } from '../design/icons';
import {
  Colors, Semantic, Typography, Spacing, Radius, Shadow,
} from '../design/tokens';
import { domainFromUrl, brandLogoUrl, labelToBrandDomain, brandShortName } from '../features/entityDetail/brandAssets';
import { getAirportName } from '../domain/airports';
import { CAR_TYPE_LABELS } from '../features/entityDetail/carAssets';
import { resolveStopColor } from '../design/tripPacks';

export interface RentalCardProps {
  booking: Booking;            // primary (pickup) booking
  returnBooking: Booking | null;
  stop: Stop;
  onExpand?: (booking: Booking, rect: DOMRect) => void;
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return '—';
  // Use noon to avoid local-timezone date shifts
  const startDate = new Date(start + 'T12:00:00');
  const endDate = end ? new Date(end + 'T12:00:00') : null;
  const startMonth = startDate.toLocaleString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  if (!endDate) return `${startMonth} ${startDay}`;
  const endMonth = endDate.toLocaleString('en-US', { month: 'short' });
  const endDay = endDate.getDate();
  if (startMonth === endMonth) return `${startMonth} ${startDay}–${endDay}`;
  return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
}

function daysBetween(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  const a = new Date(start + 'T12:00:00');
  const b = new Date(end + 'T12:00:00');
  const d = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return d > 0 ? d : null;
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return 'TBD';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m} ${ampm}`;
}

// ── Sub-components ────────────────────────────────────────────

function RentalDot({ color }: { color: string }) {
  return (
    <div style={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      border: `1.5px solid ${color}`,
      background: Colors.surfaceRaised,
      flexShrink: 0,
    }} />
  );
}

function CarLine({ accent }: { accent: string }) {
  return (
    <div style={{ width: '100%', height: 1.5, background: Colors.border, position: 'relative' }}>
      <span style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'inline-flex',
        background: Colors.surfaceRaised,
        padding: '0 2px',
        lineHeight: 1,
      }}>
        <Icons.Car size={13} color={accent} weight="duotone" />
      </span>
    </div>
  );
}

// ── RentalCard ────────────────────────────────────────────────

export function RentalCard({ booking, returnBooking, stop, onExpand }: RentalCardProps) {
  const domain = (booking.url ? domainFromUrl(booking.url) : null)
    ?? labelToBrandDomain(booking.label);
  const brandName = brandShortName(domain, booking.label.split(' ')[0].toUpperCase());
  const logoUrl = domain ? brandLogoUrl(domain, 40) : null;

  const accent = resolveStopColor(stop);
  const dateRange = fmtDateRange(booking.pickup_date, booking.return_date);
  const days = daysBetween(booking.pickup_date, booking.return_date);
  const carLabel = booking.car_type ? (CAR_TYPE_LABELS[booking.car_type] ?? booking.car_type) : null;

  // Airport codes + names
  const pickupCode = booking.pickup_airport ?? null;
  const dropoffCode = (returnBooking?.dropoff_airport ?? booking.dropoff_airport) ?? null;
  const pickupName = pickupCode ? getAirportName(pickupCode) : null;
  const dropoffName = dropoffCode ? getAirportName(dropoffCode) : null;

  // Footer context: if this IS the return booking, show drop-off label
  const isReturn = !!booking.linked_booking_id;
  const contextCode = isReturn ? dropoffCode : pickupCode;
  const contextTime = isReturn
    ? fmtTime(booking.return_time)
    : fmtTime(booking.pickup_time);
  const contextDot = isReturn ? Semantic.success : accent;
  const contextLabel = isReturn
    ? `Drop-off${contextCode ? ` at ${contextCode}` : ''} · ${contextTime}`
    : `Pickup${contextCode ? ` at ${contextCode}` : ''} · ${contextTime}`;

  const handleExpand = onExpand
    ? (e: React.MouseEvent<HTMLElement>) =>
        onExpand(booking, (e.currentTarget as HTMLElement).getBoundingClientRect())
    : undefined;

  return (
    <div data-rental-card style={{
      background: Colors.surfaceRaised,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      boxShadow: Shadow.cardResting,
    }}>
      {/* 1. Header strip */}
      <div
        onClick={handleExpand}
        style={{
          background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
          padding: '12px 14px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          cursor: onExpand ? 'pointer' : 'default',
        }}
      >
        {/* Left: icon + title + vehicle type */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ marginTop: 1, flexShrink: 0 }}>
            <Icons.Car size={18} color="rgba(255,255,255,0.7)" weight="duotone" />
          </div>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 5,
              flexWrap: 'wrap' as const,
              lineHeight: 1.2,
            }}>
              <span style={{
                fontSize: 13,
                fontWeight: Typography.weight.bold,
                color: '#ffffff',
                fontFamily: Typography.family.sans,
              }}>
                Rental Car
              </span>
              {carLabel && (
                <span style={{
                  fontSize: 11,
                  fontWeight: Typography.weight.regular,
                  color: 'rgba(255,255,255,0.65)',
                  fontFamily: Typography.family.sans,
                }}>
                  {carLabel}
                </span>
              )}
            </div>
            <div style={{
              fontSize: 9,
              fontWeight: Typography.weight.medium,
              color: 'rgba(255,255,255,0.55)',
              fontFamily: Typography.family.sans,
              letterSpacing: '0.04em',
              marginTop: 2,
            }}>
              {stop.city}
            </div>
          </div>
        </div>

        {/* Right: date range + day count */}
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: Spacing.md }}>
          <div style={{
            fontSize: Typography.size.sm,
            fontWeight: Typography.weight.bold,
            color: '#ffffff',
            fontFamily: Typography.family.sans,
          }}>
            {dateRange}
          </div>
          {days != null && (
            <div style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.45)',
              fontFamily: Typography.family.sans,
              marginTop: 2,
            }}>
              {days} day{days !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* 2. Horizontal timeline */}
      <div
        onClick={handleExpand}
        style={{ padding: '10px 14px 8px', cursor: onExpand ? 'pointer' : 'default' }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(56px, auto) 1fr minmax(56px, auto)',
          gridTemplateRows: '14px auto auto',
          alignItems: 'center',
          justifyItems: 'center',
          rowGap: 3,
        }}>
          {/* Row 1: duration above track */}
          <div />
          <div style={{
            fontSize: Typography.size.xs,
            color: Colors.textMuted,
            fontFamily: Typography.family.sans,
            whiteSpace: 'nowrap' as const,
          }}>
            {days != null ? `${days} day${days !== 1 ? 's' : ''}` : ''}
          </div>
          <div />

          {/* Row 2: dots + line */}
          <RentalDot color={accent} />
          <CarLine accent={accent} />
          <RentalDot color={Semantic.success} />

          {/* Row 3: node labels */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            textAlign: 'center' as const,
          }}>
            <div style={{
              fontSize: Typography.size.base + 2,
              fontWeight: Typography.weight.bold,
              color: Colors.textPrimary,
              fontFamily: Typography.family.sans,
              lineHeight: 1,
            }}>
              {pickupCode ?? '—'}
            </div>
            <div style={{
              fontSize: 9,
              fontWeight: Typography.weight.semibold,
              color: accent,
              fontFamily: Typography.family.sans,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
            }}>
              Pickup
            </div>
            {pickupName && (
              <div style={{
                fontSize: 9,
                color: Colors.textMuted,
                fontFamily: Typography.family.sans,
                maxWidth: 80,
                textAlign: 'center' as const,
                lineHeight: 1.2,
              }}>
                {pickupName}
              </div>
            )}
          </div>

          {/* center cell — brand logo on same row as airport labels */}
          {logoUrl ? (
            <div style={{
              background: '#ffffff',
              borderRadius: 4,
              padding: '2px 7px',
              display: 'flex',
              alignItems: 'center',
            }}>
              <img
                src={logoUrl}
                alt={brandName}
                style={{ height: 13, width: 'auto', display: 'block' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ) : <div />}


          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            textAlign: 'center' as const,
          }}>
            <div style={{
              fontSize: Typography.size.base + 2,
              fontWeight: Typography.weight.bold,
              color: Colors.textPrimary,
              fontFamily: Typography.family.sans,
              lineHeight: 1,
            }}>
              {dropoffCode ?? '—'}
            </div>
            <div style={{
              fontSize: 9,
              fontWeight: Typography.weight.semibold,
              color: Semantic.success,
              fontFamily: Typography.family.sans,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
            }}>
              Drop-off
            </div>
            {dropoffName && (
              <div style={{
                fontSize: 9,
                color: Colors.textMuted,
                fontFamily: Typography.family.sans,
                maxWidth: 80,
                textAlign: 'center' as const,
                lineHeight: 1.2,
              }}>
                {dropoffName}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Footer */}
      <div style={{
        padding: '8px 14px 10px',
        borderTop: `1px solid ${Colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{
          fontSize: Typography.size.xs,
          color: Colors.textMuted,
          fontFamily: Typography.family.sans,
        }}>
          <span style={{ color: contextDot }}>●</span>{' '}
          {contextLabel}
        </div>
        {onExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand(booking, (e.currentTarget as HTMLElement).closest('[data-rental-card]')?.getBoundingClientRect() ?? new DOMRect());
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: `${accent}22`,
              color: accent,
              border: 'none',
              borderRadius: Radius.full,
              padding: '3px 10px',
              fontSize: Typography.size.xs,
              fontWeight: Typography.weight.semibold,
              fontFamily: Typography.family.sans,
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: Spacing.sm,
            }}
          >
            Details ›
          </button>
        )}
      </div>
    </div>
  );
}
