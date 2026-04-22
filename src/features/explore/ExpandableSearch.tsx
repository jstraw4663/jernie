import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Colors, Radius, Typography, Animation } from '../../design/tokens';

interface ExpandableSearchProps {
  onSearch: (query: string) => void;
  onOpen?: (open: boolean) => void;
  placeholder?: string;
  width?: number;
}

const COLLAPSED = 36;

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ExpandableSearch({ onSearch, onOpen, placeholder = 'Search places…', width = 260 }: ExpandableSearchProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    onOpen?.(next);
    if (!next) {
      setValue('');
      onSearch('');
    }
  };

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(id);
    } else {
      setValue('');
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setValue('');
        onSearch('');
        onOpen?.(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onSearch, onOpen]);

  const handleChange = (v: string) => {
    setValue(v);
    onSearch(v);
  };

  return (
    <div style={{ position: 'relative', width: COLLAPSED, height: COLLAPSED, flexShrink: 0 }}>
      {/* Toggle button — always on top */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close search' : 'Open search'}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: `${Radius.full}px`,
          border: `1px solid ${open ? Colors.border : 'transparent'}`,
          background: open ? Colors.surface : 'transparent',
          color: Colors.textSecondary,
          cursor: 'pointer',
          transition: `background 150ms, border-color 150ms`,
        }}
      >
        {open ? <XIcon /> : <SearchIcon />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="search-bar"
            initial={{ width: COLLAPSED, opacity: 0 }}
            animate={{ width, opacity: 1 }}
            exit={{ width: COLLAPSED, opacity: 0, transition: { type: 'spring', ...Animation.springs.snappy } }}
            transition={{ type: 'spring', ...Animation.springs.snappy }}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: COLLAPSED,
              borderRadius: `${Radius.full}px`,
              border: `1px solid ${Colors.border}`,
              background: Colors.surfaceRaised,
              boxShadow: '0 2px 12px rgba(13,43,62,0.10)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            {/* Left search icon */}
            <span style={{ position: 'absolute', left: 10, color: Colors.textMuted, display: 'flex', pointerEvents: 'none' }}>
              <SearchIcon />
            </span>

            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => handleChange(e.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%',
                height: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                paddingLeft: 32,
                paddingRight: COLLAPSED + 4,
                fontSize: `${Typography.size.sm}px`,
                color: Colors.textPrimary,
                fontFamily: Typography.family,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
