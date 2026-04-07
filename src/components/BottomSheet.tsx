// BottomSheet — swipe-down-to-dismiss sheet with overlay, drag handle pill,
// and animated entrance from the bottom. Feels native.
//
// Gesture tracking uses Framer Motion useMotionValue + useVelocity so dismiss
// carries the velocity of the user's swipe into the exit animation — same
// physics as the enter spring, no CSS transition snap.
//
// Enter:  spring (gentle) from off-screen to 0
// Exit:   easeIn tween (accelerate away) OR velocity-carried dismiss
// Drag:   sheetY MotionValue updated directly in pointer handlers (no re-renders)
// Snap-back (below threshold): snappy spring back to 0
//
// PLATFORM NOTE:
//   - useMotionValue + animate → Reanimated useSharedValue + withSpring on Expo
//   - Pointer events on swipe zone → PanResponder / Gesture Handler on RN
//   - backdrop-filter → not available on RN (use plain rgba background)

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useVelocity, animate } from 'framer-motion';
import { Colors, Spacing, Radius, Animation, Shadow } from '../design/tokens';

export interface BottomSheetProps {
  isOpen: boolean;
  /** Called when the sheet should close (swipe-down or overlay tap) */
  onRequestClose: () => void;
  title?: string;
  /** Slot for top-right header action (e.g. checkmark confirm button) */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** Pinned below the scroll area — use for ActionBar */
  footer?: React.ReactNode;
}

const SWIPE_DISMISS_THRESHOLD = 80;   // px down to trigger dismiss
const VELOCITY_DISMISS_THRESHOLD = 400; // px/s downward flick velocity
const SHEET_OFFSCREEN = typeof window !== 'undefined' ? window.innerHeight : 800;

export function BottomSheet({
  isOpen,
  onRequestClose,
  title,
  headerRight,
  children,
  footer,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Single MotionValue drives all vertical position of the sheet.
  // 0 = fully open. Positive values move the sheet down (toward dismiss).
  // Initialized off-screen so the enter animation always slides up from below.
  const sheetY = useMotionValue(SHEET_OFFSCREEN);
  const sheetVelocity = useVelocity(sheetY);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Chain mountFrames rAFs so the browser fully paints the initial off-screen
      // position before the enter spring fires.
      const rafs: number[] = [];
      const wait = (remaining: number) => {
        if (remaining <= 0) { setIsVisible(true); return; }
        rafs.push(requestAnimationFrame(() => wait(remaining - 1)));
      };
      wait(Animation.mountFrames);
      return () => rafs.forEach(id => cancelAnimationFrame(id));
    } else {
      setIsVisible(false);
      const t = setTimeout(() => setMounted(false), 420);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Drive sheetY via imperative animate() on visibility change.
  // Enter: spring — feels the same as all other FM springs in the app.
  // Exit:  easeIn tween — accelerates away, doesn't decelerate like enter.
  useEffect(() => {
    if (isVisible) {
      animate(sheetY, 0, { type: 'spring', ...Animation.springs.gentle });
    } else {
      // Exit uses a tween with explicit duration — springs are useless here because
      // the force is proportional to the distance (window.innerHeight ≈ 850px),
      // so even low-stiffness springs complete in <200ms and look instantaneous.
      // 500ms easeIn gives a deliberate, visible glide that accelerates off-screen.
      animate(sheetY, SHEET_OFFSCREEN, {
        type: 'tween',
        duration: 0.5,
        ease: [0.4, 0, 0.9, 1],
      });
    }
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset sheetY to off-screen when fully unmounted so the next open
  // always enters from below.
  useEffect(() => {
    if (!mounted) {
      sheetY.set(SHEET_OFFSCREEN);
    }
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Non-passive touchmove on the sheet panel blocks iOS scroll bleed-through
  // when sheet content is short (non-scrollable). Passes through when a
  // scrollable child still has content to reveal.
  const sheetRef = useRef<HTMLDivElement>(null);
  const preventScroll = useCallback((e: TouchEvent) => {
    let el = e.target as HTMLElement | null;
    while (el && el !== sheetRef.current) {
      const { overflowY } = window.getComputedStyle(el);
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return;
      el = el.parentElement;
    }
    e.preventDefault();
  }, []);
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    if (isVisible) {
      el.addEventListener('touchmove', preventScroll, { passive: false });
    } else {
      el.removeEventListener('touchmove', preventScroll);
    }
    return () => el.removeEventListener('touchmove', preventScroll);
  }, [isVisible, preventScroll]);

  // Swipe tracking — pointer handlers update sheetY directly (no setState,
  // no re-renders) so tracking is frame-perfect. useVelocity reads the
  // instantaneous velocity of sheetY to decide fast-flick dismiss.
  const dragStartY = useRef<number | null>(null);
  const isDragging = useRef(false);

  function handleSwipeStart(e: React.PointerEvent) {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // Stop any in-progress spring so drag feels immediate
    sheetY.stop();
  }

  function handleSwipeMove(e: React.PointerEvent) {
    if (!isDragging.current || dragStartY.current === null) return;
    sheetY.set(Math.max(0, e.clientY - dragStartY.current));
  }

  function handleSwipeEnd() {
    if (!isDragging.current) return;
    isDragging.current = false;
    dragStartY.current = null;

    const offset = sheetY.get();
    const velocity = sheetVelocity.get();

    if (offset >= SWIPE_DISMISS_THRESHOLD || velocity >= VELOCITY_DISMISS_THRESHOLD) {
      // Dismiss: onRequestClose → isVisible=false → animate to off-screen
      onRequestClose();
    } else {
      // Snap back to fully open — gentle spring matches the enter feel
      animate(sheetY, 0, { type: 'spring', ...Animation.springs.gentle });
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onRequestClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: Colors.overlay,
          opacity: isVisible ? 1 : 0,
          transition: `opacity ${Animation.duration.sheet} ${Animation.easing.default}`,
          zIndex: 200,
          pointerEvents: isVisible ? 'auto' : 'none',
          touchAction: isVisible ? 'none' : 'auto',
        }}
      />

      {/* Sheet */}
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '85vh',
          background: Colors.surface,
          borderTopLeftRadius: Radius.xl,
          borderTopRightRadius: Radius.xl,
          boxShadow: Shadow.xl,
          display: 'flex',
          flexDirection: 'column',
          y: sheetY,
          zIndex: 201,
          overflow: 'hidden',
        }}
      >
        {/* Swipe zone — covers pill + full header bar */}
        <div
          onPointerDown={handleSwipeStart}
          onPointerMove={handleSwipeMove}
          onPointerUp={handleSwipeEnd}
          onPointerCancel={handleSwipeEnd}
          style={{
            flexShrink: 0,
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            borderBottom: `1px solid ${Colors.border}`,
          }}
        >
          {/* Pill */}
          <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 4, borderRadius: Radius.full, background: Colors.border }} />
          </div>

          {/* Title row */}
          {(title || headerRight) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${Spacing.xs}px ${Spacing.base}px ${Spacing.sm}px`,
              }}
            >
              <span
                style={{
                  fontSize: 17,
                  fontFamily: 'Georgia, serif',
                  fontWeight: '600',
                  color: Colors.textPrimary,
                }}
              >
                {title}
              </span>
              {/* stopPropagation so the ✓ tap doesn't trigger the swipe tracker */}
              <div onPointerDown={e => e.stopPropagation()}>
                {headerRight}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable content area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </div>

        {/* Pinned footer (ActionBar lives here) */}
        {footer ? (
          // Safe-area inset goes into the footer div so the space is "used" by the
          // footer content rather than appearing as a blank strip below it.
          <div style={{ flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {footer}
          </div>
        ) : (
          // No footer — still need the bottom cushion for scrollable content.
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)', flexShrink: 0 }} />
        )}
      </motion.div>
    </>
  );
}
