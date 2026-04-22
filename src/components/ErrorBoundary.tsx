// ErrorBoundary — catches render errors inside detail sheets (and any wrapped subtree)
// so crashes don't propagate to the full app.
//
// On caught error, renders a contained fallback message.
// Wraps EntityDetail inside EntityDetailSheet — the animation wrapper stays stable.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Colors, Spacing } from '../design/tokens';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Non-crashing logging — safe in all environments
    console.error('[ErrorBoundary] Detail sheet render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: `${Spacing.xl}px`,
            color: Colors.textMuted,
            fontSize: 15,
            textAlign: 'center',
            background: Colors.background,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: `${Spacing.base}px` }}>⚠</div>
          Couldn&apos;t load details
        </div>
      );
    }

    return this.props.children;
  }
}
