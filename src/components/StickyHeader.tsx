// StickyHeader — animated sticky header with scroll-driven compression.
// Framer Motion useScroll + useTransform:
//   scroll 0→80px: title 24px→17px, dates/details fade out
//   scroll 0→60px: tab bar padding compresses (8px reduction top/bottom)
//   active tab indicator slides between tabs via layoutId="tab-indicator"
//
// Receives a scrollRef pointing at the scrolling container element so
// useScroll can track its position rather than the window.
//
// PLATFORM NOTE:
//   CSS transitions → Reanimated useScrollHandler on Expo migration
//   layoutId (shared element) → Moti/Reanimated shared transitions

import React from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from 'framer-motion';
import type { Stop } from '../types';
import { Spacing, Typography } from '../design/tokens';
import { StopsBar } from './StopsBar';

export interface StickyHeaderProps {
  stops: Stop[];
  active: string;
  onTabChange: (id: string) => void;
  /** Ref on the scrolling container — used by useScroll for offset tracking */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  tripDates: string;
  tripTitle: string;
  tagline: string;
  pills: [string, string][];
  /** Rendered inside the expanded header section */
  headerSlot?: React.ReactNode;
}

export function StickyHeader({
  stops,
  active,
  onTabChange,
  scrollRef,
  tripDates,
  tripTitle,
  tagline,
  pills,
  headerSlot,
}: StickyHeaderProps) {
  const { scrollY } = useScroll({
    container: scrollRef as React.RefObject<HTMLElement>,
  });

  // Low stiffness = gradual, organic compression. Fluid trailing feel, no snap or bounce.
  const smoothY = useSpring(scrollY, { stiffness: 45, damping: 18, restDelta: 0.001 });

  const titleFontSize = useTransform(smoothY, [0, 300], [24, 17]);
  const titleLetterSpacing = useTransform(smoothY, [0, 300], [-0.01, 0.01]);
  const dateMarginBottom = useTransform(smoothY, [0, 300], [Spacing.md, Spacing.xxs]);
  const detailsOpacity = useTransform(smoothY, [0, 300], [1, 0]);
  const detailsMaxHeight = useTransform(smoothY, [0, 350], [300, 0]);
  const headerPaddingTop = useTransform(smoothY, [0, 300], [48, 8]);
  const headerPaddingBottom = useTransform(smoothY, [0, 300], [36, 6]);
  return (
    <div
      data-sticky-nav
      style={{
        position: 'sticky',
        top: -1,      // pulls 1px into the container top — closes iOS subpixel rendering gap
        paddingTop: 1, // compensates so inner layout doesn't shift
        zIndex: 100,
      }}
    >
      {/* ── Gradient header ─────────────────────────────────── */}
      <motion.div
        style={{
          background: 'linear-gradient(135deg,#0D2B3E 0%,#1B4D6B 60%,#0D2B3E 100%)',
          paddingTop: headerPaddingTop,
          paddingBottom: headerPaddingBottom,
          paddingLeft: `${Spacing.xl}px`,
          paddingRight: `${Spacing.xl}px`,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Notch / Dynamic Island spacer — pushes content below the status bar area.
            The gradient background fills behind it so the navy box covers the notch. */}
        <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />

        {/* Decorative radial overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 50%,rgba(255,255,255,0.05) 0%,transparent 60%),' +
              'radial-gradient(circle at 80% 20%,rgba(255,255,255,0.04) 0%,transparent 50%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Dates — always visible above the title in both expanded and compressed states */}
          <motion.div
            style={{
              fontSize: `${Typography.size.xs}px`,
              letterSpacing: '0.3em',
              color: '#A8C4D4',
              textTransform: 'uppercase',
              marginBottom: dateMarginBottom,
            }}
          >
            {tripDates}
          </motion.div>

          {/* Title — compresses on scroll */}
          <motion.h1
            style={{
              margin: 0,
              fontSize: titleFontSize,
              fontWeight: Typography.weight.regular,
              color: '#FDFAF4',
              lineHeight: Typography.lineHeight.tight,
              letterSpacing: titleLetterSpacing,
              fontFamily: Typography.family,
            }}
          >
            {tripTitle}
          </motion.h1>

          {/* Tagline + pills + slot — fade + collapse on scroll */}
          <motion.div
            style={{
              opacity: detailsOpacity,
              maxHeight: detailsMaxHeight,
              overflow: 'hidden',
            }}
          >
            <p
              style={{
                margin: `${Spacing.sm}px auto 0`,
                maxWidth: '500px',
                color: '#7A9FB5',
                fontSize: `${Typography.size.xs + 1}px`,
                fontStyle: 'italic',
              }}
            >
              {tagline}
            </p>
            <div
              style={{
                marginTop: `${Spacing.base}px`,
                display: 'flex',
                justifyContent: 'center',
                gap: `${Spacing.xl}px`,
                flexWrap: 'wrap',
              }}
            >
              {pills.map(([e, l]) => (
                  <div
                    key={l}
                    style={{ color: '#C8DDE8', fontSize: `${Typography.size.xs}px`, letterSpacing: '0.04em' }}
                  >
                    {e} {l}
                  </div>
                )
              )}
            </div>
            {headerSlot}
          </motion.div>
        </div>
      </motion.div>

      {/* ── Stops bar ───────────────────────────────────────── */}
      <StopsBar stops={stops} active={active} onTabChange={onTabChange} />
    </div>
  );
}
