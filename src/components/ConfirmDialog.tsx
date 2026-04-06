// ConfirmDialog — inline confirmation that slides up from the bottom of a
// BottomSheet. NOT a separate modal — it lives inside the sheet.
//
// PLATFORM NOTE: CSS transitions → React Native Animated / Reanimated on Expo.

import { Colors, Spacing, Radius, Typography, Animation, Shadow } from '../design/tokens';

export interface ConfirmDialogProps {
  isVisible: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' renders the confirm button in red */
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isVisible,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBg = variant === 'danger' ? Colors.red : Colors.navy;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: Colors.surface,
        borderTopLeftRadius: Radius.lg,
        borderTopRightRadius: Radius.lg,
        boxShadow: Shadow.lg,
        padding: `${Spacing.lg}px ${Spacing.base}px`,
        // Extra 24px ensures the hidden state clears the safe-area spacer
        // at the bottom of BottomSheet — without it, the dialog top edge
        // sits exactly at the spacer boundary and peeks through.
        transform: isVisible ? 'translateY(0)' : 'translateY(calc(100% + 24px))',
        transition: `transform ${Animation.duration.normal} ${Animation.easing.enter}`,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: Spacing.md,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: Typography.family,
          fontSize: Typography.size.base,
          color: Colors.textPrimary,
          lineHeight: Typography.lineHeight.normal,
          textAlign: 'center',
        }}
      >
        {message}
      </p>

      <div style={{ display: 'flex', gap: Spacing.sm }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            height: 44,
            border: `1px solid ${Colors.border}`,
            borderRadius: Radius.md,
            background: Colors.surface,
            fontFamily: Typography.family,
            fontSize: Typography.size.base,
            color: Colors.textSecondary,
            cursor: 'pointer',
          }}
        >
          {cancelLabel}
        </button>

        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            height: 44,
            border: 'none',
            borderRadius: Radius.md,
            background: confirmBg,
            fontFamily: Typography.family,
            fontSize: Typography.size.base,
            fontWeight: Typography.weight.semibold,
            color: Colors.textInverse,
            cursor: 'pointer',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
