// ReviewCarousel — horizontal scrollable review cards with tap-to-expand overlay.
//
// Carousel: scroll-snap, arrow buttons, 1.5–2 cards visible (peek effect).
// Expand: tap a card → scales up to ~75% screen with full review text.
// Dismiss: X button, swipe down on handle pill, or tap backdrop.
// Navigate: arrows or swipe handle left/right; background carousel tracks expanded index.
// End card: "See all reviews on Google Maps" CTA (only when googlePlaceId provided).
//
// Animation patterns mirror BottomSheet.tsx:
//   - useMountVisible RAF guard before triggering AnimatePresence
//   - swipe-down: useMotionValue + useVelocity → dismiss or spring-back
//   - enter: Animation.springs.cardExpand; exit: short easeIn tween
//
// PLATFORM NOTE:
//   - useMotionValue + animate → Reanimated useSharedValue + withSpring on Expo
//   - transformOrigin for scale-from-card → RN doesn't support; use shared element transition

import { useRef, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion, useMotionValue, useVelocity, animate } from 'framer-motion';
import { Colors, Radius, Shadow, Spacing, Typography, Animation } from '../../../design/tokens';
import type { PlaceReview } from '../../../types';
import { ChevronLeft, ChevronRight } from './ChevronIcons';
import { CarouselArrowButton } from './CarouselArrowButton';
import { useMountVisible } from '../../../hooks/useMountVisible';
import { useScrollCarousel } from '../../../hooks/useScrollCarousel';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_WIDTH = 240;
const CARD_MIN_HEIGHT = 140;
/** Card width + gap — one slot in the scroll-snap grid. */
const CARD_SLOT = CARD_WIDTH + Spacing.sm;
/** Right padding that lets the next card peek in, signalling scrollability. */
const PEEK_PADDING = 56;

const SWIPE_DISMISS_THRESHOLD = 80;
const VELOCITY_DISMISS_THRESHOLD = 400;
const SWIPE_H_THRESHOLD = 40;

// ── StarRow ───────────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ fontSize: 13, color: i < Math.round(rating) ? Colors.gold : Colors.border, lineHeight: 1 }}>
          ★
        </span>
      ))}
    </div>
  );
}

// ── NavButton — shared prev/next for ExpandedOverlay footer ──────────────────

function NavButton({ dir, disabled, onClick }: { dir: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'left' ? 'Previous review' : 'Next review'}
      style={{
        width: 32,
        height: 32,
        borderRadius: `${Radius.full}px`,
        background: disabled ? 'transparent' : Colors.border,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        color: Colors.textSecondary,
        opacity: disabled ? 0.3 : 1,
        padding: 0,
        transition: 'opacity 150ms ease',
      }}
    >
      {dir === 'left' ? <ChevronLeft /> : <ChevronRight />}
    </button>
  );
}

// ── ExpandedOverlay ───────────────────────────────────────────────────────────

interface ExpandedOverlayProps {
  reviews: PlaceReview[];
  initialIndex: number;
  originRect: DOMRect;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

function ExpandedOverlay({ reviews, initialIndex, originRect, onClose, onIndexChange }: ExpandedOverlayProps) {
  const isVisible = useMountVisible();
  const [index, setIndex] = useState(initialIndex);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragY = useMotionValue(0);
  const dragVelocity = useVelocity(dragY);

  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragAxis = useRef<'h' | 'v' | null>(null);
  const isDragging = useRef(false);

  const originX = originRect.left + originRect.width / 2;
  const originY = originRect.top + originRect.height / 2;
  const transformOrigin = `${originX}px ${originY}px`;
  const review = reviews[index];

  // Block page scroll while overlay is open — non-passive touchmove walks the DOM
  // tree; if a scrollable child still has room to scroll, let it, otherwise
  // preventDefault stops the background page from scrolling.
  const preventScroll = useCallback((e: TouchEvent) => {
    let el = e.target as HTMLElement | null;
    while (el && el !== cardRef.current) {
      const { overflowY } = window.getComputedStyle(el);
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return;
      el = el.parentElement;
    }
    e.preventDefault();
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !isVisible) return;
    el.addEventListener('touchmove', preventScroll, { passive: false });
    return () => el.removeEventListener('touchmove', preventScroll);
  }, [isVisible, preventScroll]);

  function navigate(newIndex: number) {
    setIndex(newIndex);
    onIndexChange?.(newIndex);
    dragY.set(0);
  }

  // Drag handle: axis-locked — horizontal swipe navigates, vertical swipe dismisses
  function handleSwipeStart(e: React.PointerEvent) {
    isDragging.current = true;
    dragAxis.current = null;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragY.stop();
  }

  function handleSwipeMove(e: React.PointerEvent) {
    if (!isDragging.current || dragStartX.current === null || dragStartY.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - dragStartY.current;
    if (!dragAxis.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        dragAxis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      return;
    }
    if (dragAxis.current === 'v') dragY.set(Math.max(0, dy));
  }

  function handleSwipeEnd(e: React.PointerEvent) {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dx = dragStartX.current !== null ? e.clientX - dragStartX.current : 0;
    dragStartX.current = null;
    dragStartY.current = null;

    if (dragAxis.current === 'h') {
      if (dx < -SWIPE_H_THRESHOLD && index < reviews.length - 1) navigate(index + 1);
      else if (dx > SWIPE_H_THRESHOLD && index > 0) navigate(index - 1);
    } else if (dragAxis.current === 'v') {
      const offset = dragY.get();
      const velocity = dragVelocity.get();
      if (offset >= SWIPE_DISMISS_THRESHOLD || velocity >= VELOCITY_DISMISS_THRESHOLD) {
        onClose();
      } else {
        animate(dragY, 0, { type: 'spring', ...Animation.springs.gentle });
      }
    }
    dragAxis.current = null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: Colors.overlay, zIndex: 400, touchAction: 'none' }}
          />

          {/* Centering wrapper — flexbox centers; motion.div handles spring + drag offset */}
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 401, pointerEvents: 'none' }}>
            <motion.div
              ref={cardRef}
              variants={{
                hidden: { scale: 0.82, opacity: 0 },
                visible: { scale: 1, opacity: 1 },
                exit: { scale: 0.82, opacity: 0, transition: { duration: 0.18, ease: Animation.fm.easeIn } },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: 'spring', ...Animation.springs.cardExpand }}
              style={{
                width: 'min(340px, 88vw)',
                maxHeight: '78vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: `${Radius.xl}px`,
                background: Colors.surface,
                boxShadow: Shadow.xl,
                overflow: 'hidden',
                transformOrigin,
                y: dragY,
                pointerEvents: 'auto',
              }}
            >
              {/* Drag handle — vertical swipe dismisses, horizontal swipe navigates */}
              <div
                onPointerDown={handleSwipeStart}
                onPointerMove={handleSwipeMove}
                onPointerUp={handleSwipeEnd}
                onPointerCancel={handleSwipeEnd}
                style={{
                  flexShrink: 0,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'grab',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  borderBottom: `1px solid ${Colors.border}`,
                }}
              >
                <div style={{ width: 32, height: 3, borderRadius: `${Radius.full}px`, background: Colors.border }} />
              </div>

              {/* Scrollable content */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
                padding: `${Spacing.base}px ${Spacing.xl}px ${Spacing.xl}px`,
                position: 'relative',
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  aria-label="Close"
                  style={{
                    position: 'absolute',
                    top: `${Spacing.sm}px`,
                    right: `${Spacing.sm}px`,
                    width: 32,
                    height: 32,
                    borderRadius: `${Radius.full}px`,
                    background: Colors.border,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: Colors.textSecondary,
                    fontSize: 16,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>

                <div style={{ marginBottom: `${Spacing.md}px`, paddingRight: `${Spacing.xl}px` }}>
                  <StarRow rating={review.rating} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: `${Spacing.xs}px`, marginTop: `${Spacing.xs}px` }}>
                    <span style={{ fontWeight: Typography.weight.bold, fontSize: `${Typography.size.sm}px`, color: Colors.textPrimary, fontFamily: Typography.family }}>
                      {review.author}
                    </span>
                    {review.time && (
                      <>
                        <span style={{ color: Colors.border, fontSize: `${Typography.size.xs}px` }}>·</span>
                        <span style={{ fontSize: `${Typography.size.xs}px`, color: Colors.textMuted, fontFamily: Typography.family }}>
                          {review.time}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ height: 1, background: Colors.border, marginBottom: `${Spacing.md}px` }} />

                <p style={{ margin: 0, fontSize: `${Typography.size.sm}px`, lineHeight: Typography.lineHeight.relaxed, color: Colors.textSecondary, fontFamily: Typography.family }}>
                  {review.text || 'No review text provided.'}
                </p>
              </div>

              {reviews.length > 1 && (
                <div style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `${Spacing.sm}px ${Spacing.base}px`,
                  borderTop: `1px solid ${Colors.border}`,
                }}>
                  <NavButton dir="left" disabled={index === 0} onClick={() => navigate(index - 1)} />
                  <span style={{ fontSize: `${Typography.size.xs}px`, color: Colors.textMuted, fontFamily: Typography.family }}>
                    {index + 1} of {reviews.length}
                  </span>
                  <NavButton dir="right" disabled={index === reviews.length - 1} onClick={() => navigate(index + 1)} />
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── ReviewCarousel ────────────────────────────────────────────────────────────

interface ReviewCarouselProps {
  reviews: PlaceReview[];
  googlePlaceId?: string;
  placeName?: string;
}

export function ReviewCarousel({ reviews, googlePlaceId, placeName }: ReviewCarouselProps) {
  const totalItems = reviews.length + (googlePlaceId ? 1 : 0);
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useScrollCarousel(totalItems);
  const [expanded, setExpanded] = useState<{ initialIndex: number; originRect: DOMRect } | null>(null);

  // Scroll background carousel to match the index the user navigated to in expanded view
  const scrollToIndex = useCallback((i: number) => {
    scrollRef.current?.scrollTo({ left: i * CARD_SLOT, behavior: 'smooth' });
  }, [scrollRef]);

  if (reviews.length === 0) return null;

  const showArrows = totalItems > 1;
  // query + query_place_id is the officially supported Maps Platform format for deep-linking
  // to a specific place listing. query disambiguates; query_place_id pins the exact place.
  const mapsUrl = googlePlaceId
    ? `https://www.google.com/maps/search/?api=1${placeName ? `&query=${encodeURIComponent(placeName)}` : ''}&query_place_id=${googlePlaceId}`
    : null;

  return (
    <>
      <div style={{ position: 'relative', marginBottom: `${Spacing.base}px` }}>
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: `${Spacing.sm}px`,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            paddingLeft: `${Spacing.base}px`,
            paddingRight: PEEK_PADDING,
            paddingBottom: `${Spacing.xs}px`,
          } as React.CSSProperties}
        >
          {reviews.map((review, i) => (
            <div
              key={i}
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setExpanded({ initialIndex: i, originRect: rect });
              }}
              style={{
                flexShrink: 0,
                scrollSnapAlign: 'start',
                width: CARD_WIDTH,
                minHeight: CARD_MIN_HEIGHT,
                borderRadius: `${Radius.lg}px`,
                background: Colors.surface,
                boxShadow: Shadow.cardResting,
                border: `1px solid ${Colors.border}`,
                padding: `${Spacing.md}px`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: `${Spacing.xs}px`,
              }}
            >
              <StarRow rating={review.rating} />

              <div style={{ display: 'flex', alignItems: 'center', gap: `${Spacing.xs}px`, flexWrap: 'wrap' as const }}>
                <span style={{ fontWeight: Typography.weight.bold, fontSize: `${Typography.size.xs}px`, color: Colors.textPrimary, fontFamily: Typography.family }}>
                  {review.author}
                </span>
                {review.time && (
                  <>
                    <span style={{ color: Colors.border, fontSize: `${Typography.size.xs}px` }}>·</span>
                    <span style={{ fontSize: `${Typography.size.xs}px`, color: Colors.textMuted, fontFamily: Typography.family }}>
                      {review.time}
                    </span>
                  </>
                )}
              </div>

              <div style={{ height: 1, background: Colors.border }} />

              {review.text && (
                <p
                  style={{
                    margin: 0,
                    fontSize: `${Typography.size.xs}px`,
                    lineHeight: Typography.lineHeight.normal,
                    color: Colors.textSecondary,
                    fontFamily: Typography.family,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    flex: 1,
                  } as React.CSSProperties}
                >
                  {review.text}
                </p>
              )}
            </div>
          ))}

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                flexShrink: 0,
                scrollSnapAlign: 'start',
                width: CARD_WIDTH,
                minHeight: CARD_MIN_HEIGHT,
                borderRadius: `${Radius.lg}px`,
                background: Colors.surface,
                boxShadow: Shadow.cardResting,
                border: `1px solid ${Colors.border}`,
                padding: `${Spacing.md}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: `${Spacing.sm}px`,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 28 }}>🗺️</span>
              <span style={{ fontWeight: Typography.weight.semibold, fontSize: `${Typography.size.sm}px`, color: Colors.textPrimary, fontFamily: Typography.family, textAlign: 'center' as const }}>
                See all reviews
              </span>
              <span style={{ fontSize: `${Typography.size.xs}px`, color: Colors.textMuted, fontFamily: Typography.family, textAlign: 'center' as const }}>
                on Google Maps →
              </span>
            </a>
          )}
        </div>

        {showArrows && canScrollLeft  && <CarouselArrowButton dir="left"  onClick={() => scroll('left')}  />}
        {showArrows && canScrollRight && <CarouselArrowButton dir="right" onClick={() => scroll('right')} />}
      </div>

      {expanded && (
        <ExpandedOverlay
          reviews={reviews}
          initialIndex={expanded.initialIndex}
          originRect={expanded.originRect}
          onClose={() => setExpanded(null)}
          onIndexChange={scrollToIndex}
        />
      )}
    </>
  );
}
