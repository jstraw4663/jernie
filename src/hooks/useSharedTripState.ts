import { useEffect, useState } from "react";
import { ref, onValue, set, update } from "firebase/database";
import { db } from "../lib/firebase";
import type { CustomItem, ItineraryDay, ItineraryItem } from "../types";

// localStorage keys — used as offline cache only
const LS_CONFIRMS = "jernie_fb_confirms";
const LS_PACKING = "jernie_fb_packing";
const LS_ITINERARY_ORDER = "jernie_fb_itinerary_order";
const LS_CUSTOM_ITEMS = "jernie_fb_custom_items";
const LS_TIME_OVERRIDES = "jernie_fb_time_overrides";
const LS_RESERVATION_TIMES = "jernie_fb_reservation_times";

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
  const [reservationTimes, setReservationTimesState] = useState<Record<string, string>>(readLS(LS_RESERVATION_TIMES));

  useEffect(() => {
    const confirmsRef = ref(db, `trips/${tripId}/state/confirms`);
    const packingRef = ref(db, `trips/${tripId}/state/packing`);
    const orderRef = ref(db, `trips/${tripId}/state/itinerary_order`);
    const customRef = ref(db, `trips/${tripId}/state/custom_items`);
    const timeRef = ref(db, `trips/${tripId}/state/time_overrides`);
    const resvRef = ref(db, `trips/${tripId}/state/reservation_times`);

    const unsubConfirms = onValue(confirmsRef, (snap) => {
      const val: Record<string, boolean> = snap.val() || {};
      setConfirms(val);
      writeLS(LS_CONFIRMS, val);
    });

    const unsubPacking = onValue(packingRef, (snap) => {
      const val: Record<string, boolean> = snap.val() || {};
      setPacking(val);
      writeLS(LS_PACKING, val);
    });

    const unsubOrder = onValue(orderRef, (snap) => {
      const val: Record<string, string[]> = snap.val() || {};
      setItineraryOrder(val);
      writeLS(LS_ITINERARY_ORDER, val);
    });

    const unsubCustom = onValue(customRef, (snap) => {
      const val: Record<string, CustomItem> = snap.val() || {};
      setCustomItems(val);
      writeLS(LS_CUSTOM_ITEMS, val);
    });

    const unsubTime = onValue(timeRef, (snap) => {
      const val: Record<string, string> = snap.val() || {};
      setTimeOverridesState(val);
      writeLS(LS_TIME_OVERRIDES, val);
    });

    const unsubResv = onValue(resvRef, (snap) => {
      const val: Record<string, string> = snap.val() || {};
      setReservationTimesState(val);
      writeLS(LS_RESERVATION_TIMES, val);
    });

    return () => {
      unsubConfirms();
      unsubPacking();
      unsubOrder();
      unsubCustom();
      unsubTime();
      unsubResv();
    };
  }, [tripId]);

  function setConfirm(itemId: string, value: boolean) {
    set(ref(db, `trips/${tripId}/state/confirms/${itemId}`), value);
  }

  function setPack(itemId: string, value: boolean) {
    set(ref(db, `trips/${tripId}/state/packing/${itemId}`), value);
  }

  function resetPacking() {
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
    set(ref(db, `trips/${tripId}/state/itinerary_order/${dayId}`), orderedIds);
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

    update(ref(db), updates);
  }

  // Create custom item and append to day's order
  function addCustomItem(dayId: string, time: string, text: string, sourcePlaceId: string | null) {
    const id = "custom-" + rand8();
    const item: CustomItem = { id, day_id: dayId, time, text, source_place_id: sourcePlaceId, created_at: Date.now() };
    const currentOrder = [...(itineraryOrder[dayId] || [])];
    currentOrder.push(id);

    const updates: Record<string, any> = {
      [`trips/${tripId}/state/custom_items/${id}`]: item,
      [`trips/${tripId}/state/itinerary_order/${dayId}`]: currentOrder,
    };
    update(ref(db), updates);
  }

  // Remove custom item and its ID from order
  function deleteCustomItem(itemId: string, dayId: string) {
    const newOrder = (itineraryOrder[dayId] || []).filter(id => id !== itemId);
    const updates: Record<string, any> = {
      [`trips/${tripId}/state/itinerary_order/${dayId}`]: newOrder,
      [`trips/${tripId}/state/custom_items/${itemId}`]: null,
    };
    update(ref(db), updates);
  }

  // Set or clear a time override for any item (base or custom)
  function setTimeOverride(itemId: string, time: string) {
    set(ref(db, `trips/${tripId}/state/time_overrides/${itemId}`), time || null);
  }

  // Set or clear a reservation time for any item
  function setReservationTime(itemId: string, time: string) {
    set(ref(db, `trips/${tripId}/state/reservation_times/${itemId}`), time || null);
  }

  return {
    confirms, packing, setConfirm, setPacking: setPack, resetPacking,
    itineraryOrder, customItems, timeOverrides, reservationTimes,
    initializeOrder, setDayOrder, moveItem, addCustomItem, deleteCustomItem,
    setTimeOverride, setReservationTime,
  };
}
