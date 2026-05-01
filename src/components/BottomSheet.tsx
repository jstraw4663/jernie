// BottomSheet — vaul-backed swipe-dismiss sheet.
//
// Physics: vaul handles all swipe tracking, velocity-based dismiss, spring snap-back.
// data-vaul-no-drag on the scroll area prevents dismiss while scrolling content.
//
// PLATFORM NOTE:
//   vaul is web-only. On Expo migration, replace with gorhom/bottom-sheet
//   using the same props interface.

import React from 'react';
import { Drawer } from 'vaul';
import { Colors, Spacing, Radius, Shadow, Typography } from '../design/tokens';
import { useSheetRegistration } from '../hooks/useSheetRegistration';
import { DragPill } from './DragPill';

export interface BottomSheetProps {
  isOpen: boolean;
  onRequestClose: () => void;
  title?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Rendered inside Drawer.Content but outside the scroll area — use for abs-positioned overlays like ConfirmDialog */
  overlay?: React.ReactNode;
  maxHeight?: string;
  zIndex?: number;
}

export function BottomSheet({
  isOpen,
  onRequestClose,
  title,
  headerRight,
  children,
  footer,
  overlay,
  maxHeight = '85vh',
  zIndex = 201,
}: BottomSheetProps) {
  useSheetRegistration(isOpen);

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={open => { if (!open) onRequestClose(); }}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: Colors.overlay,
            zIndex: zIndex - 1,
          }}
        />

        <Drawer.Content
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight,
            background: Colors.surface,
            borderTopLeftRadius: Radius.xl,
            borderTopRightRadius: Radius.xl,
            boxShadow: Shadow.xl,
            display: 'flex',
            flexDirection: 'column',
            zIndex,
            outline: 'none',
          }}
        >
          <DragPill />

          {(title || headerRight) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${Spacing.xs}px ${Spacing.base}px ${Spacing.sm}px`,
                borderBottom: `1px solid ${Colors.border}`,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: `${Typography.size.md}px`,
                  fontFamily: Typography.family.sans,
                  fontWeight: Typography.weight.semibold,
                  color: Colors.textPrimary,
                }}
              >
                {title}
              </span>
              {headerRight}
            </div>
          )}

          <div
            data-vaul-no-drag
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
            }}
          >
            {children}
          </div>

          {footer ? (
            <div data-vaul-no-drag style={{ flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
              {footer}
            </div>
          ) : (
            <div style={{ height: 'env(safe-area-inset-bottom, 0px)', flexShrink: 0 }} />
          )}
          {overlay}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
