import type React from 'react';
import { Colors, Typography, Spacing, Radius, Animation } from '../../design/tokens';
import type { SectionId } from './selectors';

export interface NavSection {
  id: SectionId;
  icon: React.ReactNode;
  label: string;
  count: number;
}

interface OverviewAnchorNavProps {
  sections: NavSection[];
  activeSection: SectionId;
  onSectionTap: (id: SectionId) => void;
  accent?: string;
}

export function OverviewAnchorNav({ sections, activeSection, onSectionTap, accent }: OverviewAnchorNavProps) {
  const activeColor = accent ?? Colors.navy;

  return (
    <div style={{
      display: 'flex',
      gap: Spacing.xs,
      overflowX: 'auto',
      padding: `0 ${Spacing.base}px ${Spacing.sm}px`,
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    } as React.CSSProperties}>
      {sections.map(section => {
        const isActive = section.id === activeSection;
        return (
          <button
            key={section.id}
            onClick={() => onSectionTap(section.id)}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: Spacing.xs,
              padding: `${Spacing.xs}px ${Spacing.md}px`,
              borderRadius: `${Radius.full}px`,
              border: `1px solid ${isActive ? activeColor : Colors.border}`,
              background: isActive ? activeColor : Colors.surface,
              color: isActive ? '#fff' : Colors.textSecondary,
              fontSize: `${Typography.size.xs + 1}px`,
              fontFamily: Typography.family,
              fontWeight: isActive ? Typography.weight.semibold : Typography.weight.regular,
              cursor: 'pointer',
              transition: `background 150ms ${Animation.easing.default}, color 150ms ${Animation.easing.default}, border-color 150ms ${Animation.easing.default}`,
              whiteSpace: 'nowrap' as const,
            }}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
            {section.count > 0 && (
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : Colors.border,
                color: isActive ? '#fff' : Colors.textMuted,
                borderRadius: `${Radius.full}px`,
                padding: `0 ${Spacing.xs}px`,
                fontSize: `${Typography.size.xs - 1}px`,
                fontWeight: Typography.weight.semibold,
                lineHeight: '16px',
                minWidth: '16px',
                textAlign: 'center' as const,
              }}>
                {section.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
