// QuickActions — 4-button action row for place detail sheets.
//
// Renders below the body title. Buttons are disabled (dimmed, no pointer) when
// the required data is absent (e.g. Call greyed out when no phone number).
// Navigate opens Apple Maps; falls back to address string when no coords.

import type { ReactElement } from 'react';
import { Colors, Typography, Spacing, Radius } from '../../../design/tokens';

interface QuickActionsProps {
  phone?: string;
  website?: string;
  lat?: number;
  lon?: number;
  addr?: string;
  label?: string;    // place name for Maps query
  stopColor?: string;
}

interface Action {
  label: string;
  icon: ReactElement;
  href?: string;
  disabled: boolean;
}

function PhoneIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.5 3.5C3.5 3.5 4.5 2.5 5.5 2.5C6 2.5 6.5 3 7.5 4.5C8.5 6 8.5 6.5 8.5 7C8.5 7.5 7.5 8.5 7.5 8.5C7.5 8.5 8 10 10 12C12 14 13.5 14.5 13.5 14.5C13.5 14.5 14.5 13.5 15 13.5C15.5 13.5 16 13.5 17.5 14.5C19 15.5 19.5 16 19.5 16.5C19.5 17.5 18.5 18.5 18.5 18.5C17.5 19.5 16.5 19.5 15 18C13.5 16.5 10 13.5 8 11.5C6 9.5 3 6 1.5 4.5C0 3 0 2 1 1C2 0 3.5 3.5 3.5 3.5Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function GlobeIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8.5" stroke={color} strokeWidth="1.7" />
      <ellipse cx="10" cy="10" rx="3.5" ry="8.5" stroke={color} strokeWidth="1.7" />
      <path d="M1.5 10H18.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M1.5 6.5H18.5M1.5 13.5H18.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeDasharray="2 2" opacity="0.6" />
    </svg>
  );
}

function NavigateIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2L18 10L10 12.5L2 10L10 2Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M10 12.5V18" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="15.5" cy="4.5" r="2" stroke={color} strokeWidth="1.7" />
      <circle cx="15.5" cy="15.5" r="2" stroke={color} strokeWidth="1.7" />
      <circle cx="4.5" cy="10" r="2" stroke={color} strokeWidth="1.7" />
      <path d="M6.3 9L13.7 5.3M6.3 11L13.7 14.7" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function QuickActions({ phone, website, lat, lon, addr, label, stopColor }: QuickActionsProps) {
  const hasAny = phone || website || lat != null || lon != null || addr;
  if (!hasAny) return null;

  const iconColor = stopColor ?? Colors.navy;

  let mapsHref: string | undefined;
  if (lat != null && lon != null) {
    const q = encodeURIComponent(label ?? addr ?? '');
    mapsHref = `https://maps.apple.com/?ll=${lat},${lon}${q ? `&q=${q}` : ''}`;
  } else if (addr) {
    mapsHref = `https://maps.apple.com/?q=${encodeURIComponent(addr)}`;
  }

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
      icon: <NavigateIcon color={mapsHref ? iconColor : Colors.textMuted} />,
      href: mapsHref,
      disabled: !mapsHref,
    },
    {
      label: 'Share',
      icon: <ShareIcon color={iconColor} />,
      href: undefined,
      disabled: false,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: Spacing.sm,
        padding: `0 ${Spacing.base}px ${Spacing.base}px`,
      }}
    >
      {actions.map((action) => {
        const el = (
          <div
            key={action.label}
            style={{
              background: Colors.surface2,
              border: `0.5px solid ${Colors.border}`,
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
              textDecoration: 'none',
            }}
          >
            {action.icon}
            <span
              style={{
                fontFamily: Typography.family.sans,
                fontSize: `${Typography.size.xs}px`,
                fontWeight: Typography.weight.semibold,
                color: Colors.textPrimary,
                lineHeight: 1,
              }}
            >
              {action.label}
            </span>
          </div>
        );

        if (action.href && !action.disabled) {
          return (
            <a
              key={action.label}
              href={action.href}
              target={action.href.startsWith('tel:') ? '_self' : '_blank'}
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              {el}
            </a>
          );
        }

        return <div key={action.label}>{el}</div>;
      })}
    </div>
  );
}
