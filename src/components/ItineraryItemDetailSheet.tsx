// ItineraryItemDetailSheet — unified detail, edit, and confirm sheet for any itinerary item.
//
// Three entry points all open this sheet: "Confirm" CTA, "✓ Confirmed" pill, and ··· ellipsis.
//
// Two modes driven by resolvedPlace:
//   Place-linked:  shows linked place data (read-only) + editable label, confirm
//   Custom:        editable type, title, address, notes; delete button
//
// Time field: AM/PM numeric input — formats "730" → "7:30", optional.
// Time saves to reservation_times (hard confirmed time) only on Confirm press.
// Soft display times (Morning, Afternoon) are set via drag-and-drop only.
//
// Follows the mountFrames entrance pattern from BottomSheet.tsx.
// PLATFORM NOTE: div/input/button → View/TextInput/Pressable on Expo migration.

import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';
import { StarRating } from './StarRating';
import { Colors, Semantic, Core, Spacing, Typography, Radius } from '../design/tokens';
import { appleMapsUrl } from '../domain/trip';
import { parseItemText } from '../utils/parseItemText';
import type { ItineraryItem, CustomItem, Place, PlaceCategory } from '../types';

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

type ResolvedItem = (ItineraryItem & { _isCustom: false }) | (CustomItem & { _isCustom: true });

const CATEGORY_OPTIONS: { value: PlaceCategory | ''; label: string }[] = [
  { value: '',           label: 'No category' },
  { value: 'attraction', label: '🎭 Attraction' },
  { value: 'bar',        label: '🍻 Bar' },
  { value: 'beach',      label: '🏖 Beach' },
  { value: 'hike',       label: '🥾 Hike' },
  { value: 'museum',     label: '🏛 Museum' },
  { value: 'restaurant', label: '🍽 Restaurant' },
  { value: 'shop',       label: '🛍 Shop' },
  { value: 'sight',      label: '👁 Sight' },
  { value: 'other',      label: '✏ Other' },
];

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

// ── Time parsing — accepts "730", "7", "1930", "7:30 PM" etc. ────────────────
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

export interface ItineraryItemDetailSheetProps {
  isOpen: boolean;
  item: ResolvedItem | null;
  resolvedPlace: Place | null;
  accent: string;
  textOverride?: string;
  /** Current hard reservation time from RTDB (reservation_times path) */
  reservationTime?: string;
  isConfirmed?: boolean;
  onClose: () => void;
  onSetTextOverride: (id: string, text: string) => void;
  onUpdateCustomItem: (id: string, patch: Partial<Pick<CustomItem, 'text' | 'time' | 'category' | 'addr'>>) => void;
  /** Writes hard reservation time to reservation_times RTDB path */
  onSetReservationTime: (id: string, time: string) => void;
  onDelete?: () => void;
  onConfirm?: (id: string, value: boolean) => void;
}

export function ItineraryItemDetailSheet({
  isOpen,
  item,
  resolvedPlace,
  accent,
  textOverride,
  reservationTime,
  isConfirmed,
  onClose,
  onSetTextOverride,
  onUpdateCustomItem,
  onSetReservationTime,
  onDelete,
  onConfirm,
}: ItineraryItemDetailSheetProps) {
  const isCustom = item?._isCustom ?? false;
  const customItem = isCustom ? (item as CustomItem & { _isCustom: true }) : null;

  // Local draft state — committed on blur or explicit save
  const [titleDraft, setTitleDraft] = useState('');
  const [addrDraft, setAddrDraft] = useState('');
  const [categoryDraft, setCategoryDraft] = useState<PlaceCategory | ''>('');

  // Reservation time — numeric input + AM/PM toggle; saved only on confirm press
  const [timeInput, setTimeInput] = useState('');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset drafts when item/sheet changes
  useEffect(() => {
    if (!item) return;
    const { title } = parseItemText(textOverride ?? item.text ?? '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitleDraft(title);
    setAddrDraft(customItem?.addr ?? '');
    setCategoryDraft((customItem?.category as PlaceCategory | undefined) ?? '');

    if (reservationTime) {
      const { display, period: p } = parseAndFormat(reservationTime);
      setTimeInput(display);
      setPeriod(p);
    } else {
      setTimeInput('');
      setPeriod('AM');
    }
  }, [item?.id, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset confirm dialog when sheet closes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isOpen) setShowDeleteConfirm(false);
  }, [isOpen]);

  if (!item) return null;

  const hasPlaceLink = !!resolvedPlace;
  const sheetTitle = hasPlaceLink
    ? `${resolvedPlace!.emoji} ${resolvedPlace!.name}`
    : (customItem?.category ? `${CATEGORY_OPTIONS.find(o => o.value === customItem.category)?.label ?? ''} ` : '') + (item.text || 'Custom item');

  function commitLabel(title: string) {
    if (!item) return;
    const t = capitalizeFirst(title.trim());
    if (isCustom && customItem) {
      onUpdateCustomItem(item.id, { text: t });
    } else {
      onSetTextOverride(item.id, t);
    }
  }

  function commitAddr(val: string) {
    if (!item || !customItem) return;
    onUpdateCustomItem(item.id, { addr: val.trim() || null as string | null });
  }

  function commitCategory(val: PlaceCategory | '') {
    if (!item || !customItem) return;
    onUpdateCustomItem(item.id, { category: val || undefined });
  }

  function handleTimeBlur() {
    if (!timeInput.trim()) return;
    const { display, period: detected } = parseAndFormat(timeInput);
    setTimeInput(display);
    setPeriod(detected);
  }

  function buildReservationTime(): string {
    if (!timeInput.trim()) return '';
    const { display } = parseAndFormat(timeInput);
    if (!display) return '';
    return `${display} ${period}`;
  }

  const inputStyle = {
    width: '100%',
    fontSize: `${Typography.size.sm}px`,
    fontFamily: Typography.family.sans,
    color: Colors.textPrimary,
    background: Colors.surfaceRaised,
    border: `1px solid ${Colors.border}`,
    borderRadius: `${Radius.md}px`,
    padding: `${Spacing.sm}px ${Spacing.md}px`,
    outline: 'none',
    boxSizing: 'border-box' as const,
    lineHeight: Typography.lineHeight.normal,
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

  const deleteOverlay = onDelete ? (
    <ConfirmDialog
      isVisible={showDeleteConfirm}
      message="Delete this item?"
      confirmLabel="Delete"
      variant="danger"
      onConfirm={() => {
        onDelete();
        setShowDeleteConfirm(false);
        onClose();
      }}
      onCancel={() => setShowDeleteConfirm(false)}
    />
  ) : undefined;

  return (
    <BottomSheet
      isOpen={isOpen}
      onRequestClose={showDeleteConfirm ? () => setShowDeleteConfirm(false) : onClose}
      title={sheetTitle}
      overlay={deleteOverlay}
      headerRight={
        <button
          onClick={onClose}
          aria-label="Done"
          style={{
            width: 30,
            height: 30,
            borderRadius: Radius.full,
            background: '#0D2B3E',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 6l3 3 5-5" stroke="#F7F4EF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      }
    >
      <div style={{ padding: `${Spacing.base}px` }}>

        {/* ── Title ── */}
        <div style={{ marginBottom: Spacing.sm }}>
          <FieldLabel>{hasPlaceLink ? 'Your label' : 'Title'}</FieldLabel>
          <input
            type="text"
            value={titleDraft}
            onChange={e => setTitleDraft(capitalizeFirst(e.target.value))}
            onBlur={() => commitLabel(titleDraft)}
            onKeyDown={e => { if (e.key === 'Enter') { commitLabel(titleDraft); (e.target as HTMLInputElement).blur(); } }}
            placeholder={hasPlaceLink ? resolvedPlace!.name : 'Item title…'}
            style={{ ...inputStyle, fontWeight: Typography.weight.semibold }}
          />
        </div>

        {/* ── Reservation time — numeric + AM/PM toggle ── */}
        <div style={{ marginBottom: Spacing.md }}>
          <FieldLabel>Reservation time (optional)</FieldLabel>
          <div style={{ display: 'flex', gap: `${Spacing.sm}px` }}>
            <input
              type="text"
              inputMode="numeric"
              value={timeInput}
              onChange={e => setTimeInput(e.target.value)}
              onBlur={handleTimeBlur}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleTimeBlur();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="e.g. 730 or 7"
              style={{ ...inputStyle, flex: 1, width: 'auto', height: 44 }}
            />
            {(['AM', 'PM'] as const).map(p => (
              <button key={p} type="button" onClick={() => setPeriod(p)} style={periodBtn(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* ── Custom item fields ── */}
        {isCustom && (
          <>
            {/* Category selector */}
            <div style={{ marginBottom: Spacing.md }}>
              <FieldLabel>Type</FieldLabel>
              <select
                value={categoryDraft}
                onChange={e => { const v = e.target.value as PlaceCategory | ''; setCategoryDraft(v); commitCategory(v); }}
                style={{ ...inputStyle, cursor: 'pointer', background: '#fff' }}
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div style={{ marginBottom: Spacing.md }}>
              <FieldLabel>Address</FieldLabel>
              <input
                type="text"
                value={addrDraft}
                onChange={e => setAddrDraft(e.target.value)}
                onBlur={() => commitAddr(addrDraft)}
                onKeyDown={e => { if (e.key === 'Enter') { commitAddr(addrDraft); (e.target as HTMLInputElement).blur(); } }}
                placeholder="123 Main St, Portland, ME"
                style={inputStyle}
              />
            </div>
          </>
        )}

        {/* ── Place enrichment block (read-only) ── */}
        {hasPlaceLink && (
          <div style={{
            background: Colors.surface2,
            borderRadius: `${Radius.lg}px`,
            padding: `${Spacing.md}px`,
            marginBottom: Spacing.md,
            display: 'flex',
            flexDirection: 'column',
            gap: Spacing.sm,
          }}>
            {/* Rating + price */}
            {(resolvedPlace!.rating != null || resolvedPlace!.price) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' }}>
                {resolvedPlace!.rating != null && <StarRating rating={resolvedPlace!.rating} />}
                {resolvedPlace!.price && (
                  <span style={{ fontSize: `${Typography.size.xs}px`, color: Colors.textMuted, fontFamily: Typography.family.sans }}>
                    {resolvedPlace!.price}
                  </span>
                )}
              </div>
            )}

            {/* Address */}
            {resolvedPlace!.addr && (
              <a
                href={appleMapsUrl(resolvedPlace!.addr)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: Spacing.xs,
                  fontSize: `${Typography.size.sm}px`,
                  color: accent,
                  textDecoration: 'none',
                  fontFamily: Typography.family.sans,
                  lineHeight: Typography.lineHeight.normal,
                }}
              >
                📍 {resolvedPlace!.addr}
                <span style={{ fontSize: `${Typography.size.xs - 1}px`, opacity: 0.6 }}>· Maps</span>
              </a>
            )}

            {/* Note / description */}
            {resolvedPlace!.note && (
              <div style={{
                fontSize: `${Typography.size.xs + 1}px`,
                color: Colors.textSecondary,
                lineHeight: Typography.lineHeight.relaxed,
                fontFamily: Typography.family.sans,
                fontStyle: 'italic',
              }}>
                {resolvedPlace!.note}
              </div>
            )}

            {/* Website link */}
            {resolvedPlace!.url && (
              <a
                href={resolvedPlace!.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: `${Typography.size.xs + 1}px`,
                  color: accent,
                  textDecoration: 'none',
                  fontFamily: Typography.family.sans,
                }}
              >
                🔗 Website
              </a>
            )}
          </div>
        )}

        {/* ── Confirm / Remove Confirmation ── */}
        {onConfirm && (
          <div style={{ marginBottom: Spacing.md }}>
            <button
              type="button"
              onClick={() => {
                if (isConfirmed) {
                  onSetReservationTime(item.id, '');
                  onConfirm(item.id, false);
                } else {
                  onSetReservationTime(item.id, buildReservationTime());
                  onConfirm(item.id, true);
                }
                onClose();
              }}
              style={{
                width: '100%',
                background: isConfirmed ? accent : Semantic.confirmed,
                color: Core.white,
                border: 'none',
                borderRadius: `${Radius.lg}px`,
                padding: `${Spacing.base}px`,
                fontSize: `${Typography.size.sm}px`,
                fontWeight: Typography.weight.semibold,
                fontFamily: Typography.family.sans,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: Spacing.xs,
                boxShadow: isConfirmed
                  ? `0 8px 22px ${accent}40, 0 1px 2px rgba(0,0,0,0.08)`
                  : `0 8px 22px ${Semantic.confirmed}40, 0 1px 2px rgba(0,0,0,0.08)`,
              }}
            >
              {isConfirmed ? 'Remove Confirmation' : 'Confirm'}
            </button>
          </div>
        )}

        {/* ── Delete button (custom items only) ── */}
        {onDelete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: '100%',
              padding: `${Spacing.sm}px`,
              border: `1px solid ${Colors.red}40`,
              borderRadius: `${Radius.md}px`,
              background: Colors.redLight,
              color: Colors.red,
              fontSize: `${Typography.size.sm}px`,
              fontFamily: Typography.family.sans,
              fontWeight: Typography.weight.medium,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.xs,
            }}
          >
            🗑 Delete item
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
