import { motion, AnimatePresence } from 'framer-motion';
import type { Place, PlaceEnrichment, Stop } from '../../types';
import { PlaceCarouselCard } from './PlaceCarouselCard';
import { useScrollCarousel } from '../../hooks/useScrollCarousel';
import { Colors, Spacing, Typography, Radius, Animation } from '../../design/tokens';

interface PlaceCarouselProps {
  label: string;
  places: Place[];
  stopMap: Record<string, Stop>;
  enrichmentMap: Record<string, PlaceEnrichment>;
  onCardClick?: (place: Place, rect: DOMRect) => void;
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {direction === 'left'
        ? <polyline points="15 18 9 12 15 6" />
        : <polyline points="9 18 15 12 9 6" />
      }
    </svg>
  );
}

export function PlaceCarousel({ label, places, stopMap, enrichmentMap, onCardClick }: PlaceCarouselProps) {
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useScrollCarousel(places.length);

  if (places.length < 2) return null;

  const buttonStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    top: '50%',
    [side]: 0,
    transform: 'translateY(-50%)',
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: `${Radius.full}px`,
    background: Colors.surfaceRaised,
    border: `1px solid ${Colors.border}`,
    color: Colors.textPrimary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  });

  return (
    <div style={{ marginBottom: Spacing.lg }}>
      {/* Row header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: Spacing.xs,
        paddingLeft: Spacing.base,
        paddingRight: Spacing.base,
        marginBottom: Spacing.sm,
      }}>
        <span style={{
          fontFamily: Typography.family,
          fontWeight: Typography.weight.bold,
          fontSize: `${Typography.size.base}px`,
          color: Colors.textPrimary,
        }}>
          {label}
        </span>
        <span style={{ fontSize: `${Typography.size.xs}px`, color: Colors.textMuted }}>
          {places.length}
        </span>
      </div>

      {/* Scroll row */}
      <div style={{ position: 'relative' }}>
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: Spacing.sm,
            overflowX: 'auto',
            paddingLeft: Spacing.base,
            paddingRight: Spacing.base,
            paddingBottom: Spacing.xs,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {places.map((place, i) => (
            <motion.div
              key={place.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04, ease: Animation.fm.easeOut }}
            >
              <PlaceCarouselCard
                place={place}
                stopName={stopMap[place.stop_id]?.city ?? ''}
                accent={stopMap[place.stop_id]?.accent ?? Colors.navy}
                enrichment={enrichmentMap[place.id]}
                onClick={onCardClick}
              />
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              key="left"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => scroll('left')}
              style={buttonStyle('left')}
              aria-label="Scroll left"
            >
              <ChevronIcon direction="left" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              key="right"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => scroll('right')}
              style={buttonStyle('right')}
              aria-label="Scroll right"
            >
              <ChevronIcon direction="right" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
