import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Colors, Typography, Spacing, Radius, Animation } from '../../design/tokens';
import { OverviewEmptyState } from './OverviewEmptyState';
import type { SectionId } from './selectors';

interface OverviewSectionProps {
  id: SectionId;
  sectionRef: (el: HTMLDivElement | null) => void;
  icon: ReactNode;
  title: string;
  count: number;
  children: ReactNode;
  isEmpty: boolean;
  emptyIcon: ReactNode;
  emptyText: string;
  addLabel?: string;
  onAddNew?: () => void;
}

export function OverviewSection({
  id,
  sectionRef,
  icon,
  title,
  count,
  children,
  isEmpty,
  emptyIcon,
  emptyText,
  addLabel,
  onAddNew,
}: OverviewSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      ref={sectionRef}
      data-section-id={id}
      style={{ marginBottom: Spacing.xxl }}
    >
      {/* Section header — tap anywhere to collapse */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.md,
          marginBottom: isOpen ? Spacing.base : 0,
          padding: `0 ${Spacing.base}px`,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left' as const,
        }}
      >
        <div style={{
          fontWeight: Typography.weight.bold,
          color: Colors.gold,
          fontSize: `${Typography.size.xs}px`,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          fontFamily: Typography.family.sans,
          whiteSpace: 'nowrap' as const,
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.xs,
        }}>
          <span>{icon}</span>
          <span>{title}</span>
          {count > 0 && (
            <span style={{
              background: Colors.gold + '22',
              color: Colors.gold,
              borderRadius: `${Radius.full}px`,
              padding: `1px ${Spacing.xs}px`,
              fontSize: `${Typography.size.xs - 1}px`,
              fontWeight: Typography.weight.semibold,
              marginLeft: 2,
            }}>
              {count}
            </span>
          )}
        </div>
        <div style={{ flex: 1, height: '1px', background: Colors.gold + '30' }} />
        <motion.span
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ type: 'spring', ...Animation.springs.snappy }}
          style={{
            display: 'flex',
            alignItems: 'center',
            color: Colors.gold,
            fontSize: '11px',
            lineHeight: 1,
            transformOrigin: 'center',
          }}
        >
          ▾
        </motion.span>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', ...Animation.springs.gentle }}
            style={{ overflow: 'hidden' }}
          >
            {isEmpty ? (
              <OverviewEmptyState
                icon={emptyIcon}
                text={emptyText}
                ctaLabel={addLabel}
                onCta={onAddNew}
              />
            ) : (
              <>
                <div style={{
                  padding: `0 ${Spacing.base}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: Spacing.md,
                }}>
                  {children}
                </div>
                {addLabel && onAddNew && (
                  <div style={{ padding: `${Spacing.md}px ${Spacing.base}px 0` }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddNew(); }}
                      style={{
                        width: '100%',
                        padding: `${Spacing.sm}px`,
                        border: `1px dashed ${Colors.border}`,
                        borderRadius: `${Radius.lg}px`,
                        background: 'transparent',
                        color: Colors.textMuted,
                        fontFamily: Typography.family.sans,
                        fontSize: `${Typography.size.sm}px`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: Spacing.xs,
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>+</span>
                      {addLabel}
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
