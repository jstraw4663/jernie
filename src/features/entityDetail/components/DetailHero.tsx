// DetailHero — full-bleed hero area at the top of an entity detail sheet.
//
// Render priority:
//   1. heroPhotoUrl — full-bleed photo (place image, etc.)
//   2. heroGradient — gradient from brand/stop accent (always present as fallback)
//
// The heroLogoUrl is shown as a branded badge in the bottom-left of the hero.
// The X close button is overlaid in the top-right corner.
// The hero area is intentionally NOT data-vaul-no-drag — vaul captures swipe-down
// gestures here to dismiss the sheet.

import { useState, type ReactNode } from 'react';
import { Colors, Typography, Spacing, Radius } from '../../../design/tokens';

interface DetailHeroProps {
  gradient: string;
  photoUrl?: string;
  logoUrl?: string;
  emoji?: ReactNode;
  title: string;
  subtitle?: string;
  categoryChip?: string;
  onClose?: () => void;
  onAddToItinerary?: () => void;
  isAdded?: boolean;
}

export function DetailHero({ gradient, photoUrl, logoUrl, emoji, title, subtitle, categoryChip, onClose, onAddToItinerary, isAdded }: DetailHeroProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = !!photoUrl && !photoFailed;

  return (
    <div
      style={{
        position: 'relative',
        background: showPhoto ? Colors.navy : gradient,
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        flexShrink: 0,
      }}
    >
      {/* Full-bleed photo */}
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

      {/* Scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: showPhoto
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.55) 100%)'
            : 'none',
          pointerEvents: 'none',
        }}
      />

      {/* X close button — top right overlay */}
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
            color: '#fff',
            fontSize: '1rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          ✕
        </button>
      )}

      {/* Content layer */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: `${Spacing.xxl}px ${Spacing.base}px ${Spacing.xl}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: `${Spacing.xs}px`,
        }}
      >
        {/* Top row: emoji + category chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: `${Spacing.sm}px` }}>
          {emoji && <span style={{ lineHeight: 1 }}>{emoji}</span>}
          {categoryChip && (
            <span
              style={{
                fontFamily: Typography.family,
                fontSize: `${Typography.size.xs}px`,
                fontWeight: Typography.weight.bold,
                color: showPhoto ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.75)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                background: 'rgba(0,0,0,0.25)',
                padding: `2px ${Spacing.sm}px`,
                borderRadius: `${Radius.full}px`,
              }}
            >
              {categoryChip}
            </span>
          )}
        </div>

        {/* Title + optional logo */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: `${Spacing.md}px`, justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: Typography.family,
                fontSize: `${Typography.size.xl}px`,
                fontWeight: Typography.weight.bold,
                color: Colors.textInverse,
                margin: 0,
                lineHeight: Typography.lineHeight.tight,
                textShadow: showPhoto ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontFamily: Typography.family,
                  fontSize: `${Typography.size.sm}px`,
                  color: showPhoto ? 'rgba(255,255,255,0.90)' : 'rgba(247,244,239,0.80)',
                  margin: `${Spacing.xxs}px 0 0`,
                  lineHeight: Typography.lineHeight.normal,
                  textShadow: showPhoto ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {logoUrl && <BrandLogo url={logoUrl} alt={title} />}
        </div>

        {onAddToItinerary && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddToItinerary(); }}
            style={{
              alignSelf: 'flex-start',
              marginTop: `${Spacing.xs}px`,
              padding: `${Spacing.xs + 2}px ${Spacing.md}px`,
              borderRadius: `${Radius.full}px`,
              background: isAdded ? Colors.gold : 'rgba(255,255,255,0.18)',
              backdropFilter: isAdded ? 'none' : 'blur(6px)',
              WebkitBackdropFilter: isAdded ? 'none' : 'blur(6px)',
              border: isAdded ? `1.5px solid ${Colors.gold}` : '1.5px solid rgba(255,255,255,0.45)',
              color: '#fff',
              fontSize: `${Typography.size.xs}px`,
              fontFamily: Typography.family,
              fontWeight: Typography.weight.semibold,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              lineHeight: 1,
            }}
          >
            {isAdded ? '✓ Added to Itinerary' : '+ Add to Itinerary'}
          </button>
        )}
      </div>
    </div>
  );
}

function BrandLogo({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div
      style={{
        flexShrink: 0,
        width: 52,
        height: 52,
        borderRadius: `${Radius.md}px`,
        background: 'rgba(255,255,255,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
