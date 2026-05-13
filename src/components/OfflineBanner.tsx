import { Semantic, Typography, Spacing } from '../design/tokens';
import { useConnectivityState } from '../contexts/ConnectivityContext';
import { useMountVisible } from '../hooks/useMountVisible';

// Persistent offline banner rendered below the sticky nav.
// Mounts when offline or briefly on reconnect (wasOffline grace period).
// Parent is responsible for rendering this only when needed —
// call useConnectivityState() in AppShell and render conditionally.

export function OfflineBanner() {
  const { isOnline, wasOffline, pendingWriteCount } = useConnectivityState();
  const visible = useMountVisible();

  const reconnecting = isOnline && wasOffline;

  const bg = reconnecting ? Semantic.successTint : Semantic.warningTint;
  const borderColor = reconnecting ? Semantic.success : Semantic.warning;
  const textColor = reconnecting ? Semantic.success : Semantic.warning;

  let message: string;
  if (reconnecting) {
    message = 'Back online — syncing…';
  } else if (pendingWriteCount > 0) {
    message = `No connection — ${pendingWriteCount} change${pendingWriteCount === 1 ? '' : 's'} saved locally`;
  } else {
    message = 'No connection — showing cached data';
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: Spacing.md,
        right: Spacing.md,
        // Float above the 56px BottomBar + device safe area
        bottom: 'calc(56px + min(env(safe-area-inset-bottom, 0px), 5px))',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: Spacing.md,
        paddingRight: Spacing.md,
        height: 36,
        background: bg,
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      <span
        style={{
          fontFamily: Typography.family.sans,
          fontSize: 12,
          fontWeight: 500,
          color: textColor,
          lineHeight: 1,
          letterSpacing: 0.1,
        }}
      >
        {message}
      </span>
    </div>
  );
}
