// AppShell — top-level layout wrapper.
//
// Responsibilities:
//   1. PIN / biometric gate (PinGate) — session-persisted unlock state.
//   2. Body background sync — navy on lock screen, cream on main app, so
//      Safari's bottom chrome area matches the active screen.
//   3. Layout contract — flex column, screen area + BottomBar, ensures the
//      nav bar is NEVER behind scrollable content:
//
//      position:fixed; inset:0; flex-direction:column
//      ├─ screen area  (flex:1 · position:relative · overflow:hidden)
//      │    └─ motion.div (position:absolute; inset:0) — animated tab container
//      │         └─ <ActiveScreen />  — fills its container; scrolls internally
//      └─ <BottomBar />  (flexShrink:0 · never in AnimatePresence)
//
//   4. Tab routing — active tab state + Framer Motion slide transitions.
//
// ADDING A NEW TAB:
//   1. Add an entry to TABS (id, label, icon component, screen component).
//   2. TabId union in BottomBar.tsx already covers the 5 tab ids — extend
//      it there if you add a 6th.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavigationContext } from '../contexts/NavigationContext';
import { navigation } from '../navigation';
import type { ExploreDeepLink, JernieDeepLink } from '../navigation';
import MaineGuide from '../Jernie-PWA';
import { ExploreScreen } from '../features/explore/ExploreScreen';
import { OverviewScreen } from '../features/overview/OverviewScreen';
import { PinGate } from './PinGate';
import { BottomBar } from './BottomBar';
import type { TabId, BottomBarTab } from './BottomBar';
import {
  IconClipboard,
  IconHeart,
  IconJ,
  IconSearch,
  IconPerson,
} from './NavIcons';
import { Colors, Animation, Typography, Spacing } from '../design/tokens';

// ---------------------------------------------------------------------------
// Tab configuration — add screens here as they're built out.
// ---------------------------------------------------------------------------

interface TabConfig extends BottomBarTab {
  screen: React.ComponentType;
}

const TAB_INDEX: Record<TabId, number> = {
  overview: 0,
  saved:    1,
  jernie:   2,
  explore:  3,
  profile:  4,
};

// Placeholder for tabs not yet implemented
function PlaceholderScreen({ label, Icon }: { label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
      background: Colors.background,
      color: Colors.textSecondary,
    }}>
      <Icon size={48} strokeWidth={1.5} />
      <span style={{
        fontFamily: Typography.family.sans,
        fontSize: Typography.size.base,
        color: Colors.textSecondary,
      }}>
        {label}
      </span>
    </div>
  );
}

const TABS: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: IconClipboard,
    screen: OverviewScreen,
  },
  {
    id: 'saved',
    label: 'Saved',
    icon: IconHeart,
    screen: () => <PlaceholderScreen label="Saved" Icon={IconHeart} />,
  },
  {
    id: 'jernie',
    label: 'Jernie',
    icon: IconJ,
    screen: MaineGuide,
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: IconSearch,
    screen: ExploreScreen,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: IconPerson,
    screen: () => <PlaceholderScreen label="Profile" Icon={IconPerson} />,
  },
];

// Stable tab list for BottomBar (strip the screen prop)
const BOTTOM_TABS: BottomBarTab[] = TABS.map(({ id, label, icon }) => ({ id, label, icon }));

// ---------------------------------------------------------------------------
// Screen transition variants — mirrors StopNavigator slide pattern.
// Enter from full edge; exit to shallow opposite edge with fade.
// ---------------------------------------------------------------------------
const screenVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? '100%' : '-100%',
    opacity: 1,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir >= 0 ? '-20%' : '20%',
    opacity: 0,
    transition: {
      x: { type: 'spring' as const, ...Animation.springs.gentle },
      opacity: { duration: 0.12 },
    },
  }),
};

// ---------------------------------------------------------------------------
// Unlock persistence — localStorage + 24h TTL.
// sessionStorage is cleared when iOS kills the PWA WebView on background,
// causing the PIN gate to re-show on every app switch. localStorage survives
// page reloads; the 24h TTL ensures the gate re-shows after a full day.
// ---------------------------------------------------------------------------
const UNLOCK_KEY = 'maine2026_unlocked_v2';
const UNLOCK_TTL_MS = 24 * 60 * 60 * 1000;

function readUnlocked(): boolean {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (!raw) return false;
    const { v, ts } = JSON.parse(raw) as { v: string; ts: number };
    return v === '1' && Date.now() - ts < UNLOCK_TTL_MS;
  } catch { return false; }
}

function writeUnlocked(): void {
  try { localStorage.setItem(UNLOCK_KEY, JSON.stringify({ v: '1', ts: Date.now() })); } catch {}
}

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------
export function AppShell() {
  const [unlocked, setUnlocked] = useState(readUnlocked);
  const [activeTab, setActiveTab] = useState<TabId>('jernie');
  const [direction, setDirection] = useState(0);
  const prevIndexRef = useRef(TAB_INDEX['jernie']);
  const activeTabRef = useRef<TabId>('jernie');
  activeTabRef.current = activeTab;

  // Sync body/html background so Safari's bottom chrome matches the active surface.
  useEffect(() => {
    const bg = unlocked ? Colors.background : Colors.navy;
    document.body.style.background = bg;
    document.documentElement.style.background = bg;
  }, [unlocked]);

  const handleTabChange = useCallback((tab: TabId) => {
    if (tab === activeTabRef.current) return;
    const newIndex = TAB_INDEX[tab];
    setDirection(newIndex > prevIndexRef.current ? 1 : -1);
    prevIndexRef.current = newIndex;
    setActiveTab(tab);
  }, []);

  const navigateToExplore = useCallback((link: ExploreDeepLink) => {
    navigation.scheduleExplore(link);
    handleTabChange('explore');
  }, [handleTabChange]);

  const navigateToJernie = useCallback((link: JernieDeepLink) => {
    navigation.scheduleJernie(link);
    handleTabChange('jernie');
  }, [handleTabChange]);

  const navContextValue = useMemo(() => ({ navigateToExplore, navigateToJernie }), [navigateToExplore, navigateToJernie]);

  if (!unlocked) {
    return <PinGate onUnlock={() => { writeUnlocked(); setUnlocked(true); }} />;
  }

  const ActiveScreen = TABS.find(t => t.id === activeTab)!.screen;

  return (
    <NavigationContext.Provider value={navContextValue}>
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: Colors.background,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Screen area — fills all space above the nav bar.
          overflow:hidden + position:relative creates the containing block for
          each screen's position:absolute scroll container. */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence custom={direction} mode="popLayout" initial={false}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={screenVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', ...Animation.springs.gentle }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <ActiveScreen />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* BottomBar lives outside AnimatePresence — it never animates with screens. */}
      <BottomBar
        tabs={BOTTOM_TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
    </NavigationContext.Provider>
  );
}
