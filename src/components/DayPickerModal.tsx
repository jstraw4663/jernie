import { BottomSheet } from './BottomSheet';
import type { ItineraryDay, Stop } from '../types';
import { Colors, Spacing, Typography } from '../design/tokens';
import { resolveStopColor } from '../design/tripPacks';

interface DayPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  fromDayId?: string;
  onMoveItem?: (itemId: string, fromDayId: string, toDayId: string) => void;
  onMoveItems?: (toDayId: string) => void;
  allDays: ItineraryDay[];
  stops: Stop[];
  /** When set, only days belonging to this stop_id are shown */
  filterStopId?: string;
}

export function DayPickerModal({
  isOpen, onClose,
  itemId, fromDayId, onMoveItem, onMoveItems,
  allDays, stops, filterStopId,
}: DayPickerModalProps) {
  function handleSelect(dayId: string) {
    if (onMoveItems) {
      onMoveItems(dayId);
    } else if (itemId && fromDayId && onMoveItem) {
      onMoveItem(itemId, fromDayId, dayId);
    }
    onClose();
  }

  const visibleDays = filterStopId
    ? allDays.filter(d => d.stop_id === filterStopId)
    : allDays;

  const stopGroups = stops.map(stop => ({
    stop,
    days: visibleDays.filter(d => d.stop_id === stop.id),
  })).filter(g => g.days.length > 0);

  return (
    <BottomSheet isOpen={isOpen} onRequestClose={onClose} title="Move to day">
      <div style={{ padding: `${Spacing.sm}px 0` }}>
        {stopGroups.map(({ stop, days }) => (
          <div key={stop.id}>
            <div style={{
              padding: `${Spacing.sm}px ${Spacing.xl}px ${Spacing.xs}px`,
              fontSize: Typography.size.xs,
              fontWeight: Typography.weight.bold,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: resolveStopColor(stop),
            }}>
              {stop.city}
            </div>
            {days.map(day => {
              const isCurrent = day.id === fromDayId;
              return (
                <button
                  key={day.id}
                  onClick={() => !isCurrent && handleSelect(day.id)}
                  disabled={isCurrent}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: `${Spacing.md}px ${Spacing.xl}px`,
                    background: isCurrent ? Colors.surfaceRaised : 'transparent',
                    border: 'none',
                    cursor: isCurrent ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: Spacing.sm,
                    fontFamily: Typography.family.sans,
                    borderBottom: `1px solid ${Colors.border}`,
                  }}
                  onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = resolveStopColor(stop) + '0A'; }}
                  onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{day.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: isCurrent ? Colors.textMuted : Colors.textPrimary }}>{day.date}</div>
                    <div style={{ fontSize: Typography.size.xs, color: Colors.textSecondary, fontStyle: 'italic', marginTop: '1px' }}>{day.label}</div>
                  </div>
                  {isCurrent && (
                    <span style={{ fontSize: Typography.size.xs, color: Colors.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>current</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
