// PLATFORM BOUNDARY: @dnd-kit is web-only.
// Expo migration: replace DndContext/SortableContext/useDroppable with
// react-native-reanimated + react-native-gesture-handler.
// All props and Firebase state are platform-agnostic.

import { useState, useEffect, useRef, useMemo, Fragment, type RefObject } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, closestCenter,
  useDroppable,
  type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Stop, TripData, ItineraryItem, CustomItem, Place, Booking, PlaceCategory } from "../types";
import { DayPickerModal } from "./DayPickerModal";
import { BottomSheet } from "./BottomSheet";
import { SelectableListItem } from "./SelectableListItem";
import { ActionBar } from "./ActionBar";
import { ConfirmDialog } from "./ConfirmDialog";
import { DayCard } from "./DayCard";
import { ItineraryItem as ItineraryItemRow } from "./ItineraryItem";
import { Icons, CATEGORY_ICON_MAP } from '../design/icons';
import { EntryIcon } from '../design/EntryIcon';
import { Animation, Colors, Core, Spacing, Typography } from "../design/tokens";
import { TimelineItem } from "./TimelineItem";
import { ItineraryItemDetailSheet } from "./ItineraryItemDetailSheet";
import { findPlaceForItem } from "../domain/trip";

type ResolvedItem = (ItineraryItem & { _isCustom: false }) | (CustomItem & { _isCustom: true });

interface AddFormState {
  dayId: string;
  time: string;
  text: string;
  category: PlaceCategory | '';
}

const CATEGORY_OPTIONS: { value: PlaceCategory | ''; label: string }[] = [
  { value: '',           label: 'Type (optional)' },
  { value: 'attraction', label: 'Attraction' },
  { value: 'bar',        label: 'Bar' },
  { value: 'beach',      label: 'Beach' },
  { value: 'hike',       label: 'Hike' },
  { value: 'museum',     label: 'Museum' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'shop',       label: 'Shop' },
  { value: 'sight',      label: 'Sight' },
  { value: 'other',      label: 'Other' },
];

interface EditableItineraryProps {
  stop: Stop;
  data: TripData;
  confirms: Record<string, boolean>;
  onConfirm: (id: string, value: boolean) => void;
  itineraryOrder: Record<string, string[]>;
  customItems: Record<string, CustomItem>;
  timeOverrides: Record<string, string>;
  textOverrides: Record<string, string>;
  setDayOrder: (dayId: string, orderedIds: string[]) => void;
  moveItem: (itemId: string, fromDayId: string, toDayId: string, insertAtIndex: number) => void;
  addCustomItem: (dayId: string, time: string, text: string, sourcePlaceId: string | null, category?: PlaceCategory) => void;
  deleteCustomItem: (itemId: string, dayId: string) => void;
  initializeOrder: (days: TripData["itinerary_days"], items: TripData["itinerary_items"]) => void;
  setTimeOverride: (itemId: string, time: string) => void;
  setTextOverride: (itemId: string, text: string) => void;
  updateCustomItem: (id: string, patch: Partial<Pick<CustomItem, 'text' | 'time' | 'category' | 'addr'>>) => void;
  reservationTimes: Record<string, string>;
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Open entity detail (place card or booking card) — handled in Jernie-PWA */
  onExpandPlace: (place: Place, rect: DOMRect) => void;
  onExpandBooking: (booking: Booking, rect: DOMRect) => void;
  /** When set, scroll to and expand that day accordion (consumed once then cleared) */
  requestOpenDayId?: string | null;
  onRequestOpenDayConsumed?: () => void;
  /** When set, scroll to the specific item within the open accordion and pulse it */
  requestScrollToItemId?: string | null;
  onRequestScrollToItemConsumed?: () => void;
}

// ── Time inference helpers ─────────────────────────────────────

const SOFT_TIMES: [string, number][] = [
  ["Early Morning",   330],  // ~5:30 AM
  ["Morning",         510],  // ~8:30 AM
  ["Mid-Morning",     570],  // ~9:30 AM
  ["Late Morning",    630],  // ~10:30 AM
  ["Noon",            720],  // 12:00 PM
  ["Early Afternoon", 780],  // ~1:00 PM
  ["Afternoon",       840],  // ~2:00 PM
  ["Mid-Afternoon",   900],  // ~3:00 PM
  ["Late Afternoon", 1020],  // ~5:00 PM
  ["Golden Hour",    1080],  // ~6:00 PM
  ["Early Evening",  1110],  // ~6:30 PM
  ["Evening",        1200],  // ~8:00 PM
];

function toMinutes(t: string): number | null {
  if (!t) return null;
  // Soft label lookup (case-insensitive)
  const lower = t.toLowerCase();
  for (const [label, mins] of SOFT_TIMES) {
    if (label.toLowerCase() === lower) return mins;
  }
  // Clock parse fallback — strip leading ~, trailing emoji/words
  const cleaned = t.replace(/^~/, "").replace(/[^ -~]/gu, "").replace(/\b(sharp)\b/gi, "").trim();
  const m = cleaned.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

function minutesToSoftLabel(mins: number): string {
  let closest = SOFT_TIMES[0][0];
  let minDist = Math.abs(mins - SOFT_TIMES[0][1]);
  for (const [label, mid] of SOFT_TIMES) {
    const dist = Math.abs(mins - mid);
    if (dist < minDist) { minDist = dist; closest = label; }
  }
  return closest;
}

function inferSoftTime(prevTime: string | null | undefined, nextTime: string | null | undefined): string {
  const prevMins = prevTime ? toMinutes(prevTime) : null;
  const nextMins = nextTime ? toMinutes(nextTime) : null;
  if (prevMins !== null && nextMins !== null) return minutesToSoftLabel((prevMins + nextMins) / 2);
  if (prevMins !== null) return minutesToSoftLabel(prevMins + 90);
  if (nextMins !== null) return minutesToSoftLabel(Math.max(nextMins - 90, 0));
  return "";
}

// ── Slot grouping ─────────────────────────────────────────────────

type SlotId = 'morning' | 'midmorning' | 'earlyafternoon' | 'lateafternoon' | 'evening';

const SLOT_LABELS: Record<SlotId, string> = {
  morning:        'Morning',
  midmorning:     'Mid-morning',
  earlyafternoon: 'Early afternoon',
  lateafternoon:  'Late afternoon',
  evening:        'Evening',
};

const SLOT_BOUNDARIES: [SlotId, number][] = [
  ['morning',        0],
  ['midmorning',   570],   // 9:30 AM
  ['earlyafternoon', 660], // 11:00 AM
  ['lateafternoon',  840], // 2:00 PM
  ['evening',       1050], // 5:30 PM
];

function assignSlot(displayTime: string): SlotId {
  const mins = toMinutes(displayTime);
  if (mins === null) return 'morning';
  let slot: SlotId = 'morning';
  for (const [id, threshold] of SLOT_BOUNDARIES) {
    if (mins >= threshold) slot = id;
  }
  return slot;
}

const SLOT_ORDER: SlotId[] = ['morning', 'midmorning', 'earlyafternoon', 'lateafternoon', 'evening'];

function findSlotForId(id: string, groups: Record<SlotId, string[]>): SlotId | null {
  for (const slot of SLOT_ORDER) {
    if (groups[slot].includes(id)) return slot;
  }
  return null;
}

// SPINE_X / NODE_SIZE mirror the consts in TimelineItem.tsx — keep in sync.
const SPINE_X = 26;
const NODE_SIZE = 36;

function SlotHeader({ label, paddingLeft = SPINE_X - NODE_SIZE / 2 }: { label: string; paddingLeft?: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      paddingLeft,
      paddingTop: 10,
      paddingBottom: 4,
    }}>
      <span style={{
        display: 'inline-block',
        height: 28,
        padding: '0 12px',
        lineHeight: '28px',
        borderRadius: 999,
        background: Core.surfaceMuted,
        color: Core.textFaint,
        fontSize: `${Typography.size.xs}px`,
        fontWeight: Typography.weight.semibold,
        fontFamily: Typography.family.sans,
        letterSpacing: '0.04em',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1,
        height: 1,
        marginLeft: 8,
        marginRight: 4,
        background: Core.surfaceMuted,
        borderRadius: 1,
      }} />
    </div>
  );
}

// ── DroppableDay — makes collapsed day headers register as drop targets ──

function DroppableDay({ dayId, children }: { dayId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "day-drop-" + dayId, data: { dayId } });
  return (
    <div ref={setNodeRef} style={{ background: isOver ? "rgba(0,0,0,0.015)" : "transparent", transition: "background 0.15s" }}>
      {children}
    </div>
  );
}

function DroppableSlotZone({ slotId }: { slotId: SlotId }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-drop-${slotId}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        height: 40,
        borderRadius: 8,
        border: `1.5px dashed ${isOver ? Core.textFaint : Core.surfaceMuted}`,
        background: isOver ? Core.surfaceMuted : 'transparent',
        transition: 'border-color 0.15s, background 0.15s',
        margin: '2px 0 6px',
      }}
    />
  );
}

// TimeLabel and ItemContent replaced by TimelineItem component.

// ── SortableItem ──────────────────────────────────────────────
// Inline read-only view. Long press triggers Edit Mode BottomSheet.
// Drag reorder now lives inside the sheet (Bundle 3).

function SortableItem({ item, accent, isLocked, onLongPress, displayTime, reservationTime, tripPhase, index, isLast, animate, resolvedPlace, textOverride, onConfirm, onSetTime, onOpenDetail, onTapCard, isPulsing, itemRef }: {
  item: ResolvedItem; accent: string;
  isLocked: boolean;
  onLongPress?: () => void;
  displayTime: string;
  reservationTime: string;
  tripPhase: 'pre-trip' | 'on-trip';
  index: number;
  isLast: boolean;
  animate: boolean;
  resolvedPlace: Place | null;
  textOverride?: string;
  onConfirm?: (value: boolean) => void;
  onSetTime?: (time: string) => void;
  onOpenDetail: () => void;
  onTapCard?: (rect: DOMRect) => void;
  isPulsing?: boolean;
  itemRef?: (el: HTMLDivElement | null) => void;
}) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: true, // Inline drag disabled — editing happens in the BottomSheet
    data: { item },
  });

  return (
    <div
      ref={(el) => { setNodeRef(el); itemRef?.(el); }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <ItineraryItemRow onLongPress={onLongPress} isLocked={isLocked}>
        <TimelineItem
          item={item}
          accent={accent}
          isConfirmed={isLocked}
          isCustom={item._isCustom}
          displayTime={displayTime}
          reservationTime={reservationTime}
          tripPhase={tripPhase}
          index={index}
          animate={animate}
          isLast={isLast}
          resolvedPlace={resolvedPlace}
          textOverride={textOverride}
          onConfirm={onConfirm}
          onSetTime={onSetTime}
          onOpenDetail={onOpenDetail}
          onTapCard={onTapCard}
          isPulsing={isPulsing}
        />
      </ItineraryItemRow>
    </div>
  );
}

// ── SheetSortableItem — SelectableListItem + @dnd-kit sortable for the sheet ─
// Wraps SelectableListItem so the drag handle gets @dnd-kit listeners while
// keeping SelectableListItem's API platform-agnostic.

function SheetSortableItem({ item, isSelected, isLocked, isDragDisabled, onToggleSelect, displayTime, accent }: {
  item: ResolvedItem;
  isSelected: boolean;
  /** Lock icon shown, item cannot be selected/deleted/moved to another day */
  isLocked: boolean;
  /** Drag handle hidden; item cannot be reordered */
  isDragDisabled: boolean;
  onToggleSelect: () => void;
  displayTime: string;
  accent: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isDragDisabled,
    data: { item },
  });

  const categoryIconEntry = !item._isCustom
    ? CATEGORY_ICON_MAP[(item as ItineraryItem).category ?? ''] ?? undefined
    : undefined;
  const categoryIcon = categoryIconEntry
    ? <EntryIcon entry={categoryIconEntry} size={Typography.size.sm} />
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <SelectableListItem
        id={item.id}
        time={displayTime}
        label={item.text}
        isSelected={isSelected}
        isLocked={isLocked}
        showDragHandle={!isDragDisabled}
        onToggleSelect={onToggleSelect}
        dragListeners={listeners}
        dragAttributes={attributes}
        accent={accent}
        categoryIcon={categoryIcon}
      />
    </div>
  );
}

// ── EditableItinerary ────────────────────────────────────────

export function EditableItinerary({
  stop, data, confirms, onConfirm,
  itineraryOrder, customItems, timeOverrides, textOverrides, reservationTimes,
  setDayOrder, moveItem, addCustomItem, deleteCustomItem, initializeOrder,
  setTimeOverride, setTextOverride, updateCustomItem,
  scrollRef, onExpandPlace, onExpandBooking,
  requestOpenDayId, onRequestOpenDayConsumed,
  requestScrollToItemId, onRequestScrollToItemConsumed,
}: EditableItineraryProps) {
  const [openDay, setOpenDay] = useState(0);
  // Kept in a ref so the requestOpenDayId effect always sees the current value
  // without needing to re-run whenever openDay changes.
  const openDayRef = useRef(0);
  // Refs for each DayCard — used to scroll the header into view on expand.
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Refs for each timeline item — used to scroll to and pulse the target item.
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [pulsingItemId, setPulsingItemId] = useState<string | null>(null);
  // Tracks stop IDs that have already played their entrance stagger.
  // isFirstVisit is captured once at mount via useState so it never flips mid-lifecycle.
  // If it were recalculated from the ref on every render, the first post-mount re-render
  // (Firebase event, data update) would flip it false and remove whileInView from
  // DayCards before the IntersectionObserver fires — leaving below-fold cards at opacity:0.
  const seenStops = useRef(new Set<string>());
  const [isFirstVisit] = useState(() => !seenStops.current.has(stop.id));
  // Pending rAF IDs and switch timeout — cancelled on remount or rapid tap
  const pendingRafsRef = useRef<number[]>([]);
  const switchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<AddFormState | null>(null);
  const [showMovePicker, setShowMovePicker] = useState(false);

  // Edit Mode state — ephemeral UI state, not persisted to Firebase
  const [editModeDay, setEditModeDay] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [confirmMode, setConfirmMode] = useState<'delete' | 'exit' | null>(null);
  const [liveGroups, setLiveGroups] = useState<Record<SlotId, string[]> | null>(null);
  const liveGroupsRef = useRef<Record<SlotId, string[]> | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializingRef = useRef(false);

  // Detail sheet state — null when closed
  const [detailState, setDetailState] = useState<{
    item: ResolvedItem;
    resolvedPlace: Place | null;
  } | null>(null);

  const tripPhase = useMemo<'pre-trip' | 'on-trip'>(
    () => new Date() >= new Date(data.trip.departure) ? 'on-trip' : 'pre-trip',
    [data.trip.departure],
  );

  const days = data.itinerary_days.filter(d => d.stop_id === stop.id);

  // Keep openDayRef in sync so the requestOpenDayId effect never has a stale read.
  useEffect(() => { openDayRef.current = openDay; });

  // When a "View" navigation arrives, scroll to and expand the target day accordion.
  // `days` is in the dep array so the effect re-runs once the new stop's days have
  // loaded — this fixes the case where the stop switch happens just before the
  // requestOpenDayId fires and the day list is still the old stop's list.
  useEffect(() => {
    if (!requestOpenDayId || !days.length) return;

    const di = days.findIndex(d => d.id === requestOpenDayId);
    if (di === -1) return;

    // Consume immediately so the parent clears the prop after we've read it.
    onRequestOpenDayConsumed?.();

    const scrollEl = scrollRef.current;
    const card = cardRefs.current[requestOpenDayId];
    const currentOpenDay = openDayRef.current;

    pendingRafsRef.current.forEach(id => cancelAnimationFrame(id));
    pendingRafsRef.current = [];
    if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);

    const doScrollAndOpen = () => {
      // Re-read card here — may have re-rendered since the effect fired.
      const liveCard = cardRefs.current[requestOpenDayId] ?? card;
      if (scrollEl && liveCard) {
        const navEl = document.querySelector('[data-sticky-nav]') as HTMLElement | null;
        const navHeight = (navEl ? navEl.offsetHeight : 120) + 16;
        const containerTop = scrollEl.getBoundingClientRect().top;
        const cardTop = liveCard.getBoundingClientRect().top;
        const targetTop = scrollEl.scrollTop + (cardTop - containerTop) - navHeight;
        scrollEl.style.overflowAnchor = 'none';
        scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        const wait = (n: number) => {
          if (n <= 0) {
            scrollEl.style.overflowAnchor = '';
            setOpenDay(di);
            return;
          }
          pendingRafsRef.current.push(requestAnimationFrame(() => wait(n - 1)));
        };
        wait(Animation.mountFrames);
      } else {
        setOpenDay(di);
      }
    };

    if (di === currentOpenDay) {
      // Already open — just smooth-scroll to it
      const liveCard = cardRefs.current[requestOpenDayId] ?? card;
      if (scrollEl && liveCard) {
        const navEl = document.querySelector('[data-sticky-nav]') as HTMLElement | null;
        const navHeight = (navEl ? navEl.offsetHeight : 120) + 16;
        const containerTop = scrollEl.getBoundingClientRect().top;
        const cardTop = liveCard.getBoundingClientRect().top;
        const targetTop = scrollEl.scrollTop + (cardTop - containerTop) - navHeight;
        scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
    } else if (currentOpenDay !== -1) {
      setOpenDay(-1);
      switchTimeoutRef.current = setTimeout(doScrollAndOpen, 500);
    } else {
      doScrollAndOpen();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestOpenDayId, days]);

  // After the day accordion opens, scroll to the specific item and pulse it.
  // Waits 900ms to allow the DayCard spring to fully settle before measuring.
  useEffect(() => {
    if (!requestScrollToItemId) return;
    onRequestScrollToItemConsumed?.();
    const captured = requestScrollToItemId;

    const timer = setTimeout(() => {
      const scrollEl = scrollRef.current;
      const itemEl = itemRefs.current[captured];
      if (scrollEl && itemEl) {
        const navEl = document.querySelector('[data-sticky-nav]') as HTMLElement | null;
        const navHeight = (navEl ? navEl.offsetHeight : 120) + 32;
        const containerTop = scrollEl.getBoundingClientRect().top;
        const itemTop = itemEl.getBoundingClientRect().top;
        const targetTop = scrollEl.scrollTop + (itemTop - containerTop) - navHeight;
        scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
      setPulsingItemId(captured);
      setTimeout(() => setPulsingItemId(null), 1400);
    }, 900);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestScrollToItemId]);

  // Mark this stop as seen after first render (not during render) so isFirstVisit
  // is stable for the entire render pass and all DayCards get the same value.
  useEffect(() => { seenStops.current.add(stop.id); }, [stop.id]);

  // Cancel pending rAFs and switch timeout on unmount.
  useEffect(() => () => {
    pendingRafsRef.current.forEach(id => cancelAnimationFrame(id));
    if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
  }, []);

  // Initialization guard — write Firebase order from trip.json once
  useEffect(() => {
    if (!data || isInitializingRef.current) return;
    const hasSomeOrder = data.itinerary_days.some(d => itineraryOrder[d.id] !== undefined);
    if (!hasSomeOrder) {
      isInitializingRef.current = true;
      initializeOrder(data.itinerary_days, data.itinerary_items);
    }
  }, [data, itineraryOrder]);

  // Resolve ordered items for a day: Firebase order is canonical
  function resolveOrderedItems(dayId: string): ResolvedItem[] {
    const order = itineraryOrder[dayId];
    if (!order || order.length === 0) {
      return data.itinerary_items
        .filter(it => it.day_id === dayId)
        .map(it => ({ ...it, _isCustom: false as const }));
    }
    return order.map(id => {
      if (id.startsWith("custom-")) {
        const ci = customItems[id];
        return ci ? { ...ci, _isCustom: true as const } : null;
      }
      const it = data.itinerary_items.find(x => x.id === id);
      return it ? { ...it, _isCustom: false as const } : null;
    }).filter(Boolean) as ResolvedItem[];
  }

  // Find which day an item belongs to (searches all days across all stops)
  function findItemDay(itemId: string): string | null {
    for (const dayId of Object.keys(itineraryOrder)) {
      if ((itineraryOrder[dayId] || []).includes(itemId)) return dayId;
    }
    return null;
  }

  // Compute display time: override wins, then stored time
  function getDisplayTime(item: ResolvedItem): string {
    return timeOverrides[item.id] ?? item.time ?? "";
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
    setActiveDayId(findItemDay(event.active.id as string));
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over?.id as string | undefined;
    if (!overId) return;

    let hoverDayId: string | null = null;
    if (overId.startsWith("day-drop-")) {
      hoverDayId = overId.replace("day-drop-", "");
    } else {
      hoverDayId = findItemDay(overId);
    }
    if (!hoverDayId) return;

    const dayIndex = days.findIndex(d => d.id === hoverDayId);
    if (dayIndex !== -1 && dayIndex !== openDay) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => setOpenDay(dayIndex), 500);
    } else {
      // Hovering over current open day — cancel any pending expand
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const { active, over } = event;
    const fromDayId = activeDayId;
    setActiveId(null);
    setActiveDayId(null);

    if (!over || !fromDayId) return;

    const activeItemId = active.id as string;
    const overId = over.id as string;

    let toDayId: string | null = null;
    if (overId.startsWith("day-drop-")) {
      toDayId = overId.replace("day-drop-", "");
    } else {
      toDayId = findItemDay(overId);
    }
    if (!toDayId) return;

    if (toDayId === fromDayId) {
      // Same-day reorder
      const order = itineraryOrder[fromDayId] || [];
      const oldIndex = order.indexOf(activeItemId);
      const newIndex = order.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove([...order], oldIndex, newIndex);
        setDayOrder(fromDayId, newOrder);
        // Infer new time from neighbors in the new order
        const resolvedBefore = resolveOrderedItems(fromDayId);
        const prevItem = resolvedBefore[newIndex > oldIndex ? newIndex : newIndex - 1];
        const nextItem = resolvedBefore[newIndex > oldIndex ? newIndex + 1 : newIndex];
        const inferred = inferSoftTime(prevItem ? getDisplayTime(prevItem) : null, nextItem ? getDisplayTime(nextItem) : null);
        if (inferred) setTimeOverride(activeItemId, inferred);
      }
    } else {
      // Cross-day move — append to end if dropped on zone, else insert at position
      let insertIndex: number;
      if (overId.startsWith("day-drop-")) {
        insertIndex = Infinity;
      } else {
        const toOrder = itineraryOrder[toDayId] || [];
        const idx = toOrder.indexOf(overId);
        insertIndex = idx === -1 ? Infinity : idx;
      }
      moveItem(activeItemId, fromDayId, toDayId, insertIndex);
      // Infer time after cross-day move
      const destItems = resolveOrderedItems(toDayId);
      const insertAt = insertIndex === Infinity ? destItems.length : insertIndex;
      const prevItem = destItems[insertAt - 1];
      const nextItem = destItems[insertAt];
      const inferred = inferSoftTime(prevItem ? getDisplayTime(prevItem) : null, nextItem ? getDisplayTime(nextItem) : null);
      if (inferred) setTimeOverride(activeItemId, inferred);
    }
  }

  // Derived edit mode items — reflects pendingOrder if a reorder is in progress
  const baseEditItems = useMemo(
    () => editModeDay ? resolveOrderedItems(editModeDay) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editModeDay, itineraryOrder, customItems, data.itinerary_items]
  );
  const editDay = useMemo(
    () => editModeDay ? days.find(d => d.id === editModeDay) ?? null : null,
    [editModeDay, days]
  );
  const editItems = useMemo<ResolvedItem[]>(
    () => pendingOrder
      ? pendingOrder.map(id => baseEditItems.find(i => i.id === id)).filter((i): i is ResolvedItem => !!i)
      : baseEditItems,
    [pendingOrder, baseEditItems]
  );
  const editItemsById = useMemo(
    () => new Map(editItems.map(i => [i.id, i])),
    [editItems]
  );

  function closeEditMode() {
    setEditModeDay(null);
    setSelectedItems(new Set());
    setPendingOrder(null);
    setConfirmMode(null);
    setShowMovePicker(false);
  }

  // Called by checkmark button and swipe-down — checks for unsaved reorder
  function handleRequestClose() {
    if (pendingOrder !== null) {
      setConfirmMode('exit');
    } else {
      closeEditMode();
    }
  }

  function toggleItem(itemId: string) {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function handleSheetDragStart(_event: DragStartEvent) {
    const groups: Record<SlotId, string[]> = { morning: [], midmorning: [], earlyafternoon: [], lateafternoon: [], evening: [] };
    for (const item of editItems) {
      groups[assignSlot(getDisplayTime(item))].push(item.id);
    }
    liveGroupsRef.current = groups;
    setLiveGroups(groups);
  }

  function handleSheetDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    setLiveGroups(prev => {
      if (!prev) return null;
      const activeSlot = findSlotForId(activeId, prev);
      if (!activeSlot) return prev;

      // Drop onto an empty slot's droppable zone
      if (overId.startsWith('slot-drop-')) {
        const overSlot = overId.replace('slot-drop-', '') as SlotId;
        if (activeSlot === overSlot) return prev;
        const next = {
          ...prev,
          [activeSlot]: prev[activeSlot].filter(id => id !== activeId),
          [overSlot]: [activeId, ...prev[overSlot]],
        };
        liveGroupsRef.current = next;
        return next;
      }

      const overSlot = findSlotForId(overId, prev);
      if (!overSlot) return prev;

      let next: Record<SlotId, string[]>;
      if (activeSlot === overSlot) {
        const slot = prev[activeSlot];
        const oldIdx = slot.indexOf(activeId);
        const newIdx = slot.indexOf(overId);
        if (oldIdx === newIdx) return prev;
        next = { ...prev, [activeSlot]: arrayMove(slot, oldIdx, newIdx) };
      } else {
        const fromArr = prev[activeSlot].filter(id => id !== activeId);
        const toArr = [...prev[overSlot]];
        const overIdx = toArr.indexOf(overId);
        toArr.splice(overIdx === -1 ? toArr.length : overIdx, 0, activeId);
        next = { ...prev, [activeSlot]: fromArr, [overSlot]: toArr };
      }
      liveGroupsRef.current = next;
      return next;
    });
  }

  function handleSheetDragEnd(event: DragEndEvent) {
    const activeId = event.active.id as string;
    const finalGroups = liveGroupsRef.current;
    liveGroupsRef.current = null;
    setLiveGroups(null);

    if (!finalGroups || !editModeDay) return;

    const newOrder = SLOT_ORDER.flatMap(s => finalGroups[s]);
    setPendingOrder(newOrder);

    const movedItem = editItems.find(i => i.id === activeId);
    if (movedItem) {
      const originalSlot = assignSlot(getDisplayTime(movedItem));
      const newSlot = findSlotForId(activeId, finalGroups);
      if (newSlot && newSlot !== originalSlot) {
        setTimeOverride(activeId, SLOT_LABELS[newSlot]);
      }
    }
  }

  function handleDeleteConfirmed() {
    editItems.forEach(item => {
      if (selectedItems.has(item.id) && editModeDay) {
        deleteCustomItem(item.id, editModeDay);
      }
    });
    setConfirmMode(null);
    setSelectedItems(new Set());
  }

  function handleExitSave() {
    if (editModeDay && pendingOrder) setDayOrder(editModeDay, pendingOrder);
    closeEditMode();
  }

  // Stop-scoping: all sheet items are from one day = one stop (size always ≤ 1).
  // Multi-stop guard is here for future-proofing when cross-stop edits are added.
  const selectedStopIds = useMemo(
    () => editDay ? new Set([editDay.stop_id]) : new Set<string>(),
    [editDay]
  );
  const moveDisabledReason = useMemo(
    () => selectedStopIds.size > 1 ? "Selected items span multiple stops" : undefined,
    [selectedStopIds]
  );

  function deleteItem(item: ResolvedItem) {
    const dayId = item.day_id;
    if (item._isCustom) {
      deleteCustomItem(item.id, dayId);
    } else {
      setDayOrder(dayId, (itineraryOrder[dayId] || []).filter(id => id !== item.id));
    }
  }

  function handleMoveItems(toDayId: string) {
    if (!editModeDay) return;
    selectedItems.forEach(itemId => {
      moveItem(itemId, editModeDay, toDayId, Infinity);
    });
    closeEditMode();
  }

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    if (activeId.startsWith("custom-")) {
      const ci = customItems[activeId];
      return ci ? { ...ci, _isCustom: true as const } : null;
    }
    const it = data.itinerary_items.find(x => x.id === activeId);
    return it ? { ...it, _isCustom: false as const } : null;
  }, [activeId, customItems, data.itinerary_items]);

  return (
    <>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div style={{ fontWeight: "bold", color: stop.accent, fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", display: 'flex', alignItems: 'center', gap: 5 }}><Icons.Calendar size={14} weight="duotone" color={stop.accent} /> Daily Itinerary</div>
          <div style={{ flex: 1, height: "1px", background: stop.accent + "30" }} />
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {days.map((day, di) => {
              const items = resolveOrderedItems(day.id);
              const isOpen = openDay === di;
              return (
                <DroppableDay key={day.id} dayId={day.id}>
                  <DayCard
                    ref={el => { cardRefs.current[day.id] = el; }}
                    day={day}
                    accent={stop.accent}
                    isOpen={isOpen}
                    onToggle={() => {
                      if (isOpen) { setOpenDay(-1); return; }
                      const scrollEl = scrollRef.current;
                      const card = cardRefs.current[day.id];

                      // Cancel any in-flight rAFs or switch timeout from a prior tap.
                      pendingRafsRef.current.forEach(id => cancelAnimationFrame(id));
                      pendingRafsRef.current = [];
                      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);

                      // Scroll card header to just below sticky nav, disable overflow-anchor
                      // so iOS doesn't "correct" our position during Framer Motion's
                      // height:auto measurement, then wait mountFrames rAFs before expanding.
                      const doScrollAndOpen = () => {
                        if (scrollEl && card) {
                          const navEl = document.querySelector('[data-sticky-nav]') as HTMLElement | null;
                          const navHeight = (navEl ? navEl.offsetHeight : 120) + 16;
                          const containerTop = scrollEl.getBoundingClientRect().top;
                          const cardTop = card.getBoundingClientRect().top;
                          const targetTop = scrollEl.scrollTop + (cardTop - containerTop) - navHeight;
                          scrollEl.style.overflowAnchor = 'none';
                          scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
                          const wait = (n: number) => {
                            if (n <= 0) {
                              scrollEl.style.overflowAnchor = '';
                              setOpenDay(di);
                              return;
                            }
                            pendingRafsRef.current.push(requestAnimationFrame(() => wait(n - 1)));
                          };
                          wait(Animation.mountFrames);
                        } else {
                          setOpenDay(di);
                        }
                      };

                      if (openDay !== -1) {
                        // Another card is open — collapse it first and wait for
                        // springs.lazy to settle so layout is stable before measuring.
                        setOpenDay(-1);
                        switchTimeoutRef.current = setTimeout(doScrollAndOpen, 400);
                      } else {
                        doScrollAndOpen();
                      }
                    }}
                    shouldAnimate={isFirstVisit}
                  >
                    {(() => {
                      const sortedItems = [...items].sort((a, b) => {
                        const am = toMinutes(getDisplayTime(a));
                        const bm = toMinutes(getDisplayTime(b));
                        if (am === null && bm === null) return 0;
                        if (am === null) return -1;
                        if (bm === null) return 1;
                        return am - bm;
                      });
                      return (
                        <SortableContext items={sortedItems.map(it => it.id)} strategy={verticalListSortingStrategy}>
                          {sortedItems.map((item, ii) => {
                            const isItemLocked = confirms[item.id] || (!item._isCustom && !!(item as ItineraryItem).locked);
                            const itemPlace = findPlaceForItem(item, data.places);
                            const itemBooking = !item._isCustom && (item as ItineraryItem).booking_id
                              ? data.bookings.find(b => b.id === (item as ItineraryItem).booking_id) ?? null
                              : null;
                            const displayTimeForSlot = getDisplayTime(item);
                            const onTapCard = itemPlace
                              ? (rect: DOMRect) => onExpandPlace(itemPlace, rect)
                              : itemBooking
                                ? (rect: DOMRect) => onExpandBooking(itemBooking, rect)
                                : () => setDetailState({ item, resolvedPlace: null });
                            const slot = assignSlot(displayTimeForSlot);
                            const prevSlot = ii > 0 ? assignSlot(getDisplayTime(sortedItems[ii - 1])) : null;
                            const showSlotHeader = slot !== prevSlot;
                            return (
                              <Fragment key={item.id}>
                                {showSlotHeader && <SlotHeader label={SLOT_LABELS[slot]} />}
                                <SortableItem
                                  item={item} accent={stop.accent}
                                  isLocked={isItemLocked}
                                  tripPhase={tripPhase}
                                  index={ii}
                                  isLast={ii === sortedItems.length - 1}
                                  animate={isFirstVisit}
                                  onLongPress={() => {
                                    setEditModeDay(day.id);
                                    setSelectedItems(new Set([item.id]));
                                  }}
                                  displayTime={displayTimeForSlot}
                                  reservationTime={reservationTimes[item.id] || ""}
                                  resolvedPlace={itemPlace}
                                  textOverride={textOverrides[item.id]}
                                  onConfirm={(value) => onConfirm(item.id, value)}
                                  onSetTime={(time) => setTimeOverride(item.id, time)}
                                  onOpenDetail={() => setDetailState({ item, resolvedPlace: itemPlace })}
                                  onTapCard={onTapCard}
                                  isPulsing={pulsingItemId === item.id}
                                  itemRef={el => { itemRefs.current[item.id] = el; }}
                                />
                              </Fragment>
                            );
                          })}
                        </SortableContext>
                      );
                    })()}

                    {/* Inline add form */}
                    {addForm?.dayId === day.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", paddingTop: "10px", borderTop: `1px dashed ${Colors.border}` }}>
                        {/* Row 1: time + category */}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input
                            placeholder="Time (optional)"
                            value={addForm.time}
                            onChange={e => setAddForm(f => f ? { ...f, time: e.target.value } : f)}
                            style={{ flex: 1, fontSize: "0.8rem", padding: "6px 8px", border: `1px solid ${Colors.border}`, borderRadius: "6px", fontFamily: Typography.family.sans, minWidth: 0 }}
                          />
                          <select
                            value={addForm.category}
                            onChange={e => setAddForm(f => f ? { ...f, category: e.target.value as PlaceCategory | '' } : f)}
                            style={{ flex: 1, fontSize: "0.8rem", padding: "6px 8px", border: `1px solid ${Colors.border}`, borderRadius: "6px", fontFamily: Typography.family.sans, background: "#fff", color: addForm.category ? Colors.textPrimary : Colors.textMuted, minWidth: 0, cursor: "pointer" }}
                          >
                            {CATEGORY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        {/* Row 2: text + buttons */}
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input
                            autoFocus
                            placeholder="Add item…"
                            value={addForm.text}
                            onChange={e => setAddForm(f => f ? { ...f, text: e.target.value } : f)}
                            onKeyDown={e => {
                              if (e.key === "Enter" && addForm.text.trim()) {
                                addCustomItem(day.id, addForm.time, addForm.text.trim(), null, addForm.category || undefined);
                                setAddForm(null);
                              }
                              if (e.key === "Escape") setAddForm(null);
                            }}
                            style={{ flex: 1, fontSize: "0.8rem", padding: "6px 8px", border: `1px solid ${Colors.border}`, borderRadius: "6px", fontFamily: Typography.family.sans }}
                          />
                          <button
                            onClick={() => {
                              if (addForm.text.trim()) addCustomItem(day.id, addForm.time, addForm.text.trim(), null, addForm.category || undefined);
                              setAddForm(null);
                            }}
                            style={{ background: stop.accent, color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontFamily: Typography.family.sans, flexShrink: 0 }}
                          >Add</button>
                          <button
                            onClick={() => setAddForm(null)}
                            style={{ background: "transparent", color: Colors.textMuted, border: `1px solid ${Colors.border}`, borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontSize: "0.8rem", fontFamily: Typography.family.sans, flexShrink: 0 }}
                          >✕</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddForm({ dayId: day.id, time: "", text: "", category: "" })}
                        style={{
                          marginTop: "10px", background: "transparent", border: "1px dashed " + stop.accent + "50",
                          borderRadius: "6px", padding: "6px 14px", cursor: "pointer",
                          fontSize: "0.75rem", color: stop.accent + "99", fontFamily: Typography.family.sans,
                          display: "flex", alignItems: "center", gap: "5px",
                        }}
                      >+ Add item</button>
                    )}
                  </DayCard>
                </DroppableDay>
              );
            })}
          </div>

          <DragOverlay>
            {activeItem && (
              <div style={{
                background: Colors.surface, borderRadius: "8px", padding: "10px 14px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)", opacity: 0.95,
              }}>
                <TimelineItem
                  item={activeItem}
                  accent={stop.accent}
                  isConfirmed={false}
                  isCustom={activeItem._isCustom}
                  displayTime={getDisplayTime(activeItem)}
                  reservationTime=""
                  tripPhase={tripPhase}
                  index={0}
                  animate={false}
                  isLast={true}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Edit Mode BottomSheet */}
      <BottomSheet
        isOpen={!!editModeDay && !showMovePicker}
        onRequestClose={handleRequestClose}
        title={editDay ? `${editDay.date} · ${editDay.label}` : ""}
        headerRight={
          <button
            onClick={handleRequestClose}
            aria-label="Done"
            style={{
              width: 36, height: 36,
              border: "none", borderRadius: "50%",
              background: Colors.navy,
              color: Colors.textInverse,
              fontSize: 18, lineHeight: 1,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontFamily: Typography.family.sans,
            }}
          >
            ✓
          </button>
        }
        footer={
          <div style={{ position: "relative" }}>
            <ConfirmDialog
              isVisible={confirmMode === 'delete'}
              message={`Delete ${selectedItems.size} selected item${selectedItems.size !== 1 ? "s" : ""}?`}
              confirmLabel="Delete"
              cancelLabel="Keep"
              variant="danger"
              onConfirm={handleDeleteConfirmed}
              onCancel={() => setConfirmMode(null)}
            />
            <ConfirmDialog
              isVisible={confirmMode === 'exit'}
              message="Save reorder changes?"
              confirmLabel="Save"
              cancelLabel="Discard"
              onConfirm={handleExitSave}
              onCancel={closeEditMode}
            />
            <ActionBar
              selectedCount={selectedItems.size}
              onDelete={() => setConfirmMode('delete')}
              onMove={() => setShowMovePicker(true)}
              moveDisabledReason={moveDisabledReason}
            />
          </div>
        }
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleSheetDragStart}
          onDragOver={handleSheetDragOver}
          onDragEnd={handleSheetDragEnd}
          onDragCancel={() => { liveGroupsRef.current = null; setLiveGroups(null); }}
        >
          <div style={{ padding: `${Spacing.xs}px ${Spacing.base}px` }}>
            {SLOT_ORDER.map(slotId => {
              const slotItemIds: string[] = liveGroups
                ? liveGroups[slotId]
                : editItems.filter(i => assignSlot(getDisplayTime(i)) === slotId).map(i => i.id);
              const slotItems = slotItemIds
                .map(id => editItemsById.get(id))
                .filter((i): i is ResolvedItem => !!i);

              // Hide empty slots when nothing is being dragged
              if (slotItems.length === 0 && !liveGroups) return null;

              return (
                <Fragment key={slotId}>
                  <SlotHeader label={SLOT_LABELS[slotId]} paddingLeft={0} />
                  {slotItems.length === 0 ? (
                    <DroppableSlotZone slotId={slotId} />
                  ) : (
                    <SortableContext items={slotItemIds} strategy={verticalListSortingStrategy}>
                      {slotItems.map(item => {
                        const isItemLocked = confirms[item.id] || (!item._isCustom && !!(item as ItineraryItem).locked);
                        return (
                          <SheetSortableItem
                            key={item.id}
                            item={item}
                            isSelected={selectedItems.has(item.id)}
                            isLocked={isItemLocked}
                            isDragDisabled={isItemLocked}
                            onToggleSelect={() => toggleItem(item.id)}
                            displayTime={getDisplayTime(item)}
                            accent={stop.accent}
                          />
                        );
                      })}
                    </SortableContext>
                  )}
                </Fragment>
              );
            })}
          </div>
        </DndContext>
      </BottomSheet>

      {/* Day picker — Move selected items to another day within the same stop */}
      <DayPickerModal
        isOpen={showMovePicker}
        onClose={() => setShowMovePicker(false)}
        fromDayId={editModeDay ?? undefined}
        allDays={data.itinerary_days}
        stops={data.stops}
        filterStopId={editDay?.stop_id}
        onMoveItems={handleMoveItems}
      />

      {/* Item detail / edit sheet */}
      <ItineraryItemDetailSheet
        isOpen={!!detailState}
        item={detailState?.item ?? null}
        resolvedPlace={detailState?.resolvedPlace ?? null}
        accent={stop.accent}
        textOverride={detailState ? textOverrides[detailState.item.id] : undefined}
        timeOverride={detailState ? timeOverrides[detailState.item.id] : undefined}
        isConfirmed={detailState ? (confirms[detailState.item.id] || (!detailState.item._isCustom && (detailState.item as ItineraryItem).locked)) : false}
        onClose={() => setDetailState(null)}
        onSetTextOverride={setTextOverride}
        onUpdateCustomItem={updateCustomItem}
        onSetTimeOverride={setTimeOverride}
        onDelete={() => { if (detailState) { deleteItem(detailState.item); setDetailState(null); } }}
        onConfirm={onConfirm}
      />

    </>
  );
}
