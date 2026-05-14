import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAddedPlaceIds } from "./hooks/useAddedPlaceIds";
import { useTripData } from "./hooks/useTripData";
import { useSharedTripState } from "./hooks/useSharedTripState";
import { EditableItinerary } from "./components/EditableItinerary";
import { AddToItinerarySheet } from "./components/AddToItinerarySheet";
import { StickyHeader } from "./components/StickyHeader";
import { StopNavigator } from "./components/StopNavigator";
import type { Booking, Place } from "./types";
import { motion } from 'framer-motion';
import { Animation, Typography } from "./design/tokens";
import { TripThemeProvider } from "./contexts/TripThemeContext";
import { resolveStopColor } from "./design/tripPacks";
import { useNavigation } from "./contexts/NavigationContext";
import { navigation } from "./navigation";
import { ACTIVITY_CATEGORIES } from "./features/overview/selectors";
import { deriveFlightGroups, findEntityInItinerary, isWithinFlightWindow, isRentalCar } from "./domain/trip";
import type { FlightGroupEntry, FlightStatus } from "./domain/trip";
import { CollapsibleSection } from "./components/CollapsibleSection";
import { WeatherStrip } from "./components/WeatherStrip";
import { PlaceList } from "./components/PlaceList";
import { AlertBox, LegSummary, SecHead, TravelSection } from "./components/TravelSection";
import { WhatToPack } from "./components/WhatToPack";
import type { SelectedEntity } from "./features/entityDetail/detailTypes";
import { EntityDetailSheet } from "./features/entityDetail/EntityDetailSheet";
import { buildPlaceDetailConfig } from "./features/entityDetail/builders/buildPlaceDetailConfig";
import { usePlaceEnrichment } from "./hooks/usePlaceEnrichment";
import { useTrailEnrichment } from "./hooks/useTrailEnrichment";
import { useBookingEnrichment } from "./hooks/useBookingEnrichment";
import { useWeatherEnrichment } from "./hooks/useWeatherEnrichment";
import { readCache, writeCache } from "./utils/cache";
import { useConnectivityState } from "./contexts/ConnectivityContext";
import { buildHikeDetailConfig } from "./features/entityDetail/builders/buildHikeDetailConfig";
import { buildFlightDetailConfig } from "./features/entityDetail/builders/buildFlightDetailConfig";
import { buildBookingDetailConfig } from "./features/entityDetail/builders/buildBookingDetailConfig";
import { buildHotelDetailConfig } from "./features/entityDetail/builders/buildHotelDetailConfig";
import { buildRentalCarDetailConfig } from "./features/entityDetail/builders/buildRentalCarDetailConfig";

const FLIGHT_STATUS_URL: string = import.meta.env.VITE_FLIGHT_STATUS_URL ?? "/.netlify/functions/flight-status";

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

type StatusSetter = (fn: (prev: Record<string, FlightStatus>) => Record<string, FlightStatus>) => void;
type DateSetter   = (fn: (prev: Record<string, Date>) => Record<string, Date>) => void;

async function fetchFlightStatusGroupWithData(
  dateKey: string,
  flights: FlightGroupEntry[],
  setStatus: StatusSetter,
  setLoading: (b: boolean) => void,
  setLastUpdated: DateSetter,
): Promise<void> {
  if (flights.length === 0) { setLoading(false); return; }
  setLoading(true);
  const cacheKey = "jernie_flights_" + dateKey;

  const MAX_FLIGHT_CACHE_AGE_MS = 72 * 60 * 60 * 1000; // 72hr — clear stale post-trip data
  if (!navigator.onLine) {
    const cached = readCache<Record<string, FlightStatus>>(cacheKey);
    const valid = cached && (Date.now() - cached.cachedAt) < MAX_FLIGHT_CACHE_AGE_MS;
    if (valid) setStatus(prev => ({ ...prev, ...cached!.data }));
    setLastUpdated(prev => ({ ...prev, [dateKey]: valid ? new Date(cached!.cachedAt) : new Date() }));
    setLoading(false);
    return;
  }

  try {
    const resp = await fetch(FLIGHT_STATUS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Token": import.meta.env.VITE_APP_SECRET ?? "",
      },
      body: JSON.stringify({ flights }),
    });
    if (!resp.ok) throw new Error("proxy error");
    const map = await resp.json() as Record<string, FlightStatus>;
    writeCache(cacheKey, map);
    setStatus(prev => ({ ...prev, ...map }));
  } catch {
    const cached = readCache<Record<string, FlightStatus>>(cacheKey);
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
    transition: { type: 'spring' as const, ...Animation.springs.gentle },
  },
};

// ── Countdown component ───────────────────────────────────────

function ExploreMoreButton({ label, onClick, accent }: { label: string; onClick: () => void; accent: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', marginTop: '12px',
        padding: '10px', border: `1px dashed ${accent}55`,
        borderRadius: '8px', background: 'transparent',
        color: accent, fontFamily: Typography.family.sans,
        fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center',
      }}
    >
      Explore more {label} →
    </button>
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

// ── Main ──────────────────────────────────────────────────────
// PinGate + session management live in AppShell (src/components/AppShell.tsx).
// MaineGuide is a pure trip-content screen; it renders unconditionally.

export default function MaineGuide() {
  const { data, loading, error } = useTripData();
  // VITE_TRIP_ID separates dev and prod Firebase paths (both use the same project).
  // Local: "dev-maine-2026" (set in .env.development.local)
  // Prod:  "maine-2026" (set in Netlify environment variables)
  // Phase 2: replace with trip ID from router when multi-trip support is added.
  const tripId: string = import.meta.env.VITE_TRIP_ID ?? "maine-2026";
  const { confirms, packing, setConfirm, setPacking, resetPacking,
          itineraryOrder, customItems, timeOverrides, textOverrides, reservationTimes, initializeOrder, initializeConfirms, setDayOrder, moveItem,
          addCustomItem, deleteCustomItem, clearItemState, setTimeOverride, setTextOverride, setReservationTime, updateCustomItem,
          setBookingField, bookingOverrides } = useSharedTripState(tripId);
  const addedPlaceIds = useAddedPlaceIds(data, customItems, itineraryOrder);
  const { isOnline } = useConnectivityState();
  const { navigateToExplore } = useNavigation();
  const onExploreMore = useCallback(() => navigateToExplore({ filter: 'all' }), [navigateToExplore]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const confirmsSeededRef = useRef(false);
  const ACTIVE_STOP_KEY = "jernie_active_stop";
  const [active, setActive] = useState(() => {
    try { return localStorage.getItem(ACTIVE_STOP_KEY) || "portland"; } catch { return "portland"; }
  });
  const handleSetActive = (id: string) => {
    try { localStorage.setItem(ACTIVE_STOP_KEY, id); } catch { /* storage unavailable */ }
    setActive(id);
  };
  const { weather: weatherData, cachedAtMap: weatherCachedAtMap } = useWeatherEnrichment(tripId, data?.stops ?? []);
  const [flightStatus, setFlightStatus] = useState<Record<string, FlightStatus>>({});
  const [flightLoading, setFlightLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Record<string, Date>>({});
  const [travelOpen, setTravelOpen] = useState(true);
  const [eatOpen, setEatOpen] = useState(true);
  const [doOpen, setDoOpen] = useState(true);
  const [addPlaceContext, setAddPlaceContext] = useState<Place|null>(null);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [requestOpenDayId, setRequestOpenDayId] = useState<string | null>(null);
  const [requestScrollToItemId, setRequestScrollToItemId] = useState<string | null>(null);
  // Memoized so useCountdown's [departure] dependency stays stable — prevents interval churn
  // Must be at top level (before early returns) to satisfy Rules of Hooks
  const departure = useMemo(() => data ? new Date(data.trip.departure) : null, [data?.trip?.departure]);

  // Consume any "View in Jernie" signal scheduled from another tab (e.g. Explore).
  // Runs once on mount — by then the tab transition has started and we wait a beat
  // for it to land before applying the stop switch + day open.
  useEffect(() => {
    const link = navigation.consumeJernie();
    if (!link) return;
    setTimeout(() => {
      if (link.stopId) handleSetActive(link.stopId);
      if (link.dayId) {
        const needsSwitch = link.stopId && link.stopId !== active;
        setTimeout(() => {
          setRequestOpenDayId(link.dayId!);
          if (link.itemId) setRequestScrollToItemId(link.itemId);
        }, needsSwitch ? 600 : 210);
      }
    }, 420);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable callback for hotel/rental car field mutations.
  // For linked rental cars, resolves the primary booking ID so both the pickup and
  // return cards always write to the same Firebase path.
  const onBookingChange = useCallback(
    (field: keyof Booking, value: string | null | boolean | Record<string, string | null>) => {
      if (!selectedEntity || !data) return;
      const tapped = data.bookings.find(b => b.id === selectedEntity.id);
      const primaryId = tapped?.linked_booking_id ?? selectedEntity.id;
      setBookingField(primaryId, field, value);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedEntity?.id, setBookingField, data],
  );

  const onLegAircraftChange = useCallback(
    (bookingId: string, legKey: string, value: string | null) => {
      const current = (bookingOverrides[bookingId]?.aircraft_types ?? {}) as Record<string, string | null>;
      setBookingField(bookingId, 'aircraft_types', { ...current, [legKey]: value });
    },
    [setBookingField, bookingOverrides],
  );

  // Eagerly enrich all places and accommodations on first load so detail cards
  // are cache-warm regardless of which stop the user navigates to first.
  // Must be before early returns (Rules of Hooks); safe to call with [].
  const allPlaces = data?.places ?? [];
  const allAccommodations = data?.bookings.filter(b => b.type === 'accommodation') ?? [];
  const { enrichmentMap, saveOverride } = usePlaceEnrichment(tripId, allPlaces);
  const trailEnrichmentMap = useTrailEnrichment(tripId, allPlaces);
  const { enrichmentMap: hotelEnrichmentMap, saveOverride: hotelSaveOverride } = useBookingEnrichment(tripId, allAccommodations);

  // Derive DetailConfig for entity detail sheet. Must be before early returns (Rules of Hooks).
  const detailConfig = useMemo(() => {
    if (!selectedEntity || !data) return null;

    if (selectedEntity.kind === 'place') {
      const place = data.places.find(p => p.id === selectedEntity.id);
      if (!place) return null;
      const placeStop = data.stops.find(s => s.id === place.stop_id) ?? data.stops[0];
      if (!placeStop) return null;
      return place.category === 'hike'
        ? buildHikeDetailConfig(place, placeStop, data.stops, trailEnrichmentMap[place.id], enrichmentMap[place.id])
        : buildPlaceDetailConfig(place, placeStop, data.stops, enrichmentMap[place.id]);
    }

    const booking = data.bookings.find(b => b.id === selectedEntity.id);
    if (!booking) return null;

    // For linked rental cars: resolve which booking is primary (pickup) and which is
    // return (secondary). Both cards open the same unified detail sheet; Firebase
    // overrides are always keyed to the primary booking's ID.
    let primaryBooking = booking;
    let returnBooking: Booking | null = null;
    if (isRentalCar(booking)) {
      if (booking.linked_booking_id) {
        // Tapped the return card — find and use the primary
        const found = data.bookings.find(b => b.id === booking.linked_booking_id);
        if (found) { primaryBooking = found; returnBooking = booking; }
      } else {
        // Tapped the pickup card — find the return card if one exists
        returnBooking = data.bookings.find(b => b.linked_booking_id === booking.id) ?? null;
      }
    }

    const bookingStop = data.stops.find(s => s.id === primaryBooking.stop_id) ?? data.stops[0];
    if (!bookingStop) return null;

    // Merge Firebase overrides onto the primary booking
    const mergedBooking: Booking = { ...primaryBooking, ...(bookingOverrides[primaryBooking.id] ?? {}) } as Booking;

    if (mergedBooking.type === 'flight') {
      const primaryId = mergedBooking.id;
      return buildFlightDetailConfig(
        mergedBooking, bookingStop, flightStatus,
        (legKey, value) => onLegAircraftChange(primaryId, legKey, value),
      );
    }
    if (mergedBooking.type === 'accommodation') return buildHotelDetailConfig(mergedBooking, bookingStop, data.stops, onBookingChange, hotelEnrichmentMap[mergedBooking.id]);
    if (isRentalCar(mergedBooking))             return buildRentalCarDetailConfig(mergedBooking, bookingStop, data.stops, onBookingChange, returnBooking, !!booking.linked_booking_id);
    return buildBookingDetailConfig(mergedBooking, bookingStop);
  }, [selectedEntity, data, onBookingChange, onLegAircraftChange, bookingOverrides, hotelEnrichmentMap, flightStatus, enrichmentMap, trailEnrichmentMap]);

  // Seed flight status from cache then fetch if within window
  useEffect(() => {
    if (!data) return;

    const MAX_FLIGHT_CACHE_AGE_MS = 72 * 60 * 60 * 1000;
    const flightInit: Record<string, FlightStatus> = {};
    const lastUpdatedInit: Record<string, Date> = {};
    const groups = deriveFlightGroups(data.bookings);
    Object.keys(groups).forEach(dk => {
      const c = readCache<Record<string, FlightStatus>>("jernie_flights_" + dk);
      if (c && (Date.now() - c.cachedAt) < MAX_FLIGHT_CACHE_AGE_MS) {
        Object.assign(flightInit, c.data);
        lastUpdatedInit[dk] = new Date(c.cachedAt);
      }
    });
    setFlightStatus(flightInit);
    setLastUpdated(lastUpdatedInit);
    Object.entries(groups).forEach(([dateKey, group]) => {
      if (isWithinFlightWindow(dateKey, group.flights)) {
        fetchFlightStatusGroupWithData(dateKey, group.flights, setFlightStatus, setFlightLoading, setLastUpdated);
      }
    });
  }, [data]);

  // Seed RTDB confirms for editorially-locked items once per session.
  // get() reads authoritative RTDB before writing, so existing user values are never touched.
  useEffect(() => {
    if (!data || confirmsSeededRef.current) return;
    confirmsSeededRef.current = true;
    initializeConfirms(data.itinerary_items);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    setTravelOpen(true);
    setEatOpen(true);
    setDoOpen(true);
  }, [active]);

  if (loading || !data) {
    return (
      <div style={{fontFamily:Typography.family.serif,background:"#F5F0E8",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",color:"#888"}}>
          <div style={{fontSize:"2rem",marginBottom:"12px"}}>🦞</div>
          <div style={{fontSize:"0.9rem",fontStyle:"italic"}}>Loading your trip…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{fontFamily:Typography.family.sans,background:"#F5F0E8",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
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
  // Derive accent from tripPacks — single source of truth for all stop colors.
  // Components using useTripTheme() read from context; prop-drilled components get stopAccent.
  const stopAccent = resolveStopColor(stop);
  const stopBookings = data.bookings.filter(b => b.stop_id === active);
  const stopPlaces = data.places.filter(p => p.stop_id === active);
  const stopAlerts = data.alerts.filter(a => a.stop_id === active);
  const restaurants = stopPlaces.filter(p => p.category === "restaurant" && !addedPlaceIds.has(p.id)).slice(0, 5);
  const activities = stopPlaces.filter(p => ACTIVITY_CATEGORIES.has(p.category) && !addedPlaceIds.has(p.id)).slice(0, 5);
  const hasFlights = stopBookings.some(b => b.type === "flight");

  // Plain functions — not hooks, so safe after early returns. stopAccent is stable per stop.
  const handlePlaceExpand = (place: Place, rect: DOMRect) => {
    setSelectedEntity({ kind: 'place', id: place.id, originRect: rect, accent: stopAccent });
  };

  const handleBookingExpand = (booking: Booking, rect: DOMRect) => {
    setSelectedEntity({ kind: 'booking', id: booking.id, originRect: rect, accent: stopAccent });
  };

  const handleView = (() => {
    if (selectedEntity?.kind !== 'place') return undefined;
    const place = data.places.find(p => p.id === selectedEntity.id);
    if (!place || !addedPlaceIds.has(place.id)) return undefined;
    return () => {
      const loc = findEntityInItinerary(
        place.id,
        data.itinerary_items,
        customItems,
        itineraryOrder,
        data.itinerary_days,
      );
      const targetStopId = loc?.stopId ?? place.stop_id;
      const needsSwitch = targetStopId !== active;

      setSelectedEntity(null);

      if (loc?.dayId) {
        if (needsSwitch) {
          setTimeout(() => handleSetActive(targetStopId), 130);
          setTimeout(() => {
            setRequestOpenDayId(loc.dayId!);
            if (loc.itemId) setRequestScrollToItemId(loc.itemId);
          }, 680);
        } else {
          setTimeout(() => {
            setRequestOpenDayId(loc.dayId!);
            if (loc.itemId) setRequestScrollToItemId(loc.itemId);
          }, 420);
        }
      }
    };
  })();

  return (
    <TripThemeProvider tripId="maine" stopId={active}>
    <>
    <div
      ref={scrollRef}
      style={{fontFamily:Typography.family.sans,background:"#F5F0E8",color:"#1a1a1a",position:"absolute",inset:0,overflowY:"auto",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain"}}
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
          <WeatherStrip stop={stop} weatherData={weatherData} cachedAt={weatherCachedAtMap[stop.id]} />
        </motion.div>

        {/* Travel & Accommodations */}
        <motion.div variants={contentSectionVariants}>
          <CollapsibleSection
            color={stopAccent}
            label="Travel & Accommodations"
            open={travelOpen}
            onToggle={()=>setTravelOpen(v=>!v)}
            rightSlot={hasFlights&&(
              <button onClick={(e)=>{
                e.stopPropagation();
                if (!isOnline) return;
                const groups = deriveFlightGroups(stopBookings);
                Object.entries(groups).forEach(([dk, g]) => {
                  fetchFlightStatusGroupWithData(dk, g.flights, setFlightStatus, setFlightLoading, setLastUpdated);
                });
              }} disabled={flightLoading || !isOnline}
                style={{background:"transparent",border:"1px solid "+stopAccent+"50",borderRadius:"6px",padding:"3px 10px",fontSize:"0.72rem",color:stopAccent,cursor:(flightLoading||!isOnline)?"default":"pointer",opacity:(flightLoading||!isOnline)?0.5:1,fontFamily:Typography.family.sans}}>
                {flightLoading?"Checking…":(!isOnline?"Offline":"↻ Refresh")}
              </button>
            )}
          >
            <TravelSection
              stop={stop}
              stopBookings={stopBookings}
              allBookings={data.bookings}
              groups={data.groups}
              flightStatus={flightStatus}
              flightLoading={flightLoading}
              onBookingExpand={handleBookingExpand}
              hotelEnrichmentMap={hotelEnrichmentMap}
              flightLastUpdated={lastUpdated}
            />
          </CollapsibleSection>
        </motion.div>

        {/* Additional Details */}
        {stopAlerts.length > 0 && (
          <motion.div variants={contentSectionVariants}>
            <div style={{marginBottom:"28px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
                <div style={{fontWeight:"bold",color:stopAccent,fontSize:"0.78rem",letterSpacing:"0.12em",textTransform:"uppercase"}}>Additional Details</div>
                <div style={{flex:1,height:"1px",background:stopAccent+"30"}}/>
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
            timeOverrides={timeOverrides} textOverrides={textOverrides}
            reservationTimes={reservationTimes}
            setReservationTime={setReservationTime}
            setDayOrder={setDayOrder} moveItem={moveItem}
            addCustomItem={addCustomItem} deleteCustomItem={deleteCustomItem} clearItemState={clearItemState}
            initializeOrder={initializeOrder}
            setTimeOverride={setTimeOverride} setTextOverride={setTextOverride}
            updateCustomItem={updateCustomItem}
            scrollRef={scrollRef}
            onExpandPlace={handlePlaceExpand}
            onExpandBooking={handleBookingExpand}
            requestOpenDayId={requestOpenDayId}
            onRequestOpenDayConsumed={() => setRequestOpenDayId(null)}
            requestScrollToItemId={requestScrollToItemId}
            onRequestScrollToItemConsumed={() => setRequestScrollToItemId(null)}
          />
        </motion.div>

        {/* Where to Eat */}
        <motion.div variants={contentSectionVariants}>
          {active==="barharbor" ? (
            <CollapsibleSection color={stopAccent} label="Where to Eat" open={eatOpen} onToggle={()=>setEatOpen(v=>!v)}>
              <PlaceList places={restaurants} accent={stopAccent} enrichmentMap={enrichmentMap} onAddToItinerary={p=>setAddPlaceContext(p)} onExpand={handlePlaceExpand} addedPlaceIds={addedPlaceIds}/>
              <ExploreMoreButton label="restaurants" onClick={onExploreMore} accent={stopAccent}/>
            </CollapsibleSection>
          ) : (
            <div style={{marginBottom:"28px"}}>
              <SecHead label="Where to Eat"/>
              <PlaceList places={restaurants} accent={stopAccent} enrichmentMap={enrichmentMap} onAddToItinerary={p=>setAddPlaceContext(p)} onExpand={handlePlaceExpand} addedPlaceIds={addedPlaceIds}/>
              <ExploreMoreButton label="restaurants" onClick={onExploreMore} accent={stopAccent}/>
            </div>
          )}
        </motion.div>

        {/* What to Do */}
        {activities.length > 0 && (
          <motion.div variants={contentSectionVariants}>
            {active==="barharbor" ? (
              <CollapsibleSection color={stopAccent} label="What to Do" open={doOpen} onToggle={()=>setDoOpen(v=>!v)}>
                <PlaceList places={activities} accent={stopAccent} enrichmentMap={enrichmentMap} trailEnrichmentMap={trailEnrichmentMap} isActivities onAddToItinerary={p=>setAddPlaceContext(p)} onExpand={handlePlaceExpand} addedPlaceIds={addedPlaceIds}/>
                <ExploreMoreButton label="activities" onClick={onExploreMore} accent={stopAccent}/>
              </CollapsibleSection>
            ) : (
              <div style={{marginBottom:"28px"}}>
                <SecHead label="What to Do"/>
                <PlaceList places={activities} accent={stopAccent} enrichmentMap={enrichmentMap} trailEnrichmentMap={trailEnrichmentMap} isActivities onAddToItinerary={p=>setAddPlaceContext(p)} onExpand={handlePlaceExpand} addedPlaceIds={addedPlaceIds}/>
                <ExploreMoreButton label="activities" onClick={onExploreMore} accent={stopAccent}/>
              </div>
            )}
          </motion.div>
        )}

        {/* What to Pack */}
        <motion.div variants={contentSectionVariants}>
          <WhatToPack accent={stopAccent} data={data} packing={packing} onPack={setPacking} onReset={resetPacking}/>
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
        addCustomItem(toDayId, "", place.name + (place.note ? " — " + place.note : ""), place.id, place.category);
      }}
    />

    {/* Entity detail sheet — expands from tapped card origin rect to fullscreen */}
    {detailConfig && selectedEntity && (
      <EntityDetailSheet
        isOpen={!!selectedEntity}
        originRect={selectedEntity.originRect}
        config={detailConfig}
        onClose={() => setSelectedEntity(null)}
        onAddToItinerary={(() => {
          if (selectedEntity.kind !== 'place') return undefined;
          const place = data.places.find(p => p.id === selectedEntity.id);
          return place ? () => setAddPlaceContext(place) : undefined;
        })()}
        isAdded={selectedEntity.kind === 'place' && addedPlaceIds.has(selectedEntity.id)}
        onView={handleView}
        onSaveOverride={selectedEntity.kind === 'booking' ? hotelSaveOverride : saveOverride}
      />
    )}
    </>
    </TripThemeProvider>
  );
}
