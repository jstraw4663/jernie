import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTripData } from '../../hooks/useTripData';
import { useSharedTripState } from '../../hooks/useSharedTripState';
import { usePlaceEnrichment } from '../../hooks/usePlaceEnrichment';
import { useTrailEnrichment } from '../../hooks/useTrailEnrichment';
import { useBookingEnrichment } from '../../hooks/useBookingEnrichment';
import { useAddedPlaceIds } from '../../hooks/useAddedPlaceIds';
import { EntityDetailSheet } from '../entityDetail/EntityDetailSheet';
import { buildPlaceDetailConfig } from '../entityDetail/builders/buildPlaceDetailConfig';
import { buildHikeDetailConfig } from '../entityDetail/builders/buildHikeDetailConfig';
import { buildFlightDetailConfig } from '../entityDetail/builders/buildFlightDetailConfig';
import { buildHotelDetailConfig } from '../entityDetail/builders/buildHotelDetailConfig';
import { buildRentalCarDetailConfig } from '../entityDetail/builders/buildRentalCarDetailConfig';
import { buildBookingDetailConfig } from '../entityDetail/builders/buildBookingDetailConfig';
import { AddToItinerarySheet } from '../../components/AddToItinerarySheet';
import { useNavigation } from '../../contexts/NavigationContext';
import { PlaceList } from '../../components/PlaceList';
import { ScrollReveal } from '../../components/ScrollReveal';
import { HotelGroupCard } from '../../components/HotelGroupCard';
import { FlightGroupCard } from '../../components/FlightGroupCard';
import { RentalCard } from '../../components/RentalCard';
import type { SelectedEntity } from '../entityDetail/detailTypes';
import type { Booking, Place, Stop } from '../../types';
import { deriveFlightGroups, findEntityInItinerary, isRentalCar } from '../../domain/trip';
import type { FlightStatus } from '../../domain/trip';
import { Icons } from '../../design/icons';
import { Colors, Spacing, Typography, Radius, TypeColors } from '../../design/tokens';
import { getStopTheme } from '../../contexts/TripThemeContext';
import { resolveStopColor } from '../../design/tripPacks';
import { PlaceIcon } from '../../components/PlaceIcon';
import { OverviewAnchorNav } from './OverviewAnchorNav';
import type { NavSection } from './OverviewAnchorNav';
import { OverviewSection } from './OverviewSection';
import {
  selectFlightBookings,
  groupFlightsByStop,
  groupAccommodationsByStop,
  selectRentalCars,
  groupRestaurantsByStop,
  groupActivitiesByStop,
} from './selectors';
import type { SectionId } from './selectors';

const TRIP_ID = import.meta.env.VITE_TRIP_ID ?? 'maine-2026';


// ---------------------------------------------------------------------------
// Sub-header for stop groups (restaurants + activities)
// ---------------------------------------------------------------------------
function StopGroupHeader({ stop }: { stop: Stop }) {
  const stopTheme = getStopTheme(TRIP_ID, stop.id);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    }}>
      <PlaceIcon emoji={stop.emoji} size={16} weight="regular" />
      <span style={{
        fontFamily: Typography.family.sans,
        fontWeight: Typography.weight.semibold,
        fontSize: `${Typography.size.sm}px`,
        color: stopTheme.cardHeading,
      }}>
        {stop.city}
      </span>
      <span style={{
        fontFamily: Typography.family.sans,
        fontSize: `${Typography.size.xs}px`,
        color: Colors.textMuted,
      }}>
        · {stop.dates}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OverviewScreen
// ---------------------------------------------------------------------------
export function OverviewScreen() {
  const { data, loading } = useTripData();
  const {
    customItems, addCustomItem,
    bookingOverrides, setBookingField,
    itineraryOrder,
  } = useSharedTripState(TRIP_ID);

  // Enrichment — all places / accommodations (not stop-scoped like Jernie tab)
  const allPlaces = useMemo(() => data?.places ?? [], [data]);
  const allAccommodations = useMemo(
    () => data?.bookings.filter(b => b.type === 'accommodation') ?? [],
    [data],
  );
  const { enrichmentMap, saveOverride } = usePlaceEnrichment(TRIP_ID, allPlaces);
  const trailEnrichmentMap = useTrailEnrichment(TRIP_ID, allPlaces);
  const { enrichmentMap: hotelEnrichmentMap, saveOverride: hotelSaveOverride } = useBookingEnrichment(TRIP_ID, allAccommodations);
  const addedPlaceIds = useAddedPlaceIds(data, customItems);

  // Flight status — read from localStorage cache written by Jernie tab
  const flightStatus = useMemo<Record<string, FlightStatus>>(() => {
    if (!data) return {};
    const result: Record<string, FlightStatus> = {};
    const groups = deriveFlightGroups(data.bookings);
    Object.keys(groups).forEach(dk => {
      try {
        const raw = localStorage.getItem('jernie_flights_' + dk);
        if (raw) {
          const cached = JSON.parse(raw) as { data: Record<string, FlightStatus> };
          if (cached.data) Object.assign(result, cached.data);
        }
      } catch { /* corrupted or missing cache entry — skip */ }
    });
    return result;
  }, [data]);

  // Grouped data via selectors
  const flightsByStop = useMemo(
    () => groupFlightsByStop(data?.bookings ?? [], data?.stops ?? []),
    [data],
  );
  const accomByStop = useMemo(
    () => groupAccommodationsByStop(data?.bookings ?? [], data?.stops ?? []),
    [data],
  );
  const rentalCars        = useMemo(() => selectRentalCars(data?.bookings ?? [], data?.stops ?? []), [data]);
  const restaurantGroups  = useMemo(() => groupRestaurantsByStop(data?.places ?? [], data?.stops ?? [], addedPlaceIds), [data, addedPlaceIds]);
  const activityGroups    = useMemo(() => groupActivitiesByStop(data?.places ?? [], data?.stops ?? [], addedPlaceIds), [data, addedPlaceIds]);

  // Flat flight count for anchor nav
  const totalFlights = useMemo(() => selectFlightBookings(data?.bookings ?? []).length, [data]);

  // Section counts for anchor nav
  const navSections = useMemo<NavSection[]>(() => [
    { id: 'flights',        icon: <Icons.Flight size={13} weight="duotone" />,   label: 'Flights',      count: totalFlights },
    { id: 'accommodations', icon: <Icons.Hotel size={13} weight="duotone" />,    label: 'Stays',        count: accomByStop.reduce((n, g) => n + g.bookings.length, 0) },
    { id: 'rental-car',     icon: <Icons.Car size={13} weight="duotone" />,      label: 'Rental Car',   count: rentalCars.length },
    { id: 'restaurants',    icon: <Icons.Restaurant size={13} weight="duotone" />, label: 'Restaurants',  count: restaurantGroups.reduce((n, g) => n + g.places.length, 0) },
    { id: 'activities',     icon: <Icons.Hike size={13} weight="duotone" />,     label: 'Activities',   count: activityGroups.reduce((n, g) => n + g.places.length, 0) },
  ], [totalFlights, accomByStop, rentalCars, restaurantGroups, activityGroups]);

  // Anchor nav scroll tracking
  const [activeSection, setActiveSection] = useState<SectionId>('flights');
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    flights:        null,
    accommodations: null,
    'rental-car':   null,
    restaurants:    null,
    activities:     null,
  });

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const topmost = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (topmost) setActiveSection(topmost.target.getAttribute('data-section-id') as SectionId);
      },
      { root: scrollEl, threshold: 0.15, rootMargin: '-60px 0px 0px 0px' },
    );
    const refs = sectionRefs.current;
    (Object.values(refs) as (HTMLDivElement | null)[]).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [data]);

  const scrollToSection = useCallback((id: SectionId) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const { navigateToExplore, navigateToJernie } = useNavigation();

  // Entity detail sheet
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

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

    let primaryBooking = booking;
    let returnBooking: Booking | null = null;
    if (isRentalCar(booking)) {
      if (booking.linked_booking_id) {
        const found = data.bookings.find(b => b.id === booking.linked_booking_id);
        if (found) { primaryBooking = found; returnBooking = booking; }
      } else {
        returnBooking = data.bookings.find(b => b.linked_booking_id === booking.id) ?? null;
      }
    }

    const bookingStop = data.stops.find(s => s.id === primaryBooking.stop_id) ?? data.stops[0];
    if (!bookingStop) return null;

    const mergedBooking: Booking = { ...primaryBooking, ...(bookingOverrides[primaryBooking.id] ?? {}) } as Booking;

    if (mergedBooking.type === 'flight') {
      const primaryId = mergedBooking.id;
      return buildFlightDetailConfig(
        mergedBooking, bookingStop, flightStatus,
        (legKey, value) => onLegAircraftChange(primaryId, legKey, value),
      );
    }
    if (mergedBooking.type === 'accommodation') {
      return buildHotelDetailConfig(mergedBooking, bookingStop, data.stops, onBookingChange, hotelEnrichmentMap[mergedBooking.id]);
    }
    if (isRentalCar(mergedBooking)) {
      return buildRentalCarDetailConfig(mergedBooking, bookingStop, data.stops, onBookingChange, returnBooking, !!booking.linked_booking_id);
    }
    return buildBookingDetailConfig(mergedBooking, bookingStop);
  }, [selectedEntity, data, onBookingChange, onLegAircraftChange, bookingOverrides, hotelEnrichmentMap, flightStatus, enrichmentMap, trailEnrichmentMap]);

  // Expand handlers
  const handlePlaceExpand = useCallback((place: Place, rect: DOMRect) => {
    const stop = data?.stops.find(s => s.id === place.stop_id);
    setSelectedEntity({ kind: 'place', id: place.id, originRect: rect, accent: resolveStopColor(stop) });
  }, [data]);

  const handleBookingExpand = useCallback((booking: Booking, rect: DOMRect) => {
    const stop = data?.stops.find(s => s.id === booking.stop_id);
    setSelectedEntity({ kind: 'booking', id: booking.id, originRect: rect, accent: resolveStopColor(stop) });
  }, [data]);

  // Add to itinerary sheet
  const [addPlaceContext, setAddPlaceContext] = useState<Place | null>(null);

  // ── Loading / error state ─────────────────────────────────────
  if (loading || !data) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: Colors.background }}>
        <span style={{ color: Colors.textMuted, fontFamily: Typography.family.sans, fontSize: `${Typography.size.sm}px` }}>
          Loading…
        </span>
      </div>
    );
  }

  const accent = resolveStopColor(data.stops[0]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: Colors.background, overflow: 'hidden' }}>

      {/* ── Sticky header ─────────────────────────────────────── */}
      <div
        data-sticky-nav
        style={{
          flexShrink: 0,
          background: Colors.background,
          borderBottom: `1px solid ${Colors.border}`,
          zIndex: 10,
        }}
      >
        {/* Notch / Dynamic Island spacer — same pattern as StickyHeader.tsx:90 */}
        <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: `${Spacing.base}px ${Spacing.base}px ${Spacing.sm}px`,
        }}>
          <h1 style={{
            margin: 0,
            fontFamily: Typography.family.sans,
            fontWeight: Typography.weight.bold,
            fontSize: `${Typography.size.xl}px`,
            color: Colors.textPrimary,
            lineHeight: 1,
          }}>
            Overview
          </h1>
        </div>

        <OverviewAnchorNav
          sections={navSections}
          activeSection={activeSection}
          onSectionTap={scrollToSection}
          accent={accent}
        />
      </div>

      {/* ── Scrollable content ────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', paddingTop: Spacing.xl, paddingBottom: Spacing.xxxl }}
      >

        {/* ── Flights ─────────────────────────────────────────── */}
        <OverviewSection
          id="flights"
          sectionRef={el => { sectionRefs.current.flights = el; }}
          icon={<Icons.Flight size={14} weight="duotone" color={TypeColors.flight} />}
          title="Flights"
          count={totalFlights}
          isEmpty={flightsByStop.length === 0}
          emptyIcon={<Icons.Flight size={36} weight="duotone" color={TypeColors.flight} />}
          emptyText="No flights added yet"
        >
          {flightsByStop.map((group, gi) => (
            <ScrollReveal key={group.stop.id} index={gi} root={scrollRef} margin="80px">
              <FlightGroupCard
                bookings={group.bookings.map(b => ({ ...b, ...(bookingOverrides[b.id] ?? {}) } as Booking))}
                stop={group.stop}
                groups={data.groups}
                flightStatus={flightStatus}
                onExpand={(b, rect) => handleBookingExpand(b, rect)}
              />
            </ScrollReveal>
          ))}
        </OverviewSection>

        {/* ── Accommodations ──────────────────────────────────── */}
        <OverviewSection
          id="accommodations"
          sectionRef={el => { sectionRefs.current.accommodations = el; }}
          icon={<Icons.Hotel size={14} weight="duotone" color={TypeColors.stay} />}
          title="Stays"
          count={accomByStop.reduce((n, g) => n + g.bookings.length, 0)}
          isEmpty={accomByStop.length === 0}
          emptyIcon={<Icons.Hotel size={36} weight="duotone" color={TypeColors.stay} />}
          emptyText="No accommodations added yet"
        >
          {accomByStop.map((group, gi) => (
            <ScrollReveal key={group.stop.id} index={gi} root={scrollRef} margin="80px">
              <HotelGroupCard
                bookings={group.bookings.map(b => ({ ...b, ...(bookingOverrides[b.id] ?? {}) } as Booking))}
                stop={group.stop}
                groups={data.groups}
                enrichmentMap={hotelEnrichmentMap}
                onExpand={(b: Booking, rect: DOMRect) => handleBookingExpand(b, rect)}
              />
            </ScrollReveal>
          ))}
        </OverviewSection>

        {/* ── Rental Car ──────────────────────────────────────── */}
        <OverviewSection
          id="rental-car"
          sectionRef={el => { sectionRefs.current['rental-car'] = el; }}
          icon={<Icons.Car size={14} weight="duotone" color={TypeColors.flight} />}
          title="Rental Car"
          count={rentalCars.length}
          isEmpty={rentalCars.length === 0}
          emptyIcon={<Icons.Car size={36} weight="duotone" color={TypeColors.flight} />}
          emptyText="No rental car added yet"
        >
          {rentalCars.map(({ booking }, i) => {
            const mergedBooking = { ...booking, ...(bookingOverrides[booking.id] ?? {}) } as Booking;
            const returnBooking = data.bookings.find(b => b.linked_booking_id === booking.id) ?? null;
            const mergedReturn = returnBooking
              ? { ...returnBooking, ...(bookingOverrides[returnBooking.id] ?? {}) } as Booking
              : null;
            const bookingStop = data.stops.find(s => s.id === booking.stop_id) ?? data.stops[0];
            return (
              <ScrollReveal key={booking.id} index={i} root={scrollRef} margin="80px">
                <RentalCard
                  booking={mergedBooking}
                  returnBooking={mergedReturn}
                  stop={bookingStop}
                  onExpand={(b, rect) => handleBookingExpand(b, rect)}
                />
              </ScrollReveal>
            );
          })}
        </OverviewSection>

        {/* ── Restaurants ─────────────────────────────────────── */}
        <OverviewSection
          id="restaurants"
          sectionRef={el => { sectionRefs.current.restaurants = el; }}
          icon={<Icons.Restaurant size={14} weight="duotone" color={TypeColors.food} />}
          title="Restaurants"
          count={restaurantGroups.reduce((n, g) => n + g.places.length, 0)}
          isEmpty={restaurantGroups.length === 0}
          emptyIcon={<Icons.Restaurant size={36} weight="duotone" color={TypeColors.food} />}
          emptyText="No restaurants yet"
          addLabel="Add restaurant"
          onAddNew={() => navigateToExplore({ filter: 'restaurant' })}
        >
          {restaurantGroups.map((group, gi) => (
            <div key={group.stop.id}>
              {restaurantGroups.length > 1 && (
                <div style={{ marginTop: gi > 0 ? Spacing.md : 0 }}>
                  <StopGroupHeader stop={group.stop} />
                </div>
              )}
              <PlaceList
                places={group.places}
                accent={resolveStopColor(group.stop)}
                enrichmentMap={enrichmentMap}
                trailEnrichmentMap={trailEnrichmentMap}
                isActivities={false}
                addedPlaceIds={addedPlaceIds}
                hideNote
                onAddToItinerary={p => setAddPlaceContext(p)}
                onExpand={handlePlaceExpand}
                scrollRoot={scrollRef}
                revealMargin="80px"
              />
              <button
                onClick={() => navigateToExplore({ filter: 'restaurant', stopId: group.stop.id })}
                style={{
                  width: '100%',
                  marginTop: Spacing.sm,
                  padding: `${Spacing.xs}px`,
                  border: `1px dashed ${Colors.border}`,
                  borderRadius: `${Radius.md}px`,
                  background: 'transparent',
                  color: Colors.textMuted,
                  fontFamily: Typography.family.sans,
                  fontSize: `${Typography.size.xs}px`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: Spacing.xs,
                }}
              >
                + Add to {group.stop.city} itinerary
              </button>
            </div>
          ))}
        </OverviewSection>

        {/* ── Activities ──────────────────────────────────────── */}
        <OverviewSection
          id="activities"
          sectionRef={el => { sectionRefs.current.activities = el; }}
          icon={<Icons.Hike size={14} weight="duotone" color={TypeColors.hike} />}
          title="Activities"
          count={activityGroups.reduce((n, g) => n + g.places.length, 0)}
          isEmpty={activityGroups.length === 0}
          emptyIcon={<Icons.Hike size={36} weight="duotone" color={TypeColors.hike} />}
          emptyText="No activities yet"
          addLabel="Add activity"
          onAddNew={() => navigateToExplore({ filter: 'activity' })}
        >
          {activityGroups.map((group, gi) => (
            <div key={group.stop.id}>
              {activityGroups.length > 1 && (
                <div style={{ marginTop: gi > 0 ? Spacing.md : 0 }}>
                  <StopGroupHeader stop={group.stop} />
                </div>
              )}
              <PlaceList
                places={group.places}
                accent={resolveStopColor(group.stop)}
                enrichmentMap={enrichmentMap}
                trailEnrichmentMap={trailEnrichmentMap}
                isActivities={true}
                addedPlaceIds={addedPlaceIds}
                hideNote
                onAddToItinerary={p => setAddPlaceContext(p)}
                onExpand={handlePlaceExpand}
                scrollRoot={scrollRef}
                revealMargin="80px"
              />
              <button
                onClick={() => navigateToExplore({ filter: 'activity', stopId: group.stop.id })}
                style={{
                  width: '100%',
                  marginTop: Spacing.sm,
                  padding: `${Spacing.xs}px`,
                  border: `1px dashed ${Colors.border}`,
                  borderRadius: `${Radius.md}px`,
                  background: 'transparent',
                  color: Colors.textMuted,
                  fontFamily: Typography.family.sans,
                  fontSize: `${Typography.size.xs}px`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: Spacing.xs,
                }}
              >
                + Add to {group.stop.city} itinerary
              </button>
            </div>
          ))}
        </OverviewSection>

      </div>{/* /scrollable */}

      {/* ── Add to itinerary sheet ─────────────────────────────── */}
      <AddToItinerarySheet
        isOpen={!!addPlaceContext}
        onClose={() => setAddPlaceContext(null)}
        place={addPlaceContext}
        allDays={data.itinerary_days}
        stops={data.stops}
        onAddPlace={(place, dayId) =>
          addCustomItem(dayId, '', place.name + (place.note ? ' — ' + place.note : ''), place.id, place.category)
        }
      />

      {/* ── Entity detail sheet ────────────────────────────────── */}
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
          isAdded={selectedEntity.kind === 'place' ? addedPlaceIds.has(selectedEntity.id) : false}
          onView={(() => {
            if (selectedEntity.kind !== 'place') return undefined;
            if (!addedPlaceIds.has(selectedEntity.id)) return undefined;
            const place = data.places.find(p => p.id === selectedEntity.id);
            if (!place) return undefined;
            return () => {
              const loc = findEntityInItinerary(
                place.id,
                data.itinerary_items,
                customItems,
                itineraryOrder,
                data.itinerary_days,
              );
              setSelectedEntity(null);
              navigateToJernie({
                stopId: loc?.stopId ?? place.stop_id,
                dayId: loc?.dayId,
                itemId: loc?.itemId,
              });
            };
          })()}
          onSaveOverride={selectedEntity.kind === 'booking' ? hotelSaveOverride : saveOverride}
        />
      )}

    </div>
  );
}
