// ActionIcons — Inline SVG icons for action bar buttons.
// Not from the Phosphor pack; hand-crafted for specific UI roles.
// NavigateIcon matches the QuickActions navigate tile exactly.

export function NavigateIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3L21 21L12 16.5L3 21Z" fill={color} />
    </svg>
  );
}

export function CheckmarkIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EllipsisIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="5" r="1.5" fill={color} />
      <circle cx="12" cy="12" r="1.5" fill={color} />
      <circle cx="12" cy="19" r="1.5" fill={color} />
    </svg>
  );
}
