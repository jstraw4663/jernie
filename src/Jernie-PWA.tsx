// @ts-nocheck — types deferred; will be added during CSS/architecture refactor (phase:foundation)
import { useState, useEffect, useMemo, useRef } from "react";
import { useTripData } from "./hooks/useTripData";
import { useSharedTripState } from "./hooks/useSharedTripState";
import { EditableItinerary } from "./components/EditableItinerary";
import { AddToItinerarySheet } from "./components/AddToItinerarySheet";
import { RestaurantCard } from "./components/RestaurantCard";
import { ActivityCard } from "./components/ActivityCard";
import { StickyHeader } from "./components/StickyHeader";
import { StopNavigator } from "./components/StopNavigator";
import { ScrollReveal } from "./components/ScrollReveal";
import type { Booking, Group, Place, Stop, TripData } from "./types";
import { motion } from 'framer-motion';
import { Colors, Typography, Spacing, Radius, Animation } from "./design/tokens";

const FLIGHT_STATUS_URL = (import.meta as any).env?.VITE_FLIGHT_STATUS_URL ?? "/.netlify/functions/flight-status";

const WMO: Record<number,{e:string,d:string}> = {
  0:{e:"☀️",d:"Clear"},1:{e:"🌤️",d:"Mostly Clear"},2:{e:"⛅",d:"Partly Cloudy"},3:{e:"☁️",d:"Overcast"},
  45:{e:"🌫️",d:"Foggy"},48:{e:"🌫️",d:"Foggy"},51:{e:"🌦️",d:"Drizzle"},53:{e:"🌦️",d:"Drizzle"},
  55:{e:"🌧️",d:"Rain"},61:{e:"🌧️",d:"Light Rain"},63:{e:"🌧️",d:"Rain"},65:{e:"🌧️",d:"Heavy Rain"},
  71:{e:"🌨️",d:"Snow"},73:{e:"🌨️",d:"Snow"},75:{e:"❄️",d:"Heavy Snow"},80:{e:"🌦️",d:"Showers"},
  81:{e:"🌧️",d:"Showers"},82:{e:"⛈️",d:"Storms"},95:{e:"⛈️",d:"Thunderstorm"},99:{e:"⛈️",d:"Severe Storm"}
};
const wmo = (c:number) => WMO[c] || {e:"🌡️",d:"—"};
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const appleMaps = (addr:string) => "https://maps.apple.com/?q=" + encodeURIComponent(addr);

// ── Countdown ─────────────────────────────────────────────────

function useCountdown(departure: Date | null) {
  const calc = () => {
    if (!departure) return null;
    const diff = departure.getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins: Math.floor((diff % 3600000) / 60000),
      secs: Math.floor((diff % 60000) / 1000),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [departure]);
  return t;
}

// ── Cache Utilities ───────────────────────────────────────────

function readCache(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() })); }
  catch {}
}

// ── Flight Utilities ──────────────────────────────────────────

function deriveFlightGroups(bookings: Booking[]) {
  const groups: Record<string,any> = {};
  bookings.filter(b => b.type === "flight" && b.flights).forEach(b => {
    b.flights!.forEach(f => {
      const dateKey = new Date(f.date).toISOString().split("T")[0];
      if (!groups[dateKey]) groups[dateKey] = { dateKey, flights: [] };
      if (!groups[dateKey].flights.find((x:any) => x.key === f.key)) {
        groups[dateKey].flights.push({
          key: f.key,
          flight: f.airline + " " + f.num.replace(" ",""),
          route: f.route,
          date: f.date,
          schedDep: f.dep,
          schedArr: f.arr,
        });
      }
    });
  });
  return groups;
}

function isWithinFlightWindow(dateKey: string, flights: any[]) {
  let earliest = Infinity;
  flights.forEach(f => {
    const t = Date.parse(dateKey + " " + f.schedDep);
    if (!isNaN(t) && t < earliest) earliest = t;
  });
  if (!isFinite(earliest)) return false;
  const now = Date.now();
  return now >= earliest - 48 * 3600000 && now <= earliest + 24 * 3600000;
}

async function fetchWeatherForStop(s: Stop, signal?: AbortSignal) {
  const key = "jernie_weather_" + s.id;
  const cached = readCache(key);
  if (cached && (Date.now() - cached.cachedAt) < 3 * 3600000) {
    return { data: cached.data, fromCache: true };
  }
  const daysUntilTrip = Math.ceil((new Date(s.weather_start).getTime() - Date.now()) / 86400000);
  if (daysUntilTrip > 16) return null;
  if (!navigator.onLine) {
    return cached ? { data: cached.data, fromCache: true } : null;
  }
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + s.lat + "&longitude=" + s.lon + "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=" + s.weather_start + "&end_date=" + s.weather_end;
    const r = await fetch(url, { signal });
    const d = await r.json();
    if (d.error || !d.daily?.time?.length) return cached ? { data: cached.data, fromCache: true } : null;
    writeCache(key, d.daily);
    return { data: d.daily, fromCache: false };
  } catch {
    return cached ? { data: cached.data, fromCache: true } : null;
  }
}

async function fetchFlightStatusGroupWithData(
  dateKey: string,
  flights: any[],
  setStatus: (fn: (prev: Record<string,any>) => Record<string,any>) => void,
  setLoading: (b: boolean) => void,
  setLastUpdated: (fn: (prev: Record<string,any>) => Record<string,any>) => void
) {
  if (!flights || flights.length === 0) { setLoading(false); return; }
  setLoading(true);
  const cacheKey = "jernie_flights_" + dateKey;

  if (!navigator.onLine) {
    const cached = readCache(cacheKey);
    if (cached) setStatus(prev => ({ ...prev, ...cached.data }));
    setLastUpdated(prev => ({ ...prev, [dateKey]: cached ? new Date(cached.cachedAt) : new Date() }));
    setLoading(false);
    return;
  }

  try {
    const resp = await fetch(FLIGHT_STATUS_URL, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ flights })
    });
    if (!resp.ok) throw new Error("proxy error");
    const map = await resp.json();
    writeCache(cacheKey, map);
    setStatus(prev => ({ ...prev, ...map }));
  } catch {
    const cached = readCache(cacheKey);
    if (cached) setStatus(prev => ({ ...prev, ...cached.data }));
  }

  setLastUpdated(prev => ({ ...prev, [dateKey]: new Date() }));
  setLoading(false);
}

// ── Entrance animation variants ───────────────────────────────
// The main content area uses staggerChildren so each section cascades in
// after unlock. Content only mounts once (behind PIN gate) so initial="hidden"
// fires exactly once — no re-animation on stop swipe.

const contentContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045 },
  },
};

const contentSectionVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', ...Animation.springs.gentle },
  },
};

// ── Sub-components ────────────────────────────────────────────

function AlertBox({type, text, link}: {type:string, text:string, link?:{label:string, url:string}}) {
  const s = ({
    warning: { bd: Colors.gold },
    tip:     { bd: Colors.success },
    info:    { bd: '#2D6A8F' },
  } as any)[type] || { bd: '#2D6A8F' };
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
        fontFamily: Typography.family,
      }}>
        {text}
      </div>
      {link && (
        <div style={{ marginTop: `${Spacing.sm}px` }}>
          <a href={link.url} target="_blank" rel="noopener noreferrer" style={{
            color: s.bd,
            fontWeight: Typography.weight.bold,
            fontSize: `${Typography.size.xs}px`,
            fontFamily: Typography.family,
          }}>
            {link.label}
          </a>
        </div>
      )}
    </div>
  );
}

function SecHead({label}: {label:string}) {
  return <div style={{display:"flex",alignItems:"center",gap:Spacing.md,marginBottom:Spacing.base}}>
    <div style={{fontWeight:Typography.weight.bold,color:Colors.gold,fontSize:Typography.size.xs,letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"Georgia,serif"}}>{label}</div>
    <div style={{flex:1,height:"1px",background:Colors.gold+"30"}}/>
  </div>;
}


function HotelCard({accent, label, booking}: any) {
  return (
    <div style={{
      background: Colors.surfaceRaised,
      borderRadius: `${Radius.lg}px`,
      boxShadow: '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
      borderLeft: `3px solid ${accent}`,
      padding: `${Spacing.md}px ${Spacing.base}px`,
    }}>
      <div style={{
        fontSize: `${Typography.size.xs}px`,
        fontWeight: Typography.weight.bold,
        color: accent,
        letterSpacing: '0.12em',
        textTransform: 'uppercase' as const,
        fontFamily: Typography.family,
        marginBottom: `${Spacing.sm}px`,
      }}>
        {label}
      </div>
      {booking.url
        ? <a href={booking.url} target="_blank" rel="noopener noreferrer" style={{
            fontWeight: Typography.weight.bold,
            fontSize: `${Typography.size.base}px`,
            color: Colors.textPrimary,
            textDecoration: 'none',
            borderBottom: `1px dotted ${Colors.border}`,
            display: 'inline-block',
            marginBottom: `${Spacing.xs}px`,
            fontFamily: Typography.family,
          }}>
            {booking.label}
          </a>
        : <div style={{
            fontWeight: Typography.weight.bold,
            fontSize: `${Typography.size.base}px`,
            color: Colors.textPrimary,
            marginBottom: `${Spacing.xs}px`,
            fontFamily: Typography.family,
          }}>
            {booking.label}
          </div>
      }
      {booking.addr && (
        <a href={appleMaps(booking.addr)} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: `${Spacing.xs}px`,
          fontSize: `${Typography.size.xs}px`,
          color: accent,
          textDecoration: 'none',
          marginTop: `${Spacing.xs}px`,
          marginBottom: `${Spacing.xs}px`,
          opacity: 0.85,
          fontFamily: Typography.family,
        }}>
          📍 {booking.addr} <span style={{ fontSize: '10px', opacity: 0.6 }}>· Maps</span>
        </a>
      )}
      {booking.confirmation && (
        <div style={{
          fontSize: `${Typography.size.xs}px`,
          color: Colors.textMuted,
          marginBottom: `${Spacing.xs}px`,
          fontFamily: Typography.family,
        }}>
          🎫 Confirmation: <span style={{ fontWeight: Typography.weight.bold, color: Colors.textSecondary }}>{booking.confirmation}</span>
        </div>
      )}
      {booking.note && (
        <div style={{
          color: Colors.textSecondary,
          fontSize: `${Typography.size.sm}px`,
          lineHeight: Typography.lineHeight.relaxed,
          fontStyle: 'italic',
          marginTop: `${Spacing.xs}px`,
          fontFamily: Typography.family,
        }}>
          {booking.note}
        </div>
      )}
    </div>
  );
}

function StatusBadge({status}: {status:string}) {
  const cfg = ({"On Time":{bg:"#EDFAF1",color:"#1B7A4A",dot:"#1B7A4A"},"Delayed":{bg:"#FFF8E7",color:"#b07010",dot:"#E8A020"},"Cancelled":{bg:"#FEF2F2",color:"#b91c1c",dot:"#ef4444"},"Scheduled":{bg:"#EBF4F8",color:"#2D6A8F",dot:"#2D6A8F"}}as any)[status]||{bg:"#f5f5f5",color:"#888",dot:"#aaa"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:"5px",background:cfg.bg,color:cfg.color,fontSize:"0.7rem",fontWeight:"bold",padding:"2px 9px",borderRadius:"20px",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>
    <span style={{width:"6px",height:"6px",borderRadius:"50%",background:cfg.dot,flexShrink:0}}/>{status}
  </span>;
}

function FlightRow({f, sMap, loading}: any) {
  const s = sMap?.[f.key];
  const delayed = s?.delayMin > 0;
  const actualDep = s?.actualDep && s.actualDep !== f.dep ? s.actualDep : null;
  const actualArr = s?.actualArr && s.actualArr !== f.arr ? s.actualArr : null;
  const label = (l: string) => (
    <div style={{
      fontSize: `${Typography.size.xs}px`,
      color: Colors.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      marginBottom: `${Spacing.xxs}px`,
      fontFamily: Typography.family,
    }}>{l}</div>
  );
  const val = (children: React.ReactNode, color?: string) => (
    <div style={{
      fontWeight: Typography.weight.bold,
      fontSize: `${Typography.size.sm}px`,
      color: color ?? Colors.textPrimary,
      display: 'flex',
      alignItems: 'center',
      gap: `${Spacing.xs}px`,
      fontFamily: Typography.family,
    }}>{children}</div>
  );
  return (
    <div style={{ borderTop: `1px solid ${Colors.border}`, paddingTop: `${Spacing.md}px`, marginTop: `${Spacing.md}px` }}>
      {/* Flight header: number · airline · route · date + status */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap' as const, gap: `${Spacing.xs}px`, marginBottom: `${Spacing.sm}px`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${Spacing.xs}px`, flexWrap: 'wrap' as const }}>
          {f.trackingUrl
            ? <a href={f.trackingUrl} target="_blank" rel="noopener noreferrer" style={{
                fontWeight: Typography.weight.bold,
                fontSize: `${Typography.size.base}px`,
                color: Colors.textPrimary,
                textDecoration: 'none',
                borderBottom: `1px dotted ${Colors.textMuted}`,
                fontFamily: Typography.family,
              }}>{f.num}</a>
            : <span style={{ fontWeight: Typography.weight.bold, fontSize: `${Typography.size.base}px`, fontFamily: Typography.family }}>{f.num}</span>
          }
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
      {/* Flight stats grid */}
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
          <div>{label('Delay')}{val(`+${s.delayMin} min`, Colors.gold)}</div>
        )}
      </div>
    </div>
  );
}

function BookingCard({booking, accent, flightStatus, flightLoading}: any) {
  return (
    <div style={{
      background: Colors.surfaceRaised,
      borderRadius: `${Radius.lg}px`,
      boxShadow: '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
      borderLeft: `3px solid ${accent}60`,
      padding: `${Spacing.md}px ${Spacing.base}px`,
      display: 'flex',
      gap: `${Spacing.md}px`,
      alignItems: 'flex-start',
    }}>
      <div style={{ fontSize: '1.3rem', lineHeight: 1, marginTop: '2px', flexShrink: 0 }}>{booking.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: Typography.weight.bold,
          color: Colors.textSecondary,
          fontSize: `${Typography.size.xs}px`,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          marginBottom: `${Spacing.sm}px`,
          fontFamily: Typography.family,
        }}>
          {booking.label.includes("Avis") ? (() => {
            const parts = booking.label.split("Avis");
            return <>{parts[0]}<span style={{color:"#CC2200"}}>Avis</span>{parts[1]}</>;
          })() : booking.label}
        </div>
        {booking.flights?.map((f:any, i:number) => <FlightRow key={i} f={f} sMap={flightStatus} loading={flightLoading}/>)}
        {booking.lines?.map((l:string, i:number) => {
          const isAddr = l.startsWith("📍");
          return (
            <div key={i} style={{
              fontSize: `${Typography.size.sm}px`,
              lineHeight: Typography.lineHeight.normal,
              marginBottom: `${Spacing.xxs}px`,
              fontWeight: i === 0 ? Typography.weight.semibold : Typography.weight.regular,
              color: l.startsWith("⏰") || l.startsWith("📅") ? Colors.textSecondary : Colors.textPrimary,
              fontFamily: Typography.family,
            }}>
              {isAddr && booking.addr
                ? <a href={appleMaps(booking.addr)} target="_blank" rel="noopener noreferrer" style={{ color: accent, textDecoration: 'none' }}>
                    📍 {l.replace("📍", "").trim()} <span style={{ fontSize: `${Typography.size.xs}px`, opacity: 0.7 }}>· Open in Maps</span>
                  </a>
                : l
              }
            </div>
          );
        })}
        {booking.confirmation_link && (
          <div style={{ fontSize: `${Typography.size.sm}px`, lineHeight: Typography.lineHeight.normal, marginTop: `${Spacing.xxs}px` }}>
            <a href={booking.confirmation_link.url} target="_blank" rel="noopener noreferrer" style={{
              color: accent,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: `${Spacing.xs}px`,
              fontFamily: Typography.family,
            }}>
              🎫 {booking.confirmation_link.label}
              <span style={{ fontSize: `${Typography.size.xs}px`, opacity: 0.7 }}>· View Reservation</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function LegSummary({stop}: {stop:Stop}) {
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
        fontFamily: Typography.family,
        marginBottom: `${Spacing.xs}px`,
      }}>
        {stop.emoji} {stop.city} · {stop.dates}
      </div>
      <div style={{
        fontSize: `${Typography.size.sm}px`,
        color: Colors.textSecondary,
        lineHeight: Typography.lineHeight.relaxed,
        fontStyle: 'italic',
        fontFamily: Typography.family,
      }}>
        {stop.summary}
      </div>
    </div>
  );
}

function WeatherStrip({stop, weatherData}: any) {
  const data = weatherData[stop.id];
  const tripStart = new Date(stop.weather_start+"T12:00:00");
  const today = new Date();
  const daysOut = Math.ceil((tripStart.getTime()-today.getTime())/(1000*60*60*24));
  const availDate = new Date(tripStart.getTime()-15*24*60*60*1000).toLocaleDateString("en-US",{month:"long",day:"numeric"});
  return <div style={{marginBottom:"22px"}}>
    <div style={{fontSize:"0.72rem",fontWeight:"bold",color:stop.accent,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"9px"}}>🌤️ Forecast — {stop.city}</div>
    {!data?(
      <div style={{background:stop.accent+"08",border:"1px dashed "+stop.accent+"30",borderRadius:"10px",padding:"14px 18px",display:"flex",alignItems:"center",gap:"12px"}}>
        <span style={{fontSize:"1.6rem"}}>📅</span>
        <div>
          <div style={{fontWeight:"bold",fontSize:"0.85rem",color:Colors.textPrimary}}>Forecast not yet available</div>
          <div style={{fontSize:"0.8rem",color:Colors.textMuted,marginTop:"2px"}}>{daysOut>16?"Opens around "+availDate+" — will auto-populate on refresh.":"Loading weather data…"}</div>
        </div>
      </div>
    ):(
      <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"2px"}}>
        {data.time.map((dt:string,i:number)=>{
          const d=new Date(dt+"T12:00:00");
          const w=wmo(data.weathercode[i]);
          const hi=Math.round(data.temperature_2m_max[i]);
          const lo=Math.round(data.temperature_2m_min[i]);
          const precip=data.precipitation_probability_max[i];
          return <div key={i} style={{flex:"0 0 auto",minWidth:"84px",background:Colors.surface,border:"1px solid "+stop.accent+"22",borderRadius:"12px",padding:"12px 10px",textAlign:"center",boxShadow:"0 1px 5px "+stop.accent+"0D"}}>
            <div style={{fontSize:"0.68rem",fontWeight:"bold",color:Colors.textMuted,letterSpacing:"0.06em"}}>{DAYS[d.getDay()]}</div>
            <div style={{fontSize:"0.68rem",color:Colors.textMuted,marginBottom:"7px"}}>{d.getMonth()+1}/{d.getDate()}</div>
            <div style={{fontSize:"1.6rem",lineHeight:1,marginBottom:"5px"}}>{w.e}</div>
            <div style={{fontSize:"0.68rem",color:Colors.textMuted,marginBottom:"5px"}}>{w.d}</div>
            <div style={{fontWeight:"bold",fontSize:"0.88rem",color:Colors.textPrimary}}>{hi}°<span style={{fontWeight:"normal",color:Colors.textMuted,fontSize:"0.78rem"}}> {lo}°</span></div>
            <div style={{fontSize:"0.7rem",color:precip>50?Colors.navyLight:Colors.textMuted,marginTop:"4px",fontWeight:precip>50?"bold":"normal"}}>💧{precip}%</div>
          </div>;
        })}
      </div>
    )}
  </div>;
}

function PlaceCard({place, accent, onAddToItinerary}: {place:Place, accent:string, onAddToItinerary?:(place:Place)=>void}) {
  return place.category === "restaurant"
    ? <RestaurantCard place={place} accent={accent} onAddToItinerary={onAddToItinerary} />
    : <ActivityCard place={place} accent={accent} onAddToItinerary={onAddToItinerary} />;
}

function getActivityDisplayGroup(place: Place): string {
  if (place.category === "hike") return "Hikes";
  if (place.subcategory === "on-the-water") return "On the Water";
  if (place.category === "sight") return "Walks & Views";
  return "Nature & Culture";
}

function PlaceList({places, accent, isActivities, onAddToItinerary}: {places:Place[], accent:string, isActivities?:boolean, onAddToItinerary?:(place:Place)=>void}) {
  // Activities with groupable categories (hikes, on-the-water) get section headers
  const hasGroups = isActivities && places.some(p => p.category === "hike" || p.subcategory === "on-the-water");

  if (!hasGroups) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:"11px"}}>
        {places.map((p, i)=>(
          <ScrollReveal key={p.id} index={i} margin="-40px">
            <PlaceCard place={p} accent={accent} onAddToItinerary={onAddToItinerary}/>
          </ScrollReveal>
        ))}
      </div>
    );
  }

  const groupOrder = ["Hikes","On the Water","Walks & Views","Nature & Culture"];
  const groupEmojis: Record<string,string> = {"Hikes":"🥾","On the Water":"⛵","Walks & Views":"🚶","Nature & Culture":"🌿"};
  const grouped: Record<string,Place[]> = {};
  places.forEach(p => {
    const g = getActivityDisplayGroup(p);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(p);
  });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
      {groupOrder.filter(g=>grouped[g]?.length).map(g=>(
        <div key={g}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
            <span style={{fontSize:"1rem"}}>{groupEmojis[g]||"📍"}</span>
            <div style={{fontWeight:"bold",color:accent,fontSize:"0.72rem",letterSpacing:"0.1em",textTransform:"uppercase"}}>{g}</div>
            <div style={{flex:1,height:"1px",background:accent+"20"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {grouped[g].map((p, i)=>(
              <ScrollReveal key={p.id} index={i} margin="-40px">
                <PlaceCard place={p} accent={accent} onAddToItinerary={onAddToItinerary}/>
              </ScrollReveal>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({color, label, open, onToggle, children, rightSlot}: any) {
  return (
    <div style={{marginBottom:"28px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:open?"12px":"0"}}>
        <button onClick={onToggle} style={{flex:1,display:"flex",alignItems:"center",gap:"12px",background:"none",border:"none",cursor:"pointer",padding:"0",fontFamily:"Georgia,serif"}}>
          <div style={{fontWeight:"bold",color,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</div>
          <div style={{flex:1,height:"1px",background:color+"30"}}/>
          <span style={{color,fontSize:"0.72rem",transition:"transform 0.18s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>▼</span>
        </button>
        {rightSlot}
      </div>
      {open && children}
    </div>
  );
}

function DailyItinerary({stop, data, confirms, onConfirm}: {stop:Stop, data:TripData, confirms:Record<string,boolean>, onConfirm:(id:string, value:boolean)=>void}) {
  const [openDay, setOpenDay] = useState(0);

  const days = data.itinerary_days.filter(d => d.stop_id === stop.id);
  const itemsByDay = useMemo(() => {
    const map: Record<string, typeof data.itinerary_items> = {};
    data.itinerary_items.forEach(it => {
      if (!map[it.day_id]) map[it.day_id] = [];
      map[it.day_id].push(it);
    });
    return map;
  }, [data.itinerary_items]);

  return (
    <div style={{marginBottom:"28px"}}>
      <SecHead label="📅 Daily Jernie — Loose Plan"/>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {days.map((day,di)=>{
          const items = itemsByDay[day.id] || [];
          return (
          <div key={day.id} style={{border:"1px solid "+stop.accent+(openDay===di?"40":"20"),borderRadius:"12px",overflow:"hidden",background:"#fff",transition:"border-color 0.15s"}}>
            <button onClick={()=>setOpenDay(openDay===di?-1:di)}
              style={{width:"100%",padding:"14px 18px",display:"flex",alignItems:"center",gap:"12px",background:openDay===di?stop.accent+"0A":"transparent",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"Georgia,serif",transition:"background 0.15s"}}>
              <span style={{fontSize:"1.25rem",flexShrink:0}}>{day.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:"bold",fontSize:"0.92rem",color:"#1a1a1a"}}>{day.date}</div>
                <div style={{fontSize:"0.75rem",color:"#888",marginTop:"2px",fontStyle:"italic"}}>{day.label}</div>
              </div>
              <span style={{color:stop.accent,fontSize:"0.75rem",display:"inline-block",transform:openDay===di?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.15s"}}>▼</span>
            </button>
            {openDay===di&&(
              <div style={{padding:"0 18px 14px 18px",borderTop:"1px solid "+stop.accent+"15"}}>
                {items.map((item,ii)=>{
                  const isLocked = item.locked || confirms[item.id];
                  return (
                  <div key={item.id} style={{display:"flex",gap:"12px",padding:"10px 0",borderBottom:ii<items.length-1?"1px dashed #f0ede6":"none",alignItems:"flex-start"}}>
                    <div style={{minWidth:"96px",flexShrink:0,display:"flex",flexDirection:"column",gap:"5px",paddingTop:"2px"}}>
                      <div style={{fontSize:"0.7rem",color:"#aaa",lineHeight:1.4,fontStyle:"italic"}}>{item.time}</div>
                      {isLocked ? (
                        <button onClick={()=>!item.locked&&onConfirm(item.id, !confirms[item.id])}
                          title={item.locked?"Locked in":"Click to unmark"}
                          style={{background:stop.accent,color:"#fff",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",display:"inline-block",width:"fit-content",border:"none",cursor:item.locked?"default":"pointer",fontFamily:"Georgia,serif"}}>
                          ✓ Confirmed
                        </button>
                      ) : (
                        <>
                          {item.book_now&&(
                            item.booking_url
                              ? <a href={item.booking_url} target="_blank" rel="noopener noreferrer"
                                  style={{background:"#FFF3CD",color:"#7a5800",fontSize:"0.52rem",padding:"2px 8px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px solid #F0C040aa",display:"inline-block",width:"fit-content",textDecoration:"none",cursor:"pointer"}}>
                                  📅 Book Now
                                </a>
                              : <span style={{background:"#FFF3CD",color:"#7a5800",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px solid #F0C040aa",display:"inline-block",width:"fit-content"}}>📅 Book Now</span>
                          )}
                          {item.alert&&!item.book_now&&(
                            <span style={{background:"#FFF8E7",color:"#b07010",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px solid #E8A02050",display:"inline-block",width:"fit-content"}}>⚠ Note</span>
                          )}
                          <button onClick={()=>onConfirm(item.id, !confirms[item.id])}
                            style={{background:"transparent",color:"#bbb",fontSize:"0.52rem",padding:"2px 6px",borderRadius:"4px",letterSpacing:"0.06em",textTransform:"uppercase",border:"1px dashed #ddd",display:"inline-block",width:"fit-content",cursor:"pointer",fontFamily:"Georgia,serif",marginTop:"1px"}}>
                            + Confirm
                          </button>
                        </>
                      )}
                    </div>
                    <div style={{fontSize:"0.86rem",color:"#333",lineHeight:1.55,flex:1,paddingTop:"2px"}}>
                      {item.text}
                      {item.addr&&(
                        <div style={{marginTop:"5px"}}>
                          <a href={appleMaps(item.addr)} target="_blank" rel="noopener noreferrer"
                            style={{display:"inline-flex",alignItems:"center",gap:"4px",fontSize:"0.76rem",color:stop.accent,textDecoration:"none",fontStyle:"normal"}}>
                            📍 {item.addr_label||item.addr} <span style={{fontSize:"0.68rem",opacity:0.7}}>· Maps</span>
                          </a>
                        </div>
                      )}
                      {item.tide_url&&(
                        <div style={{marginTop:"5px"}}>
                          <a href={item.tide_url} target="_blank" rel="noopener noreferrer"
                            style={{display:"inline-flex",alignItems:"center",gap:"4px",fontSize:"0.76rem",color:"#2D6A8F",textDecoration:"none",fontStyle:"normal"}}>
                            🌊 Bar Harbor Tide Chart <span style={{fontSize:"0.68rem",opacity:0.7}}>· NOAA</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function Countdown({departure}: {departure:Date|null}) {
  const t = useCountdown(departure);
  if (!t) return (
    <p style={{margin:"16px auto 0",color:"#A8C4D4",fontSize:"1rem",fontStyle:"italic"}}>We're in Maine! 🦞</p>
  );
  return (
    <div style={{marginTop:"20px"}}>
      <div style={{fontSize:"0.65rem",letterSpacing:"0.25em",color:"#7A9FB5",textTransform:"uppercase",marginBottom:"10px"}}>Countdown to Departure · May 22 · 8:20 AM</div>
      <div style={{display:"flex",justifyContent:"center",gap:"6px",flexWrap:"wrap"}}>
        {([["days",t.days],["hrs",t.hours],["min",t.mins],["sec",t.secs]] as [string,number][]).map(([label,val])=>(
          <div key={label} style={{textAlign:"center",background:"rgba(255,255,255,0.07)",borderRadius:"10px",padding:"10px 14px",minWidth:"56px"}}>
            <div style={{fontSize:"clamp(1.3rem,4vw,1.9rem)",fontWeight:"bold",color:"#FDFAF4",lineHeight:1,fontVariantNumeric:"tabular-nums",letterSpacing:"-0.02em"}}>{String(val).padStart(2,"0")}</div>
            <div style={{fontSize:"0.58rem",color:"#7A9FB5",letterSpacing:"0.15em",textTransform:"uppercase",marginTop:"4px"}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── What to Pack ──────────────────────────────────────────────

function WhatToPack({accent, data, packing, onPack, onReset}: {accent:string, data:TripData, packing:Record<string,boolean>, onPack:(id:string,value:boolean)=>void, onReset:()=>void}) {
  const [open, setOpen] = useState(false);

  const totalItems = data.packing_lists.reduce((a,c)=>a+c.items.length,0);
  const checkedCount = Object.values(packing).filter(Boolean).length;

  return (
    <div style={{marginBottom:"28px"}}>
      <button onClick={()=>setOpen(v=>!v)} style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",background:"none",border:"none",cursor:"pointer",padding:"0",marginBottom:open?"12px":"0",fontFamily:"Georgia,serif"}}>
        <div style={{fontWeight:"bold",color:accent,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap"}}>🎒 What to Pack</div>
        <div style={{flex:1,height:"1px",background:accent+"30"}}/>
        <span style={{fontSize:"0.7rem",color:"#999",whiteSpace:"nowrap",marginRight:"6px"}}>{checkedCount}/{totalItems} packed</span>
        <span style={{color:accent,fontSize:"0.72rem",transition:"transform 0.18s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>▼</span>
      </button>
      {open && (
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {data.packing_lists.map((section)=>(
            <div key={section.id} style={{background:"#fff",borderRadius:"12px",border:"1px solid #e0ddd6",overflow:"hidden"}}>
              <div style={{background:accent+"0A",borderBottom:"1px solid "+accent+"15",padding:"10px 16px",fontWeight:"bold",fontSize:"0.8rem",color:accent,letterSpacing:"0.04em"}}>
                {section.category}
              </div>
              <div style={{padding:"6px 0"}}>
                {section.items.map((item,ii)=>{
                  const done = !!packing[item.id];
                  return (
                    <button key={item.id} onClick={()=>onPack(item.id, !packing[item.id])}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"8px 16px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"Georgia,serif",borderBottom:ii<section.items.length-1?"1px solid #f5f3ef":"none",transition:"background 0.1s"}}>
                      <div style={{width:"18px",height:"18px",borderRadius:"4px",border:"2px solid "+(done?accent:"#ccc"),background:done?accent:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                        {done&&<span style={{color:"#fff",fontSize:"0.65rem",fontWeight:"bold"}}>✓</span>}
                      </div>
                      <span style={{fontSize:"0.84rem",color:done?"#bbb":"#333",textDecoration:done?"line-through":"none",lineHeight:1.4,transition:"all 0.15s"}}>{item.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {checkedCount > 0 && (
            <button onClick={onReset} style={{alignSelf:"flex-end",background:"transparent",border:"1px solid #e0ddd6",borderRadius:"6px",padding:"4px 12px",fontSize:"0.72rem",color:"#aaa",cursor:"pointer",fontFamily:"Georgia,serif"}}>
              Reset list
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Travel Section ────────────────────────────────────────────

function TravelSection({stop, stopBookings, groups, flightStatus, flightLoading, lastUpdated}: any) {
  // Sort by display_order for chronological story (arrival: flights → car → hotel; departure: hotel → car → flights)
  const sorted = [...stopBookings].sort((a:Booking, b:Booking) => (a.display_order ?? 999) - (b.display_order ?? 999));

  const hasFlights = stopBookings.some((b:Booking) => b.type === "flight");

  // Compute last updated timestamp for flights on this stop
  const flightBookings = stopBookings.filter((b:Booking) => b.type === "flight" && b.flights);
  const dateKeys = [...new Set(
    flightBookings.flatMap((b:any) => b.flights.map((f:any) => new Date(f.date).toISOString().split("T")[0]))
  )] as string[];
  const relevantTimestamps = dateKeys.map((dk:string) => lastUpdated[dk]).filter(Boolean);
  const mostRecent = relevantTimestamps.length > 0
    ? new Date(Math.max(...relevantTimestamps.map((d:Date) => d.getTime())))
    : null;

  const renderBooking = (b: Booking) => {
    if (b.type === "accommodation") {
      const groupName = b.group_ids
        ? groups.find((g:Group) => g.id === b.group_ids![0])?.name
        : "Party-Wide";
      return <HotelCard key={b.id} accent={stop.accent} label={"🏠 " + groupName + "'s Accommodations"} booking={b}/>;
    }
    return <BookingCard key={b.id} booking={b} accent={stop.accent} flightStatus={flightStatus} flightLoading={flightLoading}/>;
  };

  return (
    <>
      {hasFlights && mostRecent && (
        <div style={{fontSize:"0.7rem",color:"#bbb",textAlign:"right",marginBottom:"10px"}}>
          {!navigator.onLine?"Offline · ":""}Last checked: {mostRecent.toLocaleTimeString()}
        </div>
      )}
      {hasFlights && !mostRecent && (
        <div style={{fontSize:"0.7rem",color:"#bbb",textAlign:"right",marginBottom:"10px"}}>Live status begins 48hrs before departure</div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:`${Spacing.sm}px`}}>
        {sorted.map((b: Booking, i: number) => (
          <ScrollReveal key={b.id} index={i}>
            {renderBooking(b)}
          </ScrollReveal>
        ))}
      </div>
    </>
  );
}

// ── PIN Gate ──────────────────────────────────────────────────

const PIN = "0824";
const SESSION_KEY = "maine2026_unlocked";

function PinGate({onUnlock}: {onUnlock: ()=>void}) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleDigit = (d: string) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      const entered = next.join("");
      if (entered === PIN) {
        setFlash(true);
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
        setTimeout(onUnlock, 380);
      } else {
        setShake(true);
        setTimeout(() => { setDigits([]); setShake(false); }, 650);
      }
    }
  };

  const handleDelete = () => setDigits(d => d.slice(0,-1));

  const keys = [
    ["1",""],["2","ABC"],["3","DEF"],
    ["4","GHI"],["5","JKL"],["6","MNO"],
    ["7","PQRS"],["8","TUV"],["9","WXYZ"],
    null,["0",""],["DEL",""]
  ];

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:9999,
      background:"linear-gradient(170deg,#1a2a3a 0%,#0D2B3E 50%,#0a1f2e 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",
      opacity: flash ? 0 : 1,
      transition: flash ? "opacity 0.35s ease" : "none",
      fontFamily:"Georgia,'Times New Roman',serif",
    }}>
      <div style={{fontSize:"2rem",marginBottom:"10px",opacity:0.5}}>🔒</div>
      <div style={{color:"#FDFAF4",fontSize:"1.45rem",fontWeight:"normal",letterSpacing:"0.01em",marginBottom:"6px",textAlign:"center"}}>
        Enter Passcode to View
      </div>
      <div style={{color:"#7A9FB5",fontSize:"0.9rem",letterSpacing:"0.04em",marginBottom:"36px",fontStyle:"italic"}}>
        Happy Birthday Ford
      </div>
      <div style={{
        display:"flex",gap:"18px",marginBottom:"44px",
        animation: shake ? "pinShake 0.55s ease" : "none",
      }}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{
            width:"13px",height:"13px",borderRadius:"50%",
            border:"2px solid rgba(255,255,255,0.5)",
            background: i < digits.length ? "#FDFAF4" : "transparent",
            transition:"background 0.15s",
          }}/>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"13px",width:"min(290px,80vw)"}}>
        {keys.map((k,i)=>{
          if (!k) return <div key={i}/>;
          const [num, letters] = k;
          const isDel = num === "DEL";
          return (
            <button key={i}
              onClick={()=> isDel ? handleDelete() : handleDigit(num)}
              style={{
                width:"100%",aspectRatio:"1",borderRadius:"50%",
                border:"none",cursor:"pointer",
                background: isDel ? "transparent" : "rgba(255,255,255,0.12)",
                backdropFilter:"blur(8px)",
                WebkitBackdropFilter:"blur(8px)",
                display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",
                color:"#FDFAF4",
                transition:"background 0.12s,transform 0.08s",
                fontFamily:"inherit",
              }}
              onMouseDown={e=>(e.currentTarget.style.background = isDel ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)")}
              onMouseUp={e=>(e.currentTarget.style.background = isDel ? "transparent" : "rgba(255,255,255,0.12)")}
              onTouchStart={e=>(e.currentTarget.style.background = isDel ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)")}
              onTouchEnd={e=>(e.currentTarget.style.background = isDel ? "transparent" : "rgba(255,255,255,0.12)")}
            >
              {isDel
                ? <span style={{fontSize:"1.1rem",opacity:0.7}}>⌫</span>
                : <>
                    <span style={{fontSize:"1.65rem",fontWeight:"300",lineHeight:1}}>{num}</span>
                    {letters && <span style={{fontSize:"0.5rem",letterSpacing:"0.18em",opacity:0.6,marginTop:"2px"}}>{letters}</span>}
                  </>
              }
            </button>
          );
        })}
      </div>
      <style>{`
        @keyframes pinShake {
          0%   { transform: translateX(0); }
          15%  { transform: translateX(-10px); }
          30%  { transform: translateX(10px); }
          45%  { transform: translateX(-8px); }
          60%  { transform: translateX(8px); }
          75%  { transform: translateX(-4px); }
          90%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function MaineGuide() {
  const { data, loading, error } = useTripData();
  // VITE_TRIP_ID separates dev and prod Firebase paths (both use the same project).
  // Local: "dev-maine-2026" (set in .env.development.local)
  // Prod:  "maine-2026" (set in Netlify environment variables)
  // Phase 2: replace with trip ID from router when multi-trip support is added.
  const tripId = (import.meta as any).env?.VITE_TRIP_ID ?? "maine-2026";
  const { confirms, packing, setConfirm, setPacking, resetPacking,
          itineraryOrder, customItems, timeOverrides, reservationTimes, initializeOrder, setDayOrder, moveItem,
          addCustomItem, deleteCustomItem, setTimeOverride, setReservationTime } = useSharedTripState(tripId);
  const [unlocked, setUnlocked] = useState(()=>{
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  });

  // Sync body background to the active screen so Safari's bottom chrome area
  // matches: navy on lockscreen, cream on main app.
  useEffect(() => {
    document.body.style.background = unlocked ? Colors.background : Colors.navy;
  }, [unlocked]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const ACTIVE_STOP_KEY = "jernie_active_stop";
  const [active, setActive] = useState(() => {
    try { return sessionStorage.getItem(ACTIVE_STOP_KEY) || "portland"; } catch { return "portland"; }
  });
  const handleSetActive = (id: string) => {
    try { sessionStorage.setItem(ACTIVE_STOP_KEY, id); } catch {}
    setActive(id);
  };
  const [weatherData, setWeatherData] = useState<Record<string,any>>({});
  const [flightStatus, setFlightStatus] = useState<Record<string,any>>({});
  const [flightLoading, setFlightLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Record<string,Date>>({});
  const [travelOpen, setTravelOpen] = useState(true);
  const [eatOpen, setEatOpen] = useState(true);
  const [doOpen, setDoOpen] = useState(true);
  const [addPlaceContext, setAddPlaceContext] = useState<Place|null>(null);
  // Memoized so useCountdown's [departure] dependency stays stable — prevents interval churn
  // Must be at top level (before early returns) to satisfy Rules of Hooks
  const departure = useMemo(() => data ? new Date(data.trip.departure) : null, [data?.trip?.departure]);

  // Load caches and kick off fetches once data is available
  useEffect(() => {
    if (!data) return;

    // Weather: seed from cache immediately, then fetch all stops in parallel.
    // Promise.allSettled ensures a single setWeatherData call when all complete —
    // prevents 3 separate re-renders (one per stop) that could cause scroll jitter on iOS.
    const weatherInit: Record<string,any> = {};
    data.stops.forEach(s => {
      const c = readCache("jernie_weather_" + s.id);
      if (c) weatherInit[s.id] = c.data;
    });
    setWeatherData(weatherInit);

    const weatherController = new AbortController();
    Promise.allSettled(data.stops.map(s => fetchWeatherForStop(s, weatherController.signal)))
      .then(results => {
        if (weatherController.signal.aborted) return;
        const updates: Record<string,any> = {};
        results.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value) updates[data.stops[i].id] = r.value.data;
        });
        if (Object.keys(updates).length) setWeatherData(prev => ({...prev, ...updates}));
      });

    // Flights: load cache then fetch if within window
    const flightInit: Record<string,any> = {};
    const lastUpdatedInit: Record<string,Date> = {};
    const groups = deriveFlightGroups(data.bookings);
    Object.keys(groups).forEach(dk => {
      const c = readCache("jernie_flights_" + dk);
      if (c) {
        Object.assign(flightInit, c.data);
        lastUpdatedInit[dk] = new Date(c.cachedAt);
      }
    });
    setFlightStatus(flightInit);
    setLastUpdated(lastUpdatedInit);
    Object.entries(groups).forEach(([dateKey, group]: [string, any]) => {
      if (isWithinFlightWindow(dateKey, group.flights)) {
        fetchFlightStatusGroupWithData(dateKey, group.flights, setFlightStatus, setFlightLoading, setLastUpdated);
      }
    });

    return () => weatherController.abort();
  }, [data]);

  useEffect(() => {
    setTravelOpen(true);
    setEatOpen(true);
    setDoOpen(true);
  }, [active]);

  if (!unlocked) return <PinGate onUnlock={()=>setUnlocked(true)}/>;

  if (loading || !data) {
    return (
      <div style={{fontFamily:"Georgia,'Times New Roman',serif",background:"#F5F0E8",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",color:"#888"}}>
          <div style={{fontSize:"2rem",marginBottom:"12px"}}>🦞</div>
          <div style={{fontSize:"0.9rem",fontStyle:"italic"}}>Loading your trip…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{fontFamily:"Georgia,'Times New Roman',serif",background:"#F5F0E8",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",color:"#888",padding:"32px"}}>
          <div style={{fontSize:"0.9rem",color:"#b91c1c",marginBottom:"8px"}}>Failed to load trip data.</div>
          <div style={{fontSize:"0.8rem",fontStyle:"italic"}}>{error.message}</div>
        </div>
      </div>
    );
  }

  const activeIndex = data.stops.findIndex(s => s.id === active);
  const handleSwipe = (dir: 1 | -1) => {
    const next = data.stops[activeIndex + dir];
    if (next) handleSetActive(next.id);
  };

  const stop = data.stops.find(s => s.id === active)!;
  const stopBookings = data.bookings.filter(b => b.stop_id === active);
  const stopPlaces = data.places.filter(p => p.stop_id === active);
  const stopAlerts = data.alerts.filter(a => a.stop_id === active);
  const restaurants = stopPlaces.filter(p => p.category === "restaurant");
  const activities = stopPlaces.filter(p => p.category !== "restaurant");
  const hasFlights = stopBookings.some(b => b.type === "flight");

  return (
    <>
    <div
      ref={scrollRef}
      style={{fontFamily:"Georgia,'Times New Roman',serif",background:"#F5F0E8",color:"#1a1a1a",position:"fixed",inset:0,overflowY:"auto",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain"}}
    >

      <StickyHeader
        stops={data.stops}
        active={active}
        onTabChange={handleSetActive}
        scrollRef={scrollRef}
        tripDates={data.trip.dates}
        tripTitle={data.trip.title ?? data.trip.name}
        tagline={data.trip.tagline ?? ''}
        pills={data.trip.pills ?? []}
        headerSlot={<Countdown departure={departure}/>}
      />

      {/* Main */}
      <StopNavigator stops={data.stops} activeIndex={activeIndex} onSwipe={handleSwipe}>
      <motion.div
        style={{maxWidth:"780px",margin:"0 auto",padding:"32px 20px 64px"}}
        variants={contentContainerVariants}
        initial="hidden"
        animate="visible"
      >

        <motion.div variants={contentSectionVariants}>
          <LegSummary stop={stop}/>
        </motion.div>

        <motion.div variants={contentSectionVariants}>
          <WeatherStrip stop={stop} weatherData={weatherData}/>
        </motion.div>

        {/* Travel & Accommodations */}
        <motion.div variants={contentSectionVariants}>
          <CollapsibleSection
            color={stop.accent}
            label="✈️ Travel & Accommodations"
            open={travelOpen}
            onToggle={()=>setTravelOpen(v=>!v)}
            rightSlot={hasFlights&&(
              <button onClick={(e)=>{
                e.stopPropagation();
                const groups = deriveFlightGroups(stopBookings);
                Object.entries(groups).forEach(([dk, g]: [string, any]) => {
                  fetchFlightStatusGroupWithData(dk, g.flights, setFlightStatus, setFlightLoading, setLastUpdated);
                });
              }} disabled={flightLoading}
                style={{background:"transparent",border:"1px solid "+stop.accent+"50",borderRadius:"6px",padding:"3px 10px",fontSize:"0.72rem",color:stop.accent,cursor:flightLoading?"default":"pointer",opacity:flightLoading?0.5:1,fontFamily:"Georgia,serif"}}>
                {flightLoading?"⏳ Checking…":"↻ Refresh"}
              </button>
            )}
          >
            <TravelSection
              stop={stop}
              stopBookings={stopBookings}
              groups={data.groups}
              flightStatus={flightStatus}
              flightLoading={flightLoading}
              lastUpdated={lastUpdated}
            />
          </CollapsibleSection>
        </motion.div>

        {/* Additional Details */}
        {stopAlerts.length > 0 && (
          <motion.div variants={contentSectionVariants}>
            <div style={{marginBottom:"28px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
                <div style={{fontWeight:"bold",color:stop.accent,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase"}}>📌 Additional Details</div>
                <div style={{flex:1,height:"1px",background:stop.accent+"30"}}/>
              </div>
              {stopAlerts.map((a)=><AlertBox key={a.id} {...a}/>)}
            </div>
          </motion.div>
        )}

        <motion.div variants={contentSectionVariants}>
          <EditableItinerary
            stop={stop} data={data}
            confirms={confirms} onConfirm={setConfirm}
            itineraryOrder={itineraryOrder} customItems={customItems}
            timeOverrides={timeOverrides} reservationTimes={reservationTimes}
            setDayOrder={setDayOrder} moveItem={moveItem}
            addCustomItem={addCustomItem} deleteCustomItem={deleteCustomItem}
            initializeOrder={initializeOrder} setTimeOverride={setTimeOverride}
            setReservationTime={setReservationTime}
            scrollRef={scrollRef}
          />
        </motion.div>

        {/* Where to Eat */}
        <motion.div variants={contentSectionVariants}>
          {active==="barharbor" ? (
            <CollapsibleSection color={stop.accent} label="🍽️ Where to Eat" open={eatOpen} onToggle={()=>setEatOpen(v=>!v)}>
              <PlaceList places={restaurants} accent={stop.accent} onAddToItinerary={p=>setAddPlaceContext(p)}/>
            </CollapsibleSection>
          ) : (
            <div style={{marginBottom:"28px"}}>
              <SecHead label="🍽️ Where to Eat"/>
              <PlaceList places={restaurants} accent={stop.accent} onAddToItinerary={p=>setAddPlaceContext(p)}/>
            </div>
          )}
        </motion.div>

        {/* What to Do */}
        {activities.length > 0 && (
          <motion.div variants={contentSectionVariants}>
            {active==="barharbor" ? (
              <CollapsibleSection color={stop.accent} label="📍 What to Do" open={doOpen} onToggle={()=>setDoOpen(v=>!v)}>
                <PlaceList places={activities} accent={stop.accent} isActivities onAddToItinerary={p=>setAddPlaceContext(p)}/>
              </CollapsibleSection>
            ) : (
              <div style={{marginBottom:"28px"}}>
                <SecHead label="📍 What to Do"/>
                <PlaceList places={activities} accent={stop.accent} isActivities onAddToItinerary={p=>setAddPlaceContext(p)}/>
              </div>
            )}
          </motion.div>
        )}

        {/* What to Pack */}
        <motion.div variants={contentSectionVariants}>
          <WhatToPack accent={stop.accent} data={data} packing={packing} onPack={setPacking} onReset={resetPacking}/>
        </motion.div>

      </motion.div>

      <div style={{background:"#0D2B3E",color:"#A8C4D4",textAlign:"center",padding:"22px",fontSize:"0.8rem",letterSpacing:"0.05em"}}>
        Maine Coast · May 2026 · 🌊
      </div>
      </StopNavigator>
    </div>

    {/* Add to jernie — stop-scoped day picker */}
    <AddToItinerarySheet
      isOpen={!!addPlaceContext}
      onClose={()=>setAddPlaceContext(null)}
      place={addPlaceContext}
      allDays={data.itinerary_days}
      stops={data.stops}
      onAddPlace={(place, toDayId)=>{
        addCustomItem(toDayId, "", place.name + (place.note ? " — " + place.note : ""), place.id);
      }}
    />
    </>
  );
}
