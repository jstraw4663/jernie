// EntityDetail — pure renderer for DetailConfig.
//
// Scroll architecture: a single overflowY:auto container holds hero + all
// content. onScroll drives hero compression (scrollY state → compress 0→1).
// FloatingAddCTA is positioned absolute in the outer shell (outside the scroll
// container) so it stays pinned to the bottom while content scrolls behind it.
//
// vaul dismiss: scrollTop === 0 + drag down → captured by vaul (sheet dismiss).
//               scrollTop > 0 + drag down → normal scroll.

import { useState, useCallback } from 'react';
import type { DetailConfig } from './detailTypes';
import { DetailHero } from './components/DetailHero';
import { DetailSection } from './components/DetailSection';
import { DetailMap } from './components/DetailMap';
import { DetailPhotoStrip } from './components/DetailPhotoStrip';
import { FloatingAddCTA } from './components/FloatingAddCTA';
import { QuickActions } from './components/QuickActions';
import { Colors, Spacing, Typography } from '../../design/tokens';

const COMPRESS_RANGE = 120;

interface EntityDetailProps {
  config: DetailConfig;
  onClose: () => void;
  isCachedOnly?: boolean;
  onAddToItinerary?: () => void;
  isAdded?: boolean;
  onView?: () => void;
}

export function EntityDetail({ config, onClose, isCachedOnly = false, onAddToItinerary, isAdded, onView }: EntityDetailProps) {
  const [scrollY, setScrollY] = useState(0);
  const compress = Math.min(1, scrollY / COMPRESS_RANGE);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollY((e.target as HTMLDivElement).scrollTop);
  }, []);

  const showQuickActions = !!(config.phone || config.externalUrl || config.mapLat != null || config.mapAddr);
  const hasFloatingCTA = !!onAddToItinerary;

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Scroll container */}
      <div
        onScroll={onScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as const,
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          background: Colors.background,
        }}
      >
        {isCachedOnly && (
          <div style={{
            color: Colors.textMuted,
            fontSize: 12,
            textAlign: 'center',
            padding: `${Spacing.xs}px ${Spacing.base}px`,
          }}>
            Cached data · Some details may be outdated
          </div>
        )}

        <DetailHero
          gradient={config.heroGradient}
          photoUrl={config.heroPhotoUrl}
          logoUrl={config.heroLogoUrl}
          emoji={config.heroEmoji}
          title={config.title}
          subtitle={config.subtitle}
          categoryChip={config.categoryChip}
          stopLabel={config.stopLabel}
          stopColor={config.stopAccent}
          onClose={onClose}
          scrollY={scrollY}
        />

        {/* Body title — fades out as hero overlay title fades in */}
        <div
          style={{
            padding: `${Spacing.base}px ${Spacing.base}px ${Spacing.sm}px`,
            opacity: Math.max(0, 1 - compress * 2.5),
            transform: `translateY(${-compress * 24}px)`,
          }}
        >
          <h1
            style={{
              fontFamily: Typography.family.serif,
              fontSize: `${Typography.size.xxl}px`,
              fontWeight: Typography.weight.regular,
              color: Colors.textPrimary,
              margin: 0,
              lineHeight: Typography.lineHeight.tight,
              letterSpacing: '-0.02em',
            }}
          >
            {config.title}
          </h1>
          {config.subtitle && (
            <p
              style={{
                fontFamily: Typography.family.sans,
                fontSize: `${Typography.size.sm}px`,
                color: Colors.textSecondary,
                margin: `${Spacing.xxs}px 0 0`,
                lineHeight: Typography.lineHeight.normal,
              }}
            >
              {config.subtitle}
            </p>
          )}
        </div>

        {/* Quick actions — Call, Website, Navigate, Share */}
        {showQuickActions && (
          <QuickActions
            phone={config.phone}
            website={config.externalUrl}
            lat={config.mapLat}
            lon={config.mapLon}
            addr={config.mapAddr}
            label={config.title}
            stopColor={config.stopAccent}
          />
        )}

        {/* Photo strip */}
        {config.photos && config.photos.length > 0 && (
          <DetailPhotoStrip photos={config.photos} />
        )}

        {/* Content sections */}
        <div
          style={{
            flex: 1,
            padding: `${Spacing.sm}px ${Spacing.base}px ${hasFloatingCTA ? 112 : Spacing.xxxl}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          {config.sections.map((section, i) => (
            <DetailSection key={i} section={section} />
          ))}

          {(config.mapLat != null || config.mapLon != null ||
            config.kind === 'place' || config.kind === 'booking') && (
            <div style={{ marginBottom: `${Spacing.xl}px` }}>
              <div style={{
                fontSize: 11,
                fontWeight: '700',
                color: Colors.textMuted,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                fontFamily: Typography.family.sans,
                marginBottom: `${Spacing.sm}px`,
              }}>
                Map
              </div>
              <DetailMap
                lat={config.mapLat}
                lon={config.mapLon}
                addr={config.mapAddr}
                label={config.title}
                trailEmbedUrl={config.trailEmbedUrl}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating CTA — pinned outside scroll, always above content */}
      {hasFloatingCTA && (
        <FloatingAddCTA
          onAddToItinerary={onAddToItinerary!}
          isAdded={isAdded}
          stopLabel={config.stopLabel}
          stopColor={config.stopAccent}
          onView={onView}
        />
      )}
    </div>
  );
}
