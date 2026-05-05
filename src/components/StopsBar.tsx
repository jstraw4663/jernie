// StopsBar — Trailhead v2.
// Active stop is a carved pill floating on a horizontal trail line.
// Inactive stops scale by distance from active: labeled → iconDot → miniDot.
// Trail fill animates with its own spring (trail config) so it lags the pill ~80ms.
// Bar supports swipe-to-advance; disabled when a sheet is open.
//
// PLATFORM NOTE:
//   drag → react-native-gesture-handler PanGestureHandler on Expo migration
//   useLayoutEffect measurements → useMeasure / onLayout on Expo migration

import { useRef, useState, useLayoutEffect } from 'react';
import {
  motion,
  LayoutGroup,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import type { Stop } from '../types';
import { Colors, Semantic, Spacing, Typography, Animation } from '../design/tokens';
import { getStopPack } from '../design/tripPacks';
import { useSheetContext } from '../contexts/SheetContext';

// Look up the Maine Pack color for a stop; fall back to trip.json accent.
function resolveStopAccent(stop: Stop): string {
  return getStopPack('maine', stop.id)?.primary ?? stop.accent;
}

// ---------------------------------------------------------------------------
// Types / helpers
// ---------------------------------------------------------------------------

type StopMode = 'active' | 'labeled' | 'iconDot' | 'miniDot';

function resolveMode(idx: number, activeIndex: number, count: number): StopMode {
  if (idx === activeIndex) return 'active';
  const dist = Math.abs(idx - activeIndex);
  if (count <= 4 || dist === 1) return 'labeled';
  if (count <= 6 || dist === 2) return 'iconDot';
  return 'miniDot';
}

// ---------------------------------------------------------------------------
// TrailLine
// ---------------------------------------------------------------------------

interface TrailLineProps {
  centers: number[];
  fillWidth: ReturnType<typeof useSpring>;
  accent: string;
  offsetLeft: number;
}

function TrailLine({ centers, fillWidth, accent, offsetLeft }: TrailLineProps) {
  if (centers.length < 2) return null;
  const first = centers[0];
  const last = centers[centers.length - 1];
  const totalWidth = last - first;
  if (totalWidth <= 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: offsetLeft,
        top: '50%',
        transform: 'translateY(-50%)',
        width: totalWidth,
        height: 2,
        background: `${Colors.textMuted}33`,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <motion.div
        style={{
          height: '100%',
          width: fillWidth,
          background: accent,
          boxShadow: `0 0 8px ${accent}55`,
          borderRadius: 1,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StopNode variants
// ---------------------------------------------------------------------------

interface StopNodeProps {
  stop: Stop;
  mode: StopMode;
  isPast: boolean;
}

function StopNode({ stop, mode, isPast }: StopNodeProps) {
  const accent = resolveStopAccent(stop);

  if (mode === 'active') {
    return (
      <motion.div
        layoutId="stops-bar-active"
        animate={{ scale: [0.96, 1] }}
        transition={{ type: 'spring', ...Animation.springs.settle }}
        style={{
          background: Colors.surfaceRaised,
          border: `1.5px solid ${accent}45`,
          borderRadius: 38,
          boxShadow: '0 1px 4px rgba(13,43,62,0.08), 0 6px 18px rgba(13,43,62,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.sm,
          padding: `${Spacing.sm}px ${Spacing.md}px`,
          cursor: 'pointer',
          position: 'relative',
          zIndex: 2,
          userSelect: 'none',
        }}
      >
        {/* Emoji chip — keyed by stop.id so it re-mounts + blooms on each stop change */}
        <motion.div
          key={stop.id}
          initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', ...Animation.springs.bloom }}
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${accent}33, ${accent}11)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            flexShrink: 0,
          }}
        >
          {stop.emoji}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', ...Animation.springs.bloom, delay: 0.06 }}
        >
          <div
            style={{
              color: accent,
              fontWeight: Typography.weight.bold,
              fontSize: `${Typography.size.sm}px`,
              fontFamily: Typography.family.sans,
              whiteSpace: 'nowrap',
            }}
          >
            {stop.city}
          </div>
          <div
            style={{
              color: Colors.textSecondary,
              fontSize: `${Typography.size.xs}px`,
              fontFamily: Typography.family.sans,
              whiteSpace: 'nowrap',
            }}
          >
            {stop.dates}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (mode === 'labeled') {
    const dotColor = isPast ? Semantic.confirmed : Colors.textMuted;
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: Spacing.xxs,
          cursor: 'pointer',
          userSelect: 'none',
          zIndex: 1,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: isPast ? `${Semantic.confirmed}22` : `${Colors.textMuted}22`,
            border: `1.5px solid ${dotColor}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
          }}
        >
          {stop.emoji}
        </div>
        <div
          style={{
            color: dotColor,
            fontSize: `${Typography.size.xs}px`,
            fontFamily: Typography.family.sans,
            whiteSpace: 'nowrap',
          }}
        >
          {stop.city}
        </div>
      </div>
    );
  }

  if (mode === 'iconDot') {
    const dotColor = isPast ? Semantic.confirmed : Colors.textMuted;
    return (
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: isPast ? `${Colors.gold}22` : `${Colors.textMuted}22`,
          border: `1.5px solid ${dotColor}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          cursor: 'pointer',
          userSelect: 'none',
          zIndex: 1,
          position: 'relative',
        }}
      >
        {stop.emoji}
      </div>
    );
  }

  // miniDot
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: isPast ? Semantic.confirmed : `${Colors.textMuted}55`,
        cursor: 'pointer',
        userSelect: 'none',
        zIndex: 1,
        position: 'relative',
        flexShrink: 0,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// StopsBar
// ---------------------------------------------------------------------------

export interface StopsBarProps {
  stops: Stop[];
  active: string;
  onTabChange: (id: string) => void;
}

export function StopsBar({ stops, active, onTabChange }: StopsBarProps) {
  const activeIndex = stops.findIndex(s => s.id === active);
  const activeStop = stops[activeIndex] ?? stops[0];

  const scrollRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [centers, setCenters] = useState<number[]>([]);
  const [trailOffsetLeft, setTrailOffsetLeft] = useState(0);

  const fillPx = useMotionValue(0);
  const springFillPx = useSpring(fillPx, Animation.springs.trail);

  const { openCount } = useSheetContext();

  // Measure stop node centers relative to the inner div, update trail fill target.
  useLayoutEffect(() => {
    const els = nodeRefs.current;
    if (!els.length) return;

    const measured = els.map(el => {
      if (!el) return 0;
      return el.offsetLeft + el.offsetWidth / 2;
    });
    setCenters(measured);

    const first = measured[0] ?? 0;
    setTrailOffsetLeft(first);
    fillPx.set((measured[activeIndex] ?? first) - first);
  }, [activeIndex, stops.length, fillPx]);

  // Scroll container so active node is centered.
  useLayoutEffect(() => {
    const container = scrollRef.current;
    const node = nodeRefs.current[activeIndex];
    if (!container || !node) return;
    const nodeCenter = node.offsetLeft + node.offsetWidth / 2;
    container.scrollTo({
      left: nodeCenter - container.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [activeIndex]);

  const showFades = stops.length > 1;

  return (
    <div
      style={{
        background: Colors.tabBg,
        borderBottom: `2px solid ${Colors.tabBorder}`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Edge fades */}
      {showFades && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 32,
            zIndex: 10,
            background: `linear-gradient(to right, ${Colors.background}, transparent)`,
            pointerEvents: 'none',
          }}
        />
      )}
      {showFades && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 32,
            zIndex: 10,
            background: `linear-gradient(to left, ${Colors.background}, transparent)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Swipe-to-advance gesture wrapper */}
      <motion.div
        drag={openCount === 0 ? 'x' : false}
        dragElastic={0.05}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          const dx = info.offset.x;
          const vx = info.velocity.x;
          if (Math.abs(dx) > 40 || Math.abs(vx) > 180) {
            if (dx < 0 && activeIndex < stops.length - 1) {
              onTabChange(stops[activeIndex + 1].id);
            } else if (dx > 0 && activeIndex > 0) {
              onTabChange(stops[activeIndex - 1].id);
            }
          }
        }}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Scrollable band */}
        <div
          ref={scrollRef}
          style={{
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
        >
          {/* Inner layout — padding lets first/last stops reach center */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 'calc(50vw - 110px)',
              paddingRight: 'calc(50vw - 110px)',
              paddingTop: `${Spacing.sm}px`,
              paddingBottom: `${Spacing.sm}px`,
              minWidth: 'max-content',
              position: 'relative',
              gap: `${Spacing.base}px`,
            }}
          >
            {/* Trail line — sits behind nodes */}
            <TrailLine
              centers={centers}
              fillWidth={springFillPx}
              accent={activeStop ? resolveStopAccent(activeStop) : Colors.textMuted}
              offsetLeft={trailOffsetLeft}
            />

            <LayoutGroup>
              {stops.map((stop, i) => (
                <div
                  key={stop.id}
                  ref={el => { nodeRefs.current[i] = el; }}
                  onClick={() => onTabChange(stop.id)}
                  style={{ flexShrink: 0 }}
                >
                  <StopNode
                    stop={stop}
                    mode={resolveMode(i, activeIndex, stops.length)}
                    isPast={i < activeIndex}
                  />
                </div>
              ))}
            </LayoutGroup>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
