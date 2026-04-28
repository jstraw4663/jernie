import { createPortal } from "react-dom";
import type { ItineraryDay, Place, Stop } from "../types";
import { Colors, Spacing, Radius, Typography, Shadow } from "../design/tokens";
import { useSheetRegistration } from "../hooks/useSheetRegistration";

interface DayPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "move" | "addPlace";
  // move mode — single item (existing)
  itemId?: string;
  fromDayId?: string;
  onMoveItem?: (itemId: string, fromDayId: string, toDayId: string) => void;
  // move mode — multiple items from ActionBar
  onMoveItems?: (toDayId: string) => void;
  // addPlace mode
  place?: Place;
  onAddPlace?: (place: Place, toDayId: string) => void;
  // shared
  allDays: ItineraryDay[];
  stops: Stop[];
  /** When set, only days belonging to this stop_id are shown */
  filterStopId?: string;
}

export function DayPickerModal({
  isOpen, onClose, mode,
  itemId, fromDayId, onMoveItem, onMoveItems,
  place, onAddPlace,
  allDays, stops, filterStopId,
}: DayPickerModalProps) {
  useSheetRegistration(isOpen);

  if (!isOpen) return null;

  function handleSelect(dayId: string) {
    if (mode === "move") {
      if (onMoveItems) {
        onMoveItems(dayId);
      } else if (itemId && fromDayId && onMoveItem) {
        onMoveItem(itemId, fromDayId, dayId);
      }
    } else if (mode === "addPlace" && place && onAddPlace) {
      onAddPlace(place, dayId);
    }
    onClose();
  }

  // Filter days to a specific stop when requested (Move from edit mode)
  const visibleDays = filterStopId
    ? allDays.filter(d => d.stop_id === filterStopId)
    : allDays;

  // Group visible days by stop
  const stopGroups = stops.map(stop => ({
    stop,
    days: visibleDays.filter(d => d.stop_id === stop.id),
  })).filter(g => g.days.length > 0);

  const title = mode === "move" ? "Move to day" : `Add ${place?.name ?? "place"} to itinerary`;

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.28)",
        }}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9001,
        background: Colors.surface,
        borderRadius: Radius.xl,
        boxShadow: Shadow.xl,
        width: "min(360px, 92vw)", maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        fontFamily: Typography.family,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: `${Spacing.lg}px ${Spacing.xl}px ${Spacing.md}px`,
          borderBottom: `1px solid ${Colors.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontWeight: Typography.weight.bold, fontSize: Typography.size.base, color: Colors.textPrimary }}>{title}</div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.1rem", color: Colors.textMuted, lineHeight: 1, padding: `${Spacing.xxs}px ${Spacing.xs}px` }}
          >✕</button>
        </div>

        {/* Day list */}
        <div style={{ overflowY: "auto", padding: `${Spacing.sm}px 0` }}>
          {stopGroups.map(({ stop, days }) => (
            <div key={stop.id}>
              {/* Stop header */}
              <div style={{
                padding: `${Spacing.sm}px ${Spacing.xl}px ${Spacing.xs}px`,
                fontSize: Typography.size.xs, fontWeight: Typography.weight.bold,
                letterSpacing: "0.1em", textTransform: "uppercase", color: stop.accent,
              }}>
                {stop.city}
              </div>

              {/* Days */}
              {days.map(day => {
                const isCurrent = day.id === fromDayId;
                return (
                  <button
                    key={day.id}
                    onClick={() => !isCurrent && handleSelect(day.id)}
                    disabled={isCurrent}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: `${Spacing.md}px ${Spacing.xl}px`,
                      background: isCurrent ? Colors.surfaceRaised : "transparent",
                      border: "none",
                      cursor: isCurrent ? "default" : "pointer",
                      display: "flex", alignItems: "center", gap: Spacing.sm,
                      fontFamily: Typography.family,
                      borderBottom: `1px solid ${Colors.border}`,
                    }}
                    onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = stop.accent + "0A"; }}
                    onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{day.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: isCurrent ? Colors.textMuted : Colors.textPrimary }}>{day.date}</div>
                      <div style={{ fontSize: Typography.size.xs, color: Colors.textSecondary, fontStyle: "italic", marginTop: "1px" }}>{day.label}</div>
                    </div>
                    {isCurrent && (
                      <span style={{ fontSize: Typography.size.xs, color: Colors.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>current</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}
