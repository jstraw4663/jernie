// ItineraryItemDetailSheet — detail and edit sheet for any itinerary item.
//
// Two modes driven by resolvedPlace:
//   Place-linked:  shows linked place data (read-only) + editable label, time, confirm
//   Custom:        editable type, title, time, address, notes; delete button
//
// Follows the mountFrames entrance pattern from BottomSheet.tsx.
// PLATFORM NOTE: div/input/button → View/TextInput/Pressable on Expo migration.

import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';
import { StarRating } from './StarRating';
import { Colors, Spacing, Typography, Radius } from '../design/tokens';
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


export interface ItineraryItemDetailSheetProps {
  isOpen: boolean;
  item: ResolvedItem | null;
  resolvedPlace: Place | null;
  accent: string;
  textOverride?: string;
  timeOverride?: string;
  isConfirmed?: boolean;
  onClose: () => void;
  onSetTextOverride: (id: string, text: string) => void;
  onUpdateCustomItem: (id: string, patch: Partial<Pick<CustomItem, 'text' | 'time' | 'category' | 'addr'>>) => void;
  onSetTimeOverride: (id: string, time: string) => void;
  onDeleteCustomItem?: (id: string, dayId: string) => void;
  onConfirm?: (id: string, value: boolean) => void;
}

export function ItineraryItemDetailSheet({
  isOpen,
  item,
  resolvedPlace,
  accent,
  textOverride,
  timeOverride,
  isConfirmed,
  onClose,
  onSetTextOverride,
  onUpdateCustomItem,
  onSetTimeOverride,
  onDeleteCustomItem,
  onConfirm,
}: ItineraryItemDetailSheetProps) {
  const isCustom = item?._isCustom ?? false;
  const customItem = isCustom ? (item as CustomItem & { _isCustom: true }) : null;

  // Local draft state — committed on blur or explicit save
  const [titleDraft, setTitleDraft] = useState('');
  const [blurbDraft, setBlurbDraft] = useState('');
  const [timeDraft, setTimeDraft] = useState('');
  const [addrDraft, setAddrDraft] = useState('');
  const [categoryDraft, setCategoryDraft] = useState<PlaceCategory | ''>('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset drafts when item changes — intentional sync setState in effect (controlled form reset pattern)
  useEffect(() => {
    if (!item) return;
    const { title, blurb } = parseItemText(textOverride ?? item.text ?? '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitleDraft(title);
    setBlurbDraft(blurb);
    setTimeDraft(timeOverride ?? item.time ?? '');
    setAddrDraft(customItem?.addr ?? '');
    setCategoryDraft((customItem?.category as PlaceCategory | undefined) ?? '');
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

  function commitLabel(title: string, blurb: string) {
    if (!item) return;
    const t = capitalizeFirst(title.trim());
    const b = capitalizeFirst(blurb.trim());
    const combined = b ? `${t} · ${b}` : t;
    if (isCustom && customItem) {
      onUpdateCustomItem(item.id, { text: combined });
    } else {
      onSetTextOverride(item.id, combined);
    }
  }

  function commitTime(val: string) {
    if (!item) return;
    const trimmed = val.trim();
    if (isCustom && customItem) {
      onUpdateCustomItem(item.id, { time: trimmed });
    }
    onSetTimeOverride(item.id, trimmed);
  }

  function commitAddr(val: string) {
    if (!item || !customItem) return;
    onUpdateCustomItem(item.id, { addr: val.trim() || null as string | null });
  }

  function commitCategory(val: PlaceCategory | '') {
    if (!item || !customItem) return;
    onUpdateCustomItem(item.id, { category: val || undefined });
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

  const deleteOverlay = isCustom && onDeleteCustomItem && customItem ? (
    <ConfirmDialog
      isVisible={showDeleteConfirm}
      message="Delete this item?"
      confirmLabel="Delete"
      variant="danger"
      onConfirm={() => {
        onDeleteCustomItem(item.id, customItem.day_id);
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
            onBlur={() => commitLabel(titleDraft, blurbDraft)}
            onKeyDown={e => { if (e.key === 'Enter') { commitLabel(titleDraft, blurbDraft); (e.target as HTMLInputElement).blur(); } }}
            placeholder={hasPlaceLink ? resolvedPlace!.name : 'Item title…'}
            style={{ ...inputStyle, fontWeight: Typography.weight.semibold }}
          />
        </div>

        {/* ── Details ── */}
        <div style={{ marginBottom: Spacing.md }}>
          <FieldLabel>Details</FieldLabel>
          <input
            type="text"
            value={blurbDraft}
            onChange={e => setBlurbDraft(capitalizeFirst(e.target.value))}
            onBlur={() => commitLabel(titleDraft, blurbDraft)}
            onKeyDown={e => { if (e.key === 'Enter') { commitLabel(titleDraft, blurbDraft); (e.target as HTMLInputElement).blur(); } }}
            placeholder="Optional note or detail…"
            style={{
              ...inputStyle,
              fontStyle: 'italic',
              color: Colors.textSecondary,
              fontWeight: Typography.weight.regular,
            }}
          />
        </div>

        {/* ── Time ── */}
        <div style={{ marginBottom: Spacing.md }}>
          <FieldLabel>Time</FieldLabel>
          <input
            type="text"
            value={timeDraft}
            onChange={e => setTimeDraft(e.target.value)}
            onBlur={() => commitTime(timeDraft)}
            onKeyDown={e => { if (e.key === 'Enter') { commitTime(timeDraft); (e.target as HTMLInputElement).blur(); } }}
            placeholder="e.g. 7:00 PM"
            style={inputStyle}
          />
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

        {/* ── Confirm toggle ── */}
        {onConfirm && (
          <div style={{ marginBottom: Spacing.md }}>
            <button
              onClick={() => {
                const trimmedTime = timeDraft.trim();
                if (trimmedTime) {
                  if (isCustom && customItem) onUpdateCustomItem(item.id, { time: trimmedTime });
                  onSetTimeOverride(item.id, trimmedTime);
                }
                onConfirm(item.id, !isConfirmed);
              }}
              style={{
                background: isConfirmed ? Colors.gold : 'transparent',
                color: isConfirmed ? '#fff' : Colors.gold,
                border: `1.5px solid ${Colors.gold}`,
                borderRadius: Radius.full,
                padding: `${Spacing.xs}px ${Spacing.md}px`,
                fontSize: `${Typography.size.xs}px`,
                fontFamily: Typography.family.sans,
                fontWeight: Typography.weight.semibold,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              {isConfirmed ? '✓ Confirmed' : 'Confirm ✓'}
            </button>
          </div>
        )}

        {/* ── Delete button (custom items only) ── */}
        {isCustom && onDeleteCustomItem && customItem && (
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
