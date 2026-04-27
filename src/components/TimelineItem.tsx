// TimelineItem — Timeline-style itinerary item for the inline read view.
//
// Open state:      hollow dot (stop accent), regular-weight muted title, "+ Confirm" CTA
// Confirmed state: filled gold dot, bold textPrimary title, Confirmed badge + reservation time
//
// Animations:
//   • Staggered entrance — y:8→0, opacity:0→1, delay = index × 50ms, springs.gentle
//   • Dot state change   — backgroundColor + borderColor spring on confirm/un-confirm
//   • Badge pop-in       — scale:0→1 via AnimatePresence, springs.snappy
//
// PLATFORM NOTE:
//   div → View, span/a → Text/Pressable on Expo migration
//   Framer Motion animate → Reanimated useAnimatedStyle / Moti springs
//   No web-specific APIs below this line.

import { motion, AnimatePresence } from 'framer-motion';
import { Icons, CATEGORY_ICON_MAP } from '../design/icons';
import { Colors, Typography, Spacing, Animation } from '../design/tokens';
import { Badge } from './Badge';
import { StarRating } from './StarRating';
import type { ItineraryItem, CustomItem, Place, ItineraryCategory } from '../types';
import { parseItemText } from '../utils/parseItemText';

type ResolvedItem = (ItineraryItem & { _isCustom: false }) | (CustomItem & { _isCustom: true });


// Subtle muted color tint per category — used on the category label chip only
const ITINERARY_CATEGORY_COLOR: Record<ItineraryCategory, { bg: string; text: string }> = {
  restaurant: { bg: '#FFF3E8', text: '#A0522D' },
  hike:       { bg: '#EDFAF2', text: '#2D6A3F' },
  sight:      { bg: '#E8F2FA', text: '#2D5C8F' },
  activity:   { bg: '#E8F6FA', text: '#1B5C6E' },
  travel:     { bg: '#F0F0F5', text: '#5C5C80' },
  lodging:    { bg: '#F3EEFA', text: '#6A3FA0' },
  leisure:    { bg: '#FDF8E8', text: '#8F6A1B' },
  other:      { bg: '#F0F0F0', text: '#666666' },
};


const DOT_SIZE = 10;

// ── TimeDisplay ──────────────────────────────────────────────────
// Read-only time label above the card. Editing time is now done
// exclusively through the pencil / detail sheet.

function TimeDisplay({ displayTime }: { displayTime: string }) {
  return (
    <div style={{
      fontSize: `${Typography.size.sm}px`,
      fontWeight: Typography.weight.bold,
      color: Colors.textPrimary,
      fontFamily: Typography.family,
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
}: TimelineItemProps) {
  const itItem = item as ItineraryItem;

  // Parse title + blurb from the · / — structured text format
  const { title: parsedTitle, blurb } = isCustom ? { title: item.text, blurb: '' } : parseItemText(item.text);
  // textOverride wins over stored text for display — lets users rename place-linked items
  const title = textOverride || parsedTitle;

  // Category — only on non-custom items
  const category = !isCustom ? (itItem.category ?? null) : null;
  const categoryEntry = category ? CATEGORY_ICON_MAP[category] : null;
  const categoryColor = category ? ITINERARY_CATEGORY_COLOR[category] : null;

  // Dot + connector colors — animate between open and confirmed states
  const dotBg      = isConfirmed ? Colors.gold        : 'rgba(0,0,0,0)';
  const dotBorder  = isConfirmed ? Colors.gold        : accent;
  const lineColor  = isConfirmed ? `${Colors.gold}4D` : `${accent}33`;
  const lineWeight = isConfirmed ? 2 : 1; // px — bold gold when confirmed, thin when open

  // Card left border — accent ties the card to its stop; shifts to gold on confirm
  const cardBorderColor = isConfirmed ? `${Colors.gold}90` : `${accent}30`;

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
      // Row: left track (dot + connector) | right (time label + card)
      style={{ display: 'flex', paddingBottom: isLast ? 0 : Spacing.base }}
    >
      {/* ── Left track: dot + vertical connector ── */}
      <div style={{
        width: DOT_SIZE,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: Spacing.xxs,
      }}>
        {/* Dot — hollow/accent when open, filled gold when confirmed */}
        <motion.div
          animate={{ backgroundColor: dotBg, borderColor: dotBorder }}
          transition={{ type: 'spring', ...Animation.springs.snappy }}
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: '50%',
            border: '2px solid',
            flexShrink: 0,
          }}
        />
        {/* Connector — runs from dot to the bottom of this item's space */}
        {!isLast && (
          <motion.div
            animate={{ backgroundColor: lineColor, width: lineWeight }}
            transition={{ type: 'spring', ...Animation.springs.snappy }}
            style={{
              width: 1,          // explicit initial width — prevents flex from expanding it
              flex: 1,
              marginTop: Spacing.xs,
            }}
          />
        )}
      </div>

      {/* ── Right side: time label + card ── */}
      <div style={{ flex: 1, paddingLeft: Spacing.md }}>

        {/* Time label — sits above the card, read-only (edit via pencil sheet) */}
        <div style={{ marginBottom: Spacing.xxs + 2 }}>
          <TimeDisplay
            displayTime={isConfirmed && reservationTime ? reservationTime : displayTime}
          />
        </div>

        {/* ── Item card ── */}
        <motion.div
          animate={{ borderLeftColor: cardBorderColor }}
          transition={{ duration: 0.3, ease: Animation.fm.ease }}
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
          {/* Category icon + title + detail chevron */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: Spacing.xs,
            marginBottom: blurb ? Spacing.xxs : (Spacing.xs),
          }}>
            {/* Icon — category for curated items, category for custom */}
            {(() => {
              const entry = categoryEntry ?? CATEGORY_ICON_MAP[(item as CustomItem).category ?? ''];
              if (!entry) return null;
              const { Icon: CatIcon, color: catColor } = entry;
              return (
                <span style={{ lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
                  <CatIcon size={Typography.size.base} weight="duotone" color={catColor} />
                </span>
              );
            })()}
            {/* Title */}
            <div style={{
              fontSize: `${Typography.size.base}px`,
              fontWeight: isConfirmed ? Typography.weight.bold : Typography.weight.medium,
              color: isConfirmed ? Colors.textPrimary : Colors.textSecondary,
              lineHeight: Typography.lineHeight.normal,
              fontFamily: Typography.family,
              transition: `color ${Animation.duration.normal} ${Animation.easing.default}`,
              flex: 1,
            }}>
              {title}
            </div>
            {/* Pencil — opens edit sheet (label, time, confirm) */}
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
              fontFamily: Typography.family,
              fontStyle: 'italic',
              marginBottom: Spacing.xs,
              paddingLeft: (categoryEntry || (isCustom && (item as CustomItem).category))
                ? `${Typography.size.base + Spacing.xs}px`
                : 0,
            }}>
              {blurb}
            </div>
          )}

          {/* Place enrichment row — rating + price when place is linked */}
          {resolvedPlace && (resolvedPlace.rating != null || resolvedPlace.price) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs, flexWrap: 'wrap' }}>
              {resolvedPlace.rating != null && <StarRating rating={resolvedPlace.rating} compact />}
              {resolvedPlace.price && (
                <span style={{
                  fontSize: `${Typography.size.xs - 1}px`,
                  color: Colors.textMuted,
                  fontFamily: Typography.family,
                  letterSpacing: '0.02em',
                }}>
                  {resolvedPlace.price}
                </span>
              )}
            </div>
          )}

          {/* Address */}
          {addr && (
            <div style={{ marginBottom: Spacing.xs, display: 'inline-flex', alignItems: 'center', gap: Spacing.xs, fontSize: `${Typography.size.xs + 1}px`, color: accent, fontFamily: Typography.family, lineHeight: Typography.lineHeight.normal }}>
              <Icons.Pin size={12} weight="duotone" color={accent} /> {addrLabel || addr}
            </div>
          )}

          {/* Phone — shown when resolvedPlace has a phone number */}
          {resolvedPlace?.phone && (
            <div style={{ marginBottom: Spacing.xs, display: 'inline-flex', alignItems: 'center', gap: Spacing.xs, fontSize: `${Typography.size.xs + 1}px`, color: Colors.textMuted, fontFamily: Typography.family, lineHeight: Typography.lineHeight.normal }}>
              <Icons.Phone size={12} weight="duotone" color={Colors.textMuted} /> {resolvedPlace.phone}
            </div>
          )}

          {/* Tide chart */}
          {!isCustom && itItem.tide_url && (
            <div style={{ marginBottom: Spacing.xs, display: 'inline-flex', alignItems: 'center', gap: Spacing.xs, fontSize: `${Typography.size.xs + 1}px`, color: Colors.navyLight, fontFamily: Typography.family }}>
              <Icons.Waves size={12} weight="duotone" color={Colors.navyLight} /> Bar Harbor Tide Chart
            </div>
          )}

          {/* Book Now / Alert badges — above the footer row when present */}
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

          {/* Footer row: category chip left | confirm/confirmed pill right — same line */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: Spacing.xs,
            gap: Spacing.sm,
          }}>
            {/* Left: category chip */}
            <div style={{ flex: 1 }}>
              {/* Curated item category */}
              {categoryColor && category && category !== 'other' && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: `${Typography.size.xs - 1}px`,
                  background: categoryColor.bg,
                  color: categoryColor.text,
                  padding: `2px ${Spacing.sm}px`,
                  borderRadius: `${Spacing.xs}px`,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontFamily: Typography.family,
                  fontWeight: Typography.weight.semibold,
                }}>
                  {category}
                </div>
              )}
              {/* Custom item category */}
              {isCustom && (item as CustomItem).category && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: Spacing.xxs,
                  fontSize: `${Typography.size.xs - 1}px`,
                  background: Colors.infoBg,
                  color: Colors.info,
                  padding: `2px ${Spacing.sm}px`,
                  borderRadius: `${Spacing.xs}px`,
                  border: `1px solid ${Colors.info}20`,
                  letterSpacing: '0.04em',
                  fontFamily: Typography.family,
                }}>
                  {(() => { const e = CATEGORY_ICON_MAP[(item as CustomItem).category ?? '']; return e ? <e.Icon size={11} weight="duotone" color={e.color} /> : null; })()} {(item as CustomItem).category}
                </div>
              )}
            </div>

            {/* Right: confirm pill — both states open the edit sheet for time entry */}
            {!isCustom && (
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
                      background: Colors.gold,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 9999,
                      padding: `${Spacing.xs}px ${Spacing.md}px`,
                      fontSize: `${Typography.size.xs}px`,
                      fontFamily: Typography.family,
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
                      fontFamily: Typography.family,
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
            )}
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}
