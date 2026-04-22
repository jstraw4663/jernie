import type { Place, Stop, TrailEnrichment, PlaceEnrichment } from '../../../types';
import type { DetailConfig, DetailRow, DetailSectionConfig } from '../detailTypes';
import { Colors, Spacing, Radius, Typography } from '../../../design/tokens';
import { appleMapsUrl } from '../../../domain/trip';
import { ROUTE_TYPE_LABELS } from '../../../domain/hike';
import { section } from './utils';
import { DistanceModule } from '../components/DistanceModule';

// Derive AllTrails widget embed URL from a standard AllTrails trail URL.
// "https://www.alltrails.com/trail/us/maine/the-beehive-loop-trail"
//   → "https://www.alltrails.com/widget/trail/us/maine/the-beehive-loop-trail"
function toTrailEmbedUrl(url: string | null | undefined): string | undefined {
  if (!url?.includes('alltrails.com/trail/')) return undefined;
  return url.replace('alltrails.com/trail/', 'alltrails.com/widget/trail/');
}

// ── Difficulty badge ───────────────────────────────────────────────────────
// Ski trail convention: Green Circle (Easy), Blue Square (Medium),
// Black Diamond (Hard), Double Black Diamond (Expert).

interface DifficultyLevel {
  symbol: string;
  label: string;
  color: string;
}

const DIFFICULTY_LEVELS: Record<string, DifficultyLevel> = {
  easy:      { symbol: '●', label: 'Easy',   color: '#4CAF50' },
  moderate:  { symbol: '■', label: 'Medium', color: '#2196F3' },
  strenuous: { symbol: '◆', label: 'Hard',   color: '#1A1A1A' },
  expert:    { symbol: '◆◆', label: 'Expert', color: '#1A1A1A' },
};

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const level = DIFFICULTY_LEVELS[difficulty.toLowerCase()]
    ?? { symbol: '?', label: difficulty, color: Colors.textMuted };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: `${Spacing.md}px`,
        padding: `${Spacing.sm}px 0`,
        borderBottom: `1px solid ${Colors.border}`,
      }}
    >
      <span
        style={{
          fontFamily: Typography.family,
          fontSize: `${Typography.size.sm}px`,
          color: Colors.textMuted,
          flexShrink: 0,
          minWidth: 80,
        }}
      >
        Difficulty
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: `${Spacing.xs}px`,
          background: Colors.surface2,
          borderRadius: Radius.full,
          padding: `${Spacing.xxs + 2}px ${Spacing.sm}px`,
        }}
      >
        <span
          style={{
            color: level.color,
            fontSize: `${Typography.size.base}px`,
            fontWeight: Typography.weight.bold,
            lineHeight: 1,
          }}
        >
          {level.symbol}
        </span>
        <span
          style={{
            fontFamily: Typography.family,
            fontSize: `${Typography.size.sm}px`,
            color: Colors.textPrimary,
            fontWeight: Typography.weight.medium,
          }}
        >
          {level.label}
        </span>
      </span>
    </div>
  );
}

// ── Feature chips row ──────────────────────────────────────────────────────

function FeaturesRow({ features }: { features: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${Spacing.xs}px`, padding: `${Spacing.xs}px 0` }}>
      {features.map(f => (
        <span
          key={f}
          style={{
            fontSize: `${Typography.size.xs}px`,
            background: Colors.surface2,
            color: Colors.textSecondary,
            padding: `2px ${Spacing.sm}px`,
            borderRadius: `${Radius.full}px`,
            fontFamily: Typography.family,
          }}
        >
          {f}
        </span>
      ))}
    </div>
  );
}

export function buildHikeDetailConfig(
  place: Place,
  stop: Stop,
  stops: Stop[],
  trailEnrichment?: TrailEnrichment,
  placeEnrichment?: PlaceEnrichment,
): DetailConfig {
  const heroGradient = `linear-gradient(145deg, ${Colors.success} 0%, ${Colors.navy} 100%)`;

  const destinationOptions = stops.map(s => ({
    id: s.id,
    label: s.city,
    lat: s.lat,
    lon: s.lon,
    addr: s.city,
  }));

  // ── Trail Info section ─────────────────────────────────────────
  const trailRows: DetailRow[] = [];
  if (place.difficulty) {
    trailRows.push({
      label: '', value: '',
      component: <DifficultyBadge difficulty={place.difficulty} />,
    });
  }
  if (place.distance) {
    trailRows.push({ label: 'Distance', value: place.distance });
  }
  if (place.duration) {
    trailRows.push({ label: 'Est. time', value: place.duration });
  }
  // Static place fields take precedence; trail enrichment fills in if place field absent
  const elevGain = place.elevation_gain ?? trailEnrichment?.elevation_gain;
  if (elevGain) {
    trailRows.push({ label: 'Elevation gain', value: `↑ ${elevGain}` });
  }
  const routeType = place.route_type ?? trailEnrichment?.route_type;
  if (routeType && ROUTE_TYPE_LABELS[routeType]) {
    trailRows.push({ label: 'Route type', value: ROUTE_TYPE_LABELS[routeType] });
  }
  const dogsAllowed = place.dogs_allowed ?? trailEnrichment?.dogs_allowed;
  if (dogsAllowed != null) {
    trailRows.push({
      label: 'Dogs',
      value: dogsAllowed ? '🐕 Allowed on leash' : '🚫 No dogs',
    });
  }
  const features = place.features ?? trailEnrichment?.features;
  if (features && features.length > 0) {
    trailRows.push({
      label: '', value: '',
      component: <FeaturesRow features={features} />,
    });
  }

  // ── Trail Map section ──────────────────────────────────────────
  // AllTrails widget embed derived from place.url — renders actual trail path.
  // Falls back to Google Maps pin (via mapLat/mapLon on DetailConfig) when no URL.
  const trailEmbedUrl = toTrailEmbedUrl(place.url);

  // ── Getting There section ─────────────────────────────────────
  const gettingThereRows: DetailRow[] = [];
  if (place.addr) {
    gettingThereRows.push({
      label: 'Address',
      value: place.addr,
      link: appleMapsUrl(place.addr),
    });
  } else {
    gettingThereRows.push({ label: 'Area', value: stop.city });
  }
  gettingThereRows.push({
    label: '', value: '',
    component: (
      <DistanceModule
        originAddr={place.addr ?? null}
        originLat={place.lat ?? null}
        originLon={place.lon ?? null}
        destinationOptions={destinationOptions}
        defaultDestinationId={stop.id}
      />
    ),
  });

  // ── Notes section ─────────────────────────────────────────────
  const noteRows: DetailRow[] = [];
  if (place.note) {
    noteRows.push({ label: 'Guide notes', value: place.note });
  }
  if (place.flag) {
    noteRows.push({ label: 'Heads up', value: `⚠ ${place.flag}` });
  }
  if (place.must) {
    noteRows.push({ label: 'Curated', value: '⭐ Must-do hike' });
  }
  if (place.source === 'community' && place.attribution_handle) {
    noteRows.push({ label: 'Recommended by', value: `@${place.attribution_handle}` });
  }

  const sections: DetailSectionConfig[] = [
    section('Trail Info', trailRows),
    section('Getting There', gettingThereRows),
    section('Notes', noteRows),
  ].filter((s): s is DetailSectionConfig => s !== null);

  return {
    kind: 'place',
    title: place.name,
    subtitle: `${stop.city} · Trail`,
    heroEmoji: place.emoji,
    heroGradient,
    heroPhotoUrl: place.photo_url ?? undefined,
    photos: placeEnrichment?.photos ?? place.photos ?? undefined,
    categoryChip: 'Hike',
    mapLat: place.lat ?? stop.lat,
    mapLon: place.lon ?? stop.lon,
    mapAddr: place.addr ?? undefined,
    trailEmbedUrl,
    sections,
    externalUrl: place.url ?? undefined,
  };
}
