import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Booking } from '../types';
import type { FlightStatus } from '../domain/trip';
import { flightDuration, layoverDuration } from '../domain/trip';
import { Icons } from '../design/icons';
import {
  Brand, Colors, Semantic, Typography, Spacing, Radius, Animation, Shadow,
} from '../design/tokens';

export interface FlightCardProps {
  booking: Booking;
  accent: string;
  flightStatus: Record<string, FlightStatus>;
  flightLoading: boolean;
  onExpand?: (booking: Booking, rect: DOMRect) => void;
}

// ── Helpers ───────────────────────────────────────────────────

function fmt(t: string): string {
  return t.replace(' AM', 'a').replace(' PM', 'p');
}

function buildRoute(flights: NonNullable<Booking['flights']>): string {
  if (flights.length === 1) return flights[0].route;
  const codes: string[] = [flights[0].route.split(' → ')[0]];
  for (const f of flights) codes.push(f.route.split(' → ')[1]);
  return codes.join(' → ');
}

// ── Sub-components ────────────────────────────────────────────

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

// takeoff: show AirplaneTakeoff icon at 25% of track width
// landing: show AirplaneLanding icon at 75% of track width
function HLine({ accent, takeoff, landing }: { accent: string; takeoff?: boolean; landing?: boolean }) {
  return (
    <div style={{ width: '100%', height: 1.5, background: Colors.border, position: 'relative' }}>
      {takeoff && (
        <span style={{
          position: 'absolute',
          top: '50%',
          left: landing ? '25%' : '50%',
          transform: 'translate(-50%, -50%)',
          display: 'inline-flex',
          background: Colors.surfaceRaised,
          padding: '0 1px',
          lineHeight: 1,
        }}>
          <Icons.FlightTakeoff size={13} color={accent} weight="duotone" />
        </span>
      )}
      {landing && (
        <span style={{
          position: 'absolute',
          top: '50%',
          left: takeoff ? '75%' : '50%',
          transform: 'translate(-50%, -50%)',
          display: 'inline-flex',
          background: Colors.surfaceRaised,
          padding: '0 1px',
          lineHeight: 1,
        }}>
          <Icons.FlightLanding size={13} color={accent} weight="duotone" />
        </span>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const color = (({
    'On Time': Semantic.success,
    'Delayed': Semantic.warning,
    'Cancelled': Semantic.error,
  } as Record<string, string>)[status]) ?? Colors.textMuted;
  return (
    <div style={{ fontSize: 9, color, fontFamily: Typography.family.sans }}>
      ● {status}
    </div>
  );
}

// ── FlightCard ────────────────────────────────────────────────

export function FlightCard({ booking, accent, flightStatus, onExpand }: FlightCardProps) {
  const [legsOpen, setLegsOpen] = useState(false);
  const flights = booking.flights ?? [];
  if (flights.length === 0) return null;

  const isConnecting = flights.length > 1;
  const firstFlight = flights[0];
  const lastFlight = flights[flights.length - 1];
  const firstGate = flightStatus[firstFlight.key]?.gate;
  const firstStatus = flightStatus[firstFlight.key]?.status;

  // All IATA codes in order: origin of each leg + final destination
  const allIatas: string[] = [firstFlight.route.split(' → ')[0]];
  for (const f of flights) allIatas.push(f.route.split(' → ')[1]);

  // CSS Grid columns: node col alternating with track col
  // Single: minmax(32px,auto) 1fr minmax(32px,auto)
  // Connecting: minmax(32px,auto) 1fr minmax(32px,auto) 1fr minmax(32px,auto)
  const nodeCols = Array.from({ length: allIatas.length }, () => 'minmax(32px, auto)');
  const trackCols = Array.from({ length: flights.length }, () => '1fr');
  const gridCols: string[] = [];
  nodeCols.forEach((nc, i) => {
    gridCols.push(nc);
    if (i < trackCols.length) gridCols.push(trackCols[i]);
  });
  const gridTemplateColumns = gridCols.join(' ');

  const handleOpenDetail = onExpand
    ? (e: React.MouseEvent<HTMLDivElement>) =>
        onExpand(booking, (e.currentTarget as HTMLElement).getBoundingClientRect())
    : undefined;

  return (
    <div style={{
      background: Colors.surfaceRaised,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      boxShadow: Shadow.cardResting,
    }}>
      {/* 1. Header strip — tappable → opens detail sheet */}
      <div
        onClick={handleOpenDetail}
        style={{
          background: `linear-gradient(135deg, ${Brand.navy}, ${Brand.navySoft})`,
          padding: '12px 14px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          cursor: onExpand ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.Flight size={18} color="rgba(255,255,255,0.7)" weight="duotone" />
          <div style={{
            fontSize: Typography.size.xl,
            fontWeight: Typography.weight.bold,
            color: '#ffffff',
            fontFamily: Typography.family.sans,
            lineHeight: 1.2,
          }}>
            {buildRoute(flights)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: Spacing.md }}>
          <div style={{
            fontSize: Typography.size.sm,
            fontWeight: Typography.weight.bold,
            color: '#ffffff',
            fontFamily: Typography.family.sans,
          }}>
            {fmt(firstFlight.dep)} – {fmt(lastFlight.arr)}
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: firstGate ? Typography.weight.bold : Typography.weight.regular,
            color: firstGate ? Semantic.success : 'rgba(255,255,255,0.45)',
            fontFamily: Typography.family.sans,
            marginTop: 2,
          }}>
            {firstGate ? `Gate ${firstGate}` : 'Gate TBD'}
          </div>
        </div>
      </div>

      {/* 2. Horizontal timeline — tappable → opens detail sheet */}
      <div
        onClick={handleOpenDetail}
        style={{ padding: '10px 14px 8px', cursor: onExpand ? 'pointer' : 'default' }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns,
          gridTemplateRows: '16px auto auto',
          alignItems: 'center',
          justifyItems: 'center',
          rowGap: 3,
        }}>
          {/* ── Row 1: duration text above each segment ── */}
          {flights.map((f, i) => [
            <div key={`r1-node-${i}`} />,
            <div key={`r1-seg-${i}`} style={{ fontSize: Typography.size.xs, color: Colors.textMuted, fontFamily: Typography.family.sans, whiteSpace: 'nowrap' as const }}>
              {flightDuration(f.dep, f.arr)}
            </div>,
          ]).flat()}
          <div key="r1-node-last" />

          {/* ── Row 2: dots + lines — takeoff on first segment, landing on last ── */}
          {flights.map((_f, i) => {
            const isFirst = i === 0;
            const isLast  = i === flights.length - 1;
            return [
              <Dot key={`r2-dot-${i}`} accent={accent} />,
              <HLine
                key={`r2-line-${i}`}
                accent={accent}
                takeoff={isFirst}
                landing={isLast}
              />,
            ];
          }).flat()}
          <Dot key="r2-dot-last" accent={accent} />

          {/* ── Row 3: IATA labels, fn-pills, layover info ── */}
          {flights.map((f, i) => {
            const iata = allIatas[i];
            const isMiddle = isConnecting && i > 0;
            const layover = isMiddle ? layoverDuration(flights[i - 1].arr, f.dep) : null;
            return [
              <div key={`r3-node-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <div style={{ fontSize: Typography.size.xs + 1, fontWeight: Typography.weight.bold, color: isMiddle ? accent : Colors.textPrimary, fontFamily: Typography.family.sans }}>
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
          <div key="r3-node-last" style={{ fontSize: Typography.size.xs + 1, fontWeight: Typography.weight.bold, color: Colors.textPrimary, fontFamily: Typography.family.sans }}>
            {allIatas[allIatas.length - 1]}
          </div>
        </div>
      </div>

      {/* 3. Footer row — connecting: full row toggles legs drawer */}
      <div
        onClick={isConnecting ? () => setLegsOpen(o => !o) : undefined}
        style={{
          padding: '8px 14px 10px',
          borderTop: `1px solid ${Colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: isConnecting ? 'pointer' : 'default',
        }}
      >
        <div style={{ fontSize: Typography.size.xs, color: Colors.textMuted, fontFamily: Typography.family.sans }}>
          {firstFlight.airline} · {firstFlight.date}
        </div>
        {isConnecting ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontSize: Typography.size.xs,
            fontWeight: Typography.weight.bold,
            color: accent,
            fontFamily: Typography.family.sans,
          }}>
            Legs
            <motion.span
              animate={{ rotate: legsOpen ? 180 : 0 }}
              transition={Animation.springs.snappy}
              style={{ display: 'inline-block', lineHeight: 1 }}
            >
              ▾
            </motion.span>
          </div>
        ) : firstStatus ? (
          <StatusChip status={firstStatus} />
        ) : null}
      </div>

      {/* 4. Expandable legs drawer (connecting only) */}
      {isConnecting && (
        <AnimatePresence>
          {legsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={Animation.springs.lazy}
              style={{ overflow: 'hidden' }}
            >
              {flights.map((f, i) => (
                <div
                  key={f.key}
                  onClick={(e) => onExpand?.(booking, (e.currentTarget as HTMLElement).getBoundingClientRect())}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderTop: `1px solid ${Colors.border}`,
                    cursor: onExpand ? 'pointer' : 'default',
                    gap: Spacing.sm,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.xs, flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 10,
                      fontWeight: Typography.weight.bold,
                      background: `${accent}22`,
                      color: accent,
                      borderRadius: Radius.sm,
                      padding: '1px 6px',
                      whiteSpace: 'nowrap' as const,
                      flexShrink: 0,
                    }}>
                      Leg {i + 1}
                    </div>
                    <div style={{
                      fontSize: Typography.size.base - 1,
                      fontWeight: Typography.weight.bold,
                      color: Colors.textPrimary,
                      fontFamily: Typography.family.sans,
                    }}>
                      {f.route}
                    </div>
                    <FnPill num={f.num} />
                  </div>
                  <div style={{
                    fontSize: Typography.size.sm,
                    color: Colors.textMuted,
                    whiteSpace: 'nowrap' as const,
                    fontFamily: Typography.family.sans,
                    flexShrink: 0,
                  }}>
                    {fmt(f.dep)} – {fmt(f.arr)}
                  </div>
                  <div style={{ fontSize: Typography.size.sm, color: Colors.textMuted, flexShrink: 0 }}>›</div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
