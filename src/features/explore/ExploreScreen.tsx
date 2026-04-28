import React, { useState, useMemo, useRef, useEffect } from 'react';
import { navigation } from '../../navigation';
import type { FilterId } from '../../navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useTripData } from '../../hooks/useTripData';
import { usePlaceEnrichment } from '../../hooks/usePlaceEnrichment';
import { useSharedTripState } from '../../hooks/useSharedTripState';
import { useAddedPlaceIds } from '../../hooks/useAddedPlaceIds';
import type { Place, PlaceCategory } from '../../types';
import { PlaceCarousel } from './PlaceCarousel';
import { ExpandableSearch } from './ExpandableSearch';
import { ExplorePlaceList } from './ExplorePlaceList';
import type { SortKey } from './ExplorePlaceList';
import { AddToItinerarySheet } from '../../components/AddToItinerarySheet';
import { EntityDetailSheet } from '../entityDetail/EntityDetailSheet';
import { buildPlaceDetailConfig } from '../entityDetail/builders/buildPlaceDetailConfig';
import { buildHikeDetailConfig } from '../entityDetail/builders/buildHikeDetailConfig';
import type { SelectedEntity } from '../entityDetail/detailTypes';
import { Icons } from '../../design/icons';
import { Colors, Spacing, Typography, Radius, Animation, IconColors } from '../../design/tokens';

// ---------------------------------------------------------------------------
// Seeded shuffle — bucket changes every 4 hours so order is stable per session
// but rotates on the next app open after the window passes.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const TRIP_ID = import.meta.env.VITE_TRIP_ID ?? 'maine-2026';

// ---------------------------------------------------------------------------
// Carousel row definitions — static for now; AI-driven in Phase 2.
// ---------------------------------------------------------------------------
interface CarouselRow {
  id: string;
  label: string;
  filter: (p: Place) => boolean;
}

// Stacy's Finds is always pinned at the top; the remaining rows are shuffled.
const STACYS_FINDS_ROW: CarouselRow = {
  id: 'stacys-finds',
  label: "Stacy's Finds",
  filter: p => p.attribution_handle === 'stacy',
};

const SHUFFLEABLE_CAROUSEL_ROWS: CarouselRow[] = [
  { id: 'must-do',   label: 'Must Do',          filter: p => p.must },
  { id: 'eats',      label: 'Restaurants',      filter: p => p.category === 'restaurant' },
  { id: 'hikes',     label: 'Hikes',            filter: p => p.category === 'hike' },
  { id: 'water',     label: 'On the Water',     filter: p => p.subcategory === 'on-the-water' },
  { id: 'bars',      label: 'Bars & Drinks',    filter: p => p.category === 'bar' },
  { id: 'sights',    label: 'Sights & Culture', filter: p => (['attraction','sight','museum'] as PlaceCategory[]).includes(p.category) },
];

// ---------------------------------------------------------------------------
// Filter pill definitions
// ---------------------------------------------------------------------------

const FILTER_PILLS: { id: FilterId; label: string; icon?: React.ReactNode }[] = [
  { id: 'all',        label: 'All' },
  { id: 'restaurant', label: 'Eats',       icon: <Icons.Restaurant size={12} weight="duotone" color={IconColors.food} /> },
  { id: 'hike',       label: 'Hikes',      icon: <Icons.Hike size={12} weight="duotone" color={IconColors.nature} /> },
  { id: 'bar',        label: 'Bars',       icon: <Icons.Bar size={12} weight="duotone" color={IconColors.food} /> },
  { id: 'sights',     label: 'Sights',     icon: <Icons.Hotel size={12} weight="duotone" color={IconColors.activity} /> },
  { id: 'activity',   label: 'Activities', icon: <Icons.Theater size={12} weight="duotone" color={IconColors.activity} /> },
];

const FILTER_CATEGORIES: Record<FilterId, PlaceCategory[]> = {
  all:        [],
  restaurant: ['restaurant'],
  hike:       ['hike'],
  bar:        ['bar'],
  sights:     ['attraction', 'sight', 'museum'],
  activity:   ['activity'],
};

function matchesFilter(place: Place, filter: FilterId): boolean {
  if (filter === 'all') return true;
  return FILTER_CATEGORIES[filter].includes(place.category);
}

function pillStyle(active: boolean, accentColor: string): React.CSSProperties {
  return {
    flexShrink: 0,
    padding: `${Spacing.xs}px ${Spacing.md}px`,
    borderRadius: `${Radius.full}px`,
    border: `1px solid ${active ? accentColor : Colors.border}`,
    background: active ? accentColor : Colors.surface,
    color: active ? '#fff' : Colors.textSecondary,
    fontSize: `${Typography.size.xs + 1}px`,
    fontFamily: Typography.family,
    fontWeight: active ? Typography.weight.semibold : Typography.weight.regular,
    cursor: 'pointer',
    transition: `background 150ms ${Animation.easing.default}, color 150ms ${Animation.easing.default}, border-color 150ms ${Animation.easing.default}`,
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: Spacing.xs,
  };
}

// ---------------------------------------------------------------------------
// ExploreScreen
// ---------------------------------------------------------------------------
export function ExploreScreen() {
  const { data } = useTripData();
  const { addCustomItem, customItems } = useSharedTripState(TRIP_ID);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [activeStopId, setActiveStopId] = useState<string | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('rating');

  // Consume any deep link scheduled by Overview before this tab mounted
  useEffect(() => {
    const link = navigation.consumeExplore();
    if (!link) return;
    if (FILTER_CATEGORIES[link.filter]) setActiveFilter(link.filter);
    setActiveStopId(link.stopId ?? 'all');
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [addPlaceContext, setAddPlaceContext] = useState<Place | null>(null);

  const allPlaces = useMemo(() => data?.places ?? [], [data]);

  // Seed changes every 4 hours — stable within a session, rotates on next open.
  const shuffleSeed = useMemo(() => Math.floor(Date.now() / (4 * 3600 * 1000)), []);
  const stopMap = useMemo(() => {
    const map: Record<string, NonNullable<typeof data>['stops'][0]> = {};
    data?.stops.forEach(s => { map[s.id] = s; });
    return map;
  }, [data]);

  const enrichmentMap = usePlaceEnrichment(TRIP_ID, allPlaces);

  const detailConfig = useMemo(() => {
    if (!selectedEntity || !data) return null;
    const place = data.places.find(p => p.id === selectedEntity.id);
    if (!place) return null;
    const stop = stopMap[place.stop_id] ?? data.stops[0];
    return place.category === 'hike'
      ? buildHikeDetailConfig(place, stop, data.stops)
      : buildPlaceDetailConfig(place, stop, data.stops, enrichmentMap[place.id]);
  }, [selectedEntity, data, stopMap, enrichmentMap]);

  const addedPlaceIds = useAddedPlaceIds(data, customItems);

  const handlePlaceExpand = (place: Place, rect: DOMRect) => {
    setSelectedEntity({ kind: 'place', id: place.id, originRect: rect, accent: stopMap[place.stop_id]?.accent ?? Colors.navy });
  };

  // Filtered places for the All Places list
  const filteredPlaces = useMemo(() => {
    let list = allPlaces.filter(p =>
      matchesFilter(p, activeFilter) &&
      (activeStopId === 'all' || p.stop_id === activeStopId)
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.note?.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allPlaces, activeFilter, activeStopId, searchQuery]);

  // Stacy's Finds always first; remaining rows shuffled by 4-hour seed.
  // Cards within each row are also shuffled (seed offset by row index).
  const carouselRowData = useMemo(() => {
    const shuffledRows = seededShuffle(SHUFFLEABLE_CAROUSEL_ROWS, shuffleSeed);
    const allRows = [STACYS_FINDS_ROW, ...shuffledRows];
    return allRows.map((row, i) => ({
      ...row,
      places: seededShuffle(
        allPlaces.filter(p =>
          row.filter(p) &&
          matchesFilter(p, activeFilter) &&
          (activeStopId === 'all' || p.stop_id === activeStopId)
        ),
        shuffleSeed + i + 1
      ),
    }));
  }, [allPlaces, activeFilter, activeStopId, shuffleSeed]);

  const accent = data?.stops[0]?.accent ?? Colors.navy;

  const stopPillItems = useMemo(() => [
    { id: 'all', label: 'All Stops', emoji: '🗺️', accent },
    ...(data?.stops ?? []).map(s => ({ id: s.id, label: s.city, emoji: s.emoji, accent: s.accent })),
  ], [data?.stops, accent]);

  if (!data) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: Colors.background }}>
        <span style={{ color: Colors.textMuted, fontFamily: Typography.family, fontSize: `${Typography.size.sm}px` }}>
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: Colors.background, overflow: 'hidden' }}>
      {/* ── Sticky header ── */}
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
        {/* Title row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${Spacing.base}px ${Spacing.base}px ${Spacing.sm}px`,
        }}>
          <AnimatePresence mode="wait">
            {searchOpen ? (
              <motion.span
                key="searching"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                style={{
                  fontSize: `${Typography.size.xs + 1}px`,
                  color: Colors.textMuted,
                  fontFamily: Typography.family,
                }}
              >
                {filteredPlaces.length} result{filteredPlaces.length !== 1 ? 's' : ''}
              </motion.span>
            ) : (
              <motion.h1
                key="title"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                style={{
                  fontFamily: Typography.family,
                  fontWeight: Typography.weight.bold,
                  fontSize: `${Typography.size.xl}px`,
                  color: Colors.textPrimary,
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                Explore
              </motion.h1>
            )}
          </AnimatePresence>

          <ExpandableSearch
            onSearch={setSearchQuery}
            onOpen={setSearchOpen}
            placeholder="Search places…"
            width={220}
          />
        </div>

        {/* Filter pills */}
        <div style={{
          display: 'flex',
          gap: Spacing.xs,
          overflowX: 'auto',
          padding: `0 ${Spacing.base}px ${Spacing.sm}px`,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {FILTER_PILLS.map(pill => {
            const active = pill.id === activeFilter;
            return (
              <button key={pill.id} onClick={() => setActiveFilter(pill.id)} style={pillStyle(active, accent)}>
                {pill.icon && <span style={{ display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.75 }}>{pill.icon}</span>}
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Stop filter pills — dynamic from trip data, shown when trip has multiple stops */}
        {data.stops.length > 1 && (
          <div style={{ display: 'flex', gap: Spacing.xs, overflowX: 'auto', padding: `0 ${Spacing.base}px ${Spacing.sm}px`, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {stopPillItems.map(stop => {
              const active = activeStopId === stop.id;
              return (
                <button key={stop.id} onClick={() => setActiveStopId(stop.id)} style={pillStyle(active, stop.accent)}>
                  <span>{stop.emoji}</span>
                  {stop.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <AnimatePresence mode="wait">
          {searchOpen ? (
            /* Search results — full filtered list */
            <motion.div
              key="search-results"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: Animation.fm.easeOut }}
            >
              <ExplorePlaceList
                places={filteredPlaces}
                stopMap={stopMap}
                enrichmentMap={enrichmentMap}
                sort={sort}
                onSortChange={setSort}
                onExpand={handlePlaceExpand}
                onAddToItinerary={p => setAddPlaceContext(p)}
                addedPlaceIds={addedPlaceIds}
                scrollRoot={scrollRef}
              />
            </motion.div>
          ) : (
            /* Discover mode — carousels + all places list */
            <motion.div
              key="discover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {/* Carousels */}
              <div style={{ paddingTop: Spacing.base }}>
                {carouselRowData.map(row => {
                  if (row.places.length < 2) return null;
                  return (
                    <PlaceCarousel
                      key={row.id}
                      label={row.label}
                      places={row.places}
                      stopMap={stopMap}
                      enrichmentMap={enrichmentMap}
                      addedPlaceIds={addedPlaceIds}
                      onCardClick={handlePlaceExpand}
                      onAddToItinerary={p => setAddPlaceContext(p)}
                    />
                  );
                })}
              </div>

              {/* All Places list */}
              <ExplorePlaceList
                places={filteredPlaces}
                stopMap={stopMap}
                enrichmentMap={enrichmentMap}
                sort={sort}
                onSortChange={setSort}
                onExpand={handlePlaceExpand}
                onAddToItinerary={p => setAddPlaceContext(p)}
                addedPlaceIds={addedPlaceIds}
                scrollRoot={scrollRef}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add to itinerary — days scoped to place.stop_id (reuses existing sheet) */}
      <AddToItinerarySheet
        isOpen={!!addPlaceContext}
        onClose={() => setAddPlaceContext(null)}
        place={addPlaceContext}
        allDays={data.itinerary_days}
        stops={data.stops}
        onAddPlace={(place, dayId) =>
          addCustomItem(dayId, '', place.name + (place.note ? ' — ' + place.note : ''), place.id)
        }
      />

      {/* Entity detail sheet — expands from tapped card */}
      {detailConfig && selectedEntity && (
        <EntityDetailSheet
          isOpen={!!selectedEntity}
          originRect={selectedEntity.originRect}
          config={detailConfig}
          onClose={() => setSelectedEntity(null)}
          onAddToItinerary={(() => {
            const place = data.places.find(p => p.id === selectedEntity.id);
            return place ? () => setAddPlaceContext(place) : undefined;
          })()}
          isAdded={addedPlaceIds.has(selectedEntity.id)}
        />
      )}
    </div>
  );
}
