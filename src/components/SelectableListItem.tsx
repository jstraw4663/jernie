// SelectableListItem — edit-mode itinerary row inside the BottomSheet.
// Matches the TimelineItem card visual language: surfaceRaised background,
// layered shadow, left accent border, category icon + title only (no blurb).
//
// Left:   selection bubble (or gold confirmed indicator for locked items)
// Center: card — bold time label above, category icon + title below
// Right:  six-dot drag handle
//
// PLATFORM NOTE:
//   Long press: setTimeout → PanResponder / Pressable onLongPress on RN
//   Drag handle: @dnd-kit SyntheticListenerMap → react-native-reanimated on Expo
//   CSS transitions → Animated.View on Expo

import React from 'react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { Colors, Spacing, Radius, Typography, Animation } from '../design/tokens';
import { useLongPress } from '../hooks/useLongPress';
import { parseItemText } from '../utils/parseItemText';

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
  /** Stop accent color — drives card left border */
  accent?: string;
  /** Category icon pre-rendered from CATEGORY_ICON_MAP */
  categoryIcon?: React.ReactNode;
}

// Six-dot drag handle icon
function DragDotsIcon({ color }: { color: string }) {
  const dot: React.CSSProperties = {
    width: 4,
    height: 4,
    borderRadius: Radius.full,
    background: color,
  };
  const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
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
  accent,
  categoryIcon,
}: SelectableListItemProps) {
  const { handlePointerDown, cancel, consumeFired } = useLongPress(onLongPress, isLocked);

  function handleClick() {
    if (consumeFired()) return;
    if (!isLocked) onToggleSelect();
  }

  // Title only — no blurb in edit mode
  const { title } = parseItemText(label);

  // Card left border — gold for confirmed, accent for open
  const borderColor = accent ? `${accent}30` : Colors.border;

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
        padding: `${Spacing.xs}px 0`,
        cursor: isLocked ? 'default' : 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Selection bubble / confirmed indicator */}
      <div style={{ flexShrink: 0 }}>
        {isLocked ? (
          // Gold circle with white lock — curated item, cannot be selected/deleted/moved
          <div
            aria-label="Curated item"
            style={{
              width: 22,
              height: 22,
              borderRadius: Radius.full,
              background: Colors.gold,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="10" height="11" viewBox="0 0 10 12" fill="none" aria-hidden>
              <rect x="1" y="5" width="8" height="7" rx="1.5" stroke="#fff" strokeWidth="1.5" />
              <path d="M3 5V3.5a2 2 0 0 1 4 0V5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          // Selection bubble
          <div
            aria-hidden
            style={{
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
      </div>

      {/* Card */}
      <div style={{
        flex: 1,
        minWidth: 0,
        background: Colors.surfaceRaised,
        borderRadius: `${Spacing.md}px`,
        boxShadow: '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
        padding: `${Spacing.sm}px ${Spacing.sm}px ${Spacing.sm}px ${Spacing.md}px`,
        borderLeft: `3px solid ${borderColor}`,
        transition: `border-left-color ${Animation.duration.fast} ${Animation.easing.default}`,
        display: 'flex',
        alignItems: 'center',
        gap: Spacing.xs,
      }}>
        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Time label */}
          <div style={{
            fontSize: `${Typography.size.xs}px`,
            fontWeight: Typography.weight.bold,
            color: Colors.textPrimary,
            fontFamily: Typography.family.sans,
            marginBottom: Spacing.xxs + 1,
            lineHeight: 1.2,
          }}>
            {time || <span style={{ opacity: 0.35, fontWeight: Typography.weight.regular }}>no time set</span>}
          </div>

          {/* Category icon + title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: Spacing.xs }}>
            {categoryIcon && (
              <span style={{ lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
                {categoryIcon}
              </span>
            )}
            <span style={{
              fontFamily: Typography.family.sans,
              fontSize: `${Typography.size.sm}px`,
              fontWeight: Typography.weight.medium,
              color: Colors.textSecondary,
              lineHeight: Typography.lineHeight.normal,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {title}
            </span>
          </div>
        </div>

        {/* Drag handle — inside the card so all cards are the same width */}
        {showDragHandle ? (
          <div
            {...dragListeners}
            {...dragAttributes}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 40,
              cursor: 'grab',
              touchAction: 'none',
              marginRight: -Spacing.xxs,
            }}
            aria-label="Drag to reorder"
          >
            <DragDotsIcon color={Colors.border} />
          </div>
        ) : (
          <div style={{ width: 32, flexShrink: 0 }} />
        )}
      </div>
    </div>
  );
}
