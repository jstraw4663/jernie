// StopNavigator — horizontal swipe-to-navigate between stops.
// Framer Motion drag="x" with:
//   - commit threshold: 45% of screen width OR |velocity.x| > 300px/s
//   - parallax exit: old stop exits at 40% offset, new stop enters at 100%
//   - AnimatePresence mode="popLayout" keyed by activeIndex for cross-stop transitions
//   - spring snap-back if threshold not met (dragConstraints forces return to 0)
//   - dragDirectionLock: first detected direction locks (prevents diagonal swipe)
//   - edge stops: elastic 0.14 at first/last boundary (more alive than 0.04)
//
// PLATFORM NOTE:
//   drag → react-native-gesture-handler PanGestureHandler on Expo migration
//   dragConstraints/spring → withSpring + gestureHandlerRootHOC pattern
//   AnimatePresence → conditional render + Reanimated shared transitions

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Stop } from '../types';
import { Animation } from '../design/tokens';
import { useSheetContext } from '../contexts/SheetContext';

const COMMIT_VELOCITY = 300; // px/s — fling velocity that always commits

// Parallax slide variants.
// Enter: full 100% slide so the incoming stop feels substantial/weighty.
// Exit:  slight 20% slide + fast opacity fade (0.12s). The fade window is so
//        short that the two stops are never visibly overlapping — ghost eliminated.
//        The brief directional slide on exit preserves the layered depth feel.
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 1 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({
    x: dir > 0 ? '-20%' : '20%',
    opacity: 0,
    transition: { x: { type: 'spring' as const, ...Animation.springs.gentle }, opacity: { duration: 0.12 } },
  }),
};

export interface StopNavigatorProps {
  stops: Stop[];
  activeIndex: number;
  onSwipe: (direction: 1 | -1) => void;
  children: React.ReactNode;
}

export function StopNavigator({
  stops,
  activeIndex,
  onSwipe,
  children,
}: StopNavigatorProps) {
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === stops.length - 1;

  // Disable horizontal drag while any sheet/modal is open — prevents swiping
  // between stops when a BottomSheet or DayPickerModal is visible.
  const { openCount } = useSheetContext();
  const dragEnabled = openCount === 0;

  // Track swipe direction so AnimatePresence variants know which way to slide.
  // useEffect keeps this out of the render phase — calling setState during render
  // queues an extra re-render and triggers React warnings in StrictMode.
  const prevIndexRef = useRef(activeIndex);
  const [direction, setDirection] = useState(1);
  useEffect(() => {
    if (prevIndexRef.current !== activeIndex) {
      setDirection(activeIndex > prevIndexRef.current ? 1 : -1);
      prevIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

  return (
    <motion.div
      drag={dragEnabled ? 'x' : false}
      dragDirectionLock
      // Constrain so Framer Motion springs back to origin on release
      dragConstraints={{ left: 0, right: 0 }}
      // Edge elastic: 0.14 at hard-stop edges (alive but not loose), 0.18 in-between
      dragElastic={{
        left:  isLast  ? 0.14 : 0.18,
        right: isFirst ? 0.14 : 0.18,
      }}
      onDragEnd={(_, info) => {
        const dx = info.offset.x;
        const vx = info.velocity.x;
        // Dynamic threshold: 45% of current screen width prevents accidental swipes
        const commitOffset = window.innerWidth * 0.45;
        const committed = Math.abs(dx) > commitOffset || Math.abs(vx) > COMMIT_VELOCITY;

        if (!committed) return;

        if (dx < 0 && !isLast) {
          onSwipe(1);   // swiped left → advance to next stop
        } else if (dx > 0 && !isFirst) {
          onSwipe(-1);  // swiped right → go to previous stop
        }
      }}
      style={{ touchAction: 'pan-y', overflow: 'hidden' }}
      // Spring config for the snap-back animation
      transition={{
        type: 'spring',
        ...Animation.springs.snappy,
      }}
    >
      {/* Parallax slide container — clips the exiting/entering content */}
      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.div
          key={activeIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', ...Animation.springs.gentle }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
