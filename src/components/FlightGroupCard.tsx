import type { Booking, Group, Stop } from '../types';
import type { FlightStatus } from '../domain/trip';
import { parseFlightTime, flightDuration, layoverDuration } from '../domain/trip';
import { Icons } from '../design/icons';
import { Colors, Semantic, Typography, Spacing, Radius, Shadow, Core } from '../design/tokens';
import { resolveStopColor } from '../design/tripPacks';
import { formatCacheAge } from '../utils/cacheAge';
import { airlineLogoUrl, iataFromFlightNum } from '../features/entityDetail/brandAssets';

export interface FlightGroupCardProps {
  bookings: Booking[];
  stop: Stop;
  groups: Group[];
  flightStatus: Record<string, FlightStatus>;
  flightLoading?: boolean;
  onExpand?: (booking: Booking, rect: DOMRect) => void;
  lastUpdated?: Record<string, Date>;
}

// ── Helpers ───────────────────────────────────────────────────

function fmt(t: string): string {
  return t.replace(' AM', 'a').replace(' PM', 'p');
}


function FnPill({ num }: { num: string }) {
  return (
    <div style={{
      fontSize: 9,
      fontWeight: Typography.weight.bold,
      background: Colors.surface2,
      color: Colors.textMuted,
      borderRadius: Radius.sm,
      padding: '1px 6px',
      whiteSpace: 'nowrap' as const,
      fontFamily: Typography.family.sans,
    }}>
      {num}
    </div>
  );
}

function Dot({ accent }: { accent: string }) {
  return (
    <div style={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      border: `1.5px solid ${accent}`,
      background: Colors.surfaceRaised,
      flexShrink: 0,
    }} />
  );
}

function HLine({ accent, takeoff, landing }: { accent: string; takeoff?: boolean; landing?: boolean }) {
  return (
    <div style={{ width: '100%', height: 1.5, background: Colors.border, position: 'relative' }}>
      {takeoff && (
        <span style={{
          position: 'absolute', top: '50%', left: landing ? '25%' : '50%',
          transform: 'translate(-50%, -50%)',
          display: 'inline-flex', background: Colors.surfaceRaised, padding: '0 1px', lineHeight: 1,
        }}>
          <Icons.FlightTakeoff size={13} color={accent} weight="duotone" />
        </span>
      )}
      {landing && (
        <span style={{
          position: 'absolute', top: '50%', left: takeoff ? '75%' : '50%',
          transform: 'translate(-50%, -50%)',
          display: 'inline-flex', background: Colors.surfaceRaised, padding: '0 1px', lineHeight: 1,
        }}>
          <Icons.FlightLanding size={13} color={accent} weight="duotone" />
        </span>
      )}
    </div>
  );
}

// ── StatusChip ────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const color = (({
    'On Time':  Semantic.success,
    'Delayed':  Semantic.warning,
    'Cancelled': Semantic.error,
  } as Record<string, string>)[status]) ?? Colors.textMuted;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 9, color, fontFamily: Typography.family.sans, whiteSpace: 'nowrap' as const,
    }}>
      ● {status}
    </span>
  );
}

// ── FlightTimeline — full CSS-grid horizontal timeline ────────

function FlightTimeline({ flights, accent, flightStatus }: {
  flights: NonNullable<Booking['flights']>;
  accent: string;
  flightStatus?: Record<string, FlightStatus> | null;
}) {
  const isConnecting = flights.length > 1;
  const allIatas: string[] = [flights[0].route.split(' → ')[0]];
  for (const f of flights) allIatas.push(f.route.split(' → ')[1]);

  const nodeCols = Array.from({ length: allIatas.length }, () => 'minmax(32px, auto)');
  const trackCols = Array.from({ length: flights.length }, () => '1fr');
  const gridCols: string[] = [];
  nodeCols.forEach((nc, i) => {
    gridCols.push(nc);
    if (i < trackCols.length) gridCols.push(trackCols[i]);
  });
  const gridTemplateColumns = gridCols.join(' ');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns,
      gridTemplateRows: 'auto auto auto',
      alignItems: 'center',
      justifyItems: 'center',
      rowGap: 4,
    }}>
      {/* Row 1: IATA codes (nodes) + duration labels (tracks) */}
      {flights.map((f, i) => {
        const iata = allIatas[i];
        const isMiddle = isConnecting && i > 0;
        const layover = isMiddle ? layoverDuration(flights[i - 1].arr, f.dep) : null;
        return [
          <div key={`r1-node-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <div style={{
              fontSize: Typography.size.xs + 1,
              fontWeight: Typography.weight.bold,
              color: isMiddle ? accent : Colors.textPrimary,
              fontFamily: Typography.family.sans,
            }}>
              {iata}
            </div>
            {layover && (
              <div style={{ fontSize: 10, color: Colors.textMuted, fontFamily: Typography.family.sans, whiteSpace: 'nowrap' as const }}>
                {layover} layover
              </div>
            )}
          </div>,
          <div key={`r1-seg-${i}`} style={{
            fontSize: Typography.size.xs, color: Colors.textMuted,
            fontFamily: Typography.family.sans, whiteSpace: 'nowrap' as const,
          }}>
            {flightDuration(f.dep, f.arr)}
          </div>,
        ];
      }).flat()}
      <div key="r1-node-last" style={{
        fontSize: Typography.size.xs + 1, fontWeight: Typography.weight.bold,
        color: Colors.textPrimary, fontFamily: Typography.family.sans,
      }}>
        {allIatas[allIatas.length - 1]}
      </div>

      {/* Row 2: dots + lines */}
      {flights.map((_f, i) => {
        const isFirst = i === 0;
        const isLast = i === flights.length - 1;
        return [
          <Dot key={`r2-dot-${i}`} accent={accent} />,
          <HLine key={`r2-line-${i}`} accent={accent} takeoff={isFirst} landing={isLast} />,
        ];
      }).flat()}
      <Dot key="r2-dot-last" accent={accent} />

      {/* Row 3: gate info (nodes) + FnPill (tracks) */}
      {flights.map((f, i) => {
        const gate = flightStatus?.[f.key]?.gate ?? null;
        return [
          <div key={`r3-node-${i}`} style={{
            fontSize: 9,
            fontWeight: gate ? Typography.weight.semibold : Typography.weight.regular,
            color: gate ? accent : Colors.textMuted,
            fontFamily: Typography.family.sans,
            whiteSpace: 'nowrap' as const,
          }}>
            {gate ? `Gate ${gate}` : 'Gate —'}
          </div>,
          <FnPill key={`r3-seg-${i}`} num={f.num} />,
        ];
      }).flat()}
      <div key="r3-node-last" />
    </div>
  );
}

// ── FlightGroupCard ───────────────────────────────────────────

export function FlightGroupCard({
  bookings,
  stop,
  groups,
  flightStatus,
  flightLoading,
  onExpand,
  lastUpdated,
}: FlightGroupCardProps) {
  const accent = resolveStopColor(stop);

  const sorted = [...bookings]
    .filter(b => b.flights?.length)
    .sort((a, b) => parseFlightTime(a.flights![0].dep) - parseFlightTime(b.flights![0].dep));

  // Derive last-checked timestamp from the earliest booking's dateKey
  const firstDateKey = sorted[0]?.flights?.[0]?.date
    ? new Date(sorted[0].flights![0].date).toISOString().split('T')[0]
    : null;
  const lastChecked = firstDateKey ? lastUpdated?.[firstDateKey] : undefined;

  // Earliest departure across all bookings for the header
  const firstFlightDep = sorted[0]?.flights?.[0]?.dep ?? null;
  // Date format from trip.json: "May 22 2026" — strip the year for display
  const firstFlightDate = (sorted[0]?.flights?.[0]?.date ?? null)?.replace(/\s+\d{4}$/, '') ?? null;
  const n = sorted.length;

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
        padding: '12px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <Icons.Flight size={16} color="rgba(255,255,255,0.65)" weight="duotone" />
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
                Flights
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: Typography.weight.regular,
                color: 'rgba(255,255,255,0.65)',
                fontFamily: Typography.family.sans,
              }}>
                {n} {n === 1 ? 'Booking' : 'Bookings'}
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

        {(firstFlightDep || firstFlightDate) && (
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: Spacing.md }}>
            {firstFlightDep && (
              <div style={{
                fontSize: Typography.size.sm,
                fontWeight: Typography.weight.bold,
                color: '#ffffff',
                fontFamily: Typography.family.sans,
                whiteSpace: 'nowrap' as const,
              }}>
                {fmt(firstFlightDep)}
              </div>
            )}
            {firstFlightDate && (
              <div style={{
                fontSize: 9,
                fontWeight: Typography.weight.medium,
                color: 'rgba(255,255,255,0.55)',
                fontFamily: Typography.family.sans,
                letterSpacing: '0.04em',
                marginTop: 2,
                whiteSpace: 'nowrap' as const,
              }}>
                {firstFlightDate}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flight rows */}
      {sorted.map((booking) => {
        const flights = booking.flights!;
        const firstFlight = flights[0];
        const lastFlight = flights[flights.length - 1];
        const groupName = booking.group_ids?.length
          ? groups.find(g => g.id === booking.group_ids![0])?.name
          : null;
        const statusEntry = flightStatus[firstFlight.key];
        const status = !flightLoading ? statusEntry?.status : null;
        const iata = iataFromFlightNum(firstFlight.num);
        const logoUrl = airlineLogoUrl(iata);

        return (
          <div
            key={booking.id}
            onClick={onExpand
              ? (e) => onExpand(booking, (e.currentTarget as HTMLElement).getBoundingClientRect())
              : undefined}
            style={{
              borderTop: `1px solid ${Colors.border}`,
              padding: '10px 14px 12px',
              cursor: onExpand ? 'pointer' : 'default',
            }}
          >
            {/* Row: group name (left) + trip time range (right) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}>
              {groupName ? (
                <div style={{
                  fontSize: 9,
                  fontWeight: Typography.weight.bold,
                  color: accent,
                  fontFamily: Typography.family.sans,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                }}>
                  {groupName}
                </div>
              ) : <div />}
              <div style={{
                fontSize: Typography.size.xs,
                color: Colors.textMuted,
                fontFamily: Typography.family.sans,
                whiteSpace: 'nowrap' as const,
              }}>
                {fmt(firstFlight.dep)} – {fmt(lastFlight.arr)}
              </div>
            </div>

            {/* Airline logo */}
            {logoUrl && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                <img
                  src={logoUrl}
                  alt={firstFlight.airline}
                  style={{ height: 18, width: 'auto', display: 'block' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            <FlightTimeline flights={flights} accent={accent} flightStatus={flightStatus} />

            {/* Status chip */}
            {status && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <StatusChip status={status} />
              </div>
            )}
          </div>
        );
      })}

      {/* Cache timestamp footer */}
      {lastChecked && (
        <div style={{
          borderTop: `1px solid ${Colors.border}`,
          padding: '6px 14px',
          textAlign: 'right',
          fontSize: 11,
          color: Core.textFaint,
          fontFamily: Typography.family.sans,
        }}>
          Checked {formatCacheAge(lastChecked.getTime())}
        </div>
      )}
    </div>
  );
}
