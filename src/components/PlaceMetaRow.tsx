import { Icons } from '../design/icons';
import { Colors, Typography, Spacing, Radius } from '../design/tokens';
import { StarRating } from './StarRating';
import type { Place } from '../types';

const DIFFICULTY_STYLES: Record<string, { bg: string; color: string }> = {
  strenuous: { bg: Colors.redLight,     color: Colors.red },
  moderate:  { bg: Colors.goldLight,    color: Colors.gold },
  easy:      { bg: Colors.successLight, color: Colors.success },
};

interface PlaceMetaRowProps {
  place: Place;
}

export function PlaceMetaRow({ place }: PlaceMetaRowProps) {
  if (place.category === 'hike') {
    const hasAny = place.difficulty || place.distance || place.duration;
    if (!hasAny) return null;
    const diffStyle = place.difficulty
      ? (DIFFICULTY_STYLES[place.difficulty.toLowerCase()] ?? DIFFICULTY_STYLES.easy)
      : null;
    return (
      <div style={{ display: 'flex', gap: `${Spacing.sm}px`, flexWrap: 'wrap', marginBottom: `${Spacing.xs}px` }}>
        {place.difficulty && diffStyle && (
          <span style={{ fontSize: `${Typography.size.xs - 1}px`, background: diffStyle.bg, color: diffStyle.color, padding: `1px ${Spacing.sm}px`, borderRadius: `${Radius.full}px`, fontWeight: Typography.weight.bold, letterSpacing: '0.04em', textTransform: 'capitalize' }}>
            {place.difficulty}
          </span>
        )}
        {place.distance && (
          <span style={{ fontSize: `${Typography.size.xs - 1}px`, background: '#F0F4FF', color: '#3557A0', padding: `1px ${Spacing.sm}px`, borderRadius: `${Radius.full}px`, letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icons.Ruler size={10} weight="regular" /> {place.distance}
          </span>
        )}
        {place.duration && (
          <span style={{ fontSize: `${Typography.size.xs - 1}px`, background: '#F5F0FF', color: '#5B3FA6', padding: `1px ${Spacing.sm}px`, borderRadius: `${Radius.full}px`, letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icons.Timer size={10} weight="regular" /> {place.duration}
          </span>
        )}
      </div>
    );
  }

  const hasRating = place.rating != null;
  const hasPrice = !!place.price;
  if (!hasRating && !hasPrice) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs, flexWrap: 'wrap' }}>
      {hasRating && <StarRating rating={place.rating!} compact />}
      {hasPrice && (
        <span style={{
          fontSize: `${Typography.size.xs - 1}px`,
          color: Colors.textMuted,
          fontFamily: Typography.family.sans,
          letterSpacing: '0.02em',
        }}>
          {place.price}
        </span>
      )}
    </div>
  );
}
