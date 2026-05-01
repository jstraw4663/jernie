// DayCard — animated floating card for each itinerary day.
// Staggered entrance fires only on the first visit to each stop (controlled
// by the `shouldAnimate` prop). Subsequent visits render instantly to avoid
// re-running the stagger on every tab switch.
// AnimatePresence collapse/expand for the content area.
// Border/shadow animate via Framer Motion so timing is unified.
//
// PLATFORM NOTE:
//   motion.div → Animated.View with useAnimatedStyle on Expo migration
//   AnimatePresence → conditional render + useAnimatedStyle height animation

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ItineraryDay } from '../types';
import { Colors, Spacing, Radius, Typography, Shadow, Animation } from '../design/tokens';

export interface DayCardProps {
  day: ItineraryDay;
  accent: string;
  isOpen: boolean;
  onToggle: () => void;
  /** True only on first visit to a stop; skips entrance animation on tab switch */
  shouldAnimate: boolean;
  children: React.ReactNode;
}

export const DayCard = React.forwardRef<HTMLDivElement, DayCardProps>(
  function DayCard({ day, accent, isOpen, onToggle, shouldAnimate, children }, ref) {
  return (
    <motion.div
      ref={ref}
      initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
      whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: '-60px' }}
      animate={{
        boxShadow: isOpen ? Shadow.cardHover : Shadow.cardResting,
        borderColor: `${accent}${isOpen ? '35' : '18'}`,
      }}
      transition={{
        opacity:     { type: 'spring', ...Animation.springs.gentle, delay: 0.08 },
        y:           { type: 'spring', ...Animation.springs.gentle, delay: 0.08 },
        boxShadow:   { duration: 0.25, ease: Animation.fm.ease },
        borderColor: { duration: 0.25, ease: Animation.fm.ease },
      }}
      style={{
        borderRadius: `${Radius.lg}px`,
        overflow: 'hidden',
        background: Colors.surface,
        border: `1px solid`,
        // scrollMarginTop: leave room for the sticky nav below the notch.
        // calc() so it adapts to devices with/without a notch/Dynamic Island.
        // Compressed nav content (~89px) + safe-area-inset-top + 8px breathing room.
        scrollMarginTop: 'calc(env(safe-area-inset-top, 0px) + 97px)',
      }}
    >
      {/* Day header / toggle button */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: `${Spacing.md}px ${Spacing.base}px`,
          display: 'flex',
          alignItems: 'center',
          gap: `${Spacing.md}px`,
          background: isOpen ? `${accent}0A` : 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: Typography.family.sans,
          transition: `background ${Animation.duration.fast} ${Animation.easing.default}`,
        }}
      >
        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{day.emoji}</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: Typography.weight.bold,
              fontSize: `${Typography.size.sm}px`,
              color: Colors.textPrimary,
            }}
          >
            {day.date}
          </div>
          <div
            style={{
              fontSize: `${Typography.size.xs}px`,
              color: Colors.textSecondary,
              marginTop: `${Spacing.xxs}px`,
              fontStyle: 'italic',
            }}
          >
            {day.label}
          </div>
        </div>

        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: Animation.fm.ease }}
          style={{
            color: accent,
            fontSize: `${Typography.size.xs}px`,
            display: 'inline-block',
            transformOrigin: 'center',
          }}
        >
          ▼
        </motion.span>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="day-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', ...Animation.springs.lazy }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: `0 ${Spacing.base}px ${Spacing.md}px`,
                borderTop: `1px solid ${accent}15`,
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
