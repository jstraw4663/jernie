// BottomBar — pinned bottom navigation with 5 tabs.
//
// Layout contract: this component is flex-shrink:0 inside a flex-column parent
// (AppShell). It never uses position:fixed — its position is determined entirely
// by the flex container. Content scrolls ABOVE it, never behind it.
//
// Notification dots: gold dot appears top-right of icon when
// notifications[tabId] is true AND that tab is not currently active.
//
// Sheet lock: reads SheetContext.openCount and sets pointer-events:none while
// any BottomSheet is open, matching the StopNavigator drag-lock pattern.

import type { FC } from 'react';
import type { IconProps } from './NavIcons';
import { useSheetContext } from '../contexts/SheetContext';
import { Colors, Spacing, Typography, Shadow, Radius } from '../design/tokens';

export type TabId = 'overview' | 'saved' | 'jernie' | 'explore' | 'profile';

export interface BottomBarTab {
  id: TabId;
  label: string;
  // Accept a component constructor so BottomBar controls strokeWidth per state.
  // Usage in AppShell: icon: IconClipboard
  icon: FC<IconProps>;
}

export interface BottomBarProps {
  tabs: BottomBarTab[];
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  notifications?: Partial<Record<TabId, boolean>>;
}

const ICON_SIZE = 22;
const ACTIVE_SW = 2.25;
const INACTIVE_SW = 1.75;
const ACTIVE_COLOR = Colors.navyLight;   // #1A3F58

export function BottomBar({ tabs, activeTab, onTabChange, notifications }: BottomBarProps) {
  const { openCount } = useSheetContext();

  return (
    // Outer wrapper handles safe-area padding so the 56px bar height is
    // always the visible tap target height, with notch space below.
    <div
      className="bottom-bar-shell"
      style={{
        background: Colors.background,
        // Disable tap interaction while any sheet is open
        pointerEvents: openCount > 0 ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          height: 56,
          borderTop: `1px solid ${Colors.border}`,
          boxShadow: Shadow.sheet,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const showDot = !isActive && !!notifications?.[tab.id];
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: Spacing.xxs,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? ACTIVE_COLOR : Colors.textMuted,
                padding: `0 ${Spacing.xs}px`,
                WebkitTapHighlightColor: 'transparent',
                // Prevent text-size-adjust from scaling labels on rotation
                WebkitTextSizeAdjust: '100%',
              }}
            >
              {/* Icon + optional notification dot */}
              <div style={{ position: 'relative', lineHeight: 0 }}>
                <Icon
                  size={ICON_SIZE}
                  strokeWidth={isActive ? ACTIVE_SW : INACTIVE_SW}
                />
                {showDot && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -4,
                      width: 7,
                      height: 7,
                      borderRadius: Radius.full,
                      background: Colors.gold,
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  fontFamily: Typography.family,
                  fontSize: Typography.size.xs,    // 11px
                  fontWeight: isActive
                    ? Typography.weight.semibold
                    : Typography.weight.regular,
                  lineHeight: 1,
                  letterSpacing: '0.03em',
                  // color inherited from button
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
