import { Colors, Radius } from '../design/tokens';

export function DragPill({ height = 28 }: { height?: number }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: 36, height: 4, borderRadius: Radius.full, background: Colors.border }} />
    </div>
  );
}
