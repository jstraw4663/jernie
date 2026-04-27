import { useState } from 'react';
import type { Place, PlaceEnrichment } from '../../types';
import { Colors, Radius, Spacing, Typography, Shadow, Animation } from '../../design/tokens';
import { ItineraryBadge } from '../../components/ItineraryBadge';

interface PlaceCarouselCardProps {
  place: Place;
  stopName: string;
  accent: string;
  enrichment?: PlaceEnrichment;
  isAdded?: boolean;
  onClick?: (place: Place, rect: DOMRect) => void;
  onAddToItinerary?: (place: Place) => void;
}

export function PlaceCarouselCard({ place, stopName, accent, enrichment, isAdded, onClick, onAddToItinerary }: PlaceCarouselCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const photoUrl = imgError ? null : (enrichment?.photos?.[0] ?? place.photo_url ?? null);
  const rating = enrichment?.rating ?? place.rating;
  const price = enrichment?.price_level ?? place.price;

  return (
    <div
      onClick={onClick ? (e) => onClick(place, (e.currentTarget as HTMLElement).getBoundingClientRect()) : undefined}
      style={{
        width: 172,
        flexShrink: 0,
        borderRadius: `${Radius.lg}px`,
        overflow: 'hidden',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        boxShadow: Shadow.cardResting,
        cursor: onClick ? 'pointer' : 'default',
        transition: `box-shadow 150ms ${Animation.easing.default}, transform 150ms ${Animation.easing.default}`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = Shadow.cardHover;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = Shadow.cardResting;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Image area — gradient+emoji always present; photo fades in over it */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '56.25%', // 16:9
        background: `linear-gradient(135deg, ${accent}BB 0%, ${accent}44 100%)`,
        overflow: 'hidden',
      }}>
        {/* Emoji fallback, always rendered */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          opacity: imgLoaded ? 0 : 1,
          transition: `opacity 300ms ${Animation.easing.default}`,
        }}>
          {place.emoji}
        </div>

        {/* Photo — fades in on load */}
        {photoUrl && (
          <img
            src={photoUrl}
            alt={place.name}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: imgLoaded ? 1 : 0,
              transition: `opacity 400ms ${Animation.easing.default}`,
            }}
          />
        )}

        {/* Must badge */}
        {place.must && (
          <div style={{
            position: 'absolute',
            top: Spacing.xs,
            left: Spacing.xs,
            background: accent,
            color: '#fff',
            fontSize: `${Typography.size.xs - 1}px`,
            fontWeight: Typography.weight.bold,
            padding: `2px ${Spacing.sm}px`,
            borderRadius: `${Radius.full}px`,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            Must
          </div>
        )}

        {/* Add-to-itinerary badge */}
        {onAddToItinerary && (
          <ItineraryBadge place={place} isAdded={isAdded} accent={accent} onAdd={onAddToItinerary} top={Spacing.xs} right={Spacing.xs} zIndex={2} />
        )}
      </div>

      {/* Info */}
      <div style={{ padding: `${Spacing.sm}px ${Spacing.sm}px ${Spacing.md}px` }}>
        <div style={{
          fontWeight: Typography.weight.semibold,
          fontSize: `${Typography.size.sm}px`,
          color: Colors.textPrimary,
          lineHeight: Typography.lineHeight.tight,
          marginBottom: Spacing.xs,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {place.emoji} {place.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' }}>
          {rating != null && (
            <span style={{ fontSize: `${Typography.size.xs}px`, color: '#F59E0B', fontWeight: Typography.weight.medium }}>
              ★ {rating}
            </span>
          )}
          {price && (
            <span style={{ fontSize: `${Typography.size.xs}px`, color: Colors.textMuted }}>{price}</span>
          )}
          <span style={{
            fontSize: `${Typography.size.xs - 1}px`,
            color: Colors.textMuted,
            background: Colors.surface2,
            borderRadius: `${Radius.full}px`,
            padding: `1px ${Spacing.xs + 2}px`,
            flexShrink: 0,
          }}>
            {stopName}
          </span>
        </div>
      </div>
    </div>
  );
}
