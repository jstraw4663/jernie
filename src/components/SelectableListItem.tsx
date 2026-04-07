// SelectableListItem — an itinerary row with optional selection bubble (left)
// and drag handle (right, six dots). Used inside the BottomSheet edit mode.
//
// Long press (500ms) fires onLongPress when provided.
// Locked items (locked=true) hide the selection bubble and cannot be selected.
//
// PLATFORM NOTE:
//   - Long press: setTimeout/clearTimeout → PanResponder / Pressable onLongPress on RN
//   - Drag handle listeners: @dnd-kit SyntheticListenerMap → react-native-reanimated on Expo
//   - CSS transitions → Animated.View on Expo

import React from 'react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { Colors, Spacing, Radius, Typography, Animation } from '../design/tokens';
import { useLongPress } from '../hooks/useLongPress';

export interface SelectableListItemProps {
  id: string;
  time: string;
  label: string;
  isSelected: boolean;
  /** Locked items appear but cannot be selected, deleted, or moved */
  isLocked?: boolean;
  showDragHandle: boolean;
  onToggleSelect: () => void;
  /** Fires after 500ms press hold */
  onLongPress?: () => void;
  /** From @dnd-kit useSortable — attach to the drag handle element */
  dragListeners?: DraggableSyntheticListeners;
  dragAttributes?: DraggableAttributes;
}

// Six-dot drag handle icon
function DragDotsIcon({ color }: { color: string }) {
  const dot: React.CSSProperties = {
    width: 4,
    height: 4,
    borderRadius: Radius.full,
    background: color,
  };
  const col: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} aria-hidden>
      <div style={col}><div style={dot}/><div style={dot}/><div style={dot}/></div>
      <div style={col}><div style={dot}/><div style={dot}/><div style={dot}/></div>
    </div>
  );
}

export function SelectableListItem({
  time,
  label,
  isSelected,
  isLocked = false,
  showDragHandle,
  onToggleSelect,
  onLongPress,
  dragListeners,
  dragAttributes,
}: SelectableListItemProps) {
  const { handlePointerDown, cancel, consumeFired } = useLongPress(onLongPress, isLocked);

  function handleClick() {
    if (consumeFired()) return;
    if (!isLocked) onToggleSelect();
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={cancel}
      onPointerMove={cancel}
      onPointerLeave={cancel}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: `${Spacing.sm}px ${Spacing.sm}px`,
        opacity: isLocked ? 0.55 : 1,
        cursor: isLocked ? 'default' : 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Selection bubble */}
      {!isLocked && (
        <div
          aria-hidden
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            borderRadius: Radius.full,
            border: `2px solid ${isSelected ? Colors.selectedBorder : Colors.unselectedBorder}`,
            background: isSelected ? Colors.selectedFill : Colors.unselectedFill,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: `background ${Animation.duration.fast} ${Animation.easing.default},
                         border-color ${Animation.duration.fast} ${Animation.easing.default}`,
          }}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M2 6l3 3 5-5"
                stroke={Colors.textInverse}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      )}

      {/* Confirmed indicator — gold circle with checkmark, replaces bubble for locked items */}
      {isLocked && (
        <div
          aria-label="Confirmed"
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            borderRadius: Radius.full,
            background: Colors.gold,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Time + label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontFamily: Typography.family,
            fontSize: Typography.size.sm,
            color: Colors.textMuted,
            marginRight: Spacing.xs,
            whiteSpace: 'nowrap',
          }}
        >
          {time}
        </span>
        <span
          style={{
            fontFamily: Typography.family,
            fontSize: Typography.size.base,
            color: Colors.textPrimary,
          }}
        >
          {label}
        </span>
      </div>

      {/* Drag handle */}
      {showDragHandle && (
        <div
          {...dragListeners}
          {...dragAttributes}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 44,
            cursor: 'grab',
            touchAction: 'none',
          }}
          aria-label="Drag to reorder"
        >
          <DragDotsIcon color={Colors.textMuted} />
        </div>
      )}
    </div>
  );
}
