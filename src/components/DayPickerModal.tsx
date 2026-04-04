import type { ItineraryDay, Place, Stop } from "../types";

interface DayPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "move" | "addPlace";
  // move mode
  itemId?: string;
  fromDayId?: string;
  onMoveItem?: (itemId: string, fromDayId: string, toDayId: string) => void;
  // addPlace mode
  place?: Place;
  onAddPlace?: (place: Place, toDayId: string) => void;
  // shared
  allDays: ItineraryDay[];
  stops: Stop[];
}

export function DayPickerModal({
  isOpen, onClose, mode,
  itemId, fromDayId, onMoveItem,
  place, onAddPlace,
  allDays, stops,
}: DayPickerModalProps) {
  if (!isOpen) return null;

  function handleSelect(dayId: string) {
    if (mode === "move" && itemId && fromDayId && onMoveItem) {
      onMoveItem(itemId, fromDayId, dayId);
    } else if (mode === "addPlace" && place && onAddPlace) {
      onAddPlace(place, dayId);
    }
    onClose();
  }

  // Group days by stop
  const stopGroups = stops.map(stop => ({
    stop,
    days: allDays.filter(d => d.stop_id === stop.id),
  })).filter(g => g.days.length > 0);

  const title = mode === "move" ? "Move to day" : `Add ${place?.name ?? "place"} to itinerary`;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.25)",
        }}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9001, background: "#fff", borderRadius: "16px",
        boxShadow: "0 16px 48px rgba(0,0,0,0.22)",
        width: "min(360px, 92vw)", maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        fontFamily: "Georgia,serif",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid #f0ede6",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontWeight: "bold", fontSize: "0.92rem", color: "#1a1a1a" }}>{title}</div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#aaa", lineHeight: 1, padding: "2px 4px" }}
          >✕</button>
        </div>

        {/* Day list */}
        <div style={{ overflowY: "auto", padding: "10px 0" }}>
          {stopGroups.map(({ stop, days }) => (
            <div key={stop.id}>
              {/* Stop header */}
              <div style={{
                padding: "8px 20px 4px",
                fontSize: "0.62rem", fontWeight: "bold", letterSpacing: "0.1em",
                textTransform: "uppercase", color: stop.accent,
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
                      padding: "11px 20px",
                      background: isCurrent ? "#f8f7f4" : "transparent",
                      border: "none",
                      cursor: isCurrent ? "default" : "pointer",
                      display: "flex", alignItems: "center", gap: "10px",
                      fontFamily: "Georgia,serif",
                      borderBottom: "1px solid #f5f3ef",
                    }}
                    onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = stop.accent + "0A"; }}
                    onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{day.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.84rem", fontWeight: "bold", color: isCurrent ? "#aaa" : "#1a1a1a" }}>{day.date}</div>
                      <div style={{ fontSize: "0.72rem", color: "#999", fontStyle: "italic", marginTop: "1px" }}>{day.label}</div>
                    </div>
                    {isCurrent && (
                      <span style={{ fontSize: "0.6rem", color: "#bbb", letterSpacing: "0.06em", textTransform: "uppercase" }}>current</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
