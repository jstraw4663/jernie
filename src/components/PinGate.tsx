// PinGate — authentication gate before the main app.
//
// BIOMETRICS MIGRATION PATH:
// When iOS/Android biometrics are available (via a WebAuthn library or
// a React Native bridge), construct an AuthStrategy with type:'biometric'
// and pass it as the `strategy` prop. PinGate will render a "Use Biometrics"
// prompt instead of the PIN pad, calling strategy.authenticate() on tap.
// The onUnlock callback fires identically regardless of auth method.
//
// Example future usage:
//   const faceId: AuthStrategy = {
//     type: 'biometric',
//     label: 'Use Face ID',
//     authenticate: () => navigator.credentials.get({ publicKey: ... }),
//   };
//   <PinGate onUnlock={handleUnlock} strategy={faceId} />

import { useState } from 'react';
import { Typography, Brand, Semantic, Core } from '../design/tokens';

// --------------------------------------------------------------------------
// Session key — exported so AppShell can check it on mount without importing
// the full PinGate bundle.
// --------------------------------------------------------------------------
export const SESSION_KEY = 'maine2026_unlocked';

// --------------------------------------------------------------------------
// AuthStrategy interface — the seam for biometrics.
// --------------------------------------------------------------------------
export interface AuthStrategy {
  type: 'pin' | 'biometric';
  /** Resolves on success; throws (or rejects) on failure or cancellation. */
  authenticate: () => Promise<void>;
  /** Short label for the CTA button shown in biometric mode. */
  label?: string;
}

// --------------------------------------------------------------------------
// PIN constant — isolated here so it's easy to remove when biometrics land.
// --------------------------------------------------------------------------
const PIN = '0824';

// --------------------------------------------------------------------------
// Props
// --------------------------------------------------------------------------
interface PinGateProps {
  onUnlock: () => void;
  /** If omitted, falls back to the built-in PIN pad. */
  strategy?: AuthStrategy;
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------
export function PinGate({ onUnlock, strategy }: PinGateProps) {
  // strategy?.type === 'biometric' renders a single-button prompt.
  // Default (no strategy or strategy.type === 'pin') renders the PIN pad.
  const useBiometric = strategy?.type === 'biometric';

  return useBiometric
    ? <BiometricPrompt strategy={strategy!} onUnlock={onUnlock} />
    : <PinPad onUnlock={onUnlock} />;
}

// --------------------------------------------------------------------------
// BiometricPrompt — placeholder for Face ID / Touch ID / WebAuthn
// --------------------------------------------------------------------------
function BiometricPrompt({ strategy, onUnlock }: { strategy: AuthStrategy; onUnlock: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleAuth = async () => {
    setError(null);
    setPending(true);
    try {
      await strategy.authenticate();
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* storage unavailable */ }
      onUnlock();
    } catch {
      setError('Authentication failed. Try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: `linear-gradient(170deg,${Brand.navySoft}88 0%,${Brand.navy} 50%,${Brand.navy}cc 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: Typography.family.serif,
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
      <div style={{ color: Core.textInverse, fontSize: '1.3rem', marginBottom: '32px', textAlign: 'center' }}>
        {strategy.label ?? 'Authenticate to Continue'}
      </div>
      {error && (
        <div style={{ color: Semantic.error, fontSize: '0.85rem', marginBottom: '16px' }}>{error}</div>
      )}
      <button
        onClick={handleAuth}
        disabled={pending}
        style={{
          background: 'rgba(255,255,255,0.14)', border: 'none', borderRadius: '12px',
          color: Core.textInverse, fontSize: '1rem', padding: '14px 32px',
          cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? 'Authenticating…' : (strategy.label ?? 'Authenticate')}
      </button>
    </div>
  );
}

// --------------------------------------------------------------------------
// PinPad — the original phone-pad UI
// --------------------------------------------------------------------------
function PinPad({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleDigit = (d: string) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      if (next.join('') === PIN) {
        setFlash(true);
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* storage unavailable */ }
        setTimeout(onUnlock, 380);
      } else {
        setShake(true);
        setTimeout(() => { setDigits([]); setShake(false); }, 650);
      }
    }
  };

  const handleDelete = () => setDigits(d => d.slice(0, -1));

  const keys: ([string, string] | null)[] = [
    ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
    ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
    ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
    null, ['0', ''], ['DEL', ''],
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: `linear-gradient(170deg,${Brand.navySoft}88 0%,${Brand.navy} 50%,${Brand.navy}cc 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center',
      opacity: flash ? 0 : 1,
      transition: flash ? 'opacity 0.35s ease' : 'none',
      fontFamily: Typography.family.serif,
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.5 }}>🔒</div>
      <div style={{ color: Core.textInverse, fontSize: '1.45rem', fontWeight: 'normal', letterSpacing: '0.01em', marginBottom: '6px', textAlign: 'center' }}>
        Enter Passcode to View
      </div>
      <div style={{ color: '#7A9FB5', fontSize: '0.9rem', letterSpacing: '0.04em', marginBottom: '36px', fontStyle: 'italic' }}>
        Happy Birthday Ford
      </div>

      {/* PIN dots */}
      <div style={{
        display: 'flex', gap: '18px', marginBottom: '44px',
        animation: shake ? 'pinShake 0.55s ease' : 'none',
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: '13px', height: '13px', borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.5)',
            background: i < digits.length ? '#FDFAF4' : 'transparent',
            transition: 'background 0.15s',
          }}/>
        ))}
      </div>

      {/* Key grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '13px', width: 'min(290px,80vw)' }}>
        {keys.map((k, i) => {
          if (!k) return <div key={i}/>;
          const [num, letters] = k;
          const isDel = num === 'DEL';
          return (
            <button
              key={i}
              onClick={() => isDel ? handleDelete() : handleDigit(num)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: '50%',
                border: 'none', cursor: 'pointer',
                background: isDel ? 'transparent' : 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: Core.textInverse,
                transition: 'background 0.12s, transform 0.08s',
                fontFamily: 'inherit',
              }}
              onMouseDown={e => { e.currentTarget.style.background = isDel ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)'; }}
              onMouseUp={e => { e.currentTarget.style.background = isDel ? 'transparent' : 'rgba(255,255,255,0.12)'; }}
              onTouchStart={e => { e.currentTarget.style.background = isDel ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)'; }}
              onTouchEnd={e => { e.currentTarget.style.background = isDel ? 'transparent' : 'rgba(255,255,255,0.12)'; }}
            >
              {isDel
                ? <span style={{ fontSize: '1.1rem', opacity: 0.7 }}>⌫</span>
                : <>
                    <span style={{ fontSize: '1.65rem', fontWeight: '300', lineHeight: 1 }}>{num}</span>
                    {letters && <span style={{ fontSize: '0.5rem', letterSpacing: '0.18em', opacity: 0.6, marginTop: '2px' }}>{letters}</span>}
                  </>
              }
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes pinShake {
          0%   { transform: translateX(0); }
          15%  { transform: translateX(-10px); }
          30%  { transform: translateX(10px); }
          45%  { transform: translateX(-8px); }
          60%  { transform: translateX(8px); }
          75%  { transform: translateX(-4px); }
          90%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
