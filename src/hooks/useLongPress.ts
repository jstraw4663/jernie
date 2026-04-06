// useLongPress — cross-platform long-press detection via pointer events.
// Fires onLongPress after LONG_PRESS_DURATION ms; cancels on move/leave/up.
// consumeFired() lets click handlers suppress the tap that follows a long-press.
//
// PLATFORM NOTE:
//   setTimeout/clearTimeout → Pressable onLongPress on React Native

import { useRef, useEffect } from 'react';

const LONG_PRESS_DURATION = 500;

export function useLongPress(onLongPress: (() => void) | undefined, disabled = false) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  function cancel() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handlePointerDown() {
    if (!onLongPress || disabled) return;
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      firedRef.current = true;
      onLongPress();
    }, LONG_PRESS_DURATION);
  }

  /** Returns true (and resets the flag) if a long-press just fired.
   *  Use in onClick to suppress the tap that immediately follows. */
  function consumeFired(): boolean {
    if (firedRef.current) {
      firedRef.current = false;
      return true;
    }
    return false;
  }

  // Cancel pending timer on unmount
  useEffect(() => cancel, []);

  return { handlePointerDown, cancel, consumeFired };
}
