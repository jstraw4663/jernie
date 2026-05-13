import type { ReactNode } from 'react';
import type { Booking, Group, PlaceEnrichment, Stop } from '../types';
import { Colors, Semantic, Brand, Core, Typography, Spacing, Radius } from '../design/tokens';
import { ScrollReveal } from './ScrollReveal';
import { PlaceIcon } from './PlaceIcon';
import type { FlightStatus } from '../domain/trip';
import { isRentalCar } from '../domain/trip';
import { FlightGroupCard } from './FlightGroupCard';
import { HotelGroupCard } from './HotelGroupCard';
import { RentalCard } from './RentalCard';
import { resolveStopColor } from '../design/tripPacks';

// ── AlertBox ──────────────────────────────────────────────────

interface AlertBoxProps {
  type: string;
  text: string;
  link?: { label: string; url: string } | null;
}

export function AlertBox({ type, text, link }: AlertBoxProps) {
  const s = ({
    warning: { bd: Semantic.warning },
    tip:     { bd: Semantic.success },
    info:    { bd: Brand.navySoft },
  } as Record<string, { bd: string }>)[type] || { bd: Brand.navySoft };

  return (
    <div style={{
      background: Colors.surfaceRaised,
      borderRadius: `${Radius.lg}px`,
      boxShadow: '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
      borderLeft: `3px solid ${s.bd}`,
      padding: `${Spacing.md}px ${Spacing.base}px`,
      marginBottom: `${Spacing.sm}px`,
    }}>
      <div style={{
        fontSize: `${Typography.size.sm}px`,
        lineHeight: Typography.lineHeight.normal,
        color: Colors.textPrimary,
        fontFamily: Typography.family.sans,
      }}>
        {text}
      </div>
      {link && (
        <div style={{ marginTop: `${Spacing.sm}px` }}>
          <a href={link.url} target="_blank" rel="noopener noreferrer" style={{
            color: s.bd,
            fontWeight: Typography.weight.bold,
            fontSize: `${Typography.size.xs}px`,
            fontFamily: Typography.family.sans,
          }}>
            {link.label}
          </a>
        </div>
      )}
    </div>
  );
}

// ── SecHead ───────────────────────────────────────────────────

export function SecHead({ label }: { label: string }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:Spacing.md,marginBottom:Spacing.base}}>
      <div style={{fontWeight:Typography.weight.bold,color:Colors.gold,fontSize:Typography.size.xs,letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:Typography.family.sans}}>{label}</div>
      <div style={{flex:1,height:"1px",background:Colors.gold+"30"}}/>
    </div>
  );
}

// ── LegSummary ────────────────────────────────────────────────

export function LegSummary({ stop }: { stop: Stop }) {
  if (!stop.summary) return null;
  const legAccent = resolveStopColor(stop);
  return (
    <div style={{
      background: Colors.surfaceRaised,
      borderRadius: `${Radius.lg}px`,
      boxShadow: '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
      borderLeft: `3px solid ${legAccent}`,
      padding: `${Spacing.md}px ${Spacing.base}px`,
      marginBottom: `${Spacing.xl}px`,
    }}>
      <div style={{
        fontSize: `${Typography.size.xs}px`,
        fontWeight: Typography.weight.bold,
        color: legAccent,
        letterSpacing: '0.12em',
        textTransform: 'uppercase' as const,
        fontFamily: Typography.family.sans,
        marginBottom: `${Spacing.xs}px`,
      }}>
        <span style={{display:'inline-flex',alignItems:'center',gap:5}}><PlaceIcon emoji={stop.emoji} size={13} weight="regular" /> {stop.city} · {stop.dates}</span>
      </div>
      <div style={{
        fontSize: `${Typography.size.sm}px`,
        color: Colors.textSecondary,
        lineHeight: Typography.lineHeight.relaxed,
        fontStyle: 'italic',
        fontFamily: Typography.family.sans,
      }}>
        {stop.summary}
      </div>
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = ({"On Time":{bg:Semantic.successTint,color:Semantic.success,dot:Semantic.success},"Delayed":{bg:Semantic.warningTint,color:Semantic.warning,dot:Semantic.warning},"Cancelled":{bg:Semantic.errorTint,color:Semantic.error,dot:Semantic.error},"Scheduled":{bg:Semantic.selectedTint,color:Brand.navySoft,dot:Brand.navySoft}} as Record<string,{bg:string;color:string;dot:string}>)[status] || {bg:Core.surfaceMuted,color:Core.textFaint,dot:Core.textFaint};
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:"5px",background:cfg.bg,color:cfg.color,fontSize:"0.7rem",fontWeight:"bold",padding:"2px 9px",borderRadius:"20px",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>
      <span style={{width:"6px",height:"6px",borderRadius:"50%",background:cfg.dot,flexShrink:0}}/>{status}
    </span>
  );
}

// ── FlightRow ─────────────────────────────────────────────────

interface FlightRowFlight {
  key: string;
  num: string;
  airline: string;
  route: string;
  date: string;
  dep: string;
  arr: string;
  trackingUrl?: string;
}

interface FlightRowProps {
  f: FlightRowFlight;
  sMap: Record<string, FlightStatus> | null;
  loading: boolean;
}

function FlightRow({ f, sMap, loading }: FlightRowProps) {
  const s = sMap?.[f.key];
  const delayed = (s?.delayMin ?? 0) > 0;
  const actualDep = s?.actualDep && s.actualDep !== f.dep ? s.actualDep : null;
  const actualArr = s?.actualArr && s.actualArr !== f.arr ? s.actualArr : null;

  const label = (l: string) => (
    <div style={{
      fontSize: `${Typography.size.xs}px`,
      color: Colors.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      marginBottom: `${Spacing.xxs}px`,
      fontFamily: Typography.family.sans,
    }}>{l}</div>
  );
  const val = (children: ReactNode, color?: string) => (
    <div style={{
      fontWeight: Typography.weight.bold,
      fontSize: `${Typography.size.sm}px`,
      color: color ?? Colors.textPrimary,
      display: 'flex',
      alignItems: 'center',
      gap: `${Spacing.xs}px`,
      fontFamily: Typography.family.sans,
    }}>{children}</div>
  );

  return (
    <div style={{ borderTop: `1px solid ${Colors.border}`, paddingTop: `${Spacing.md}px`, marginTop: `${Spacing.md}px` }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap' as const, gap: `${Spacing.xs}px`, marginBottom: `${Spacing.sm}px`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${Spacing.xs}px`, flexWrap: 'wrap' as const }}>
          <span style={{ fontWeight: Typography.weight.bold, fontSize: `${Typography.size.base}px`, fontFamily: Typography.family.sans }}>{f.num}</span>
          <span style={{ color: Colors.textMuted, fontSize: `${Typography.size.xs}px` }}>{f.airline}</span>
          <span style={{ color: Colors.border }}>·</span>
          <span style={{ color: Colors.textSecondary, fontSize: `${Typography.size.xs}px` }}>{f.route}</span>
          <span style={{ color: Colors.border }}>·</span>
          <span style={{ color: Colors.textMuted, fontSize: `${Typography.size.xs}px` }}>{f.date}</span>
        </div>
        {loading
          ? <span style={{ fontSize: `${Typography.size.xs}px`, color: Colors.textMuted }}>Checking…</span>
          : s && <StatusBadge status={s.status || 'Unknown'}/>
        }
      </div>
      <div style={{ display: 'flex', gap: `${Spacing.xl}px`, flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
        {(['Departs', 'Arrives'] as const).map((lbl, i) => {
          const sched = i === 0 ? f.dep : f.arr;
          const actual = i === 0 ? actualDep : actualArr;
          return (
            <div key={lbl}>
              {label(lbl)}
              {val(actual
                ? <><span style={{ textDecoration: 'line-through', color: Colors.textMuted, fontWeight: Typography.weight.regular, fontSize: `${Typography.size.xs}px` }}>{sched}</span><span style={{ color: delayed ? Colors.gold : Colors.success }}>{actual}</span></>
                : sched
              )}
            </div>
          );
        })}
        <div>
          {label('Gate')}
          {val(s?.gate || 'TBD', s?.gate ? Colors.textPrimary : Colors.textMuted)}
        </div>
        {s?.terminal && (
          <div>{label('Terminal')}{val(s.terminal)}</div>
        )}
        {delayed && (
          <div>{label('Delay')}{val(`+${s!.delayMin} min`, Colors.gold)}</div>
        )}
      </div>
    </div>
  );
}

// ── BookingCard ───────────────────────────────────────────────

export interface BookingCardProps {
  booking: Booking;
  accent: string;
  flightStatus: Record<string, FlightStatus>;
  flightLoading: boolean;
  onExpand?: (booking: Booking, rect: DOMRect) => void;
}

export function BookingCard({ booking, accent, flightStatus, flightLoading, onExpand }: BookingCardProps) {
  return (
    <div
      onClick={onExpand ? (e) => onExpand(booking, (e.currentTarget as HTMLElement).getBoundingClientRect()) : undefined}
      style={{
        background: Colors.surfaceRaised,
        borderRadius: `${Radius.lg}px`,
        boxShadow: '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
        borderLeft: `3px solid ${accent}60`,
        padding: `${Spacing.md}px ${Spacing.base}px`,
        display: 'flex',
        gap: `${Spacing.md}px`,
        alignItems: 'flex-start',
        cursor: onExpand ? 'pointer' : 'default',
      }}
    >
      <div style={{ lineHeight: 1, marginTop: '2px', flexShrink: 0 }}><PlaceIcon emoji={booking.icon} size={22} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: Typography.weight.bold,
          color: Colors.textSecondary,
          fontSize: `${Typography.size.xs}px`,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          marginBottom: `${Spacing.sm}px`,
          fontFamily: Typography.family.sans,
        }}>
          {booking.label.includes("Avis") ? (() => {
            const parts = booking.label.split("Avis");
            return <>{parts[0]}<span style={{color:"#CC2200"}}>Avis</span>{parts[1]}</>;
          })() : booking.label}
        </div>
        {booking.flights?.map((f, i) => (
          <FlightRow key={i} f={f} sMap={flightStatus} loading={flightLoading}/>
        ))}
        {booking.lines?.map((l, i) => {
          return (
            <div key={i} style={{
              fontSize: `${Typography.size.sm}px`,
              lineHeight: Typography.lineHeight.normal,
              marginBottom: `${Spacing.xxs}px`,
              fontWeight: i === 0 ? Typography.weight.semibold : Typography.weight.regular,
              color: l.startsWith("⏰") || l.startsWith("📅") ? Colors.textSecondary : Colors.textPrimary,
              fontFamily: Typography.family.sans,
            }}>
              {l}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TravelSection ─────────────────────────────────────────────

interface TravelSectionProps {
  stop: Stop;
  stopBookings: Booking[];
  allBookings?: Booking[];
  groups: Group[];
  flightStatus: Record<string, FlightStatus>;
  flightLoading: boolean;
  onBookingExpand?: (booking: Booking, rect: DOMRect) => void;
  hotelEnrichmentMap?: Record<string, PlaceEnrichment>;
  flightLastUpdated?: Record<string, Date>;
}

export function TravelSection({ stop, stopBookings, allBookings, groups, flightStatus, flightLoading, onBookingExpand, hotelEnrichmentMap, flightLastUpdated }: TravelSectionProps) {
  const stopColor = resolveStopColor(stop);
  const sorted = [...stopBookings].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));

  const renderBooking = (b: Booking) => {
    if (b.type === "transportation" && isRentalCar(b)) {
      // Resolve linked booking: return card points to primary via linked_booking_id
      let primaryBooking = b;
      let returnBooking: Booking | null = null;
      if (b.linked_booking_id) {
        const primary = allBookings?.find(x => x.id === b.linked_booking_id) ?? null;
        if (primary) { primaryBooking = primary; returnBooking = b; }
      } else {
        returnBooking = allBookings?.find(x => x.linked_booking_id === b.id) ?? null;
      }
      const rentalOnExpand = onBookingExpand
        ? (_: Booking, rect: DOMRect) => onBookingExpand(b, rect)
        : undefined;
      return (
        <RentalCard
          key={b.id}
          booking={primaryBooking}
          returnBooking={returnBooking}
          stop={stop}
          onExpand={rentalOnExpand}
        />
      );
    }
    return <BookingCard key={b.id} booking={b} accent={stopColor} flightStatus={flightStatus} flightLoading={flightLoading} onExpand={onBookingExpand}/>;
  };

  const flightBookings = sorted.filter(b => b.type === "flight" && b.flights?.length);
  const accommodations = sorted.filter(b => b.type === "accommodation");
  const others = sorted.filter(b => b.type !== "accommodation" && !(b.type === "flight" && b.flights?.length));
  const othersOffset = (flightBookings.length > 0 ? 1 : 0) + (accommodations.length > 0 ? 1 : 0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:`${Spacing.sm}px`}}>
      {flightBookings.length > 0 && (
        <ScrollReveal key="flight-group" index={0}>
          <FlightGroupCard
            bookings={flightBookings}
            stop={stop}
            groups={groups}
            flightStatus={flightStatus}
            flightLoading={flightLoading}
            onExpand={onBookingExpand}
            lastUpdated={flightLastUpdated}
          />
        </ScrollReveal>
      )}
      {accommodations.length > 0 && (
        <ScrollReveal key="hotel-group" index={flightBookings.length > 0 ? 1 : 0}>
          <HotelGroupCard
            bookings={accommodations}
            stop={stop}
            groups={groups}
            enrichmentMap={hotelEnrichmentMap ?? {}}
            onExpand={onBookingExpand}
          />
        </ScrollReveal>
      )}
      {others.map((b, i) => (
        <ScrollReveal key={b.id} index={i + othersOffset}>
          {renderBooking(b)}
        </ScrollReveal>
      ))}
    </div>
  );
}
