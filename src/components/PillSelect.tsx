// PillSelect — animated expand/collapse pill selector.
//
// Collapsed: shows selected option as a single pill with a chevron.
// Expanded:  morphs into a floating panel (position: absolute, z-index 50)
//            that lists all options with staggered entrance, then snaps
//            closed on selection or click-outside.
//
// Uses Framer Motion layoutId for the pill→panel morph — same technique as
// EntityDetailSheet's card-expand animation. No additional dependencies.
//
// PLATFORM NOTE: motion.div → MotiView on Expo migration. position:absolute
// overlay pattern works identically on RN with StyleSheet.absoluteFillObject
// scoped to a positioned parent.

import React, { useId, useRef, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Colors, Spacing, Radius, Typography, Shadow, Animation } from '../design/tokens';

// ── Public types ──────────────────────────────────────────────────────────────

export interface PillSelectOption {
  id: string;
  label: string;
  value: string;
  description?: string;
  /** Emoji string, <img>, or any React node. Rendered in a 32×32 circle. */
  icon?: React.ReactNode;
}

interface PillSelectProps {
  options: PillSelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Shown in the pill when nothing is selected. Default: "Select…" */
  placeholder?: string;
  /** Header label in the expanded panel. Default: "Select" */
  title?: string;
  /** Which edge the panel anchors to. Default: "left" (opens rightward). Use "right" when the pill is right-aligned. */
  align?: 'left' | 'right';
}

// ── Animation variants ────────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.22,
      ease: Animation.fm.easeOut,
    },
  }),
  exit: (i: number) => ({
    opacity: 0,
    y: 6,
    transition: {
      delay: i * 0.03,
      duration: 0.14,
      ease: Animation.fm.easeIn,
    },
  }),
};

// ── ChevronDown — inline SVG, no Lucide dep ───────────────────────────────────

function ChevronDown({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── PillSelect ────────────────────────────────────────────────────────────────

export function PillSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  title = 'Select',
  align = 'left',
}: PillSelectProps) {
  const [open, setOpen] = React.useState(false);
  const instanceId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value) ?? null;

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const handleSelect = (opt: PillSelectOption) => {
    onChange(opt.value === value ? null : opt.value);
    setOpen(false);
  };

  // The wrapper is position:relative so the absolute expanded panel anchors to it.
  return (
    <MotionConfig
      transition={{ type: 'spring', ...Animation.springs.snappy }}
    >
      <div style={{ position: 'relative' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {!open ? (
            // ── Collapsed pill ───────────────────────────────────────────────
            <motion.button
              key="pill"
              type="button"
              layoutId={`pso-${instanceId}`}
              layout
              onClick={() => setOpen(true)}
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, borderRadius: Radius.full }}
              exit={{ opacity: 0 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: `${Spacing.xs}px`,
                padding: `${Spacing.xs + 2}px ${Spacing.sm + 2}px`,
                minHeight: 36,
                background: selected ? Colors.navy : Colors.surface2,
                border: 'none',
                borderRadius: Radius.full,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {/* Selected icon — persists layoutId for morph */}
              {selected?.icon && (
                <motion.span
                  layoutId={`pso-icon-${selected.id}-${instanceId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    lineHeight: 1,
                  }}
                >
                  {selected.icon}
                </motion.span>
              )}
              {/* Selected label — persists layoutId for morph */}
              <motion.span
                layoutId={selected ? `pso-label-${selected.id}-${instanceId}` : undefined}
                style={{
                  fontFamily: Typography.family.sans,
                  fontSize: `${Typography.size.xs}px`,
                  fontWeight: Typography.weight.semibold,
                  color: selected ? Colors.textInverse : Colors.textMuted,
                  whiteSpace: 'nowrap',
                }}
              >
                {selected?.label ?? placeholder}
              </motion.span>
              <ChevronDown color={selected ? Colors.textInverse : Colors.textMuted} />
            </motion.button>
          ) : (
            // ── Expanded panel ───────────────────────────────────────────────
            <motion.div
              key="panel"
              ref={panelRef}
              layoutId={`pso-${instanceId}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, borderRadius: Radius.lg }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                top: 0,
                ...(align === 'right' ? { right: 0 } : { left: 0 }),
                zIndex: 50,
                minWidth: 260,
                maxWidth: 360,
                width: 'max-content',
                background: Colors.surfaceRaised,
                borderRadius: Radius.lg,
                boxShadow: Shadow.cardLifted,
                border: `1px solid ${Colors.border}`,
                overflow: 'hidden',
              }}
            >
              {/* Panel header */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.08 } }}
                exit={{ opacity: 0 }}
                layout
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `${Spacing.md}px ${Spacing.base}px ${Spacing.sm}px`,
                  borderBottom: `1px solid ${Colors.border}`,
                }}
              >
                <motion.span
                  layout
                  style={{
                    fontFamily: Typography.family.sans,
                    fontSize: `${Typography.size.sm}px`,
                    fontWeight: Typography.weight.bold,
                    color: Colors.textPrimary,
                  }}
                >
                  {title}
                </motion.span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: Radius.full,
                    border: 'none',
                    background: Colors.surface2,
                    cursor: 'pointer',
                    padding: 0,
                    outline: 'none',
                    fontSize: 14,
                    color: Colors.textMuted,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </motion.div>

              {/* Option list */}
              <div style={{ overflowY: 'auto', maxHeight: 320 }}>
                {options.map((opt, i) => {
                  const isSelected = opt.value === value;
                  return (
                    <motion.div
                      key={opt.id}
                      custom={i}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      onClick={() => handleSelect(opt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: `${Spacing.md}px`,
                        padding: `${Spacing.sm}px ${Spacing.base}px`,
                        cursor: 'pointer',
                        background: isSelected ? Colors.navyTint10 : 'transparent',
                        transition: 'background 0.12s ease',
                      }}
                      whileHover={{ background: isSelected ? Colors.navyTint20 : Colors.surface2 }}
                    >
                      {/* Icon circle */}
                      {opt.icon !== undefined && (
                        <motion.div
                          layout
                          layoutId={`pso-icon-${opt.id}-${instanceId}`}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: Radius.full,
                            border: `1px solid ${Colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            flexShrink: 0,
                            background: Colors.surface,
                          }}
                        >
                          {opt.icon}
                        </motion.div>
                      )}
                      {/* Label + description */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <motion.div
                          layout
                          layoutId={`pso-label-${opt.id}-${instanceId}`}
                          style={{
                            fontFamily: Typography.family.sans,
                            fontSize: `${Typography.size.sm}px`,
                            fontWeight: isSelected ? Typography.weight.bold : Typography.weight.medium,
                            color: isSelected ? Colors.navy : Colors.textPrimary,
                          }}
                        >
                          {opt.label}
                        </motion.div>
                        {opt.description && (
                          <div style={{
                            fontFamily: Typography.family.sans,
                            fontSize: `${Typography.size.xs}px`,
                            color: Colors.textMuted,
                            marginTop: 1,
                          }}>
                            {opt.description}
                          </div>
                        )}
                      </div>
                      {/* Checkmark for selected */}
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke={Colors.navy} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
