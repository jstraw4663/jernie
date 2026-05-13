// Returns a human-readable string describing how old a cached value is.
// Pure function — no side effects, identical in React Native.
export function formatCacheAge(cachedAt: number): string {
  const ageMs = Date.now() - cachedAt;
  const ageSec = Math.floor(ageMs / 1000);
  if (ageSec < 60) return 'just now';
  const ageMin = Math.floor(ageSec / 60);
  if (ageMin < 60) return `${ageMin}m ago`;
  const ageHr = Math.floor(ageMin / 60);
  if (ageHr < 24) return `${ageHr}h ago`;
  const ageDays = Math.floor(ageHr / 24);
  return `${ageDays} day${ageDays === 1 ? '' : 's'} ago`;
}
