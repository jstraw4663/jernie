// TimelineItem — Timeline-style itinerary item for the inline read view.
//
// Open state:      category-colored circle node, muted title, "Confirm" CTA
// Confirmed state: gold circle node, bold title, "✓ Confirmed" pill
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

import { motion, AnimatePresence } from 'framer-motion';
import { Icons, CATEGORY_ICON_MAP } from '../design/icons';
import type { IconEntry } from '../design/icons';
import { Colors, Semantic, Core, Typography, Spacing, Animation } from '../design/tokens';
import { Badge } from './Badge';
import type { ItineraryItem, CustomItem, Place, ItineraryCategory } from '../types';
import { parseItemText } from '../utils/parseItemText';
import { PlaceMetaRow } from './PlaceMetaRow';

type ResolvedItem = (ItineraryItem & { _isCustom: false }) | (CustomItem & { _isCustom: true });

const NODE_SIZE = 36;
const TRACK_W   = 64;
const SPINE_X   = 32;
const NODE_TOP  = 6;

// ── TimeDisplay ──────────────────────────────────────────────────

function TimeDisplay({ displayTime }: { displayTime: string }) {
  return (
    <div style={{
      fontSize: `${Typography.size.sm}px`,
      fontWeight: Typography.weight.bold,
      color: Colors.textPrimary,
      fontFamily: Typography.family.sans,
      lineHeight: 1.3,
      minHeight: '1em',
      display: 'inline-block',
    }}>
      {displayTime || (
        <span style={{ opacity: 0.4, fontWeight: Typography.weight.regular, color: Colors.textMuted }}>
          set time
        </span>
      )}
    </div>
  );
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
  /** Open the pencil edit sheet (label, time, confirm toggle) */
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
  displayTime,
  reservationTime,
  index,
  animate,
  isLast,
  resolvedPlace,
  textOverride,
  onOpenDetail,
  onTapCard,
  isPulsing,
}: TimelineItemProps) {
  const itItem = item as ItineraryItem;

  const { title: parsedTitle, blurb } = parseItemText(item.text);
  const title = textOverride || parsedTitle;

  const category = !isCustom ? (itItem.category ?? null) : null;
  const nodeEntry = resolveNodeEntry(category, isCustom, item);
  const nodeColor = isConfirmed ? Semantic.confirmed : (nodeEntry?.color ?? accent);
  const lineColor = isConfirmed ? `${Semantic.confirmed}4D` : `${accent}33`;
  const lineWeight = isConfirmed ? 2 : 1.5;

  const cardBorderColor = isConfirmed ? `${Semantic.confirmed}90` : `${accent}30`;

  const addr = resolvedPlace?.addr ?? (!isCustom ? itItem.addr : null) ?? (isCustom ? (item as CustomItem).addr : null);
  const addrLabel = !isCustom ? (itItem.addr_label ?? null) : null;

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 8 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: '-30px' }}
      transition={{
        type: 'spring',
        ...Animation.springs.gentle,
        delay: animate ? 0.08 + index * 0.025 : 0,
      }}
      style={{ display: 'flex', paddingBottom: isLast ? 0 : Spacing.base }}
    >
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

      {/* ── Right side: time label + card ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Time label — read-only (edit via pencil sheet) */}
        <div style={{ marginBottom: Spacing.xxs + 2 }}>
          <TimeDisplay
            displayTime={isConfirmed && reservationTime ? reservationTime : displayTime}
          />
        </div>

        {/* ── Item card ── */}
        <motion.div
          animate={{
            borderLeftColor: cardBorderColor,
            boxShadow: isPulsing
              ? [
                  '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
                  `0 0 0 3px ${Colors.gold}60, 0 4px 16px ${Colors.gold}30`,
                  `0 0 0 1px ${Colors.gold}20, 0 1px 4px rgba(13,43,62,0.08)`,
                  '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
                ]
              : '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
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
            borderRadius: `${Spacing.md}px`,
            boxShadow: '0 1px 4px rgba(13,43,62,0.08), 0 2px 10px rgba(13,43,62,0.06)',
            padding: `${Spacing.md}px`,
            borderLeft: `3px solid`,
            borderLeftColor: cardBorderColor,
            cursor: onTapCard ? 'pointer' : 'default',
          }}
        >
          {/* Title + edit pencil */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: Spacing.xs,
            marginBottom: blurb ? Spacing.xxs : Spacing.xs,
          }}>
            <div style={{
              fontSize: `${Typography.size.base}px`,
              fontWeight: isConfirmed ? Typography.weight.bold : Typography.weight.medium,
              color: isConfirmed ? Colors.textPrimary : Colors.textSecondary,
              lineHeight: Typography.lineHeight.normal,
              fontFamily: Typography.family.sans,
              transition: `color ${Animation.duration.normal} ${Animation.easing.default}`,
              flex: 1,
            }}>
              {title}
            </div>
            {onOpenDetail && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
                title="Edit"
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: `1px solid ${Colors.border}`,
                  background: 'transparent',
                  color: Colors.textMuted,
                  cursor: 'pointer',
                  fontSize: `${Typography.size.xs - 1}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  padding: 0,
                  marginTop: 1,
                  transition: `border-color ${Animation.duration.fast} ${Animation.easing.default}, color ${Animation.duration.fast} ${Animation.easing.default}`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = accent;
                  (e.currentTarget as HTMLButtonElement).style.color = accent;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = Colors.border;
                  (e.currentTarget as HTMLButtonElement).style.color = Colors.textMuted;
                }}
              >
                ✎
              </button>
            )}
          </div>

          {/* Blurb */}
          {blurb && (
            <div style={{
              fontSize: `${Typography.size.xs + 1}px`,
              color: Colors.textMuted,
              lineHeight: Typography.lineHeight.relaxed,
              fontFamily: Typography.family.serif,
              fontStyle: 'italic',
              marginBottom: Spacing.xs,
            }}>
              {blurb}
            </div>
          )}

          {/* Place metadata row — hike chips or rating/price */}
          {resolvedPlace && <PlaceMetaRow place={resolvedPlace} />}

          {/* Address */}
          {addr && (
            <div style={{ marginBottom: Spacing.xs, display: 'inline-flex', alignItems: 'center', gap: Spacing.xs, fontSize: `${Typography.size.xs + 1}px`, color: accent, fontFamily: Typography.family.sans, lineHeight: Typography.lineHeight.normal }}>
              <Icons.Pin size={12} weight="duotone" color={accent} /> {addrLabel || addr}
            </div>
          )}

          {/* Phone */}
          {resolvedPlace?.phone && (
            <div style={{ marginBottom: Spacing.xs, display: 'inline-flex', alignItems: 'center', gap: Spacing.xs, fontSize: `${Typography.size.xs + 1}px`, color: Colors.textMuted, fontFamily: Typography.family.sans, lineHeight: Typography.lineHeight.normal }}>
              <Icons.Phone size={12} weight="duotone" color={Colors.textMuted} /> {resolvedPlace.phone}
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

          {/* Footer: confirm pill */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: Spacing.xs }}>
            <AnimatePresence mode="wait">
              {isConfirmed ? (
                <motion.button
                  key="confirmed"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: 'spring', ...Animation.springs.snappy }}
                  onClick={(e) => { e.stopPropagation(); onOpenDetail?.(); }}
                  whileTap={{ scale: 0.94 }}
                  style={{
                    background: Semantic.confirmed,
                    color: Core.white,
                    border: 'none',
                    borderRadius: 9999,
                    padding: `${Spacing.xs}px ${Spacing.md}px`,
                    fontSize: `${Typography.size.xs}px`,
                    fontFamily: Typography.family.sans,
                    fontWeight: Typography.weight.semibold,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    boxShadow: `0 2px 8px ${Colors.gold}55`,
                    flexShrink: 0,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                >
                  ✓ Confirmed
                </motion.button>
              ) : (
                <motion.button
                  key="confirm"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: 'spring', ...Animation.springs.snappy }}
                  onClick={(e) => { e.stopPropagation(); onOpenDetail?.(); }}
                  whileTap={{ scale: 0.94 }}
                  style={{
                    background: 'transparent',
                    color: Colors.gold,
                    border: `1.5px solid ${Colors.gold}`,
                    borderRadius: 9999,
                    padding: `${Spacing.xs}px ${Spacing.md}px`,
                    fontSize: `${Typography.size.xs}px`,
                    fontFamily: Typography.family.sans,
                    fontWeight: Typography.weight.semibold,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    flexShrink: 0,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                >
                  Confirm ✓
                </motion.button>
              )}
            </AnimatePresence>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}
