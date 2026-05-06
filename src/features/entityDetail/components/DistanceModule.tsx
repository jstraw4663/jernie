// DistanceModule — travel time + distance estimator from an origin to a searched place.
//
// Walk / Bike: Haversine straight-line distance client-side. No API required.
// Drive / Transit: no calculation — shows "Open in Maps for route" with deep-link.
// When origin has no lat/lon: all modes show "Open in Maps for route".
// Destination search uses trip.json data cached in localStorage — works offline.
//
// Display-only — writes nothing to Firebase.

import { useState, useMemo, useRef } from 'react';
import { Icons } from '../../../design/icons';
import { Colors, Spacing, Radius, Shadow, Typography, IconColors } from '../../../design/tokens';
import { haversineKm, toMiles } from '../../../domain/geo';
import { useTripData } from '../../../hooks/useTripData';

// Normalized shape shared by Place and Booking search results
interface SearchCandidate {
  id: string;
  name: string;
  subtitle: string;
  lat: number | null;
  lon: number | null;
  addr: string | null;
}

export interface DistanceModuleProps {
  originAddr: string | null;
  originLat: number | null;
  originLon: number | null;
  stopId: string;
  excludePlaceId?: string;
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
  stopId,
  excludePlaceId,
}: DistanceModuleProps) {
  const { data } = useTripData();
  const [activeMode, setActiveMode] = useState<ModeId>('walk');
  const [destText, setDestText] = useState('');
  // Resolved coords + addr when a place is selected from the dropdown
  const [selectedDest, setSelectedDest] = useState<{
    lat: number | null;
    lon: number | null;
    addr: string | null;
  } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accommodation bookings for this stop — shown as quick-select chips and included in search
  const hotelCandidates = useMemo((): SearchCandidate[] =>
    (data?.bookings ?? [])
      .filter(b => b.stop_id === stopId && b.type === 'accommodation')
      .map(b => ({ id: b.id, name: b.label, subtitle: 'Hotel', lat: null, lon: null, addr: b.addr ?? null })),
    [data, stopId],
  );

  // Places for this stop (excluding the entity being viewed)
  const placeCandidates = useMemo((): SearchCandidate[] =>
    (data?.places ?? [])
      .filter(p => p.stop_id === stopId && p.id !== excludePlaceId)
      .map(p => ({ id: p.id, name: p.name, subtitle: p.subcategory.replace(/-/g, ' '), lat: p.lat ?? null, lon: p.lon ?? null, addr: p.addr ?? null })),
    [data, stopId, excludePlaceId],
  );

  const candidates = useMemo(() =>
    [...hotelCandidates, ...placeCandidates],
    [hotelCandidates, placeCandidates],
  );

  const results = useMemo(() => {
    if (!destText.trim()) return [];
    const q = destText.toLowerCase();
    return candidates.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [candidates, destText]);

  const result = destText.trim() !== ''
    ? calcResult(activeMode, originLat, originLon,
        selectedDest?.lat ?? null, selectedDest?.lon ?? null)
    : null;

  const activeModeEntry = MODES.find(m => m.id === activeMode)!;

  // Prefer lat/lon over addr string for the Apple Maps daddr — more precise.
  function getDestForLink(): string {
    if (selectedDest) {
      if (selectedDest.lat !== null && selectedDest.lon !== null) {
        return `${selectedDest.lat},${selectedDest.lon}`;
      }
      if (selectedDest.addr) return selectedDest.addr;
    }
    return destText.trim();
  }

  function handleResultTap() {
    if (!result?.canDeepLink || !originAddr || !destText.trim()) return;
    const url = mapsUrl(originAddr, getDestForLink(), activeModeEntry.dirflg);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function selectCandidate(c: SearchCandidate) {
    setDestText(c.name);
    setSelectedDest({ lat: c.lat, lon: c.lon, addr: c.addr });
    setShowDropdown(false);
    if (blurTimer.current) clearTimeout(blurTimer.current);
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

      {/* Destination row + search dropdown */}
      <div style={{ position: 'relative' }}>
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
            placeholder="Search places…"
            aria-label="Destination search"
            onChange={e => {
              setDestText(e.target.value);
              setSelectedDest(null);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (blurTimer.current) clearTimeout(blurTimer.current);
              if (destText.trim()) setShowDropdown(true);
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setShowDropdown(false), 150);
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

        {showDropdown && results.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: Colors.surface,
              borderRadius: `${Radius.md}px`,
              boxShadow: Shadow.md,
              zIndex: 10,
              overflow: 'hidden',
            }}
          >
            {results.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => selectCandidate(c)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left' as const,
                  padding: `${Spacing.sm}px ${Spacing.base}px`,
                  background: 'none',
                  border: 'none',
                  borderBottom: i < results.length - 1 ? `1px solid ${Colors.border}` : 'none',
                  cursor: 'pointer',
                  fontFamily: Typography.family.sans,
                  fontSize: `${Typography.size.sm}px`,
                  color: Colors.textPrimary,
                  minHeight: 44,
                }}
              >
                {c.name}
                {c.subtitle && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: `${Typography.size.xs}px`,
                      color: Colors.textMuted,
                      marginTop: 1,
                    }}
                  >
                    {c.subtitle}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hotel quick-select chips */}
      {hotelCandidates.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap' as const,
            gap: `${Spacing.xs}px`,
            marginBottom: `${Spacing.sm}px`,
          }}
        >
          {hotelCandidates.map(hotel => {
            const isActive = destText === hotel.name && selectedDest !== null;
            return (
              <button
                key={hotel.id}
                type="button"
                aria-label={`Quick select: ${hotel.name}`}
                aria-pressed={isActive}
                onClick={() => selectCandidate(hotel)}
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
                {hotel.name}
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
