import { useState, useEffect } from 'react';
import { Animation } from '../design/tokens';

/**
 * Returns true after Animation.mountFrames RAF cycles.
 * Prevents flash-of-initial-state on animated overlays. Same pattern as BottomSheet.
 */
export function useMountVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const rafs: number[] = [];
    const wait = (remaining: number) => {
      if (remaining <= 0) { setVisible(true); return; }
      rafs.push(requestAnimationFrame(() => wait(remaining - 1)));
    };
    wait(Animation.mountFrames);
    return () => rafs.forEach(id => cancelAnimationFrame(id));
  }, []);
  return visible;
}
