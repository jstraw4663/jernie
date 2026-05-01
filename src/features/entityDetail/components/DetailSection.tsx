// DetailSection — a labeled group of key-value rows in the entity detail view.
// Empty sections (no rows) are not rendered — callers must filter before passing.

import type { DetailSectionConfig, DetailRow } from '../detailTypes';
import { Colors, Spacing, Typography, Radius } from '../../../design/tokens';

function DetailRowItem({ row }: { row: DetailRow }) {
  // Module rows: render the React component directly, no label/value chrome
  if (row.component !== undefined) {
    return <>{row.component}</>;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: `${Spacing.md}px`,
        padding: `${Spacing.sm}px 0`,
        borderBottom: `1px solid ${Colors.border}`,
      }}
    >
      {/* Label */}
      <span
        style={{
          fontFamily: Typography.family.sans,
          fontSize: `${Typography.size.sm}px`,
          color: Colors.textMuted,
          flexShrink: 0,
          minWidth: 80,
          lineHeight: Typography.lineHeight.normal,
        }}
      >
        {row.label}
      </span>

      {/* Value — link or plain text */}
      {row.link ? (
        <a
          href={row.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: Typography.family.sans,
            fontSize: `${Typography.size.sm}px`,
            color: Colors.info,
            textDecoration: 'none',
            textAlign: 'right',
            lineHeight: Typography.lineHeight.normal,
            wordBreak: 'break-word',
            flex: 1,
          }}
        >
          {row.value} ↗
        </a>
      ) : (
        <span
          style={{
            fontFamily: Typography.family.sans,
            fontSize: `${Typography.size.sm}px`,
            color: Colors.textPrimary,
            textAlign: 'right',
            lineHeight: Typography.lineHeight.normal,
            wordBreak: 'break-word',
            flex: 1,
          }}
        >
          {row.value}
        </span>
      )}
    </div>
  );
}

interface DetailSectionProps {
  section: DetailSectionConfig;
}

export function DetailSection({ section }: DetailSectionProps) {
  if (section.rows.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: `${Spacing.xl}px`,
        background: Colors.surfaceRaised,
        borderRadius: `${Radius.lg}px`,
        padding: `${Spacing.md}px ${Spacing.base}px`,
        boxShadow: '0 1px 4px rgba(13,43,62,0.06)',
      }}
    >
      {/* Section title */}
      <div
        style={{
          fontFamily: Typography.family.sans,
          fontSize: `${Typography.size.xs}px`,
          fontWeight: Typography.weight.bold,
          color: Colors.textMuted,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: `${Spacing.sm}px`,
        }}
      >
        {section.title}
      </div>

      {/* Rows — last row has no bottom border */}
      <div>
        {section.rows.map((row, i) => (
          <div
            key={i}
            style={i === section.rows.length - 1 ? { borderBottom: 'none' } : {}}
          >
            <DetailRowItem row={row} />
          </div>
        ))}
      </div>
    </div>
  );
}
