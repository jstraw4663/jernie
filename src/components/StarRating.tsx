import { Colors, Typography } from '../design/tokens';

interface StarRatingProps {
  rating: number;
  /** compact=true: tighter gap and smaller number text (timeline/inline use). Default: false. */
  compact?: boolean;
}

export function StarRating({ rating, compact = false }: StarRatingProps) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const gap = compact ? 1 : 2;
  const starSize = `${Typography.size.xs}px`;
  const numSize = compact
    ? `${Typography.size.xs - 2}px`
    : `${Typography.size.xs}px`;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap, fontSize: starSize, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          style={{ color: i <= full || (i === full + 1 && half) ? '#F59E0B' : Colors.border }}
        >
          ★
        </span>
      ))}
      <span style={{ color: Colors.textMuted, marginLeft: compact ? 2 : 3, fontFamily: Typography.family, fontSize: numSize }}>
        {rating}
      </span>
    </span>
  );
}
