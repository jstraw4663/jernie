// ItineraryItem — Framer Motion animated wrapper for itinerary list rows.
// Provides:
//   - whileTap scale 0.99 press feedback (disabled for locked/confirmed items)
//   - Long-press via useLongPress → triggers onLongPress (opens Edit Mode)
//
// Accepts children so ItemContent can be passed through without moving it
// prematurely — full item refactor is S4.
//
// dnd-kit's setNodeRef stays on SortableItem's outer div; this component
// owns the interaction + animation layer only.
//
// PLATFORM NOTE:
//   motion.div + whileTap → Pressable + Animated.spring on React Native
//   useLongPress → Pressable onLongPress on React Native (remove hook there)

import { motion } from 'framer-motion';
import { useLongPress } from '../hooks/useLongPress';
import { Spacing, Animation } from '../design/tokens';

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
      whileTap={isLocked ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.08, ease: Animation.fm.ease }}
      onPointerDown={handlePointerDown}
      onPointerUp={cancel}
      onPointerMove={cancel}
      onPointerLeave={cancel}
      style={{
        display: 'flex',
        gap: `${Spacing.sm}px`,
        padding: `${Spacing.sm}px 0`,
        alignItems: 'flex-start',
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {children}
    </motion.div>
  );
}
