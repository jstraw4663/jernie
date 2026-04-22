import { useEffect } from 'react';
import { useSheetContext } from '../contexts/SheetContext';

/** Registers a sheet with SheetContext so BottomBar disables while it's open. */
export function useSheetRegistration(isOpen: boolean): void {
  const { onOpen, onClose } = useSheetContext();
  useEffect(() => {
    if (isOpen) {
      onOpen();
      return onClose;
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
}
