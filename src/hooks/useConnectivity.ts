import { useEffect, useState } from 'react';

// React Native migration: replace window event listeners with NetInfo.addEventListener
// from @react-native-community/netinfo. Everything else stays the same.

export function useConnectivity(): { isOnline: boolean; wasOffline: boolean } {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    let wasOfflineTimer: ReturnType<typeof setTimeout> | null = null;

    function handleOnline() {
      setIsOnline(true);
      setWasOffline(true);
      if (wasOfflineTimer) clearTimeout(wasOfflineTimer);
      wasOfflineTimer = setTimeout(() => setWasOffline(false), 3000);
    }

    function handleOffline() {
      setIsOnline(false);
      setWasOffline(false);
      if (wasOfflineTimer) clearTimeout(wasOfflineTimer);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (wasOfflineTimer) clearTimeout(wasOfflineTimer);
    };
  }, []);

  return { isOnline, wasOffline };
}
