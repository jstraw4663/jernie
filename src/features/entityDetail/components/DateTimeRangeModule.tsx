// DateTimeRangeModule — two labeled date/time picker rows with a calculated duration.
//
// Designed to be embedded inside entity detail sheets (accommodation, rental car).
// Writes nothing directly — parent handles Firebase write queue via onXxxChange callbacks.
//
// Native input trigger pattern: invisible <input type="date|time"> revealed via ref.showPicker().
// readOnly mode: all pickers are hidden; values are rendered as plain text pills.

import { useState, type ReactNode } from 'react';
import { Colors, Spacing, Radius, Shadow, Typography } from '../../../design/tokens';

export interface DateTimeRangeModuleProps {
  startLabel: string;              // e.g. "Check-in", "Pickup"
  endLabel: string;                // e.g. "Check-out", "Return"
  startIcon: ReactNode;
  endIcon: ReactNode;
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  durationUnit: 'nights' | 'days' | 'hours';
  onStartDateChange: (val: string) => void;
  onStartTimeChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onEndTimeChange: (val: string) => void;
  readOnly?: boolean;
}

// ── Duration calculation ────────────────────────────────────────────────────

function calcDuration(
  startDate: string | null,
  startTime: string | null,
  endDate: string | null,
  endTime: string | null,
  unit: 'nights' | 'days' | 'hours',
): string {
  if (!startDate || !endDate) return '—';

  if (unit === 'hours') {
    const s = new Date(`${startDate}T${startTime ?? '00:00'}`);
    const e = new Date(`${endDate}T${endTime ?? '00:00'}`);
    const mins = Math.round((e.getTime() - s.getTime()) / 60000);
    if (mins <= 0) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  const msPerDay = 86_400_000;
  const diff = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / msPerDay,
  );
  if (diff <= 0) return '—';
  const label = unit === 'nights' ? 'Night' : 'Day';
  return `${diff} ${label}${diff !== 1 ? 's' : ''}`;
}

// ── Format helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return 'Date';
  const [year, month, day] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}

function formatTime(hhmm: string | null): string {
  if (!hhmm) return 'Time';
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ── Pill component ──────────────────────────────────────────────────────────
// Cross-platform date/time trigger: a transparent <input> overlays the visible pill.
// Tapping anywhere on the pill region activates the native picker — works on iOS Safari,
// Android Chrome, and desktop. No showPicker() call needed.

interface PillProps {
  value: string | null;
  placeholder: string;
  type: 'date' | 'time';
  isoValue: string;            // current <input> value
  onChange: (val: string) => void;
  readOnly: boolean;
  displayText: string;
}

function Pill({ value, placeholder, type, isoValue, onChange, readOnly, displayText }: PillProps) {
  const filled = value !== null && value !== '';

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${Spacing.xs}px ${Spacing.sm}px`,
    minHeight: 44,
    borderRadius: Radius.full,
    background: filled ? Colors.navy : Colors.surface2,
    color: filled ? Colors.textInverse : Colors.textMuted,
    fontFamily: Typography.family.sans,
    fontSize: `${Typography.size.sm}px`,
    fontWeight: Typography.weight.medium,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  if (readOnly) {
    return <span style={pillStyle}>{filled ? displayText : placeholder}</span>;
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Visible label — pointer-events off so taps fall through to the input */}
      <span style={{ ...pillStyle, pointerEvents: 'none' }}>
        {filled ? displayText : placeholder}
      </span>
      {/* Transparent native input covers the pill — activates platform picker on tap */}
      <input
        type={type}
        value={isoValue}
        onChange={e => onChange(e.target.value)}
        aria-label={`${type === 'date' ? 'Select date' : 'Select time'}: ${filled ? displayText : placeholder}`}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          width: '100%',
          height: '100%',
          cursor: 'pointer',
          border: 'none',
          padding: 0,
          margin: 0,
        }}
      />
    </div>
  );
}

// ── Row component ───────────────────────────────────────────────────────────

interface RowProps {
  icon: ReactNode;
  label: string;
  date: string | null;
  time: string | null;
  onDateChange: (val: string) => void;
  onTimeChange: (val: string) => void;
  readOnly: boolean;
}

function DateTimeRow({ icon, label, date, time, onDateChange, onTimeChange, readOnly }: RowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: `${Spacing.sm}px`,
        padding: `${Spacing.sm}px 0`,
      }}
    >
      {/* Icon + label */}
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span
        style={{
          fontFamily: Typography.family.sans,
          fontSize: `${Typography.size.sm}px`,
          color: Colors.textPrimary,
          flex: 1,
          fontWeight: Typography.weight.medium,
        }}
      >
        {label}
      </span>

      {/* Pills */}
      <div style={{ display: 'flex', gap: `${Spacing.xs}px`, flexShrink: 0 }}>
        <Pill
          value={date}
          placeholder="Date"
          type="date"
          isoValue={date ?? ''}
          onChange={onDateChange}
          readOnly={readOnly}
          displayText={formatDate(date)}
        />
        <Pill
          value={time}
          placeholder="Time"
          type="time"
          isoValue={time ?? ''}
          onChange={onTimeChange}
          readOnly={readOnly}
          displayText={formatTime(time)}
        />
      </div>
    </div>
  );
}

// ── Module ──────────────────────────────────────────────────────────────────

export function DateTimeRangeModule({
  startLabel,
  endLabel,
  startIcon,
  endIcon,
  startDate,
  startTime,
  endDate,
  endTime,
  durationUnit,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
  readOnly = false,
}: DateTimeRangeModuleProps) {
  // Local state for optimistic UI — the picker fires onChange immediately on selection
  // but trip.json never reflects writes (Phase 2 adds the Firebase listener). Without
  // local state the controlled inputs snap back to the prop value on each render.
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localStartTime, setLocalStartTime] = useState(startTime);
  const [localEndDate,   setLocalEndDate]   = useState(endDate);
  const [localEndTime,   setLocalEndTime]   = useState(endTime);

  const duration = calcDuration(localStartDate, localStartTime, localEndDate, localEndTime, durationUnit);

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
      <DateTimeRow
        icon={startIcon}
        label={startLabel}
        date={localStartDate}
        time={localStartTime}
        onDateChange={v => { setLocalStartDate(v); onStartDateChange(v); }}
        onTimeChange={v => { setLocalStartTime(v); onStartTimeChange(v); }}
        readOnly={readOnly}
      />

      {/* Divider */}
      <div style={{ height: 1, background: Colors.border, margin: `0 ${-Spacing.base}px` }} />

      <DateTimeRow
        icon={endIcon}
        label={endLabel}
        date={localEndDate}
        time={localEndTime}
        onDateChange={v => { setLocalEndDate(v); onEndDateChange(v); }}
        onTimeChange={v => { setLocalEndTime(v); onEndTimeChange(v); }}
        readOnly={readOnly}
      />

      {/* Duration */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: `${Spacing.xs}px`,
          fontFamily: Typography.family.sans,
          fontSize: `${Typography.size.sm}px`,
          color: Colors.textSecondary,
          fontWeight: Typography.weight.medium,
        }}
      >
        {duration}
      </div>
    </div>
  );
}
