import type { ReactNode } from 'react';
import { Icons } from '../design/icons';
import type { Booking, Group, PlaceEnrichment, Stop } from '../types';
import { Colors, Semantic, Brand, Core, Typography, Spacing, Radius } from '../design/tokens';
import { ScrollReveal } from './ScrollReveal';
import { PlaceIcon } from './PlaceIcon';
import type { FlightStatus } from '../domain/trip';
import { FlightCard } from './FlightCard';
import { useTripTheme } from '../contexts/TripThemeContext';

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
  return (
    <div style={{
      background: Colors.surfaceRaised,
      borderRadius: `${Radius.lg}px`,
      boxShadow: '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
      borderLeft: `3px solid ${stop.accent}`,
      padding: `${Spacing.md}px ${Spacing.base}px`,
      marginBottom: `${Spacing.xl}px`,
    }}>
      <div style={{
        fontSize: `${Typography.size.xs}px`,
        fontWeight: Typography.weight.bold,
        color: stop.accent,
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

// ── HotelCard ─────────────────────────────────────────────────

export interface HotelCardProps {
  accent: string;
  label: string;
  booking: Booking;
  enrichment?: PlaceEnrichment;
  hideNote?: boolean;
  onExpand?: (booking: Booking, rect: DOMRect) => void;
}

export function HotelCard({ accent, label, booking, enrichment, hideNote, onExpand }: HotelCardProps) {
  return (
    <div
      onClick={onExpand ? (e) => onExpand(booking, (e.currentTarget as HTMLElement).getBoundingClientRect()) : undefined}
      style={{
        background: Colors.surfaceRaised,
        borderRadius: `${Radius.lg}px`,
        boxShadow: '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
        borderLeft: `3px solid ${accent}`,
        cursor: onExpand ? 'pointer' : 'default',
      }}
    >
      <div style={{ padding: `${Spacing.md}px ${Spacing.base}px` }}>
        <div style={{
          fontSize: `${Typography.size.xs}px`,
          fontWeight: Typography.weight.bold,
          color: accent,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          fontFamily: Typography.family.sans,
          marginBottom: `${Spacing.sm}px`,
        }}>
          {label}
        </div>
        <div style={{
            fontWeight: Typography.weight.bold,
            fontSize: `${Typography.size.base}px`,
            color: Colors.textPrimary,
            marginBottom: `${Spacing.xs}px`,
            fontFamily: Typography.family.sans,
          }}>
            {booking.label}
          </div>

        {/* Google rating */}
        {enrichment?.rating != null && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${Spacing.xs}px`,
            marginBottom: `${Spacing.xs}px`,
          }}>
            <span style={{ color: Colors.gold, fontSize: `${Typography.size.sm}px` }}>★</span>
            <span style={{
              fontWeight: Typography.weight.semibold,
              fontSize: `${Typography.size.sm}px`,
              color: Colors.textPrimary,
              fontFamily: Typography.family.sans,
            }}>
              {enrichment.rating.toFixed(1)}
            </span>
            {enrichment.user_ratings_total != null && (
              <span style={{
                fontSize: `${Typography.size.xs}px`,
                color: Colors.textMuted,
                fontFamily: Typography.family.sans,
              }}>
                ({enrichment.user_ratings_total.toLocaleString()})
              </span>
            )}
          </div>
        )}

        {booking.addr && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: `${Spacing.xs}px`,
            fontSize: `${Typography.size.xs}px`,
            color: accent,
            marginTop: `${Spacing.xs}px`,
            marginBottom: `${Spacing.xs}px`,
            opacity: 0.85,
            fontFamily: Typography.family.sans,
          }}>
            <Icons.Pin size={11} weight="duotone" color={accent} /> {booking.addr}
          </div>
        )}

        {/* Phone from enrichment */}
        {enrichment?.phone && (
          <div style={{ marginTop: `${Spacing.xs}px`, marginBottom: `${Spacing.xs}px`, fontSize: `${Typography.size.xs}px`, color: accent, fontFamily: Typography.family.sans, opacity: 0.85 }}>
            <Icons.Phone size={11} weight="duotone" color={accent} /> {enrichment.phone}
          </div>
        )}

        {booking.confirmation && (
          <div style={{
            fontSize: `${Typography.size.xs}px`,
            color: Colors.textMuted,
            marginBottom: `${Spacing.xs}px`,
            fontFamily: Typography.family.sans,
          }}>
            <span style={{display:'inline-flex',alignItems:'center',gap:4}}><Icons.Theater size={11} weight="duotone" color={Colors.textMuted} /> Confirmation: <span style={{ fontWeight: Typography.weight.bold, color: Colors.textSecondary }}>{booking.confirmation}</span></span>
          </div>
        )}
        {!hideNote && booking.note && (
          <div style={{
            color: Colors.textSecondary,
            fontSize: `${Typography.size.sm}px`,
            lineHeight: Typography.lineHeight.relaxed,
            fontStyle: 'italic',
            marginTop: `${Spacing.xs}px`,
            fontFamily: Typography.family.sans,
          }}>
            {booking.note}
          </div>
        )}
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
  groups: Group[];
  flightStatus: Record<string, FlightStatus>;
  flightLoading: boolean;
  lastUpdated: Record<string, Date>;
  onBookingExpand?: (booking: Booking, rect: DOMRect) => void;
  hotelEnrichmentMap?: Record<string, PlaceEnrichment>;
}

export function TravelSection({ stop, stopBookings, groups, flightStatus, flightLoading, lastUpdated, onBookingExpand, hotelEnrichmentMap }: TravelSectionProps) {
  const sorted = [...stopBookings].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
  const hasFlights = stopBookings.some(b => b.type === "flight");

  const flightBookings = stopBookings.filter(b => b.type === "flight" && b.flights);
  const dateKeys = [...new Set(
    flightBookings.flatMap(b => b.flights!.map(f => new Date(f.date).toISOString().split("T")[0]))
  )];
  const relevantTimestamps = dateKeys.map(dk => lastUpdated[dk]).filter(Boolean);
  const mostRecent = relevantTimestamps.length > 0
    ? new Date(Math.max(...relevantTimestamps.map(d => d.getTime())))
    : null;

  const renderBooking = (b: Booking) => {
    if (b.type === "accommodation") {
      const groupName = b.group_ids
        ? groups.find(g => g.id === b.group_ids![0])?.name
        : "Party-Wide";
      return <HotelCard key={b.id} accent={stop.accent} label={groupName + "'s Accommodations"} booking={b} enrichment={hotelEnrichmentMap?.[b.id]} onExpand={onBookingExpand}/>;
    }
    if (b.type === "flight") {
      return <FlightCard key={b.id} booking={b} accent={stop.accent} flightStatus={flightStatus} flightLoading={flightLoading} onExpand={onBookingExpand}/>;
    }
    return <BookingCard key={b.id} booking={b} accent={stop.accent} flightStatus={flightStatus} flightLoading={flightLoading} onExpand={onBookingExpand}/>;
  };

  return (
    <>
      {hasFlights && mostRecent && (
        <div style={{fontSize:"0.7rem",color:Core.textFaint,textAlign:"right",marginBottom:"10px"}}>
          {!navigator.onLine?"Offline · ":""}Last checked: {mostRecent.toLocaleTimeString()}
        </div>
      )}
      {hasFlights && !mostRecent && (
        <div style={{fontSize:"0.7rem",color:Core.textFaint,textAlign:"right",marginBottom:"10px"}}>Live status begins 48hrs before departure</div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:`${Spacing.sm}px`}}>
        {sorted.map((b, i) => (
          <ScrollReveal key={b.id} index={i}>
            {renderBooking(b)}
          </ScrollReveal>
        ))}
      </div>
    </>
  );
}
