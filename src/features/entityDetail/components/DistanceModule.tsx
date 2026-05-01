// DistanceModule — travel time + distance estimator from an origin to a trip stop.
//
// Walk / Bike: Haversine straight-line distance client-side. No API required.
// Drive / Transit: no calculation — shows "Open in Maps for route" with deep-link.
// When origin has no lat/lon: all modes show "Open in Maps for route".
//
// Display-only — writes nothing to Firebase.

import { useState } from 'react';
import { Icons } from '../../../design/icons';
import { Colors, Spacing, Radius, Shadow, Typography, IconColors } from '../../../design/tokens';
import { haversineKm, toMiles } from '../../../domain/geo';

export interface DestinationOption {
  id: string;
  label: string;   // stop.city
  lat: number;
  lon: number;
  addr: string;
}

export interface DistanceModuleProps {
  originAddr: string | null;
  originLat: number | null;
  originLon: number | null;
  destinationOptions: DestinationOption[];
  defaultDestinationId?: string;
}

// ── Modes ───────────────────────────────────────────────────────────────────

type ModeId = 'walk' | 'drive' | 'transit' | 'bike';

const MODES: Array<{ id: ModeId; Icon: React.ElementType; label: string; dirflg: string }> = [
  { id: 'walk',    Icon: Icons.Walk,  label: 'Walk',    dirflg: 'w' },
  { id: 'drive',   Icon: Icons.Car,   label: 'Drive',   dirflg: 'd' },
  { id: 'transit', Icon: Icons.Bus,   label: 'Transit', dirflg: 'r' },
  { id: 'bike',    Icon: Icons.Bike,  label: 'Bike',    dirflg: 'b' },
];

// ── Distance calculation ────────────────────────────────────────────────────

interface CalcResult {
  text: string;
  note: string | null;  // "(straight-line estimate)" or null
  canDeepLink: boolean;
}

function calcResult(
  mode: ModeId,
  originLat: number | null,
  originLon: number | null,
  destLat: number | null,
  destLon: number | null,
): CalcResult {
  const hasCoords = originLat !== null && originLon !== null
    && destLat !== null && destLon !== null;

  if (mode === 'drive' || mode === 'transit' || !hasCoords) {
    return { text: 'Open in Maps for route', note: null, canDeepLink: true };
  }

  const km = haversineKm(originLat!, originLon!, destLat!, destLon!);
  const miles = toMiles(km);
  const milesStr = miles.toFixed(1);

  if (mode === 'walk') {
    const mins = Math.round((miles / 3) * 60);
    const timeStr = mins >= 60
      ? `${Math.floor(mins / 60)}h ${mins % 60}m`
      : `${mins} min`;
    return {
      text: `~${timeStr} walk · ${milesStr} mi`,
      note: '(straight-line estimate)',
      canDeepLink: true,
    };
  }

  // bike
  const mins = Math.round((miles / 10) * 60);
  const timeStr = mins >= 60
    ? `${Math.floor(mins / 60)}h ${mins % 60}m`
    : `${mins} min`;
  return {
    text: `~${timeStr} bike · ${milesStr} mi`,
    note: '(straight-line estimate)',
    canDeepLink: true,
  };
}

// ── Deep-link URL ───────────────────────────────────────────────────────────

function mapsUrl(originAddr: string, destAddr: string, dirflg: string): string {
  return (
    `https://maps.apple.com/?saddr=${encodeURIComponent(originAddr)}` +
    `&daddr=${encodeURIComponent(destAddr)}` +
    `&dirflg=${dirflg}`
  );
}

// ── Module ──────────────────────────────────────────────────────────────────

export function DistanceModule({
  originAddr,
  originLat,
  originLon,
  destinationOptions,
  defaultDestinationId,
}: DistanceModuleProps) {
  const defaultDest = destinationOptions.find(d => d.id === defaultDestinationId)
    ?? destinationOptions[0]
    ?? null;

  const [activeMode, setActiveMode] = useState<ModeId>('walk');
  // Free-text destination — initialized to default stop city if provided
  const [destText, setDestText] = useState<string>(defaultDest?.label ?? '');
  // Coords only known when a quick-select chip is active; null for typed addresses
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number } | null>(
    defaultDest ? { lat: defaultDest.lat, lon: defaultDest.lon } : null,
  );

  const result = destText.trim() !== ''
    ? calcResult(activeMode, originLat, originLon,
        destCoords?.lat ?? null, destCoords?.lon ?? null)
    : null;

  const activeModeEntry = MODES.find(m => m.id === activeMode)!;

  function handleResultTap() {
    if (!result?.canDeepLink || !originAddr || !destText.trim()) return;
    const url = mapsUrl(originAddr, destText.trim(), activeModeEntry.dirflg);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      style={{
        background: Colors.surface,
        borderRadius: `${Radius.lg}px`,
        boxShadow: Shadow.sm,
        padding: `${Spacing.base}px`,
        marginBottom: `${Spacing.xl}px`,
      }}
    >
      {/* Mode selector pills */}
      <div
        style={{
          display: 'flex',
          gap: `${Spacing.sm}px`,
          marginBottom: `${Spacing.md}px`,
        }}
      >
        {MODES.map(mode => {
          const isActive = mode.id === activeMode;
          return (
            <button
              key={mode.id}
              type="button"
              aria-label={`Travel mode: ${mode.label}`}
              aria-pressed={isActive}
              onClick={() => setActiveMode(mode.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: `${Spacing.xxs}px`,
                padding: `${Spacing.xs}px ${Spacing.xs}px`,
                minHeight: 44,
                borderRadius: Radius.full,
                border: 'none',
                background: isActive ? Colors.navy : Colors.surface2,
                color: isActive ? Colors.textInverse : Colors.textMuted,
                fontFamily: Typography.family.sans,
                fontSize: `${Typography.size.xs}px`,
                fontWeight: Typography.weight.semibold,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <mode.Icon size={Typography.size.sm} weight="duotone" color={isActive ? 'currentColor' : IconColors.travel} />
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* Origin row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: `${Spacing.sm}px`,
          marginBottom: `${Spacing.xs}px`,
        }}
      >
        <span
          style={{
            fontFamily: Typography.family.sans,
            fontSize: `${Typography.size.xs}px`,
            color: Colors.textSecondary,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            flexShrink: 0,
            marginTop: 2,
            minWidth: 32,
          }}
        >
          From
        </span>
        <span
          style={{
            fontFamily: Typography.family.sans,
            fontSize: `${Typography.size.sm}px`,
            color: originAddr ? Colors.textPrimary : Colors.textSecondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {originAddr ?? 'No address available'}
        </span>
      </div>

      {/* Destination row — free-text input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: `${Spacing.sm}px`,
          marginBottom: `${Spacing.xs}px`,
        }}
      >
        <span
          style={{
            fontFamily: Typography.family.sans,
            fontSize: `${Typography.size.xs}px`,
            color: Colors.textSecondary,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            flexShrink: 0,
            minWidth: 32,
          }}
        >
          To
        </span>
        <input
          type="text"
          value={destText}
          placeholder="Enter an address…"
          aria-label="Destination address"
          onChange={e => {
            setDestText(e.target.value);
            setDestCoords(null); // typed address has no coords
          }}
          style={{
            flex: 1,
            fontFamily: Typography.family.sans,
            fontSize: `${Typography.size.sm}px`,
            color: Colors.textPrimary,
            background: 'transparent',
            border: 'none',
            borderBottom: `1px solid ${Colors.border}`,
            outline: 'none',
            padding: `${Spacing.xs}px 0`,
            minHeight: 44,
          }}
        />
      </div>

      {/* Quick-select chips — trip stops */}
      {destinationOptions.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap' as const,
            gap: `${Spacing.xs}px`,
            marginBottom: `${Spacing.sm}px`,
          }}
        >
          {destinationOptions.map(opt => {
            const isActive = destText === opt.label && destCoords !== null;
            return (
              <button
                key={opt.id}
                type="button"
                aria-label={`Quick select: ${opt.label}`}
                aria-pressed={isActive}
                onClick={() => {
                  setDestText(opt.label);
                  setDestCoords({ lat: opt.lat, lon: opt.lon });
                }}
                style={{
                  padding: `${Spacing.xxs + 2}px ${Spacing.sm}px`,
                  minHeight: 36,
                  borderRadius: Radius.full,
                  border: 'none',
                  background: isActive ? Colors.navy : Colors.surface2,
                  color: isActive ? Colors.textInverse : Colors.textMuted,
                  fontFamily: Typography.family.sans,
                  fontSize: `${Typography.size.xs}px`,
                  fontWeight: Typography.weight.medium,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Result row */}
      {result !== null && (
        <>
          <div style={{ height: 1, background: Colors.border, margin: `${Spacing.xs}px 0` }} />
          <button
            type="button"
            aria-label={`${result.text}. Open in Maps.`}
            onClick={handleResultTap}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: `${Spacing.sm}px`,
              marginTop: `${Spacing.sm}px`,
              minHeight: 44,
              width: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: result.canDeepLink ? 'pointer' : 'default',
              textAlign: 'left' as const,
            }}
          >
            <activeModeEntry.Icon size={Typography.size.base} weight="duotone" color={IconColors.travel} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: Typography.family.sans,
                  fontSize: `${Typography.size.sm}px`,
                  color: Colors.textPrimary,
                  fontWeight: Typography.weight.medium,
                }}
              >
                {result.text}
              </div>
              {result.note && (
                <div
                  style={{
                    fontFamily: Typography.family.sans,
                    fontSize: `${Typography.size.xs}px`,
                    color: Colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {result.note}
                </div>
              )}
            </div>
            {result.canDeepLink && (
              <span
                style={{
                  fontSize: `${Typography.size.sm}px`,
                  color: Colors.info,
                  flexShrink: 0,
                }}
              >
                ↗
              </span>
            )}
          </button>
        </>
      )}
    </div>
  );
}
