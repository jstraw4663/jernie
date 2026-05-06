// Scroll: single overflowY:auto container drives hero compression via scrollY state.
// FloatingAddCTA sits outside the scroll container so it stays pinned while content scrolls.
// vaul dismiss: scrollTop === 0 + drag down → sheet dismiss; scrollTop > 0 → normal scroll.

import { useState, useCallback, useRef } from 'react';
import type { DetailConfig } from './detailTypes';
import { DetailHero } from './components/DetailHero';
import { DetailSection } from './components/DetailSection';
import { DetailMap } from './components/DetailMap';
import { DetailPhotoStrip } from './components/DetailPhotoStrip';
import { FloatingAddCTA } from './components/FloatingAddCTA';
import { QuickActions } from './components/QuickActions';
import { FixMatchSheet } from './components/FixMatchSheet';
import { HoursAccordion } from '../../components/HoursAccordion';
import { StarRating } from '../../components/StarRating';
import { Colors, Core, Radius, Spacing, Typography } from '../../design/tokens';

const COMPRESS_RANGE = 120;

// For places: inject PhotoStrip between Notes and Reviews sections.
// For all other kinds: photos first, then sections.
function SectionContent({ config }: { config: DetailConfig }) {
  const photoStrip = config.photos && config.photos.length > 0 ? (
    <div style={{ margin: `0 -${Spacing.base}px` }}>
      <DetailPhotoStrip photos={config.photos} />
    </div>
  ) : null;

  if (config.kind === 'place') {
    const reviewsIdx = config.sections.findIndex(s => s.title === 'Reviews');
    const before = reviewsIdx >= 0 ? config.sections.slice(0, reviewsIdx) : config.sections;
    const after  = reviewsIdx >= 0 ? config.sections.slice(reviewsIdx) : [];
    return (
      <>
        {before.map((s, i) => <DetailSection key={i} section={s} />)}
        {photoStrip}
        {after.map((s, i) => <DetailSection key={`a${i}`} section={s} />)}
      </>
    );
  }

  return (
    <>
      {photoStrip}
      {config.sections.map((s, i) => <DetailSection key={i} section={s} />)}
    </>
  );
}

interface EntityDetailProps {
  config: DetailConfig;
  onClose: () => void;
  isCachedOnly?: boolean;
  onAddToItinerary?: () => void;
  isAdded?: boolean;
  onView?: () => void;
  onSaveOverride?: (placeId: string, googlePlaceId: string) => Promise<void>;
}

export function EntityDetail({ config, onClose, isCachedOnly = false, onAddToItinerary, isAdded, onView, onSaveOverride }: EntityDetailProps) {
  const [scrollY, setScrollY] = useState(0);
  const [fixMatchOpen, setFixMatchOpen] = useState(false);
  const compress = Math.min(1, scrollY / COMPRESS_RANGE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollY((e.target as HTMLDivElement).scrollTop);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
        ref={scrollContainerRef}
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
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: `${Spacing.sm}px`,
          }}
        >
          {/* Left: title + subtitle */}
          <div style={{ flex: 1, minWidth: 0 }}>
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

          {/* Right: stars + price stacked */}
          {(config.rating != null || config.price) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: `${Spacing.xxs}px`, flexShrink: 0, paddingTop: 2 }}>
              {config.rating != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <StarRating rating={config.rating} />
                  {config.ratingCount != null && (
                    <span style={{ color: Colors.textMuted, fontSize: `${Typography.size.xs}px`, fontFamily: Typography.family.sans }}>
                      ({config.ratingCount.toLocaleString()})
                    </span>
                  )}
                </span>
              )}
              {config.price && (
                <span style={{ color: Colors.textSecondary, fontSize: `${Typography.size.sm}px`, fontFamily: Typography.family.sans }}>
                  {config.price}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick actions — Call, Website, Navigate */}
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

        {/* Hours accordion — inline, above the fold, place sheets only */}
        {config.hoursData && (
          <div
            style={{
              padding: `${Spacing.sm}px ${Spacing.base}px`,
              borderTop: `1px solid ${Core.border}`,
              borderBottom: `1px solid ${Core.border}`,
            }}
          >
            <HoursAccordion hours={config.hoursData} />
          </div>
        )}

        <div
          style={{
            flex: 1,
            padding: `${Spacing.xs}px ${Spacing.base}px ${hasFloatingCTA ? 112 : Spacing.xxxl}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          <SectionContent config={config} />

          {(config.mapLat != null || config.mapLon != null ||
            config.kind === 'place' || config.kind === 'booking') && (
            <div style={{ marginBottom: `${Spacing.xl}px` }}>
              <div style={{
                fontSize: `${Typography.size.xs}px`,
                fontWeight: Typography.weight.bold,
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

          {/* Fix Match — place sheets only, when override callback is wired */}
          {config.placeId && onSaveOverride && (
            <button
              onClick={() => setFixMatchOpen(true)}
              style={{
                width: '100%',
                border: `1px solid ${Core.border}`,
                borderRadius: Radius.md,
                padding: `${Spacing.sm}px`,
                background: 'none',
                fontFamily: Typography.family.sans,
                fontSize: `${Typography.size.xs}px`,
                color: Core.textFaint,
                cursor: 'pointer',
                textAlign: 'center' as const,
                marginTop: Spacing.xs,
              }}
            >
              {config.googlePlaceId ? '✓ Google Match' : '⚠ Fix Google Match'}
            </button>
          )}
        </div>
      </div>

      {/* Fix Match sheet — half-height vaul sheet on top of this sheet */}
      {config.placeId && onSaveOverride && (
        <FixMatchSheet
          isOpen={fixMatchOpen}
          onClose={() => setFixMatchOpen(false)}
          placeName={config.title}
          currentGooglePlaceId={config.googlePlaceId}
          onSelectGooglePlace={googlePlaceId => onSaveOverride(config.placeId!, googlePlaceId)}
          biasLat={config.mapLat}
          biasLon={config.mapLon}
        />
      )}

      {/* Floating CTA — pinned outside scroll, always above content */}
      {hasFloatingCTA && (
        <FloatingAddCTA
          compress={compress}
          onAddToItinerary={onAddToItinerary!}
          isAdded={isAdded}
          stopLabel={config.stopLabel}
          stopColor={config.stopAccent}
          onView={onView}
          onExpandBar={scrollToTop}
        />
      )}
    </div>
  );
}
