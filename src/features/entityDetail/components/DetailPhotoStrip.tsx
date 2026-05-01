// DetailPhotoStrip — scrollable photo carousel with tap-to-expand lightbox.
//
// Carousel: horizontal scroll-snap, arrow buttons, touch scroll, dot indicators.
// Lightbox: tap a photo → full-screen overlay with prev/next navigation.
//   - Swipe down to dismiss
//   - Swipe left/right to navigate between photos
//   - X button and tap-backdrop also dismiss

import { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion, useMotionValue, useVelocity, animate } from 'framer-motion';
import { Colors, Radius, Shadow, Spacing, Typography, Animation } from '../../../design/tokens';
import { ChevronLeft, ChevronRight } from './ChevronIcons';
import { CarouselArrowButton } from './CarouselArrowButton';
import { useMountVisible } from '../../../hooks/useMountVisible';
import { useScrollCarousel } from '../../../hooks/useScrollCarousel';

// ── Layout constants ──────────────────────────────────────────────────────────

const PHOTO_WIDTH = 260;
const PHOTO_HEIGHT = 200;
/** Photo width + gap — one slot in the scroll-snap grid. */
const PHOTO_SLOT = PHOTO_WIDTH + Spacing.sm;

// ── Lightbox ──────────────────────────────────────────────────────────────────

interface LightboxProps {
  photos: string[];
  initialIndex: number;
  originRect: DOMRect;
  onClose: () => void;
}

const SWIPE_V_THRESHOLD = 80;
const SWIPE_V_VELOCITY = 400;
const SWIPE_H_THRESHOLD = 60;
const SWIPE_H_VELOCITY = 300;

function Lightbox({ photos, initialIndex, originRect, onClose }: LightboxProps) {
  const isVisible = useMountVisible();
  const [index, setIndex] = useState(initialIndex);

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const velX = useVelocity(dragX);
  const velY = useVelocity(dragY);

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const axis = useRef<'h' | 'v' | null>(null);

  // Scale from tapped thumbnail
  const originX = originRect.left + originRect.width / 2;
  const originY = originRect.top + originRect.height / 2;
  const transformOrigin = `${originX}px ${originY}px`;

  // Block background scroll while lightbox is open — no scrollable content inside
  useEffect(() => {
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.body.addEventListener('touchmove', prevent, { passive: false });
    return () => document.body.removeEventListener('touchmove', prevent);
  }, []);

  function goTo(newIndex: number) {
    if (newIndex < 0 || newIndex >= photos.length) return;
    setIndex(newIndex);
    dragX.set(0);
    dragY.set(0);
  }

  function handlePointerDown(e: React.PointerEvent) {
    isDragging.current = true;
    axis.current = null;
    startX.current = e.clientX;
    startY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragX.stop();
    dragY.stop();
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current || startX.current === null || startY.current === null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // Lock axis on first meaningful movement
    if (!axis.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      return;
    }

    if (axis.current === 'v') {
      dragY.set(Math.max(0, dy));
    } else {
      dragX.set(dx);
    }
  }

  function handlePointerUp() {
    if (!isDragging.current) return;
    isDragging.current = false;

    const offsetY = dragY.get();
    const offsetX = dragX.get();
    const vY = velY.get();
    const vX = velX.get();

    if (axis.current === 'v') {
      if (offsetY >= SWIPE_V_THRESHOLD || vY >= SWIPE_V_VELOCITY) {
        onClose();
      } else {
        animate(dragY, 0, { type: 'spring', ...Animation.springs.gentle });
      }
    } else if (axis.current === 'h') {
      if (offsetX < -SWIPE_H_THRESHOLD || vX < -SWIPE_H_VELOCITY) {
        if (index < photos.length - 1) goTo(index + 1);
        else animate(dragX, 0, { type: 'spring', ...Animation.springs.gentle });
      } else if (offsetX > SWIPE_H_THRESHOLD || vX > SWIPE_H_VELOCITY) {
        if (index > 0) goTo(index - 1);
        else animate(dragX, 0, { type: 'spring', ...Animation.springs.gentle });
      } else {
        animate(dragX, 0, { type: 'spring', ...Animation.springs.gentle });
      }
    }

    startX.current = null;
    startY.current = null;
    axis.current = null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="lb-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500 }}
          />

          {/* Photo */}
          <motion.div
            key="lb-photo"
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{
              default: { type: 'spring', ...Animation.springs.cardExpand },
              opacity: { duration: 0.2 },
            }}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 501,
              transformOrigin,
              x: dragX,
              y: dragY,
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              src={photos[index]}
              alt={`Photo ${index + 1} of ${photos.length}`}
              draggable={false}
              style={{ maxWidth: '100vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: `${Radius.lg}px`, display: 'block', pointerEvents: 'none' }}
            />
          </motion.div>

          {/* X button — position directly on the button, no wrapper needed */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'fixed',
              top: `${Spacing.base}px`,
              right: `${Spacing.base}px`,
              zIndex: 502,
              width: 36,
              height: 36,
              borderRadius: `${Radius.full}px`,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ×
          </button>

          {/* Prev/next arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={() => goTo(index - 1)}
                aria-label="Previous photo"
                style={{
                  position: 'fixed',
                  left: `${Spacing.md}px`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 40,
                  height: 40,
                  borderRadius: `${Radius.full}px`,
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: index > 0 ? 'pointer' : 'default',
                  opacity: index > 0 ? 1 : 0.25,
                  transition: 'opacity 200ms ease',
                  padding: 0,
                  zIndex: 502,
                }}
              >
                <ChevronLeft color="#fff" />
              </button>

              <button
                onClick={() => goTo(index + 1)}
                aria-label="Next photo"
                style={{
                  position: 'fixed',
                  right: `${Spacing.md}px`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 40,
                  height: 40,
                  borderRadius: `${Radius.full}px`,
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: index < photos.length - 1 ? 'pointer' : 'default',
                  opacity: index < photos.length - 1 ? 1 : 0.25,
                  transition: 'opacity 200ms ease',
                  padding: 0,
                  zIndex: 502,
                }}
              >
                <ChevronRight color="#fff" />
              </button>
            </>
          )}

          {/* Counter + dots */}
          {photos.length > 1 && (
            <div style={{
              position: 'fixed',
              bottom: `${Spacing.xxl}px`,
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: `${Spacing.xs}px`,
              zIndex: 502,
            }}>
              <span style={{ fontSize: `${Typography.size.xs}px`, color: 'rgba(255,255,255,0.7)', fontFamily: Typography.family.sans }}>
                {index + 1} / {photos.length}
              </span>
              <div style={{ display: 'flex', gap: `${Spacing.xs}px` }}>
                {photos.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === index ? 16 : 6,
                      height: 6,
                      borderRadius: `${Radius.full}px`,
                      background: i === index ? '#fff' : 'rgba(255,255,255,0.35)',
                      transition: 'all 200ms ease',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

// ── DetailPhotoStrip ──────────────────────────────────────────────────────────

interface DetailPhotoStripProps {
  photos: string[];
}

export function DetailPhotoStrip({ photos }: DetailPhotoStripProps) {
  const { scrollRef, canScrollLeft, canScrollRight, activeIndex, scroll } = useScrollCarousel(photos.length, PHOTO_SLOT);
  const [lightbox, setLightbox] = useState<{ index: number; originRect: DOMRect } | null>(null);

  if (photos.length === 0) return null;

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
            paddingRight: `${Spacing.base}px`,
            paddingBottom: `${Spacing.xs}px`,
          } as React.CSSProperties}
        >
          {photos.map((url, i) => (
            <div
              key={i}
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setLightbox({ index: i, originRect: rect });
              }}
              style={{
                flexShrink: 0,
                scrollSnapAlign: 'start',
                width: PHOTO_WIDTH,
                height: PHOTO_HEIGHT,
                borderRadius: `${Radius.lg}px`,
                overflow: 'hidden',
                boxShadow: Shadow.cardResting,
                border: `1px solid ${Colors.border}`,
                cursor: 'pointer',
              }}
            >
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                loading="lazy"
                draggable={false}
                onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ))}
        </div>

        {canScrollLeft  && <CarouselArrowButton dir="left"  onClick={() => scroll('left')}  />}
        {canScrollRight && <CarouselArrowButton dir="right" onClick={() => scroll('right')} />}

        {/* Dot indicators — activeIndex from useScrollCarousel tracks the snapped card */}
        {photos.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: `${Spacing.xs}px`, marginTop: `${Spacing.xs}px` }}>
            {photos.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: `${Radius.full}px`,
                  background: i === activeIndex ? Colors.navy : Colors.border,
                  transition: 'background 200ms ease',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <Lightbox
          photos={photos}
          initialIndex={lightbox.index}
          originRect={lightbox.originRect}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
