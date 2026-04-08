// ScrollReveal — standard scroll-triggered entrance for card-level content.
//
// Design language rule: every discrete card or list item that appears below the
// fold should be wrapped in <ScrollReveal>. Once the card enters the viewport it
// animates in once and stays — scrolling up/down never re-triggers it.
//
// Usage:
//   <ScrollReveal index={i}>
//     <MyCard />
//   </ScrollReveal>
//
// Props:
//   index   — position in a list; adds 0.025s per item for a gentle cascade (default 0)
//   margin  — how far inside the viewport before triggering, as a CSS margin string
//             (default '-30px'). Increase to '-60px' for taller cards like DayCard.
//   style   — forwarded to the motion.div wrapper (e.g. display, width overrides)
//
// PLATFORM NOTE:
//   motion.div → Animated.View on Expo migration
//   whileInView → useAnimatedStyle + useSharedValue + IntersectionObserver polyfill

import React from 'react';
import { motion } from 'framer-motion';
import { Animation } from '../design/tokens';

interface ScrollRevealProps {
  children: React.ReactNode;
  index?: number;
  margin?: string;
  style?: React.CSSProperties;
}

export function ScrollReveal({ children, index = 0, margin = '-30px', style }: ScrollRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin }}
      transition={{
        type: 'spring',
        ...Animation.springs.gentle,
        delay: 0.08 + index * 0.025,
      }}
      style={style}
    >
      {children}
    </motion.div>
  );
}
