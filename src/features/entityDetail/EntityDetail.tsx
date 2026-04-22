// EntityDetail — pure renderer that takes a DetailConfig and produces the
// scrollable detail view (hero + header + sections + optional map).
//
// The entire content lives in a single scroll container with NO data-vaul-no-drag.
// vaul detects this scrollable container and applies scroll-position logic:
//   scrollTop === 0 + drag down → captured by vaul to dismiss the sheet
//   scrollTop > 0 + drag down   → normal scroll, vaul does not interfere

import type { DetailConfig } from './detailTypes';
import { DetailHero } from './components/DetailHero';
import { DetailHeader } from './components/DetailHeader';
import { DetailSection } from './components/DetailSection';
import { DetailMap } from './components/DetailMap';
import { DetailPhotoStrip } from './components/DetailPhotoStrip';
import { Colors, Spacing } from '../../design/tokens';

interface EntityDetailProps {
  config: DetailConfig;
  onClose: () => void;
  isCachedOnly?: boolean;
  onAddToItinerary?: () => void;
  isAdded?: boolean;
}

export function EntityDetail({ config, onClose, isCachedOnly = false, onAddToItinerary, isAdded }: EntityDetailProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: Colors.background,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch' as const,
        overscrollBehavior: 'contain',
      }}
    >
      {isCachedOnly && (
        <div style={{ color: Colors.textMuted, fontSize: 12, textAlign: 'center', padding: `${Spacing.xs}px ${Spacing.base}px` }}>
          Cached data · Some details may be outdated
        </div>
      )}

      {/* Hero scrolls with content; X button overlaid top-right */}
      <DetailHero
        gradient={config.heroGradient}
        photoUrl={config.heroPhotoUrl}
        logoUrl={config.heroLogoUrl}
        emoji={config.heroEmoji}
        title={config.title}
        subtitle={config.subtitle}
        categoryChip={config.categoryChip}
        onClose={onClose}
        onAddToItinerary={onAddToItinerary}
        isAdded={isAdded}
      />

      {config.externalUrl && (
        <DetailHeader externalUrl={config.externalUrl} />
      )}

      {config.photos && config.photos.length > 0 && (
        <DetailPhotoStrip photos={config.photos} />
      )}

      <div
        style={{
          flex: 1,
          padding: `${Spacing.base}px ${Spacing.base}px ${Spacing.xxxl}px`,
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
              fontSize: 11, fontWeight: '700', color: Colors.textMuted,
              letterSpacing: '0.12em', textTransform: 'uppercase' as const,
              fontFamily: 'Georgia, serif', marginBottom: `${Spacing.sm}px`,
            }}>
              Map
            </div>
            <DetailMap lat={config.mapLat} lon={config.mapLon} addr={config.mapAddr} label={config.title} trailEmbedUrl={config.trailEmbedUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
