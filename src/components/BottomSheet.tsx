// BottomSheet — swipe-down-to-dismiss sheet with overlay, drag handle pill,
// and animated entrance from the bottom. Feels native. CSS transitions only —
// no PWA-specific libraries that won't port to React Native.
//
// Swipe zone covers the full header bar (pill + title row). The overlay is
// visual-only (pointer-events: none) so swipes/scrolls above the sheet reach
// the background app. Dismiss via swipe-down or the headerRight button.
//
// PLATFORM NOTE:
//   - CSS transform/transition → React Native Animated / Reanimated on Expo
//   - Pointer events on swipe zone → PanResponder / Gesture Handler on RN
//   - backdrop-filter → not available on RN (use plain rgba background)

import React, { useRef, useState, useEffect } from 'react';
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

const SWIPE_DISMISS_THRESHOLD = 80; // px downward to trigger dismiss

export function BottomSheet({
  isOpen,
  onRequestClose,
  title,
  headerRight,
  children,
  footer,
}: BottomSheetProps) {
  // Mount on first open; unmount after exit animation completes
  const [mounted, setMounted] = useState(false);
  // isVisible lags one frame behind isOpen so the sheet always starts at
  // translateY(100%) before transitioning in — gives the CSS transition
  // something to animate from.
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Chain Animation.mountFrames rAFs so the browser fully paints the initial
      // translateY(100%) position before the transition fires.
      // Track all IDs so any pending frame can be cancelled on cleanup.
      const rafs: number[] = [];
      const wait = (remaining: number) => {
        if (remaining <= 0) { setIsVisible(true); return; }
        rafs.push(requestAnimationFrame(() => wait(remaining - 1)));
      };
      wait(Animation.mountFrames);
      return () => rafs.forEach(id => cancelAnimationFrame(id));
    } else {
      setIsVisible(false);
      // Keep in DOM until slide-out transition finishes
      const t = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Swipe tracking — activates on the full header bar (pill + title row)
  const dragStartY = useRef<number | null>(null);
  const [swipeDelta, setSwipeDelta] = useState(0);
  const isDraggingHandle = useRef(false);

  function handleHandlePointerDown(e: React.PointerEvent) {
    isDraggingHandle.current = true;
    dragStartY.current = e.clientY;
    // Capture on currentTarget (the swipe zone) so tracking stays consistent
    // even when the pointer moves over child elements (title text, pill, etc.)
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleHandlePointerMove(e: React.PointerEvent) {
    if (!isDraggingHandle.current || dragStartY.current === null) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    setSwipeDelta(delta);
  }

  function handleHandlePointerUp() {
    if (!isDraggingHandle.current) return;
    isDraggingHandle.current = false;
    if (swipeDelta >= SWIPE_DISMISS_THRESHOLD) {
      onRequestClose();
    }
    dragStartY.current = null;
    setSwipeDelta(0);
  }

  // Reset swipe delta when sheet closes
  useEffect(() => {
    if (!isOpen) setSwipeDelta(0);
  }, [isOpen]);

  if (!mounted) return null;

  const sheetTranslate = isVisible
    ? `translateY(${swipeDelta}px)`
    : 'translateY(100%)';

  const useTransition = swipeDelta === 0; // disable transition while actively dragging

  return (
    <>
      {/* Overlay — visual only, pointer-events: none so swipes reach background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: Colors.overlay,
          opacity: isVisible ? 1 : 0,
          transition: `opacity ${Animation.duration.sheet} ${Animation.easing.default}`,
          zIndex: 200,
          pointerEvents: 'none',
        }}
      />

      {/* Sheet */}
      <div
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
          transform: sheetTranslate,
          transition: useTransition
            ? `transform ${Animation.duration.sheet} ${Animation.easing.enter}`
            : 'none',
          zIndex: 201,
          overflow: 'hidden',
        }}
      >
        {/* Swipe zone — covers pill + full header bar so the whole top area
            is a drag target. touchAction:none prevents scroll bleed-through.
            headerRight is wrapped in stopPropagation so the ✓ button doesn't
            accidentally start the swipe tracker. */}
        <div
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
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
          <div
            style={{
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: Radius.full,
                background: Colors.border,
              }}
            />
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

        {/* Scrollable content area.
            touchAction:pan-y claims the vertical gesture so the browser
            won't chain to the body even when content fits on screen.
            overscrollBehavior:contain stops scroll chaining at boundaries. */}
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
        {footer && (
          <div style={{ flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
