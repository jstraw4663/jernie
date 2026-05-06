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
  compress?: number;
  onExpandBar?: () => void;
}

export function FloatingAddCTA({
  onAddToItinerary,
  isAdded,
  stopLabel,
  stopColor,
  onView,
  compress,
  onExpandBar,
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
        (() => {
          const c = compress ?? 0;
          // Collapsed target: tight circle just slightly larger than the 36px checkmark.
          const COLLAPSED_PAD = Spacing.xs; // 4px — snug around the circle
          const CIRCLE_W = 36 + COLLAPSED_PAD * 2; // 44px collapsed diameter
          // All padding animates inward so height matches width at full collapse.
          const pad      = Spacing.md - (Spacing.md - COLLAPSED_PAD) * c; // 12 → 4
          const rightPad = 14 - (14 - COLLAPSED_PAD) * c;                 // 14 → 4
          const pillW      = `calc(${((1 - c) * 100).toFixed(2)}% + ${(CIRCLE_W * c).toFixed(2)}px)`;
          const pillGap    = Spacing.md * (1 - c);
          const pillRadius = Radius.lg + (Radius.full - Radius.lg) * c;
          // Fade text slightly ahead of the clip so there's no hard text cut-off.
          const textFade   = Math.max(0, 1 - c * 3);
          return (
            <div
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: pillGap,
                background: Semantic.confirmedTint,
                border: `0.5px solid ${Semantic.confirmed}66`,
                borderRadius: pillRadius,
                padding: `${pad}px ${rightPad}px ${pad}px ${pad}px`,
                boxShadow: '0 6px 18px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.04)',
                width: pillW,
                overflow: 'hidden',
              }}
            >
              <div
                onClick={c > 0.5 ? onExpandBar : undefined}
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
                  cursor: c > 0.5 ? 'pointer' : 'default',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                ✓
              </div>
              <div style={{ flex: 1, minWidth: 0, opacity: textFade }}>
                <div
                  style={{
                    fontFamily: Typography.family.sans,
                    fontSize: `${Typography.size.sm}px`,
                    fontWeight: Typography.weight.bold,
                    color: Semantic.confirmedDark,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
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
                  opacity: textFade,
                }}
              >
                View
              </button>
            </div>
          );
        })()
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
