// ActionBar — bottom bar inside the BottomSheet housing Delete and Move actions.
//
// Layout:
//   [Delete (left)]          [Move (right)]
//
// Both buttons are disabled (faded, non-interactive) when selectedCount === 0.
// Move can also be disabled with a reason string (multi-stop edge case).
//
// PLATFORM NOTE: inline styles via tokens → React Native StyleSheet on Expo.

import { Colors, Spacing, Radius, Typography, Animation } from '../design/tokens';

export interface ActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onMove: () => void;
  /** When set, Move button is disabled and shows this tooltip text on press */
  moveDisabledReason?: string;
}

// SVG icons — inline for portability (no file imports needed)
function DeleteIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 4L16 16M16 4L4 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MoveIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      {/* Calendar base */}
      <rect x="2" y="5" width="13" height="12" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M6 3v4M11 3v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 9h13" stroke={color} strokeWidth="1.5" />
      {/* Arrow pointing right */}
      <path d="M16 10l3 3-3 3M19 13H13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ActionBar({ selectedCount, onDelete, onMove, moveDisabledReason }: ActionBarProps) {
  const hasSelection = selectedCount > 0;
  const moveActive = hasSelection && !moveDisabledReason;

  const activeColor = Colors.navy;
  const deleteActiveColor = Colors.red;
  const disabledColor = Colors.textMuted;

  const buttonBase = {
    display: 'flex',
    alignItems: 'center',
    gap: Spacing.xs,
    height: 44,
    padding: `0 ${Spacing.md}px`,
    border: 'none',
    borderRadius: Radius.lg,
    fontFamily: Typography.family,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    transition: [
      `opacity ${Animation.duration.fast} ${Animation.easing.default}`,
      `background ${Animation.duration.fast} ${Animation.easing.default}`,
    ].join(', '),
  } as const;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${Spacing.sm}px ${Spacing.sm}px`,
        borderTop: `1px solid ${Colors.border}`,
      }}
    >
      {/* Delete */}
      <button
        onClick={hasSelection ? onDelete : undefined}
        disabled={!hasSelection}
        aria-label={`Delete ${selectedCount} selected item${selectedCount !== 1 ? 's' : ''}`}
        style={{
          ...buttonBase,
          cursor: hasSelection ? 'pointer' : 'default',
          opacity: hasSelection ? 1 : 0.4,
          color: hasSelection ? deleteActiveColor : disabledColor,
          background: hasSelection ? Colors.redLight : 'transparent',
        }}
      >
        <DeleteIcon color={hasSelection ? deleteActiveColor : disabledColor} />
        Delete
      </button>

      {/* Move */}
      <button
        onClick={moveActive ? onMove : undefined}
        disabled={!moveActive}
        title={moveDisabledReason}
        aria-label={
          moveDisabledReason
            ? moveDisabledReason
            : `Move ${selectedCount} selected item${selectedCount !== 1 ? 's' : ''} to another day`
        }
        style={{
          ...buttonBase,
          cursor: moveActive ? 'pointer' : 'default',
          opacity: moveActive ? 1 : 0.4,
          color: moveActive ? activeColor : disabledColor,
          background: moveActive ? Colors.navyTint10 : 'transparent',
        }}
      >
        Move day
        <MoveIcon color={moveActive ? activeColor : disabledColor} />
      </button>
    </div>
  );
}
