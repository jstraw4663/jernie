import { useEffect, useState } from "react";
import { ref, onValue, set, update } from "firebase/database";
import { db } from "../lib/firebase";
import type { Booking, CustomItem, ItineraryDay, ItineraryItem } from "../types";

// localStorage keys — used as offline cache only
const LS_CONFIRMS = "jernie_fb_confirms";
const LS_PACKING = "jernie_fb_packing";
const LS_ITINERARY_ORDER = "jernie_fb_itinerary_order";
const LS_CUSTOM_ITEMS = "jernie_fb_custom_items";
const LS_TIME_OVERRIDES = "jernie_fb_time_overrides";
const LS_TEXT_OVERRIDES = "jernie_fb_text_overrides";
const LS_RESERVATION_TIMES = "jernie_fb_reservation_times";
const LS_BOOKING_OVERRIDES = "jernie_fb_booking_overrides";

// Write queue — survives page reloads while offline.
// Firebase RTDB keeps its write queue in memory only; on page reload that queue
// is destroyed. This queue persists writes to localStorage so they can be
// replayed to Firebase when connectivity is restored after a reload.
const LS_WRITE_QUEUE = "jernie_write_queue";

type QueuedWrite = { path: string; value: any; ts: number };

function readQueue(): QueuedWrite[] {
  try { return JSON.parse(localStorage.getItem(LS_WRITE_QUEUE) || "[]"); }
  catch { return []; }
}
function persistQueue(q: QueuedWrite[]) {
  try { localStorage.setItem(LS_WRITE_QUEUE, JSON.stringify(q)); } catch {}
}
function enqueueWrite(path: string, value: any) {
  const q = readQueue();
  // Collapse duplicate paths — last local write wins
  persistQueue([...q.filter(w => w.path !== path), { path, value, ts: Date.now() }]);
}
// Batch multiple path→value entries into a single localStorage read+write
function batchEnqueue(entries: Record<string, any>) {
  const paths = Object.keys(entries);
  const ts = Date.now();
  const q = readQueue().filter(w => !paths.includes(w.path));
  persistQueue([...q, ...paths.map(p => ({ path: p, value: entries[p], ts }))]);
}
function clearQueue() { persistQueue([]); }

function readLS(key: string): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); }
  catch { return {}; }
}

function writeLS(key: string, val: Record<string, any>) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function rand8() {
  return Math.random().toString(36).slice(2, 10);
}

export function useSharedTripState(tripId: string) {
  const [confirms, setConfirms] = useState<Record<string, boolean>>(readLS(LS_CONFIRMS));
  const [packing, setPacking] = useState<Record<string, boolean>>(readLS(LS_PACKING));
  const [itineraryOrder, setItineraryOrder] = useState<Record<string, string[]>>(readLS(LS_ITINERARY_ORDER));
  const [customItems, setCustomItems] = useState<Record<string, CustomItem>>(readLS(LS_CUSTOM_ITEMS));
  const [timeOverrides, setTimeOverridesState] = useState<Record<string, string>>(readLS(LS_TIME_OVERRIDES));
  const [textOverrides, setTextOverridesState] = useState<Record<string, string>>(readLS(LS_TEXT_OVERRIDES));
  const [reservationTimes, setReservationTimesState] = useState<Record<string, string>>(readLS(LS_RESERVATION_TIMES));
  // bookingOverrides: keyed by bookingId → field → value.
  // Stores hotel/rental car edits (check-in dates, room type, car type, etc.).
  const [bookingOverrides, setBookingOverrides] = useState<Record<string, Record<string, unknown>>>(readLS(LS_BOOKING_OVERRIDES));

  useEffect(() => {
    const confirmsRef = ref(db, `trips/${tripId}/state/confirms`);
    const packingRef = ref(db, `trips/${tripId}/state/packing`);
    const orderRef = ref(db, `trips/${tripId}/state/itinerary_order`);
    const customRef = ref(db, `trips/${tripId}/state/custom_items`);
    const timeRef = ref(db, `trips/${tripId}/state/time_overrides`);
    const textRef = ref(db, `trips/${tripId}/state/text_overrides`);
    const resvRef = ref(db, `trips/${tripId}/state/reservation_times`);
    const bookingsRef = ref(db, `trips/${tripId}/state/bookings`);

    // Flush any writes that were queued offline and survived a page reload.
    // Firebase's in-memory write queue is destroyed on page reload; this replays
    // those writes to the server as soon as connectivity is available.
    const flushQueue = () => {
      const q = readQueue();
      if (!q.length) return;
      const updates: Record<string, any> = {};
      q.forEach(w => { updates[w.path] = w.value; });
      update(ref(db), updates)
        .then(clearQueue)
        .catch(() => { /* still offline — queue stays, retries on next 'online' event */ });
    };

    if (navigator.onLine) {
      flushQueue();
    }
    window.addEventListener("online", flushQueue);

    // null-guard: if snap.val() is null the path either doesn't exist yet OR
    // we're offline and Firebase hasn't sent data. In either case, keep the
    // localStorage-seeded initial state rather than overwriting with empty.
    const unsubConfirms = onValue(confirmsRef, (snap) => {
      if (snap.val() === null) return;
      const val: Record<string, boolean> = snap.val();
      setConfirms(val);
      writeLS(LS_CONFIRMS, val);
    });

    const unsubPacking = onValue(packingRef, (snap) => {
      if (snap.val() === null) return;
      const val: Record<string, boolean> = snap.val();
      setPacking(val);
      writeLS(LS_PACKING, val);
    });

    const unsubOrder = onValue(orderRef, (snap) => {
      if (snap.val() === null) return;
      const val: Record<string, string[]> = snap.val();
      setItineraryOrder(val);
      writeLS(LS_ITINERARY_ORDER, val);
    });

    const unsubCustom = onValue(customRef, (snap) => {
      if (snap.val() === null) return;
      const val: Record<string, CustomItem> = snap.val();
      setCustomItems(val);
      writeLS(LS_CUSTOM_ITEMS, val);
    });

    const unsubTime = onValue(timeRef, (snap) => {
      if (snap.val() === null) return;
      const val: Record<string, string> = snap.val();
      setTimeOverridesState(val);
      writeLS(LS_TIME_OVERRIDES, val);
    });

    const unsubText = onValue(textRef, (snap) => {
      if (snap.val() === null) return;
      const val: Record<string, string> = snap.val();
      setTextOverridesState(val);
      writeLS(LS_TEXT_OVERRIDES, val);
    });

    const unsubResv = onValue(resvRef, (snap) => {
      if (snap.val() === null) return;
      const val: Record<string, string> = snap.val();
      setReservationTimesState(val);
      writeLS(LS_RESERVATION_TIMES, val);
    });

    const unsubBookings = onValue(bookingsRef, (snap) => {
      if (snap.val() === null) return;
      const val: Record<string, Record<string, unknown>> = snap.val();
      setBookingOverrides(val);
      writeLS(LS_BOOKING_OVERRIDES, val);
    });

    return () => {
      window.removeEventListener("online", flushQueue);
      unsubConfirms();
      unsubPacking();
      unsubOrder();
      unsubCustom();
      unsubTime();
      unsubText();
      unsubResv();
      unsubBookings();
    };
  }, [tripId]);

  function setConfirm(itemId: string, value: boolean) {
    const path = `trips/${tripId}/state/confirms/${itemId}`;
    enqueueWrite(path, value);
    set(ref(db, path), value);
  }

  function setPack(itemId: string, value: boolean) {
    const path = `trips/${tripId}/state/packing/${itemId}`;
    enqueueWrite(path, value);
    set(ref(db, path), value);
  }

  function resetPacking() {
    // Full reset: clear the queue entries for packing too
    persistQueue(readQueue().filter(w => !w.path.includes(`/state/packing`)));
    set(ref(db, `trips/${tripId}/state/packing`), null);
    setPacking({});
    writeLS(LS_PACKING, {});
  }

  // Write trip.json array order to Firebase on first load (no-op if already initialized)
  function initializeOrder(days: ItineraryDay[], items: ItineraryItem[]) {
    const updates: Record<string, string[]> = {};
    days.forEach(day => {
      const dayItems = items.filter(it => it.day_id === day.id);
      updates[day.id] = dayItems.map(it => it.id);
    });
    set(ref(db, `trips/${tripId}/state/itinerary_order`), updates);
  }

  // Single-day reorder
  function setDayOrder(dayId: string, orderedIds: string[]) {
    const path = `trips/${tripId}/state/itinerary_order/${dayId}`;
    enqueueWrite(path, orderedIds);
    set(ref(db, path), orderedIds);
  }

  // Cross-day/cross-stop move. Uses update() for atomic write.
  function moveItem(itemId: string, fromDayId: string, toDayId: string, insertAtIndex: number) {
    const fromOrder = [...(itineraryOrder[fromDayId] || [])].filter(id => id !== itemId);
    const toOrder = [...(itineraryOrder[toDayId] || [])].filter(id => id !== itemId);

    if (insertAtIndex === Infinity) {
      toOrder.push(itemId);
    } else {
      toOrder.splice(insertAtIndex, 0, itemId);
    }

    const updates: Record<string, any> = {
      [`trips/${tripId}/state/itinerary_order/${fromDayId}`]: fromOrder,
      [`trips/${tripId}/state/itinerary_order/${toDayId}`]: toOrder,
    };

    // Keep custom item's day_id in sync
    if (itemId.startsWith("custom-")) {
      updates[`trips/${tripId}/state/custom_items/${itemId}/day_id`] = toDayId;
    }

    batchEnqueue(updates);
    update(ref(db), updates);
  }

  // Create custom item and append to day's order
  function addCustomItem(dayId: string, time: string, text: string, sourcePlaceId: string | null, category?: CustomItem["category"]) {
    const id = "custom-" + rand8();
    const item: CustomItem = { id, day_id: dayId, time, text, source_place_id: sourcePlaceId, created_at: Date.now(), ...(category ? { category } : {}) };
    const currentOrder = [...(itineraryOrder[dayId] || [])];
    currentOrder.push(id);

    const updates: Record<string, any> = {
      [`trips/${tripId}/state/custom_items/${id}`]: item,
      [`trips/${tripId}/state/itinerary_order/${dayId}`]: currentOrder,
    };
    batchEnqueue(updates);
    update(ref(db), updates);
  }

  // Remove custom item and its ID from order
  function deleteCustomItem(itemId: string, dayId: string) {
    const newOrder = (itineraryOrder[dayId] || []).filter(id => id !== itemId);
    const updates: Record<string, any> = {
      [`trips/${tripId}/state/itinerary_order/${dayId}`]: newOrder,
      [`trips/${tripId}/state/custom_items/${itemId}`]: null,
    };
    // Remove any queued write for the deleted item; enqueue the new order
    persistQueue(readQueue().filter(w => w.path !== `trips/${tripId}/state/custom_items/${itemId}`));
    enqueueWrite(`trips/${tripId}/state/itinerary_order/${dayId}`, newOrder);
    update(ref(db), updates);
  }

  // Set or clear a keyed time field (time_overrides or reservation_times)
  function setTimePath(stateKey: string, itemId: string, time: string) {
    const path = `trips/${tripId}/state/${stateKey}/${itemId}`;
    if (time) enqueueWrite(path, time);
    else persistQueue(readQueue().filter(w => w.path !== path));
    set(ref(db, path), time || null);
  }

  function setTimeOverride(itemId: string, time: string) {
    setTimePath("time_overrides", itemId, time);
  }

  function setReservationTime(itemId: string, time: string) {
    setTimePath("reservation_times", itemId, time);
  }

  // Override the display title of any itinerary item (including locked curated items).
  // For CustomItems, prefer updateCustomItem({text}) instead — this is for ItineraryItems.
  function setTextOverride(itemId: string, text: string) {
    const path = `trips/${tripId}/state/text_overrides/${itemId}`;
    if (text) enqueueWrite(path, text);
    else persistQueue(readQueue().filter(w => w.path !== path));
    set(ref(db, path), text || null);
  }

  // Patch fields on an existing CustomItem in Firebase.
  // Caller provides only the fields to change — existing fields are preserved.
  function updateCustomItem(id: string, patch: Partial<Pick<CustomItem, 'text' | 'time' | 'category' | 'addr'>>) {
    const updates: Record<string, any> = {};
    (Object.keys(patch) as (keyof typeof patch)[]).forEach(field => {
      updates[`trips/${tripId}/state/custom_items/${id}/${field}`] = patch[field] ?? null;
    });
    batchEnqueue(updates);
    update(ref(db), updates);
  }

  // Write a single field on a Booking record to Firebase.
  // Used by hotel check-in/out, room info, car type, rental dates, etc.
  // Follows the exact same enqueueWrite + set(ref) pattern as setConfirm / setTimeOverride.
  function setBookingField(bookingId: string, field: keyof Booking, value: string | null | boolean | Record<string, string | null>) {
    const path = `trips/${tripId}/state/bookings/${bookingId}/${String(field)}`;
    enqueueWrite(path, value);
    set(ref(db, path), value);
  }

  return {
    confirms, packing, setConfirm, setPacking: setPack, resetPacking,
    itineraryOrder, customItems, timeOverrides, textOverrides, reservationTimes,
    bookingOverrides,
    initializeOrder, setDayOrder, moveItem, addCustomItem, deleteCustomItem,
    setTimeOverride, setTextOverride, setReservationTime, setBookingField,
    updateCustomItem,
  };
}
