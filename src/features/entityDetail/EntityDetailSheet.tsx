// EntityDetailSheet — full-height vaul sheet for entity detail views.
//
// Uses vaul's Drawer directly (not BottomSheet) because EntityDetail manages
// its own internal scroll — a nested scroll wrapper would conflict.
// Height fills from the sticky nav bar bottom to the screen bottom so the
// nav bar remains visible while the sheet is open.
//
// Z-index: 300 — sits above BottomSheet (201) and BottomBar.
//
// PLATFORM NOTE:
//   vaul is web-only. On Expo migration, replace with gorhom/bottom-sheet.

import { useState, useLayoutEffect } from 'react';
import { Drawer } from 'vaul';
import { Colors, Radius, Shadow } from '../../design/tokens';
import { useSheetRegistration } from '../../hooks/useSheetRegistration';
import { DragPill } from '../../components/DragPill';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import type { DetailConfig } from './detailTypes';
import { EntityDetail } from './EntityDetail';

interface EntityDetailSheetProps {
  isOpen: boolean;
  originRect?: DOMRect;
  config: DetailConfig;
  onClose: () => void;
  onAddToItinerary?: () => void;
  isAdded?: boolean;
  onView?: () => void;
  onSaveOverride?: (placeId: string, googlePlaceId: string) => Promise<void>;
}

export function EntityDetailSheet({ isOpen, config, onClose, onAddToItinerary, isAdded, onView, onSaveOverride }: EntityDetailSheetProps) {
  useSheetRegistration(isOpen);

  // useLayoutEffect fires before paint so top is correct on the first visible frame.
  // Fallback: when no [data-sticky-nav] exists (e.g. non-Jernie tabs), use the CSS
  // --sat variable (= env(safe-area-inset-top)) so the sheet never overlaps the notch.
  const [navBottom, setNavBottom] = useState(0);
  useLayoutEffect(() => {
    if (isOpen) {
      const nav = document.querySelector('[data-sticky-nav]');
      if (nav) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNavBottom(nav.getBoundingClientRect().bottom);
      } else {
        const sat = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0;
        setNavBottom(sat);
      }
    }
  }, [isOpen]);

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={open => { if (!open) onClose(); }}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: Colors.overlay,
            zIndex: 299,
          }}
        />

        <Drawer.Content
          style={{
            position: 'fixed',
            top: navBottom,
            bottom: 0,
            left: 0,
            right: 0,
            background: Colors.background,
            borderTopLeftRadius: Radius.xl,
            borderTopRightRadius: Radius.xl,
            boxShadow: Shadow.xl,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 300,
            outline: 'none',
          }}
          aria-label={config.title}
        >
          <DragPill height={20} />

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ErrorBoundary>
              <EntityDetail config={config} onClose={onClose} onAddToItinerary={onAddToItinerary} isAdded={isAdded} onView={onView} onSaveOverride={onSaveOverride} />
            </ErrorBoundary>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
