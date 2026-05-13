import type { Booking, Group, PlaceEnrichment, Stop } from '../types';
import { Icons } from '../design/icons';
import type { IconComponent } from '../design/icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../design/tokens';
import { resolveStopColor } from '../design/tripPacks';

export interface HotelGroupCardProps {
  bookings: Booking[];
  stop: Stop;
  groups: Group[];
  enrichmentMap: Record<string, PlaceEnrichment | undefined>;
  onExpand?: (booking: Booking, rect: DOMRect) => void;
}

// ── Helpers ───────────────────────────────────────────────────

function fmtHeaderRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  const sWeekday = s.toLocaleString('en-US', { weekday: 'short' });
  const eWeekday = e.toLocaleString('en-US', { weekday: 'short' });
  return `${sWeekday} ${s.getDate()} – ${eWeekday} ${e.getDate()}`;
}

function fmtHeaderMonth(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleString('en-US', { month: 'short' }).toUpperCase();
}

function nightsBetween(start: string, end: string): number | null {
  const n = Math.round(
    (new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()) / 86_400_000,
  );
  return n > 0 ? n : null;
}

// ── Amenity icons ─────────────────────────────────────────────

const AMENITY_ICONS: Partial<Record<string, IconComponent>> = {
  'Fitness Center': Icons.Fitness,
  'Hot Tub':        Icons.HotTub,
  'Pool':           Icons.Pool,
  'Restaurant':     Icons.Restaurant,
  'Bar':            Icons.Cocktail,
  'Free Parking':   Icons.Car,
  'Valet Parking':  Icons.Car,
  'Paid Parking':   Icons.Car,
  'Family Friendly': Icons.Home,
  'Accessible':     Icons.Walk,
};

// ── HotelGroupCard ────────────────────────────────────────────

export function HotelGroupCard({ bookings, stop, groups, enrichmentMap, onExpand }: HotelGroupCardProps) {
  const accent = resolveStopColor(stop);

  const startDate = bookings.map(b => b.checkin_date).filter(Boolean).sort()[0]
    ?? stop.weather_start;
  const endDate = bookings.map(b => b.checkout_date).filter(Boolean).sort().at(-1)
    ?? stop.weather_end;

  const nights = startDate && endDate ? nightsBetween(startDate, endDate) : null;
  const month = startDate ? fmtHeaderMonth(startDate) : '';
  const dateRange = startDate && endDate ? fmtHeaderRange(startDate, endDate) : '—';

  return (
    <div style={{
      background: Colors.surfaceRaised,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      boxShadow: Shadow.cardResting,
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
        padding: '12px 14px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <Icons.Hotel size={16} color="rgba(255,255,255,0.65)" weight="duotone" />
          <div style={{ minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 5,
              flexWrap: 'wrap' as const,
              lineHeight: 1.2,
            }}>
              <span style={{
                fontSize: 15,
                fontWeight: Typography.weight.bold,
                color: '#ffffff',
                fontFamily: Typography.family.sans,
              }}>
                Stays
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: Typography.weight.regular,
                color: 'rgba(255,255,255,0.65)',
                fontFamily: Typography.family.sans,
              }}>
                {bookings.length} {bookings.length === 1 ? 'Room' : 'Rooms'}
              </span>
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

        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: Spacing.md }}>
          <div style={{
            fontSize: Typography.size.sm,
            fontWeight: Typography.weight.bold,
            color: '#ffffff',
            fontFamily: Typography.family.sans,
            whiteSpace: 'nowrap' as const,
          }}>
            {dateRange}
          </div>
          {nights != null && (
            <div style={{
              fontSize: 9,
              fontWeight: Typography.weight.medium,
              color: 'rgba(255,255,255,0.55)',
              fontFamily: Typography.family.sans,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
              marginTop: 2,
              whiteSpace: 'nowrap' as const,
            }}>
              {month} · {nights} Night{nights !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Hotel rows */}
      {bookings.map((booking) => {
        const enrichment = enrichmentMap[booking.id];
        const groupName = booking.group_ids?.length
          ? groups.find(g => g.id === booking.group_ids![0])?.name
          : null;
        const groupLabel = groupName ? groupName.toUpperCase() + "'S" : null;
        const amenities = (enrichment?.amenities ?? []).filter(a => AMENITY_ICONS[a]);

        return (
          <div
            key={booking.id}
            onClick={onExpand
              ? (e) => onExpand(booking, (e.currentTarget as HTMLElement).getBoundingClientRect())
              : undefined}
            style={{
              borderTop: `1px solid ${Colors.border}`,
              padding: '10px 14px',
              cursor: onExpand ? 'pointer' : 'default',
            }}
          >
            {groupLabel && (
              <div style={{
                fontSize: 9,
                fontWeight: Typography.weight.bold,
                color: accent,
                fontFamily: Typography.family.sans,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                marginBottom: 3,
              }}>
                {groupLabel}
              </div>
            )}
            <div style={{
              fontSize: 14,
              fontWeight: Typography.weight.bold,
              color: Colors.textPrimary,
              fontFamily: Typography.family.sans,
              lineHeight: 1.2,
              marginBottom: 4,
            }}>
              {booking.label}
            </div>

            {/* Info line: rating + room type */}
            {(enrichment?.rating != null || booking.room_type) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                marginBottom: amenities.length > 0 ? 6 : 0,
              }}>
                {enrichment?.rating != null && (
                  <>
                    <span style={{ color: Colors.gold, fontSize: 11, lineHeight: 1 }}>★</span>
                    <span style={{
                      fontSize: Typography.size.xs,
                      fontWeight: Typography.weight.semibold,
                      color: Colors.textPrimary,
                      fontFamily: Typography.family.sans,
                    }}>
                      {enrichment.rating.toFixed(1)}
                    </span>
                    {enrichment.user_ratings_total != null && (
                      <span style={{
                        fontSize: Typography.size.xs,
                        color: Colors.textMuted,
                        fontFamily: Typography.family.sans,
                      }}>
                        ({enrichment.user_ratings_total.toLocaleString()})
                      </span>
                    )}
                  </>
                )}
                {enrichment?.rating != null && booking.room_type && (
                  <span style={{ color: Colors.border, fontSize: Typography.size.xs }}>·</span>
                )}
                {booking.room_type && (
                  <span style={{
                    fontSize: Typography.size.xs,
                    color: Colors.textSecondary,
                    fontFamily: Typography.family.sans,
                  }}>
                    {booking.room_type}
                  </span>
                )}
              </div>
            )}

            {/* Amenity icons */}
            {amenities.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {amenities.map(a => {
                  const Icon = AMENITY_ICONS[a]!;
                  return (
                    <Icon
                      key={a}
                      size={15}
                      color={Colors.textMuted}
                      weight="duotone"
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
