// ConfirmTimeSheet — time-input + confirm/unconfirm bottom sheet.
//
// Opened from TimelineItem when user taps Confirm (unconfirmed) or the
// Confirmed pill (already confirmed). Accepts free-form digit input and
// formats on blur ("730" → "7:30", "7" → "7:00"). AM/PM toggle defaults
// using a simple heuristic: hours 7–11 → AM, 1–6 and 12+ → PM.
// 24-hour input (e.g. "1930") is auto-detected and converted.
//
// PLATFORM NOTE: div/input/button → View/TextInput/Pressable on Expo migration.

import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { Colors, Core, Spacing, Typography, Radius } from '../design/tokens';

export interface ConfirmTimeSheetProps {
  isOpen: boolean;
  isConfirmed: boolean;
  currentTime: string;
  accent: string;
  onConfirm: (time: string) => void;
  onUnconfirm: () => void;
  onClose: () => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: `${Typography.size.xs}px`,
      fontWeight: Typography.weight.semibold,
      color: Colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: Typography.family.sans,
      marginBottom: Spacing.xs,
    }}>
      {children}
    </div>
  );
}

function parseAndFormat(raw: string): { display: string; period: 'AM' | 'PM' } {
  const upper = raw.toUpperCase();
  const explicitPM = upper.includes('PM');
  const explicitAM = upper.includes('AM');
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (!digits) return { display: '', period: 'AM' };

  let h: number, m: number;
  if (digits.length <= 2) {
    h = parseInt(digits, 10);
    m = 0;
  } else {
    m = parseInt(digits.slice(-2), 10);
    h = parseInt(digits.slice(0, digits.length - 2), 10);
  }
  if (m > 59) m = 59;

  let period: 'AM' | 'PM';
  if (h >= 13) {
    h -= 12;
    period = 'PM';
  } else if (explicitPM) {
    period = 'PM';
  } else if (explicitAM) {
    if (h === 12) h = 0;
    period = 'AM';
  } else if (h === 0) {
    h = 12;
    period = 'AM';
  } else if (h === 12) {
    period = 'PM';
  } else if (h >= 1 && h <= 6) {
    period = 'PM';
  } else {
    period = 'AM'; // 7–11
  }

  if (h === 0) h = 12;
  if (h > 12) h = 12;

  return { display: `${h}:${String(m).padStart(2, '0')}`, period };
}

export function ConfirmTimeSheet({
  isOpen,
  isConfirmed,
  currentTime,
  accent,
  onConfirm,
  onUnconfirm,
  onClose,
}: ConfirmTimeSheetProps) {
  const [timeInput, setTimeInput] = useState('');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (!isOpen) return;
    if (currentTime) {
      const { display, period: p } = parseAndFormat(currentTime);
      setTimeInput(display);
      setPeriod(p);
    } else {
      setTimeInput('');
      setPeriod('AM');
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleBlur() {
    if (!timeInput.trim()) return;
    const { display, period: detected } = parseAndFormat(timeInput);
    setTimeInput(display);
    setPeriod(detected);
  }

  function buildTime(): string {
    if (!timeInput.trim()) return '';
    const { display } = parseAndFormat(timeInput);
    if (!display) return '';
    return `${display} ${period}`;
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    fontSize: `${Typography.size.sm}px`,
    fontFamily: Typography.family.sans,
    color: Colors.textPrimary,
    background: Colors.surfaceRaised,
    border: `1px solid ${Colors.border}`,
    borderRadius: `${Radius.md}px`,
    padding: `${Spacing.sm}px ${Spacing.md}px`,
    outline: 'none',
    boxSizing: 'border-box',
    height: 44,
  };

  const periodBtn = (p: 'AM' | 'PM'): React.CSSProperties => ({
    width: 48,
    height: 44,
    borderRadius: `${Radius.md}px`,
    border: `1px solid ${period === p ? accent : Colors.border}`,
    background: period === p ? `${accent}15` : 'transparent',
    color: period === p ? accent : Colors.textMuted,
    fontSize: `${Typography.size.xs}px`,
    fontWeight: period === p ? Typography.weight.semibold : Typography.weight.regular,
    fontFamily: Typography.family.sans,
    cursor: 'pointer',
    flexShrink: 0,
  });

  return (
    <BottomSheet
      isOpen={isOpen}
      onRequestClose={onClose}
      title="Reservation time"
    >
      <div style={{ padding: `${Spacing.base}px`, paddingTop: `${Spacing.md}px` }}>

        <FieldLabel>Time</FieldLabel>
        <div style={{ display: 'flex', gap: `${Spacing.sm}px`, marginBottom: `${Spacing.lg}px` }}>
          <input
            type="text"
            inputMode="numeric"
            value={timeInput}
            onChange={e => setTimeInput(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleBlur();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="e.g. 730 or 7"
            style={inputStyle}
          />
          {(['AM', 'PM'] as const).map(p => (
            <button key={p} type="button" onClick={() => setPeriod(p)} style={periodBtn(p)}>
              {p}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => isConfirmed ? onUnconfirm() : onConfirm(buildTime())}
          style={{
            width: '100%',
            background: accent,
            color: Core.white,
            border: 'none',
            borderRadius: `${Radius.lg}px`,
            padding: `${Spacing.base}px`,
            fontSize: `${Typography.size.sm}px`,
            fontWeight: Typography.weight.semibold,
            fontFamily: Typography.family.sans,
            cursor: 'pointer',
            marginBottom: `${Spacing.sm}px`,
            boxShadow: `0 8px 22px ${accent}40, 0 1px 2px rgba(0,0,0,0.08)`,
          }}
        >
          {isConfirmed ? 'Remove Confirmation' : 'Confirm Reservation'}
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            height: 44,
            background: 'transparent',
            color: Colors.textMuted,
            border: `1px solid ${Colors.border}`,
            borderRadius: `${Radius.lg}px`,
            fontSize: `${Typography.size.sm}px`,
            fontFamily: Typography.family.sans,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>

      </div>
    </BottomSheet>
  );
}
