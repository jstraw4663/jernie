// PLATFORM BOUNDARY: @dnd-kit is web-only.
// Expo migration: replace DndContext/SortableContext/useDroppable with
// react-native-reanimated + react-native-gesture-handler.
// All props and Firebase state are platform-agnostic.

import { useState, useEffect, useRef, useMemo } from "react";
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
import type { Stop, TripData, ItineraryItem, CustomItem } from "../types";
import { DayPickerModal } from "./DayPickerModal";

const appleMaps = (addr: string) => "https://maps.apple.com/?q=" + encodeURIComponent(addr);

type ResolvedItem = (ItineraryItem & { _isCustom: false }) | (CustomItem & { _isCustom: true });

interface MenuState {
  itemId: string;
  dayId: string;
  isCustom: boolean;
  x: number;
  y: number;
  confirmDelete: boolean;
}

interface AddFormState {
  dayId: string;
  time: string;
  text: string;
}

interface DayPickerContext {
  mode: "move";
  itemId: string;
  fromDayId: string;
}

interface EditableItineraryProps {
  stop: Stop;
  data: TripData;
  confirms: Record<string, boolean>;
  onConfirm: (id: string, value: boolean) => void;
  itineraryOrder: Record<string, string[]>;
  customItems: Record<string, CustomItem>;
  timeOverrides: Record<string, string>;
  setDayOrder: (dayId: string, orderedIds: string[]) => void;
  moveItem: (itemId: string, fromDayId: string, toDayId: string, insertAtIndex: number) => void;
  addCustomItem: (dayId: string, time: string, text: string, sourcePlaceId: string | null) => void;
  deleteCustomItem: (itemId: string, dayId: string) => void;
  initializeOrder: (days: TripData["itinerary_days"], items: TripData["itinerary_items"]) => void;
  setTimeOverride: (itemId: string, time: string) => void;
  reservationTimes: Record<string, string>;
  setReservationTime: (itemId: string, time: string) => void;
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
  const cleaned = t.replace(/^~/, "").replace(/[^\x00-\x7F]/g, "").replace(/\b(sharp)\b/gi, "").trim();
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

// ── DroppableDay — makes collapsed day headers register as drop targets ──

function DroppableDay({ dayId, children }: { dayId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "day-drop-" + dayId, data: { dayId } });
  return (
    <div ref={setNodeRef} style={{ background: isOver ? "rgba(0,0,0,0.015)" : "transparent", transition: "background 0.15s" }}>
      {children}
    </div>
  );
}

// ── TimeLabel — click-to-edit inline ──────────────────────────

function TimeLabel({ displayTime, isLocked, onSave }: {
  displayTime: string; isLocked: boolean; onSave: (time: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayTime);

  if (isLocked || editing === false) {
    return (
      <div
        onClick={isLocked ? undefined : () => { setDraft(displayTime); setEditing(true); }}
        title={isLocked ? undefined : "Tap to edit time"}
        style={{
          fontSize: "0.7rem", color: "#aaa", lineHeight: 1.4, fontStyle: "italic",
          cursor: isLocked ? "default" : "pointer",
          minHeight: "1em",
          borderBottom: isLocked ? "none" : "1px dashed transparent",
        }}
        onMouseEnter={e => { if (!isLocked) (e.currentTarget as HTMLElement).style.borderBottomColor = "#ddd"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent"; }}
      >
        {displayTime || <span style={{ opacity: 0.35 }}>set time</span>}
      </div>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onSave(draft.trim()); setEditing(false); }}
      onKeyDown={e => {
        if (e.key === "Enter") { onSave(draft.trim()); setEditing(false); }
        if (e.key === "Escape") setEditing(false);
      }}
      placeholder="e.g. 9:00 AM"
      style={{
        width: "90px", fontSize: "0.7rem", fontStyle: "italic", color: "#666",
        border: "1px solid #ccc", borderRadius: "4px", padding: "2px 5px",
        fontFamily: "Georgia,serif", background: "#fff",
      }}
    />
  );
}

// ── ItemContent ───────────────────────────────────────────────

function ItemContent({ item, accent, confirms, onConfirm, isCustom, displayTime, isLocked, onTimeSave, reservationTime, onRequestConfirm, onEditResvTime }: {
  item: ResolvedItem; accent: string; confirms: Record<string, boolean>;
  onConfirm: (id: string, value: boolean) => void; isCustom: boolean;
  displayTime: string; isLocked: boolean; onTimeSave: (time: string) => void;
  reservationTime: string;
  onRequestConfirm: () => void;
  onEditResvTime: () => void;
}) {
  const itItem = item as ItineraryItem;
  const userConfirmed = isLocked && !itItem.locked;

  return (
    <div style={{ display: "flex", gap: "12px", flex: 1, minWidth: 0 }}>
      <div style={{ minWidth: "96px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "5px", paddingTop: "2px" }}>
        <TimeLabel displayTime={displayTime} isLocked={isLocked} onSave={onTimeSave} />
        {isCustom ? (
          <span style={{ fontSize: "0.52rem", background: "#F0F4FF", color: "#3557A0", padding: "2px 6px", borderRadius: "4px", letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid #3557A020", display: "inline-block", width: "fit-content" }}>
            ✏ Custom
          </span>
        ) : isLocked ? (
          <>
            <button
              onClick={() => !itItem.locked && onConfirm(item.id, !confirms[item.id])}
              title={itItem.locked ? "Locked in" : "Click to unmark"}
              style={{ background: accent, color: "#fff", fontSize: "0.52rem", padding: "2px 6px", borderRadius: "4px", letterSpacing: "0.06em", textTransform: "uppercase", display: "inline-block", width: "fit-content", border: "none", cursor: itItem.locked ? "default" : "pointer", fontFamily: "Georgia,serif" }}
            >
              ✓ Confirmed
            </button>
            {userConfirmed && (
              <div
                onClick={onEditResvTime}
                title={reservationTime ? "Edit reservation time" : "Add reservation time"}
                style={{ fontSize: "0.62rem", color: reservationTime ? "#777" : "#ccc", fontStyle: "italic", cursor: "pointer", lineHeight: 1.3, marginTop: "1px" }}
              >
                {reservationTime ? `🕐 ${reservationTime}` : "+ reservation time"}
              </div>
            )}
          </>
        ) : (
          <>
            {itItem.book_now && (
              itItem.booking_url
                ? <a href={itItem.booking_url} target="_blank" rel="noopener noreferrer" style={{ background: "#FFF3CD", color: "#7a5800", fontSize: "0.52rem", padding: "2px 8px", borderRadius: "4px", letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid #F0C040aa", display: "inline-block", width: "fit-content", textDecoration: "none" }}>📅 Book Now</a>
                : <span style={{ background: "#FFF3CD", color: "#7a5800", fontSize: "0.52rem", padding: "2px 6px", borderRadius: "4px", letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid #F0C040aa", display: "inline-block", width: "fit-content" }}>📅 Book Now</span>
            )}
            {itItem.alert && !itItem.book_now && (
              <span style={{ background: "#FFF8E7", color: "#b07010", fontSize: "0.52rem", padding: "2px 6px", borderRadius: "4px", letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid #E8A02050", display: "inline-block", width: "fit-content" }}>⚠ Note</span>
            )}
            <button
              onClick={onRequestConfirm}
              style={{ background: "transparent", color: "#bbb", fontSize: "0.52rem", padding: "2px 6px", borderRadius: "4px", letterSpacing: "0.06em", textTransform: "uppercase", border: "1px dashed #ddd", display: "inline-block", width: "fit-content", cursor: "pointer", fontFamily: "Georgia,serif", marginTop: "1px" }}
            >
              + Confirm
            </button>
          </>
        )}
      </div>
      <div style={{ fontSize: "0.86rem", color: "#333", lineHeight: 1.55, flex: 1, paddingTop: "2px" }}>
        {item.text}
        {!isCustom && itItem.addr && (
          <div style={{ marginTop: "5px" }}>
            <a href={appleMaps(itItem.addr)} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.76rem", color: accent, textDecoration: "none" }}>
              📍 {itItem.addr_label || itItem.addr} <span style={{ fontSize: "0.68rem", opacity: 0.7 }}>· Maps</span>
            </a>
          </div>
        )}
        {!isCustom && itItem.tide_url && (
          <div style={{ marginTop: "5px" }}>
            <a href={itItem.tide_url} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.76rem", color: "#2D6A8F", textDecoration: "none" }}>
              🌊 Bar Harbor Tide Chart <span style={{ fontSize: "0.68rem", opacity: 0.7 }}>· NOAA</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SortableItem ──────────────────────────────────────────────

function SortableItem({ item, accent, confirms, onConfirm, isLocked, onMenuOpen, displayTime, onTimeSave, reservationTime, onRequestConfirm, onEditResvTime }: {
  item: ResolvedItem; accent: string; confirms: Record<string, boolean>;
  onConfirm: (id: string, value: boolean) => void;
  isLocked: boolean;
  onMenuOpen: (itemId: string, isCustom: boolean, e: React.MouseEvent) => void;
  displayTime: string;
  onTimeSave: (time: string) => void;
  reservationTime: string;
  onRequestConfirm: () => void;
  onEditResvTime: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isLocked,
    data: { item },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={{ ...style, display: "flex", gap: "8px", padding: "10px 0", alignItems: "flex-start", position: "relative" }}>
      {/* Drag handle */}
      <div
        {...(isLocked ? {} : { ...attributes, ...listeners })}
        style={{
          cursor: isLocked ? "default" : "grab",
          color: isLocked ? "transparent" : "#ccc",
          fontSize: "0.9rem", paddingTop: "3px", flexShrink: 0,
          touchAction: "none", userSelect: "none", width: "18px", textAlign: "center",
        }}
      >
        {isLocked ? "" : "☰"}
      </div>

      <ItemContent
        item={item} accent={accent} confirms={confirms} onConfirm={onConfirm}
        isCustom={item._isCustom} displayTime={displayTime} isLocked={isLocked} onTimeSave={onTimeSave}
        reservationTime={reservationTime} onRequestConfirm={onRequestConfirm} onEditResvTime={onEditResvTime}
      />

      {/* ··· menu button */}
      {!isLocked && (
        <button
          onClick={(e) => onMenuOpen(item.id, item._isCustom, e)}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#bbb", fontSize: "1rem", padding: "2px 4px", flexShrink: 0, lineHeight: 1, fontFamily: "Georgia,serif" }}
          title="Actions"
        >
          ···
        </button>
      )}
    </div>
  );
}

// ── EditableItinerary ────────────────────────────────────────

export function EditableItinerary({
  stop, data, confirms, onConfirm,
  itineraryOrder, customItems, timeOverrides, reservationTimes,
  setDayOrder, moveItem, addCustomItem, deleteCustomItem, initializeOrder, setTimeOverride, setReservationTime,
}: EditableItineraryProps) {
  const [openDay, setOpenDay] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const [addForm, setAddForm] = useState<AddFormState | null>(null);
  const [dayPickerCtx, setDayPickerCtx] = useState<DayPickerContext | null>(null);
  const [resvPrompt, setResvPrompt] = useState<{ itemId: string; draft: string } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializingRef = useRef(false);

  const days = data.itinerary_days.filter(d => d.stop_id === stop.id);

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

  function openResvPrompt(itemId: string, prefill = "") {
    setResvPrompt({ itemId, draft: prefill });
  }

  function handleResvSave() {
    if (!resvPrompt) return;
    setReservationTime(resvPrompt.itemId, resvPrompt.draft.trim());
    onConfirm(resvPrompt.itemId, true);
    setResvPrompt(null);
  }

  function handleResvCancel() {
    setResvPrompt(null);
  }

  function openMenu(itemId: string, isCustom: boolean, e: React.MouseEvent) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuState({ itemId, dayId: findItemDay(itemId) || "", isCustom, x: rect.left, y: rect.bottom + 4, confirmDelete: false });
  }

  function closeMenu() { setMenuState(null); }

  function handleMove() {
    if (!menuState) return;
    setDayPickerCtx({ mode: "move", itemId: menuState.itemId, fromDayId: menuState.dayId });
    closeMenu();
  }

  function handleDeleteRequest() {
    setMenuState(prev => prev ? { ...prev, confirmDelete: true } : null);
  }

  function handleDeleteConfirm() {
    if (!menuState) return;
    deleteCustomItem(menuState.itemId, menuState.dayId);
    closeMenu();
  }

  function handleMoveItem(itemId: string, fromDayId: string, toDayId: string) {
    moveItem(itemId, fromDayId, toDayId, Infinity);
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
          <div style={{ fontWeight: "bold", color: stop.accent, fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>📅 Daily Itinerary — Loose Plan</div>
          <div style={{ flex: 1, height: "1px", background: stop.accent + "30" }} />
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {days.map((day, di) => {
              const items = resolveOrderedItems(day.id);
              const isOpen = openDay === di;
              return (
                <DroppableDay key={day.id} dayId={day.id}>
                  <div
                    style={{
                      border: "1px solid " + stop.accent + (isOpen ? "40" : "20"),
                      borderRadius: "12px", overflow: "hidden", background: "#fff",
                      transition: "border-color 0.15s",
                    }}
                  >
                    <button
                      onClick={() => setOpenDay(isOpen ? -1 : di)}
                      style={{
                        width: "100%", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px",
                        background: isOpen ? stop.accent + "0A" : "transparent",
                        border: "none", cursor: "pointer", textAlign: "left",
                        fontFamily: "Georgia,serif", transition: "background 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{day.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", fontSize: "0.92rem", color: "#1a1a1a" }}>{day.date}</div>
                        <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "2px", fontStyle: "italic" }}>{day.label}</div>
                      </div>
                      <span style={{ color: stop.accent, fontSize: "0.75rem", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▼</span>
                    </button>

                    {isOpen && (
                      <div style={{ padding: "0 18px 14px 18px", borderTop: "1px solid " + stop.accent + "15" }}>
                        <SortableContext items={items.map(it => it.id)} strategy={verticalListSortingStrategy}>
                          {items.map((item, ii) => {
                            const isItemLocked = !item._isCustom && ((item as ItineraryItem).locked || confirms[item.id]);
                            return (
                              <div key={item.id} style={{ borderBottom: ii < items.length - 1 ? "1px dashed #f0ede6" : "none" }}>
                                <SortableItem
                                  item={item} accent={stop.accent} confirms={confirms} onConfirm={onConfirm}
                                  isLocked={isItemLocked} onMenuOpen={openMenu}
                                  displayTime={getDisplayTime(item)}
                                  onTimeSave={(t) => setTimeOverride(item.id, t)}
                                  reservationTime={reservationTimes[item.id] || ""}
                                  onRequestConfirm={() => openResvPrompt(item.id)}
                                  onEditResvTime={() => openResvPrompt(item.id, reservationTimes[item.id] || "")}
                                />
                              </div>
                            );
                          })}
                        </SortableContext>

                        {/* Inline add form */}
                        {addForm?.dayId === day.id ? (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed #e0ddd6" }}>
                            <input
                              placeholder="Time (optional)"
                              value={addForm.time}
                              onChange={e => setAddForm(f => f ? { ...f, time: e.target.value } : f)}
                              style={{ width: "90px", fontSize: "0.8rem", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "6px", fontFamily: "Georgia,serif" }}
                            />
                            <input
                              autoFocus
                              placeholder="Add item…"
                              value={addForm.text}
                              onChange={e => setAddForm(f => f ? { ...f, text: e.target.value } : f)}
                              onKeyDown={e => {
                                if (e.key === "Enter" && addForm.text.trim()) {
                                  addCustomItem(day.id, addForm.time, addForm.text.trim(), null);
                                  setAddForm(null);
                                }
                                if (e.key === "Escape") setAddForm(null);
                              }}
                              style={{ flex: 1, fontSize: "0.8rem", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "6px", fontFamily: "Georgia,serif" }}
                            />
                            <button
                              onClick={() => {
                                if (addForm.text.trim()) addCustomItem(day.id, addForm.time, addForm.text.trim(), null);
                                setAddForm(null);
                              }}
                              style={{ background: stop.accent, color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontFamily: "Georgia,serif" }}
                            >Add</button>
                            <button
                              onClick={() => setAddForm(null)}
                              style={{ background: "transparent", color: "#bbb", border: "1px solid #ddd", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontSize: "0.8rem", fontFamily: "Georgia,serif" }}
                            >✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddForm({ dayId: day.id, time: "", text: "" })}
                            style={{
                              marginTop: "10px", background: "transparent", border: "1px dashed " + stop.accent + "50",
                              borderRadius: "6px", padding: "6px 14px", cursor: "pointer",
                              fontSize: "0.75rem", color: stop.accent + "99", fontFamily: "Georgia,serif",
                              display: "flex", alignItems: "center", gap: "5px",
                            }}
                          >+ Add item</button>
                        )}
                      </div>
                    )}
                  </div>
                </DroppableDay>
              );
            })}
          </div>

          <DragOverlay>
            {activeItem && (
              <div style={{
                background: "#fff", borderRadius: "8px", padding: "10px 14px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)", display: "flex", gap: "8px",
                alignItems: "flex-start", opacity: 0.95,
              }}>
                <ItemContent
                  item={activeItem} accent={stop.accent} confirms={confirms} onConfirm={() => {}}
                  isCustom={activeItem._isCustom}
                  displayTime={getDisplayTime(activeItem)}
                  isLocked={false}
                  onTimeSave={() => {}}
                  reservationTime=""
                  onRequestConfirm={() => {}}
                  onEditResvTime={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Action menu */}
      {menuState && (
        <>
          <div onClick={closeMenu} style={{ position: "fixed", inset: 0, zIndex: 8000 }} />
          <div style={{
            position: "fixed",
            left: Math.min(menuState.x, window.innerWidth - 160),
            top: menuState.y,
            zIndex: 8001, background: "#fff", borderRadius: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)", overflow: "hidden", minWidth: "150px",
          }}>
            {menuState.confirmDelete ? (
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: "0.82rem", color: "#333", marginBottom: "10px" }}>Delete this item?</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={handleDeleteConfirm} style={{ background: "#b91c1c", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 12px", cursor: "pointer", fontSize: "0.78rem", fontFamily: "Georgia,serif" }}>Yes</button>
                  <button onClick={closeMenu} style={{ background: "transparent", border: "1px solid #ddd", borderRadius: "6px", padding: "5px 12px", cursor: "pointer", fontSize: "0.78rem", fontFamily: "Georgia,serif" }}>No</button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={handleMove}
                  style={{ width: "100%", textAlign: "left", padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: "0.84rem", fontFamily: "Georgia,serif", borderBottom: menuState.isCustom ? "1px solid #f0f0f0" : "none" }}
                >↗ Move to day</button>
                {menuState.isCustom && (
                  <button
                    onClick={handleDeleteRequest}
                    style={{ width: "100%", textAlign: "left", padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: "0.84rem", color: "#b91c1c", fontFamily: "Georgia,serif" }}
                  >🗑 Delete</button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Day picker modal for Move */}
      <DayPickerModal
        isOpen={!!dayPickerCtx}
        onClose={() => setDayPickerCtx(null)}
        mode="move"
        itemId={dayPickerCtx?.itemId}
        fromDayId={dayPickerCtx?.fromDayId}
        allDays={data.itinerary_days}
        stops={data.stops}
        onMoveItem={handleMoveItem}
      />

      {/* Reservation time prompt */}
      {resvPrompt && (
        <>
          <div onClick={handleResvCancel} style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.18)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 8001, background: "#fff", borderRadius: "16px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.22)", padding: "22px 24px", width: "min(320px, 90vw)",
            fontFamily: "Georgia,serif",
          }}>
            <div style={{ fontWeight: "bold", fontSize: "0.95rem", color: "#1a1a1a", marginBottom: "4px" }}>Got a reservation?</div>
            <div style={{ fontSize: "0.78rem", color: "#999", marginBottom: "14px", fontStyle: "italic" }}>Add a time, or skip to just confirm.</div>
            <input
              autoFocus
              value={resvPrompt.draft}
              onChange={e => setResvPrompt(p => p ? { ...p, draft: e.target.value } : p)}
              onKeyDown={e => {
                if (e.key === "Enter") handleResvSave();
                if (e.key === "Escape") handleResvCancel();
              }}
              placeholder="e.g. 7:00 PM or Evening"
              style={{
                width: "100%", fontSize: "0.88rem", padding: "9px 11px", border: "1px solid #ddd",
                borderRadius: "8px", fontFamily: "Georgia,serif", boxSizing: "border-box",
                marginBottom: "12px", outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleResvSave}
                style={{ flex: 1, background: stop.accent, color: "#fff", border: "none", borderRadius: "8px", padding: "9px", cursor: "pointer", fontSize: "0.84rem", fontFamily: "Georgia,serif", fontWeight: "bold" }}
              >✓ Confirm</button>
              <button
                onClick={handleResvCancel}
                style={{ background: "transparent", color: "#888", border: "1px solid #ddd", borderRadius: "8px", padding: "9px 16px", cursor: "pointer", fontSize: "0.84rem", fontFamily: "Georgia,serif" }}
              >Cancel</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
