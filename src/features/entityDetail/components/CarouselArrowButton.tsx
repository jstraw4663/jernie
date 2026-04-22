import { Colors, Radius, Spacing } from '../../../design/tokens';
import { ChevronLeft, ChevronRight } from './ChevronIcons';

interface CarouselArrowButtonProps {
  dir: 'left' | 'right';
  onClick: () => void;
}

/**
 * Ghost arrow button for scroll-snap carousels.
 * Anchors to the `dir` edge at Spacing.xs inset, vertically centered.
 * Callers render null (or skip) when the button should be hidden at a boundary.
 */
export function CarouselArrowButton({ dir, onClick }: CarouselArrowButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === 'left' ? 'Scroll left' : 'Scroll right'}
      style={{
        position: 'absolute',
        left: dir === 'left' ? `${Spacing.xs}px` : undefined,
        right: dir === 'right' ? `${Spacing.xs}px` : undefined,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 28,
        height: 28,
        borderRadius: `${Radius.full}px`,
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: Colors.textSecondary,
        padding: 0,
        zIndex: 2,
      }}
    >
      {dir === 'left' ? <ChevronLeft /> : <ChevronRight />}
    </button>
  );
}
