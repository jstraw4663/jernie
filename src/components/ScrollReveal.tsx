// ScrollReveal — scroll-triggered entrance for card-level content.
//
// Design language rule: every discrete card or list item below the fold must
// be wrapped in <ScrollReveal>. Once visible it animates in once and stays.
//
// When content scrolls inside a custom overflow:auto container (e.g. Overview tab),
// pass the container's ref via `root` so the IO scopes to that container instead of
// the browser viewport. Uses native IntersectionObserver — more reliable than Framer
// Motion's viewport prop for custom scroll roots.
//
// Usage:
//   <ScrollReveal index={i}>…</ScrollReveal>
//   <ScrollReveal index={i} root={scrollRef}>…</ScrollReveal>  ← custom scroll container
//
// PLATFORM NOTE:
//   motion.div → Animated.View on Expo migration
//   native IO → react-native-intersection-observer polyfill or Reanimated's useInViewport

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Animation } from '../design/tokens';

interface ScrollRevealProps {
  children: React.ReactNode;
  index?: number;
  margin?: string;
  style?: React.CSSProperties;
  // Scroll container ref — required when content scrolls inside a custom overflow:auto
  // div rather than the window. Without it, the IO uses the browser viewport as root.
  root?: React.RefObject<Element | null>;
}

export function ScrollReveal({ children, index = 0, margin = '-30px', style, root }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        // root?.current is always populated here — refs are committed before effects run.
        // null falls back to the browser viewport (correct for window-scroll contexts).
        root: (root?.current as Element | null) ?? null,
        rootMargin: margin,
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{
        type: 'spring',
        ...Animation.springs.gentle,
        delay: visible ? 0.08 + index * 0.025 : 0,
      }}
      style={style}
    >
      {children}
    </motion.div>
  );
}
