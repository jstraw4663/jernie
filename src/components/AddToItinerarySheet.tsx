// AddToItinerarySheet — slide-up BottomSheet for adding a place to the jernie.
//
// Scopes the day list to the place's own stop so a Portland restaurant can
// never land on a Bar Harbor day. Replaces the old DayPickerModal addPlace
// flow (which showed all days and didn't filter by stop).
//
// PLATFORM NOTE: BottomSheet → Reanimated sheet on Expo migration.

import { BottomSheet } from './BottomSheet';
import type { ItineraryDay, Place, Stop } from '../types';
import { Colors, Spacing, Typography } from '../design/tokens';

interface AddToItinerarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place | null;
  allDays: ItineraryDay[];
  stops: Stop[];
  onAddPlace: (place: Place, toDayId: string) => void;
}

export function AddToItinerarySheet({
  isOpen,
  onClose,
  place,
  allDays,
  stops,
  onAddPlace,
}: AddToItinerarySheetProps) {
  if (!place) return null;

  const stop = stops.find(s => s.id === place.stop_id);
  const days = allDays.filter(d => d.stop_id === place.stop_id);

  function handleSelect(dayId: string) {
    if (place) {
      onAddPlace(place, dayId);
      onClose();
    }
  }

  const title = `Add to jernie`;

  return (
    <BottomSheet isOpen={isOpen} onRequestClose={onClose} title={title}>
      {/* Place context */}
      <div
        style={{
          padding: `${Spacing.sm}px ${Spacing.xl}px ${Spacing.md}px`,
          borderBottom: `1px solid ${Colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.sm,
        }}
      >
        <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{place.emoji}</span>
        <div>
          <div
            style={{
              fontFamily: Typography.family,
              fontSize: Typography.size.base,
              fontWeight: Typography.weight.semibold,
              color: Colors.textPrimary,
            }}
          >
            {place.name}
          </div>
          {stop && (
            <div
              style={{
                fontFamily: Typography.family,
                fontSize: Typography.size.xs,
                color: stop.accent,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                marginTop: 2,
                fontWeight: Typography.weight.bold,
              }}
            >
              {stop.city}
            </div>
          )}
        </div>
      </div>

      {/* Day list — scoped to this stop only */}
      <div style={{ overflowY: 'auto' as const }}>
        {days.map(day => (
          <button
            key={day.id}
            onClick={() => handleSelect(day.id)}
            style={{
              width: '100%',
              textAlign: 'left' as const,
              padding: `${Spacing.md}px ${Spacing.xl}px`,
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${Colors.border}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: Spacing.sm,
              fontFamily: Typography.family,
              WebkitTapHighlightColor: 'transparent',
            }}
            onPointerEnter={e => {
              (e.currentTarget as HTMLElement).style.background = stop ? stop.accent + '12' : Colors.surface2;
            }}
            onPointerLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{day.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: Typography.size.sm,
                  fontWeight: Typography.weight.bold,
                  color: Colors.textPrimary,
                }}
              >
                {day.date}
              </div>
              <div
                style={{
                  fontSize: Typography.size.xs,
                  color: Colors.textSecondary,
                  fontStyle: 'italic',
                  marginTop: 1,
                }}
              >
                {day.label}
              </div>
            </div>
            <span
              style={{
                fontSize: Typography.size.xs,
                color: stop?.accent ?? Colors.textMuted,
                opacity: 0.6,
              }}
            >
              →
            </span>
          </button>
        ))}

        {days.length === 0 && (
          <div
            style={{
              padding: `${Spacing.xxl}px ${Spacing.xl}px`,
              textAlign: 'center' as const,
              fontFamily: Typography.family,
              fontSize: Typography.size.sm,
              color: Colors.textMuted,
              fontStyle: 'italic',
            }}
          >
            No days available for this stop.
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
