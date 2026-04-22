import { useRef, useState, useCallback, useEffect, type RefObject } from 'react';

interface ScrollState {
  left: boolean;
  right: boolean;
  activeIndex: number;
}

interface UseScrollCarouselResult {
  scrollRef: RefObject<HTMLDivElement | null>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  /** Index of the currently-snapped card. Only computed when cardSlotWidth > 0; otherwise 0. */
  activeIndex: number;
  scroll: (dir: 'left' | 'right') => void;
}

/**
 * Manages horizontal scroll-snap carousel state.
 * @param itemCount     Number of items — triggers re-measure when the list changes.
 * @param cardSlotWidth Card width + gap in px. Enables activeIndex tracking when provided.
 */
export function useScrollCarousel(itemCount: number, cardSlotWidth = 0): UseScrollCarouselResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ScrollState>({ left: false, right: false, activeIndex: 0 });

  const checkScrollability = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const newLeft = el.scrollLeft > 0;
    const newRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    const newActive = cardSlotWidth > 0 ? Math.round(el.scrollLeft / cardSlotWidth) : 0;
    // Same-reference return skips re-render when nothing changed
    setState(prev =>
      prev.left === newLeft && prev.right === newRight && prev.activeIndex === newActive
        ? prev
        : { left: newLeft, right: newRight, activeIndex: newActive }
    );
  }, [cardSlotWidth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScrollability();
    el.addEventListener('scroll', checkScrollability, { passive: true });
    return () => el.removeEventListener('scroll', checkScrollability);
  }, [itemCount, checkScrollability]);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -(el.clientWidth * 0.8) : el.clientWidth * 0.8, behavior: 'smooth' });
  }, []);

  return { scrollRef, canScrollLeft: state.left, canScrollRight: state.right, activeIndex: state.activeIndex, scroll };
}
