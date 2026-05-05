// DetailHero — scroll-driven compressing hero for entity detail sheets.
//
// compress=0 (not scrolled): 200px tall, inset card with rounded corners,
//   category chip visible, title in scroll body below.
// compress=1 (scrolled ~120px): 64px strip, edge-to-edge, title overlay
//   fades in so the user always knows what sheet they're in.
//
// The X close button fades slightly as the hero compresses; vaul's drag
// handle remains the primary dismiss affordance once the hero is small.

import { useState, type ReactNode } from 'react';
import { Colors, Core, Typography, Spacing, Radius } from '../../../design/tokens';

interface DetailHeroProps {
  gradient: string;
  photoUrl?: string;
  logoUrl?: string;
  emoji?: ReactNode;   // kept for type compat; not rendered in new layout
  title: string;
  subtitle?: string;
  categoryChip?: string;
  stopLabel?: string;
  stopColor?: string;
  onClose?: () => void;
  scrollY: number;
}

const HERO_FULL = 200;
const HERO_COMPACT = 64;
const COMPRESS_RANGE = 120;

export function DetailHero({
  gradient, photoUrl, logoUrl, title, categoryChip, stopLabel, stopColor, onClose, scrollY,
}: DetailHeroProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = !!photoUrl && !photoFailed;

  const compress = Math.min(1, Math.max(0, scrollY / COMPRESS_RANGE));
  const heroH = HERO_FULL - (HERO_FULL - HERO_COMPACT) * compress;
  const edgeToEdge = compress > 0.6;
  const chipOpacity = Math.max(0, 1 - compress * 1.6);
  const overlayOpacity = Math.max(0, Math.min(1, (compress - 0.3) * 2.5));
  const scrimAlpha = 0.05 + compress * 0.35;

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        margin: edgeToEdge ? '4px 0 0' : `4px ${Spacing.base}px 0`,
        height: heroH,
        borderRadius: edgeToEdge ? 0 : Radius.xl,
        overflow: 'hidden',
        flexShrink: 0,
        background: showPhoto ? Colors.navy : gradient,
        transition: 'margin 0.18s ease, border-radius 0.18s ease',
      }}
    >
      {/* Photo */}
      {photoUrl && !photoFailed && (
        <img
          src={photoUrl}
          alt={title}
          onError={() => setPhotoFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      )}

      {/* Scrim — darkens as compressed */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,${scrimAlpha}) 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Category chip — fades + shrinks out as compressed */}
      {categoryChip && (
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 14,
            padding: '5px 10px',
            borderRadius: Radius.full,
            background: 'rgba(255,255,255,0.92)',
            fontFamily: Typography.family.sans,
            fontSize: `${Typography.size.xs}px`,
            fontWeight: Typography.weight.bold,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: stopColor ?? Colors.navy,
            opacity: chipOpacity,
            transform: `scale(${1 - compress * 0.2})`,
            transformOrigin: 'left top',
            transition: 'opacity 0.15s',
            pointerEvents: chipOpacity < 0.1 ? 'none' : 'auto',
          }}
        >
          {categoryChip}
        </div>
      )}

      {/* Close button — top right, fades gently as hero compresses */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: Spacing.md,
            right: Spacing.md,
            zIndex: 2,
            width: 32,
            height: 32,
            borderRadius: Radius.full,
            background: 'rgba(0,0,0,0.35)',
            border: 'none',
            color: Core.white,
            fontSize: '1rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            opacity: Math.max(0.3, 1 - compress * 1.2),
          }}
        >
          ✕
        </button>
      )}

      {/* Brand logo (airline, hotel) — bottom right, fades with chip */}
      {logoUrl && <BrandLogo url={logoUrl} alt={title} opacity={chipOpacity} />}

      {/* Title overlay — slides up from below into the compressed hero strip */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 56,
          top: '50%',
          transform: `translateY(calc(-50% + ${(1 - compress) * 24}px))`,
          opacity: overlayOpacity,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            maxWidth: '100%',
            background: 'rgba(0,0,0,0.42)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 8,
            padding: '5px 10px',
          }}
        >
          <div
            style={{
              fontFamily: Typography.family.sans,
              fontSize: `${Typography.size.base}px`,
              lineHeight: 1.2,
              fontWeight: Typography.weight.medium,
              color: Core.white,
              letterSpacing: '-0.015em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </div>
          {(categoryChip || stopLabel) && (
            <div
              style={{
                fontFamily: Typography.family.sans,
                fontSize: `${Typography.size.xs}px`,
                fontWeight: Typography.weight.medium,
                color: 'rgba(255,255,255,0.8)',
                marginTop: 1,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              {[categoryChip, stopLabel].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandLogo({ url, alt, opacity }: { url: string; alt: string; opacity: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: Spacing.md,
        right: Spacing.base,
        width: 52,
        height: 52,
        borderRadius: `${Radius.md}px`,
        background: 'rgba(255,255,255,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        opacity,
        transition: 'opacity 0.15s',
      }}
    >
      <img
        src={url}
        alt={alt}
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}
