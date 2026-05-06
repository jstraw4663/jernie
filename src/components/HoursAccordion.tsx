// Open/closed is computed live from hours strings — not from Google Places' cached open_now.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Core, Semantic, Spacing, Radius, Typography, Animation } from '../design/tokens';

export interface HoursAccordionProps {
  hours: string[];  // ["Monday: 9:00 AM – 9:00 PM", ...]
  style?: React.CSSProperties;
}

function parseHoursEntry(entry: string): { day: string; hours: string } {
  const colonIdx = entry.indexOf(':');
  if (colonIdx === -1) return { day: '', hours: entry };
  return { day: entry.slice(0, colonIdx).trim(), hours: entry.slice(colonIdx + 1).trim() };
}

function getTodayDayName(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function parseTime(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function computeOpenStatus(hours: string[]): {
  isOpen: boolean | null;
  minutesUntilClose: number | null;
} {
  const today = getTodayDayName();
  const todayEntry = hours.find(h => parseHoursEntry(h).day === today);
  if (!todayEntry) return { isOpen: null, minutesUntilClose: null };

  const todayHours = parseHoursEntry(todayEntry).hours;
  if (todayHours.toLowerCase() === 'closed') return { isOpen: false, minutesUntilClose: null };
  // Google sometimes returns "Open 24 hours" — always open, no close time
  if (/24\s*hours/i.test(todayHours)) return { isOpen: true, minutesUntilClose: null };

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Split on commas first to isolate each session (handles split-session days like
  // "11:30 AM – 3:00 PM, 5:00 PM – 9:00 PM"). Then split each range on any dash variant.
  const ranges = todayHours.split(/,\s*/);
  for (const range of ranges) {
    const parts = range.trim().split(/\s*[–—\-]\s*/);
    if (parts.length < 2) continue;
    const openMins  = parseTime(parts[0]);
    const closeMins = parseTime(parts[1]);
    if (openMins === null || closeMins === null) continue;
    if (nowMins >= openMins && nowMins < closeMins) {
      return { isOpen: true, minutesUntilClose: closeMins - nowMins };
    }
  }
  return { isOpen: false, minutesUntilClose: null };
}

export function HoursAccordion({ hours, style }: HoursAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const today = getTodayDayName();
  const todayEntry = hours.find(h => parseHoursEntry(h).day === today);
  const todayHours = todayEntry ? parseHoursEntry(todayEntry).hours : null;

  const { isOpen: openNow, minutesUntilClose } = computeOpenStatus(hours);

  let dotColor: string = Core.textFaint;
  let statusLabel = 'Hours';
  if (openNow === true) {
    if (minutesUntilClose !== null && minutesUntilClose <= 60) {
      dotColor = Semantic.warning;
      statusLabel = 'Closes soon';
    } else {
      dotColor = Semantic.success;
      statusLabel = 'Open';
    }
  } else if (openNow === false) {
    dotColor = Semantic.error;
    statusLabel = 'Closed';
  }

  return (
    <div style={style}>
      {/* Collapsed row */}
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.sm,
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '3px 0',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        aria-expanded={isOpen}
        aria-label="Toggle hours"
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: Radius.full,
            background: dotColor,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />

        <span
          style={{
            fontSize: `${Typography.size.sm}px`,
            lineHeight: '18px',
            fontWeight: Typography.weight.semibold,
            fontFamily: Typography.family.sans,
            color: dotColor === Core.textFaint ? Core.textMuted : dotColor,
            flexShrink: 0,
          }}
        >
          {statusLabel}
        </span>

        <span
          style={{
            fontSize: `${Typography.size.sm}px`,
            lineHeight: '18px',
            fontFamily: Typography.family.sans,
            color: Core.textMuted,
            flex: 1,
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
          }}
        >
          {todayHours ?? ''}
        </span>

        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', ...Animation.springs.snappy }}
          style={{
            display: 'inline-flex',
            flexShrink: 0,
            color: Core.textFaint,
            fontSize: 12,
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          ▾
        </motion.span>
      </button>

      {/* Expanded week list */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', ...Animation.springs.gentle }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingBottom: Spacing.xs }}>
              {hours.map((entry, i) => {
                const { day, hours: hrs } = parseHoursEntry(entry);
                const isToday = day === today;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: `${Spacing.xs}px ${isToday ? Spacing.sm : 0}px`,
                      borderRadius: isToday ? Radius.md : 0,
                      background: isToday ? Core.surfaceMuted : 'transparent',
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: Typography.size.sm,
                        fontFamily: Typography.family.sans,
                        fontWeight: isToday ? Typography.weight.semibold : Typography.weight.regular,
                        color: isToday ? Core.text : Core.textMuted,
                      }}
                    >
                      {day}
                    </span>
                    <span
                      style={{
                        fontSize: Typography.size.sm,
                        fontFamily: Typography.family.sans,
                        fontWeight: isToday ? Typography.weight.semibold : Typography.weight.regular,
                        color: isToday ? Core.text : Core.textMuted,
                      }}
                    >
                      {hrs}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
