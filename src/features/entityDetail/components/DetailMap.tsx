// DetailMap — map display for entity detail sheets.
//
// Three modes, chosen by props:
//   trailEmbedUrl present → AllTrails widget iframe (shows trail path + elevation profile)
//   lat+lon present       → Google Maps embed iframe at trailhead/location coordinates
//   addr only             → "View on Maps" deep-link fallback
//   nothing               → DetailFallbackState

import { Icons } from '../../../design/icons';
import { Colors, IconColors, Radius, Spacing } from '../../../design/tokens';
import { DetailFallbackState } from './DetailFallbackState';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string;

interface DetailMapProps {
  lat?: number;
  lon?: number;
  label?: string;
  addr?: string;         // address fallback — renders "View on Maps" link when coords absent
  trailEmbedUrl?: string; // AllTrails widget embed URL — takes precedence over Google Maps
}

export function DetailMap({ lat, lon, label, addr, trailEmbedUrl }: DetailMapProps) {
  // AllTrails widget embed — renders actual trail path and elevation profile
  if (trailEmbedUrl) {
    return (
      <div
        style={{
          borderRadius: `${Radius.lg}px`,
          overflow: 'hidden',
          height: 300,
          width: '100%',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <iframe
          title={label ? `${label} trail map` : 'Trail map'}
          src={trailEmbedUrl}
          width="100%"
          height="300"
          style={{ border: 'none', display: 'block' }}
          loading="lazy"
          {...{ sandbox: 'allow-scripts allow-same-origin allow-popups' }}
          aria-label={`AllTrails map for ${label ?? 'trail'}`}
        />
      </div>
    );
  }
  if (lat == null || lon == null) {
    // When no coords but an address is available, show a maps deep-link
    if (addr) {
      return (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(addr)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: `${Spacing.base}px`,
            color: Colors.info,
            fontSize: 15,
            textDecoration: 'none',
            border: `1px solid ${Colors.border}`,
            borderRadius: `${Radius.md}px`,
          }}
        >
          View on Maps ↗
        </a>
      );
    }
    return (
      <DetailFallbackState
        emoji={<Icons.Map size={28} weight="duotone" color={IconColors.travel} />}
        message="Precise coordinates not available for this item."
      />
    );
  }

  // Google Maps Embed API — domain-restricted client key (VITE_GOOGLE_MAPS_KEY)
  // Prefer addr as the query when available — Google geocodes to the actual business.
  // Fall back to lat,lon only when no address is provided (future: precise place coords).
  const q = addr ? encodeURIComponent(addr) : `${lat},${lon}`;
  const src =
    `https://www.google.com/maps/embed/v1/place` +
    `?key=${MAPS_KEY}` +
    `&q=${q}` +
    `&zoom=15`;

  return (
    <div
      style={{
        borderRadius: `${Radius.lg}px`,
        overflow: 'hidden',
        height: 200,
        width: '100%',
        // Prevent iOS rubber-band scroll inside iframe
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <iframe
        title={label ?? 'Location map'}
        src={src}
        width="100%"
        height="200"
        style={{ border: 'none', display: 'block' }}
        loading="lazy"
        // Suppress TS error for sandbox — cast via attribute
        {...{ sandbox: 'allow-scripts allow-same-origin' }}
        aria-label={`Map showing location of ${label ?? 'entity'}`}
      />
    </div>
  );
}
