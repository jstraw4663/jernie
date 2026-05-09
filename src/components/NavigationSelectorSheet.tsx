// NavigationSelectorSheet — bottom sheet to choose a map app for navigation.
// Used by card-level navigate buttons; mirrors the MapPicker in QuickActions
// but as a swipe-dismiss sheet rather than a fixed popover (better for card context).

import { BottomSheet } from './BottomSheet';
import { buildDeepLinks, openMapApp } from '../utils/mapNavigation';
import { Colors, Typography, Spacing } from '../design/tokens';

interface NavigationSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lat?: number | null;
  lon?: number | null;
  addr?: string | null;
  label?: string;
  zIndex?: number;
}

export function NavigationSelectorSheet({
  isOpen,
  onClose,
  lat,
  lon,
  addr,
  label,
  zIndex = 210,
}: NavigationSelectorSheetProps) {
  const links = buildDeepLinks(
    lat ?? undefined,
    lon ?? undefined,
    addr ?? undefined,
    label,
  );

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    height: 52,
    padding: `0 ${Spacing.base}px`,
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${Colors.border}`,
    cursor: 'pointer',
    fontFamily: Typography.family.sans,
    fontSize: `${Typography.size.base}px`,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
    textAlign: 'left',
    WebkitTapHighlightColor: 'transparent',
    letterSpacing: '-0.01em',
    boxSizing: 'border-box',
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onRequestClose={onClose}
      title="Open with"
      maxHeight="320px"
      zIndex={zIndex}
    >
      <div>
        <button
          type="button"
          style={rowStyle}
          onClick={() => { onClose(); openMapApp(links.apple); }}
        >
          Apple Maps
        </button>
        <button
          type="button"
          style={rowStyle}
          onClick={() => { onClose(); openMapApp(links.google, 'google'); }}
        >
          Google Maps
        </button>
        <button
          type="button"
          style={{ ...rowStyle, borderBottom: 'none' }}
          onClick={() => { onClose(); openMapApp(links.uber, 'uber'); }}
        >
          Uber
        </button>
      </div>
    </BottomSheet>
  );
}
