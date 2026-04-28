interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

export function readCache<T>(key: string): CacheEntry<T> | null {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) as CacheEntry<T> : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string, data: unknown): void {
  try { localStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() })); }
  catch {}
}
