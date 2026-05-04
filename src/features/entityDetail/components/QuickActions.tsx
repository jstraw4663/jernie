// QuickActions — 3-button action row for place detail sheets.
//
// Renders below the body title. Buttons are disabled (dimmed, no pointer) when
// the required data is absent (e.g. Call greyed out when no phone number).
// Navigate opens an inline popover (position:fixed, no backdrop) to choose
// Apple Maps, Google Maps, or Uber.
//
// Apple/Google: HTTPS Universal Links — guaranteed to open the app on iOS.
// Uber: uber:// deep link; falls back to App Store if not installed.
// Vaul 1.x attaches document-level pointerdown handlers, so the picker panel
// stops propagation on pointer/touch events to prevent drawer interference.

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../design/tokens';

interface QuickActionsProps {
  phone?: string;
  website?: string;
  lat?: number;
  lon?: number;
  addr?: string;
  label?: string;
  stopColor?: string;
}

interface Action {
  label: string;
  icon: ReactElement;
  href?: string;
  onClick?: () => void;
  disabled: boolean;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function NavigateIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3L21 21L12 16.5L3 21Z" fill={color} />
    </svg>
  );
}

function PhoneIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke={color} strokeWidth="1.8" />
      <path d="M3 12h18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ── Map app launcher ──────────────────────────────────────────────────────────
// Native OS URL schemes handed to window.open() so iOS routes to the registered
// app rather than trying to navigate the WKWebView (which ignores custom schemes).
// Apple Maps is always installed; Google Maps + Uber fall back to App Store if
// visibilitychange never fires after the open call (app wasn't installed).

const APP_STORE: Record<string, string> = {
  google: 'https://apps.apple.com/app/google-maps/id585027354',
  uber:   'https://apps.apple.com/app/uber/id368677368',
};

function buildDeepLinks(
  lat: number | undefined,
  lon: number | undefined,
  addr: string | undefined,
  label: string | undefined,
) {
  const hasCoords = lat != null && lon != null;
  const q = encodeURIComponent(label ?? addr ?? '');
  return {
    apple: hasCoords ? `maps://?ll=${lat},${lon}&q=${q}` : `maps://?q=${q}`,
    google: hasCoords
      ? `comgooglemaps://?center=${lat},${lon}&q=${q}`
      : `comgooglemaps://?q=${q}`,
    uber: hasCoords
      ? `uber://?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lon}&dropoff[nickname]=${q}`
      : `uber://?action=setPickup&dropoff[formatted_address]=${q}`,
  };
}

function openMapApp(deepLink: string, appStoreKey?: string) {
  // window.open with a custom scheme hands it to the OS — more reliable in iOS
  // PWA standalone mode than window.location.href, which tries to navigate the WebView.
  window.open(deepLink, '_blank');

  if (!appStoreKey) return;

  // If the app opened, the PWA goes to background and visibilitychange fires.
  // If it stays visible after 1.5 s, the app wasn't installed → App Store.
  let left = false;
  const mark = () => { left = true; };
  document.addEventListener('visibilitychange', mark, { once: true });
  document.addEventListener('pagehide', mark, { once: true });
  setTimeout(() => {
    document.removeEventListener('visibilitychange', mark);
    document.removeEventListener('pagehide', mark);
    if (!left) window.open(APP_STORE[appStoreKey], '_blank', 'noopener,noreferrer');
  }, 1500);
}

// ── MapPicker — fixed popover anchored to the Navigate tile ───────────────────

interface MapPickerProps {
  anchorEl: HTMLElement;
  lat?: number;
  lon?: number;
  addr?: string;
  label?: string;
  onClose: () => void;
}

function MapPicker({ anchorEl, lat, lon, addr, label, onClose }: MapPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rect = anchorEl.getBoundingClientRect();
  const links = buildDeepLinks(lat, lon, addr, label);

  // Close on tap outside the panel. Deferred one tick so the opening tap doesn't
  // immediately re-close.
  useEffect(() => {
    function outsideHandler(e: PointerEvent) {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !anchorEl.contains(t)) {
        onClose();
      }
    }
    const id = window.setTimeout(() => {
      document.addEventListener('pointerdown', outsideHandler);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', outsideHandler);
    };
  }, [anchorEl, onClose]);

  // Anchored above the Navigate tile, right-aligned.
  const panelBottom = window.innerHeight - rect.top + 8;
  const panelRight = window.innerWidth - rect.right;

  const rowStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: `${Spacing.md}px ${Spacing.base}px`,
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${Colors.border}`,
    cursor: 'pointer',
    fontFamily: Typography.family.sans,
    fontSize: `${Typography.size.sm}px`,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
    textAlign: 'left',
    WebkitTapHighlightColor: 'transparent',
    letterSpacing: '-0.01em',
  };

  // Rendered INLINE (not as a portal) so this element stays inside the Vaul
  // Drawer.Content in the DOM. Vaul's "click outside → close drawer" logic checks
  // the DOM, not the React tree — a portal to document.body would be treated as
  // "outside" and close the drawer before any button click could fire.
  // position:fixed escapes overflow:hidden clipping from parent containers.
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        bottom: `${panelBottom}px`,
        right: `${panelRight}px`,
        zIndex: 500,
        background: Colors.surfaceRaised,
        borderRadius: `${Radius.lg}px`,
        boxShadow: Shadow.cardLifted,
        border: `1px solid ${Colors.border}`,
        overflow: 'hidden',
        minWidth: 180,
      }}
    >
      <div
        style={{
          padding: `${Spacing.xs + 2}px ${Spacing.base}px`,
          borderBottom: `1px solid ${Colors.border}`,
          fontFamily: Typography.family.sans,
          fontSize: `${Typography.size.xs}px`,
          fontWeight: Typography.weight.semibold,
          color: Colors.textMuted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Open with
      </div>

      <button type="button" style={rowStyle}
        onClick={() => { onClose(); openMapApp(links.apple); }}
      >Apple Maps</button>

      <button type="button" style={rowStyle}
        onClick={() => { onClose(); openMapApp(links.google, 'google'); }}
      >Google Maps</button>

      <button type="button" style={{ ...rowStyle, borderBottom: 'none' }}
        onClick={() => { onClose(); openMapApp(links.uber, 'uber'); }}
      >Uber</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function QuickActions({ phone, website, lat, lon, addr, label, stopColor }: QuickActionsProps) {
  const [showMapPicker, setShowMapPicker] = useState(false);
  const navigateRef = useRef<HTMLDivElement>(null);
  const closeMapPicker = useCallback(() => setShowMapPicker(false), []);

  const hasAny = phone || website || lat != null || lon != null || addr;
  if (!hasAny) return null;

  const iconColor = stopColor ?? Colors.navy;
  const hasMaps = (lat != null && lon != null) || !!addr;

  // Order: Call → Website → Navigate (mirrors phone / website / address field order below)
  const actions: Action[] = [
    {
      label: 'Call',
      icon: <PhoneIcon color={phone ? iconColor : Colors.textMuted} />,
      href: phone ? `tel:${phone.replace(/\D/g, '')}` : undefined,
      disabled: !phone,
    },
    {
      label: 'Website',
      icon: <GlobeIcon color={website ? iconColor : Colors.textMuted} />,
      href: website,
      disabled: !website,
    },
    {
      label: 'Navigate',
      icon: <NavigateIcon color={hasMaps ? (showMapPicker ? Colors.textInverse : iconColor) : Colors.textMuted} />,
      onClick: hasMaps ? () => setShowMapPicker(prev => !prev) : undefined,
      disabled: !hasMaps,
    },
  ];

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: Spacing.sm,
          padding: `0 ${Spacing.base}px ${Spacing.base}px`,
        }}
      >
        {actions.map((action) => {
          const isNavigate = action.label === 'Navigate';
          const isActive = isNavigate && showMapPicker;

          const tile = (
            <div
              style={{
                background: isActive ? iconColor : Colors.surface2,
                border: `0.5px solid ${isActive ? iconColor : Colors.border}`,
                borderRadius: Radius.lg,
                padding: `${Spacing.sm + 2}px ${Spacing.xs}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                opacity: action.disabled ? 0.35 : 1,
                pointerEvents: action.disabled ? 'none' : 'auto',
                cursor: action.disabled ? 'default' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'background 0.15s ease, border-color 0.15s ease',
              }}
            >
              {action.icon}
              <span
                style={{
                  fontFamily: Typography.family.sans,
                  fontSize: `${Typography.size.xs}px`,
                  fontWeight: Typography.weight.semibold,
                  color: isActive ? Colors.textInverse : Colors.textPrimary,
                  lineHeight: 1,
                  transition: 'color 0.15s ease',
                }}
              >
                {action.label}
              </span>
            </div>
          );

          if (isNavigate) {
            return (
              <div
                key="Navigate"
                ref={navigateRef}
                onClick={action.onClick}
                style={{ cursor: hasMaps ? 'pointer' : 'default' }}
              >
                {tile}
              </div>
            );
          }

          if (action.href && !action.disabled) {
            return (
              <a
                key={action.label}
                href={action.href}
                target={action.href.startsWith('tel:') ? '_self' : '_blank'}
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                {tile}
              </a>
            );
          }

          return <div key={action.label}>{tile}</div>;
        })}
      </div>

      {showMapPicker && navigateRef.current && (
        <MapPicker
          anchorEl={navigateRef.current}
          lat={lat}
          lon={lon}
          addr={addr}
          label={label}
          onClose={closeMapPicker}
        />
      )}
    </>
  );
}
