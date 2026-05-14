// Session-level Firestore read guard — prevents getDocs() from firing on every
// hook remount (e.g. AnimatePresence tab switches). Separate from TTL:
//   TTL guards external API calls (Open-Meteo, Google Places, etc.)
//   This guards Firestore reads — cheap today, noise at scale.
//
// Resets on page reload (intentional — verify from Firestore once per session).
// React Native migration: this module is pure in-memory, no changes needed.

const SESSION_READ_DEBOUNCE_MS = 90 * 60 * 1000; // 90 minutes — reduces Firestore read costs ~3× at scale

const sessionLog = new Map<string, number>(); // cacheKey → last read timestamp

export function shouldReadFirestore(cacheKey: string): boolean {
  const last = sessionLog.get(cacheKey);
  if (last === undefined) return true;
  return Date.now() - last > SESSION_READ_DEBOUNCE_MS;
}

export function markRead(cacheKey: string): void {
  sessionLog.set(cacheKey, Date.now());
}

// Force the next call to shouldReadFirestore(key) to return true — used when
// data may have changed (e.g. after a place override is saved).
export function invalidate(cacheKey: string): void {
  sessionLog.delete(cacheKey);
}
