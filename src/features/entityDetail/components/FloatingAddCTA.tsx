// FloatingAddCTA — pinned-to-bottom itinerary action bar for entity detail sheets.
//
// Two states:
//   not added → full-width stop-colored "Add to {stop}" button
//   added      → gold pill: checkmark + stop label + "View" button
//
// Positioned absolute so it floats above the scroll content with a gradient fade.

import { Semantic, Core, Colors, Typography, Spacing, Radius } from '../../../design/tokens';

interface FloatingAddCTAProps {
  onAddToItinerary: () => void;
  isAdded?: boolean;
  stopLabel?: string;
  stopColor?: string;
  onView?: () => void;
}

export function FloatingAddCTA({
  onAddToItinerary,
  isAdded,
  stopLabel,
  stopColor,
  onView,
}: FloatingAddCTAProps) {
  const accent = stopColor ?? Colors.navy;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: `${Spacing.md}px ${Spacing.base}px ${Spacing.xl}px`,
        background: `linear-gradient(180deg, ${Colors.background}00 0%, ${Colors.background}EE 22%, ${Colors.background} 60%)`,
        pointerEvents: 'none',
      }}
    >
      {isAdded ? (
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: Spacing.md,
            background: Semantic.confirmedTint,
            border: `0.5px solid ${Semantic.confirmed}66`,
            borderRadius: Radius.lg,
            padding: `${Spacing.md}px 14px ${Spacing.md}px ${Spacing.md}px`,
            boxShadow: '0 6px 18px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: Radius.full,
              background: Semantic.confirmed,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: Core.white,
            }}
          >
            ✓
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: Typography.family.sans,
                fontSize: `${Typography.size.sm}px`,
                fontWeight: Typography.weight.bold,
                color: Semantic.confirmedDark,
                lineHeight: 1.2,
              }}
            >
              In your itinerary
            </div>
            {stopLabel && (
              <div
                style={{
                  fontFamily: Typography.family.sans,
                  fontStyle: 'italic',
                  fontSize: `${Typography.size.sm}px`,
                  color: Semantic.confirmedDark,
                  opacity: 0.9,
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {stopLabel}
              </div>
            )}
          </div>
          <button
            onClick={onView}
            style={{
              background: 'transparent',
              border: `0.5px solid ${Semantic.confirmed}88`,
              color: Semantic.confirmedDark,
              borderRadius: Radius.full,
              padding: `${Spacing.xs + 2}px ${Spacing.md}px`,
              fontFamily: Typography.family.sans,
              fontSize: `${Typography.size.xs}px`,
              fontWeight: Typography.weight.semibold,
              cursor: 'pointer',
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            View
          </button>
        </div>
      ) : (
        <button
          onClick={onAddToItinerary}
          style={{
            pointerEvents: 'auto',
            width: '100%',
            background: accent,
            color: Core.white,
            border: 'none',
            borderRadius: Radius.lg,
            padding: `${Spacing.base}px`,
            fontFamily: Typography.family.sans,
            fontSize: `${Typography.size.base}px`,
            fontWeight: Typography.weight.semibold,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Spacing.sm,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: `0 8px 22px ${accent}40, 0 1px 2px rgba(0,0,0,0.08)`,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          Add to {stopLabel ?? 'this stop'}
        </button>
      )}
    </div>
  );
}
