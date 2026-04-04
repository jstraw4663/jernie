import { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "../lib/firebase";

// localStorage keys — used as offline cache only
const LS_CONFIRMS = "jernie_fb_confirms";
const LS_PACKING = "jernie_fb_packing";

function readLS(key: string): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); }
  catch { return {}; }
}

function writeLS(key: string, val: Record<string, boolean>) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function useSharedTripState(tripId: string) {
  const [confirms, setConfirms] = useState<Record<string, boolean>>(readLS(LS_CONFIRMS));
  const [packing, setPacking] = useState<Record<string, boolean>>(readLS(LS_PACKING));

  useEffect(() => {
    const confirmsRef = ref(db, `trips/${tripId}/state/confirms`);
    const packingRef = ref(db, `trips/${tripId}/state/packing`);

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

    return () => {
      unsubConfirms();
      unsubPacking();
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

  return { confirms, packing, setConfirm, setPacking: setPack, resetPacking };
}
