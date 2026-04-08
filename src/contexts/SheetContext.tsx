// SheetContext — tracks how many sheets/modals are currently open.
//
// StopNavigator reads openCount and disables its drag="x" gesture when > 0,
// so horizontal swipes on any sheet never trigger a stop navigation.
//
// Usage:
//   - Wrap the app with <SheetProvider>
//   - Any sheet/modal calls useSheetContext() and calls onOpen/onClose
//   - StopNavigator reads openCount and sets drag={openCount > 0 ? false : 'x'}

import { createContext, useCallback, useContext, useState } from 'react';

interface SheetContextValue {
  openCount: number;
  onOpen: () => void;
  onClose: () => void;
}

const SheetContext = createContext<SheetContextValue>({
  openCount: 0,
  onOpen: () => {},
  onClose: () => {},
});

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const [openCount, setOpenCount] = useState(0);
  const onOpen = useCallback(() => setOpenCount(c => c + 1), []);
  const onClose = useCallback(() => setOpenCount(c => Math.max(0, c - 1)), []);
  return (
    <SheetContext.Provider value={{ openCount, onOpen, onClose }}>
      {children}
    </SheetContext.Provider>
  );
}

export function useSheetContext() {
  return useContext(SheetContext);
}
