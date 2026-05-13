import type { Booking, Group, Stop } from '../types';
import type { FlightStatus } from '../domain/trip';
import { parseFlightTime, flightDuration, layoverDuration } from '../domain/trip';
import { Icons } from '../design/icons';
import { Colors, Semantic, Typography, Spacing, Radius, Shadow } from '../design/tokens';
import { resolveStopColor } from '../design/tripPacks';

export interface FlightGroupCardProps {
  bookings: Booking[];
  stop: Stop;
  groups: Group[];
  flightStatus: Record<string, FlightStatus>;
  flightLoading?: boolean;
  onExpand?: (booking: Booking, rect: DOMRect) => void;
}

// ── Helpers ───────────────────────────────────────────────────

function fmt(t: string): string {
  return t.replace(' AM', 'a').replace(' PM', 'p');
}

function fmtFlightCardDate(dateStr: string): { weekday: string; day: string; month: string } {
  const d = new Date(dateStr + 'T12:00:00');
  return {
    weekday: d.toLocaleString('en-US', { weekday: 'short' }),
    day: String(d.getDate()),
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
  };
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

function FlightTimeline({ flights, accent }: { flights: NonNullable<Booking['flights']>; accent: string }) {
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
      gridTemplateRows: '16px auto auto',
      alignItems: 'center',
      justifyItems: 'center',
      rowGap: 3,
    }}>
      {/* Row 1: duration labels above each segment */}
      {flights.map((f, i) => [
        <div key={`r1-node-${i}`} />,
        <div key={`r1-seg-${i}`} style={{
          fontSize: Typography.size.xs, color: Colors.textMuted,
          fontFamily: Typography.family.sans, whiteSpace: 'nowrap' as const,
        }}>
          {flightDuration(f.dep, f.arr)}
        </div>,
      ]).flat()}
      <div key="r1-node-last" />

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

      {/* Row 3: IATA codes, fn-pills, layover labels */}
      {flights.map((f, i) => {
        const iata = allIatas[i];
        const isMiddle = isConnecting && i > 0;
        const layover = isMiddle ? layoverDuration(flights[i - 1].arr, f.dep) : null;
        return [
          <div key={`r3-node-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
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
          <FnPill key={`r3-seg-${i}`} num={f.num} />,
        ];
      }).flat()}
      <div key="r3-node-last" style={{
        fontSize: Typography.size.xs + 1, fontWeight: Typography.weight.bold,
        color: Colors.textPrimary, fontFamily: Typography.family.sans,
      }}>
        {allIatas[allIatas.length - 1]}
      </div>
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
}: FlightGroupCardProps) {
  const accent = resolveStopColor(stop);

  const sorted = [...bookings]
    .filter(b => b.flights?.length)
    .sort((a, b) => parseFlightTime(a.flights![0].dep) - parseFlightTime(b.flights![0].dep));

  const firstDateStr = bookings
    .flatMap(b => b.flights ?? [])
    .map(f => f.date)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  const headerDate = firstDateStr ? fmtFlightCardDate(firstDateStr) : null;
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
              fontSize: 15,
              fontWeight: Typography.weight.bold,
              color: '#ffffff',
              fontFamily: Typography.family.sans,
              lineHeight: 1.2,
            }}>
              Flights
            </div>
            <div style={{
              fontSize: 9,
              fontWeight: Typography.weight.bold,
              color: 'rgba(255,255,255,0.55)',
              fontFamily: Typography.family.sans,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
            }}>
              {n} {n === 1 ? 'Booking' : 'Bookings'}
            </div>
          </div>
        </div>

        {headerDate && (
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: Spacing.md }}>
            <div style={{
              fontSize: Typography.size.sm,
              fontWeight: Typography.weight.bold,
              color: '#ffffff',
              fontFamily: Typography.family.sans,
              whiteSpace: 'nowrap' as const,
            }}>
              {headerDate.weekday} {headerDate.day}
            </div>
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
              {headerDate.month}
            </div>
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
            {/* Group label */}
            {groupName && (
              <div style={{
                fontSize: 9,
                fontWeight: Typography.weight.bold,
                color: accent,
                fontFamily: Typography.family.sans,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                marginBottom: 8,
              }}>
                {groupName}
              </div>
            )}

            {/* Horizontal timeline */}
            <FlightTimeline flights={flights} accent={accent} />

            {/* Info footer: times · airline · status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
            }}>
              <div style={{
                fontSize: Typography.size.xs,
                color: Colors.textMuted,
                fontFamily: Typography.family.sans,
              }}>
                {fmt(firstFlight.dep)} – {fmt(lastFlight.arr)} · {firstFlight.airline}
              </div>
              {status && <StatusChip status={status} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
