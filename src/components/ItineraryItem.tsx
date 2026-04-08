// ItineraryItem — Framer Motion press + long-press wrapper for timeline items.
// Provides:
//   - whileTap scale 0.97 press feedback (disabled for confirmed items)
//   - Long-press via useLongPress → triggers onLongPress (opens Edit Mode)
//
// dnd-kit's setNodeRef stays on SortableItem's outer div; this component
// owns only the interaction + animation layer.
//
// PLATFORM NOTE:
//   motion.div + whileTap → Pressable + Animated.spring on React Native
//   useLongPress → Pressable onLongPress on React Native (remove hook there)

import { motion } from 'framer-motion';
import { useLongPress } from '../hooks/useLongPress';
import { Animation } from '../design/tokens';

export interface ItineraryItemProps {
  onLongPress?: () => void;
  /** When true, disables both whileTap and long-press (locked/confirmed items) */
  isLocked: boolean;
  children: React.ReactNode;
}

export function ItineraryItem({ onLongPress, isLocked, children }: ItineraryItemProps) {
  const { handlePointerDown, cancel } = useLongPress(onLongPress, isLocked);

  return (
    <motion.div
      whileTap={isLocked ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', ...Animation.springs.snappy }}
      onPointerDown={handlePointerDown}
      onPointerUp={cancel}
      onPointerMove={cancel}
      onPointerLeave={cancel}
      style={{
        display: 'block',
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {children}
    </motion.div>
  );
}
