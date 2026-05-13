import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { useConnectivity } from '../hooks/useConnectivity';
import * as writeQueue from '../lib/writeQueue';

interface ConnectivityState {
  isOnline: boolean;
  wasOffline: boolean;
  pendingWriteCount: number;
}

const ConnectivityContext = createContext<ConnectivityState>({
  isOnline: true,
  wasOffline: false,
  pendingWriteCount: 0,
});

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const { isOnline, wasOffline } = useConnectivity();
  const [pendingWriteCount, setPendingWriteCount] = useState(() => writeQueue.getCount());
  const prevIsOnline = useRef(isOnline);

  // Subscribe to write queue count changes
  useEffect(() => {
    return writeQueue.subscribe(count => setPendingWriteCount(count));
  }, []);

  // Flush queued writes on reconnect
  useEffect(() => {
    if (isOnline && !prevIsOnline.current) {
      writeQueue.flush(updates => update(ref(db), updates)).catch(() => {
        // still failing — queue stays, will retry on next reconnect
      });
    }
    prevIsOnline.current = isOnline;
  }, [isOnline]);

  return (
    <ConnectivityContext.Provider value={{ isOnline, wasOffline, pendingWriteCount }}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivityState(): ConnectivityState {
  return useContext(ConnectivityContext);
}
