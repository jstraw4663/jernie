// TimelineItem — Dense utility-product timeline card for the inline read view.
//
// Open state:      category-colored circle node, semibold title
// Confirmed state: gold circle node, bold title, Confirmed badge top-right
//
// Card layout:
//   [reservation time pill — accent, above card, only if exact time set]
//   Card: [title · confirmed badge] → metadata → action row [primary CTA | ···]
//
// Slot headers (Morning, Mid-morning, etc.) are rendered by EditableItinerary,
// not here — they group items by approximate time without per-card time labels.
//
// Primary CTA logic:
//   pre-trip + unconfirmed → Confirm (ghost, accent text)
//   pre-trip + confirmed   → Details (solid accent)
//   on-trip  + confirmed + navData → Navigate (solid accent)
//   on-trip  + confirmed + no nav  → Details (solid accent)
//   on-trip  + unconfirmed         → Confirm
//
// Animations:
//   • Staggered entrance — y:8→0, opacity:0→1, delay = index × 50ms, springs.gentle
//   • Node color spring on confirm/un-confirm
//   • Badge pop-in — scale:0→1 via AnimatePresence, springs.snappy
//
// PLATFORM NOTE:
//   div → View, span/a → Text/Pressable on Expo migration
//   Framer Motion animate → Reanimated useAnimatedStyle / Moti springs
//   No web-specific APIs below this line.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons, CATEGORY_ICON_MAP } from '../design/icons';
import type { IconEntry } from '../design/icons';
import { Colors, Semantic, Core, Shadow, Typography, Spacing, Animation } from '../design/tokens';
import { EllipsisIcon } from '../design/ActionIcons';
import { Badge } from './Badge';
import type { ItineraryItem, CustomItem, Place, ItineraryCategory } from '../types';
import { parseItemText } from '../utils/parseItemText';
import { PlaceMetaRow } from './PlaceMetaRow';
import { NavigationSelectorSheet } from './NavigationSelectorSheet';
import { ConfirmTimeSheet } from './ConfirmTimeSheet';

type ResolvedItem = (ItineraryItem & { _isCustom: false }) | (CustomItem & { _isCustom: true });

const NODE_SIZE = 36;
const TRACK_W   = 52;
const SPINE_X   = 26;
const NODE_TOP  = 6;

// ── CTA state machine ─────────────────────────────────────────────

type CTAButton = 'confirm' | 'details' | 'navigate';

const CTA_LABELS: Record<CTAButton, string> = {
  confirm: 'Confirm',
  details: 'Details',
  navigate: 'Navigate →',
};

function resolveCTAs(
  tripPhase: 'pre-trip' | 'on-trip',
  isConfirmed: boolean,
): [CTAButton, CTAButton] {
  if (!isConfirmed) return ['confirm', 'details'];
  if (tripPhase === 'on-trip') return ['navigate', 'details'];
  return ['details', 'navigate'];
}

// ── NodeIcon — renders a white icon inside the circular spine node ──

function NodeIcon({ entry, size = 16 }: { entry: IconEntry; size?: number }) {
  if (entry.kind === 'component') {
    return <entry.Icon size={size} weight="duotone" color={Core.white} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: Core.white,
        WebkitMaskImage: `url(${entry.src})`,
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskImage: `url(${entry.src})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
      }}
    />
  );
}

function resolveNodeEntry(
  category: ItineraryCategory | null,
  isCustom: boolean,
  item: ResolvedItem,
): IconEntry | null {
  if (category) return CATEGORY_ICON_MAP[category] ?? null;
  if (isCustom) return CATEGORY_ICON_MAP[(item as CustomItem).category ?? ''] ?? null;
  return null;
}

// ── TimelineItem ─────────────────────────────────────────────────

export interface TimelineItemProps {
  item: ResolvedItem;
  accent: string;           // stop accent color from trip.json stop.accent
  isConfirmed: boolean;     // editorial lock OR user-confirmed — drives full visual state
  isCustom: boolean;
  displayTime: string;
  reservationTime: string;
  /** Controls primary CTA label and navigate availability */
  tripPhase: 'pre-trip' | 'on-trip';
  /** Position in the day's list — drives entrance stagger delay */
  index: number;
  /** Play entrance animation; false on re-visits and drag overlays */
  animate: boolean;
  /** Hide connector line on the last item in the day */
  isLast: boolean;
  /** Linked Place record — enables enriched display (rating, price, address, phone) */
  resolvedPlace?: Place | null;
  /** User-set title override stored in Firebase — takes precedence over item.text */
  textOverride?: string;
  /** Navigation address from enrichment (Google Places) — same source as detail card navigate */
  navAddr?: string | null;
  /** Direct confirm/un-confirm from the primary CTA */
  onConfirm?: (value: boolean) => void;
  /** Set reservation time (e.g. "7:30 PM") — wired from EditableItinerary */
  onSetTime?: (time: string) => void;
  /** Open the edit/detail sheet (overflow ··· button) */
  onOpenDetail?: () => void;
  /** Tap anywhere on card body — opens entity detail (place/booking) or edit sheet fallback */
  onTapCard?: (rect: DOMRect) => void;
  /** When true, plays a brief gold ring pulse to draw attention to this card */
  isPulsing?: boolean;
}

export function TimelineItem({
  item,
  accent,
  isConfirmed,
  isCustom,
  displayTime: _displayTime,
  reservationTime,
  tripPhase,
  index,
  animate,
  isLast,
  resolvedPlace,
  textOverride,
  navAddr,
  onConfirm,
  onSetTime,
  onOpenDetail,
  onTapCard,
  isPulsing,
}: TimelineItemProps) {
  const [navSheetOpen, setNavSheetOpen] = useState(false);
  const [confirmSheetOpen, setConfirmSheetOpen] = useState(false);
  const itItem = item as ItineraryItem;

  const { title: parsedTitle, blurb: parsedBlurb } = parseItemText(item.text);
  const title = textOverride || parsedTitle;
  const snippet = resolvedPlace?.note || parsedBlurb || null;

  const category = !isCustom ? (itItem.category ?? null) : null;
  const nodeEntry = resolveNodeEntry(category, isCustom, item);
  const nodeColor = isConfirmed ? Semantic.confirmed : (nodeEntry?.color ?? accent);
  const lineColor = isConfirmed ? `${Semantic.confirmed}4D` : `${accent}33`;
  const lineWeight = isConfirmed ? 2 : 1.5;

  const cardBorderColor = isConfirmed ? `${Semantic.confirmed}90` : `${accent}30`;

  const addr = resolvedPlace?.addr ?? (!isCustom ? itItem.addr : null) ?? (isCustom ? (item as CustomItem).addr : null);
  const addrLabel = !isCustom ? (itItem.addr_label ?? null) : null;
  const [primaryCTA, secondaryCTA] = resolveCTAs(tripPhase, isConfirmed);

  return (
    <>
    <motion.div
      initial={animate ? { opacity: 0, y: 8 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: '-30px' }}
      transition={{
        type: 'spring',
        ...Animation.springs.gentle,
        delay: animate ? 0.08 + index * 0.025 : 0,
      }}
      style={{ display: 'flex', flexDirection: 'column', paddingBottom: isLast ? 0 : 10 }}
    >
      {/* ── Time header — pill above node circle + trailing hairline ── */}
      {reservationTime && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: SPINE_X - NODE_SIZE / 2,
          marginBottom: 6,
        }}>
          <span style={{
            display: 'inline-block',
            height: 28,
            padding: '0 12px',
            lineHeight: '28px',
            borderRadius: 999,
            background: isConfirmed ? accent : `${accent}18`,
            color: isConfirmed ? Core.white : accent,
            fontSize: `${Typography.size.xs}px`,
            fontWeight: Typography.weight.bold,
            fontFamily: Typography.family.sans,
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}>
            {reservationTime}
          </span>
          <div style={{
            flex: 1,
            height: 1,
            marginLeft: 8,
            marginRight: 4,
            background: isConfirmed ? `${accent}40` : `${accent}22`,
            borderRadius: 1,
          }} />
        </div>
      )}

      {/* ── Main row: left track + card ── */}
      <div style={{ display: 'flex' }}>

      {/* ── Left track: circular node + vertical connector ── */}
      <div style={{
        width: TRACK_W,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        paddingTop: NODE_TOP,
      }}>
        {/* Node — filled category color, gold when confirmed */}
        <motion.div
          animate={{ backgroundColor: nodeColor }}
          transition={{ type: 'spring', ...Animation.springs.snappy }}
          style={{
            marginLeft: SPINE_X - NODE_SIZE / 2,
            width: NODE_SIZE,
            height: NODE_SIZE,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${Colors.background}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
        >
          {nodeEntry && <NodeIcon entry={nodeEntry} size={16} />}
        </motion.div>

        {/* Connector — runs from node bottom to end of row gap */}
        {!isLast && (
          <motion.div
            animate={{ backgroundColor: lineColor, width: lineWeight }}
            transition={{ type: 'spring', ...Animation.springs.snappy }}
            style={{
              marginLeft: SPINE_X - 1,
              flex: 1,
              marginTop: Spacing.xs,
            }}
          />
        )}
      </div>

      {/* ── Right side: card ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* ── Item card ── */}
        <motion.div
          data-card
          animate={{
            borderLeftColor: cardBorderColor,
            boxShadow: isPulsing
              ? [
                  Shadow.cardResting,
                  `0 0 0 3px ${Colors.gold}60, 0 4px 16px ${Colors.gold}30`,
                  `0 0 0 1px ${Colors.gold}20, ${Shadow.cardResting}`,
                  Shadow.cardResting,
                ]
              : Shadow.cardResting,
          }}
          transition={{
            borderLeftColor: { duration: 0.3, ease: Animation.fm.ease },
            boxShadow: isPulsing
              ? { duration: 1.1, ease: 'easeOut', times: [0, 0.25, 0.65, 1] }
              : { duration: 0 },
          }}
          onClick={onTapCard ? (e) => {
            onTapCard((e.currentTarget as HTMLElement).getBoundingClientRect());
          } : undefined}
          style={{
            background: Colors.surfaceRaised,
            borderRadius: 16,
            boxShadow: Shadow.cardResting,
            padding: '12px 14px',
            minHeight: 112,
            borderLeft: '3px solid',
            borderLeftColor: cardBorderColor,
            cursor: onTapCard ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top row: title + confirmed badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: snippet ? 2 : 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 16,
                fontWeight: isConfirmed ? Typography.weight.bold : Typography.weight.semibold,
                color: Colors.textPrimary,
                lineHeight: 1.25,
                fontFamily: Typography.family.sans,
              }}>
                {title}
              </div>
            </div>
            {isConfirmed && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmSheetOpen(true); }}
                style={{
                  flexShrink: 0,
                  height: 22,
                  padding: '0 8px',
                  borderRadius: 999,
                  background: Semantic.confirmedTint,
                  color: Semantic.confirmedDark,
                  fontSize: `${Typography.size.xs}px`,
                  fontWeight: Typography.weight.semibold,
                  fontFamily: Typography.family.sans,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  lineHeight: 1,
                  border: 'none',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                ✓ Confirmed
              </button>
            )}
          </div>

          {/* Guide note / item blurb — 2-line italic snippet */}
          {snippet && (
            <div style={{
              fontSize: `${Typography.size.xs + 1}px`,
              color: Colors.textSecondary,
              fontStyle: 'italic',
              lineHeight: Typography.lineHeight.relaxed,
              fontFamily: Typography.family.sans,
              marginBottom: 6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}>
              {snippet}
            </div>
          )}

          {/* Place metadata row — hike chips or rating/subcategory/price */}
          {resolvedPlace && (
            <PlaceMetaRow
              place={resolvedPlace}
              subcategory={resolvedPlace.subcategory || undefined}
            />
          )}

          {/* Address */}
          {addr && (
            <div style={{ marginBottom: Spacing.xs, display: 'inline-flex', alignItems: 'center', gap: Spacing.xs, fontSize: `${Typography.size.xs + 1}px`, color: accent, fontFamily: Typography.family.sans, lineHeight: Typography.lineHeight.normal }}>
              <Icons.Pin size={12} weight="duotone" color={accent} /> {addrLabel || addr}
            </div>
          )}

          {/* Tide chart */}
          {!isCustom && itItem.tide_url && (
            <div style={{ marginBottom: Spacing.xs, display: 'inline-flex', alignItems: 'center', gap: Spacing.xs, fontSize: `${Typography.size.xs + 1}px`, color: Colors.navyLight, fontFamily: Typography.family.sans }}>
              <Icons.Waves size={12} weight="duotone" color={Colors.navyLight} /> Bar Harbor Tide Chart
            </div>
          )}

          {/* Book Now / Alert badges */}
          <AnimatePresence>
            {!isConfirmed && !isCustom && itItem.book_now && (
              <motion.div
                key="booknow"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', ...Animation.springs.snappy }}
                style={{ transformOrigin: 'left center', marginBottom: Spacing.xs }}
              >
                <Badge variant="bookNow" label="Book Now" href={undefined} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!isConfirmed && !isCustom && itItem.alert && !itItem.book_now && (
              <motion.div
                key="alert"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', ...Animation.springs.snappy }}
                style={{ transformOrigin: 'left center', marginBottom: Spacing.xs }}
              >
                <Badge variant="alert" label="Note" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spacer pushes action row to bottom when card is taller than content */}
          <div style={{ flex: 1 }} />

          {/* Action row — primary CTA + secondary CTA + overflow */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 10,
          }}>
            {([primaryCTA, secondaryCTA] as const).map((variant, btnIdx) => (
              <button
                key={`${variant}-${btnIdx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (variant === 'confirm') {
                    setConfirmSheetOpen(true);
                  } else if (variant === 'navigate') {
                    setNavSheetOpen(true);
                  } else {
                    if (onTapCard) {
                      const card = (e.currentTarget as HTMLElement).closest('[data-card]') as HTMLElement | null;
                      onTapCard((card ?? e.currentTarget as HTMLElement).getBoundingClientRect());
                    } else {
                      onOpenDetail?.();
                    }
                  }
                }}
                style={{
                  flex: btnIdx === 0 ? 5 : 4,
                  height: 40,
                  borderRadius: 13,
                  border: btnIdx === 0 ? 'none' : `1px solid ${accent}35`,
                  background: btnIdx === 0 ? `${accent}15` : 'transparent',
                  color: accent,
                  fontSize: btnIdx === 0 ? 14 : 13,
                  fontWeight: btnIdx === 0 ? Typography.weight.semibold : Typography.weight.medium,
                  fontFamily: Typography.family.sans,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  opacity: btnIdx === 0 ? 1 : 0.75,
                }}
              >
                {CTA_LABELS[variant]}
              </button>
            ))}

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenDetail?.(); }}
              style={{
                width: 34,
                height: 40,
                borderRadius: 13,
                border: `1px solid ${Colors.border}`,
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <EllipsisIcon color={Colors.textMuted} size={16} />
            </button>
          </div>

        </motion.div>
      </div>
      </div>
    </motion.div>
    <NavigationSelectorSheet
      isOpen={navSheetOpen}
      onClose={() => setNavSheetOpen(false)}
      lat={resolvedPlace?.lat}
      lon={resolvedPlace?.lon}
      addr={navAddr ?? resolvedPlace?.addr}
      label={resolvedPlace?.name ?? title}
    />
    <ConfirmTimeSheet
      isOpen={confirmSheetOpen}
      isConfirmed={isConfirmed}
      currentTime={reservationTime}
      accent={accent}
      onConfirm={(time) => {
        if (time) onSetTime?.(time);
        onConfirm?.(true);
        setConfirmSheetOpen(false);
      }}
      onUnconfirm={() => {
        onConfirm?.(false);
        setConfirmSheetOpen(false);
      }}
      onClose={() => setConfirmSheetOpen(false)}
    />
    </>
  );
}
