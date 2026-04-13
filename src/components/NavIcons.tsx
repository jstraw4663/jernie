// NavIcons — Airbnb-style outline SVG icons for bottom navigation.
// All icons are stroke-only with round caps/joins; stroke="currentColor"
// so they inherit active/inactive color from the parent.

import type { FC } from 'react';

export interface IconProps {
  size?: number;
  strokeWidth?: number;
}

// Tab: Overview
export const IconClipboard: FC<IconProps> = ({ size = 24, strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect
      x="6" y="3" width="12" height="18" rx="2"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
    />
    <path
      d="M9 3v2h6V3"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
    />
    <line x1="9" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
    <line x1="9" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
    <line x1="9" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
  </svg>
);

// Tab: Saved
export const IconHeart: FC<IconProps> = ({ size = 24, strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

// Tab: Jernie — stylised J lettermark (placeholder for logo)
export const IconJ: FC<IconProps> = ({ size = 24, strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Top horizontal bar */}
    <line x1="9" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
    {/* Vertical stem + curved foot */}
    <path
      d="M12.5 4v13a3.5 3.5 0 0 1-7 0v-1.5"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

// Tab: Explore
export const IconSearch: FC<IconProps> = ({ size = 24, strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={strokeWidth}/>
    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
  </svg>
);

// Tab: Profile
export const IconPerson: FC<IconProps> = ({ size = 24, strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={strokeWidth}/>
    <path
      d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);
