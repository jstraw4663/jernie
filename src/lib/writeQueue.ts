// Persistent offline write queue — survives page reloads.
// Firebase RTDB keeps its write queue in memory only; on reload that queue is
// destroyed. This module persists writes to localStorage so they replay to
// Firebase when connectivity is restored after a reload.
//
// React Native migration: swap the localStorage calls in readRaw/persistRaw only.
// Everything else is storage-agnostic.

const LS_WRITE_QUEUE = 'jernie_write_queue';

export interface QueuedWrite { path: string; value: unknown; ts: number }
type Subscriber = (count: number) => void;

const subscribers = new Set<Subscriber>();

function readRaw(): QueuedWrite[] {
  try { return JSON.parse(localStorage.getItem(LS_WRITE_QUEUE) || '[]'); }
  catch { return []; }
}

function persistRaw(q: QueuedWrite[]) {
  try { localStorage.setItem(LS_WRITE_QUEUE, JSON.stringify(q)); }
  catch { /* storage unavailable */ }
}

function notify() {
  const count = getCount();
  subscribers.forEach(fn => fn(count));
}

export function enqueue(path: string, value: unknown): void {
  const q = readRaw().filter(w => w.path !== path);
  persistRaw([...q, { path, value, ts: Date.now() }]);
  notify();
}

export function enqueueMany(entries: Record<string, unknown>): void {
  const paths = Object.keys(entries);
  const ts = Date.now();
  const q = readRaw().filter(w => !paths.includes(w.path));
  persistRaw([...q, ...paths.map(p => ({ path: p, value: entries[p], ts }))]);
  notify();
}

export function removeWhere(predicate: (w: QueuedWrite) => boolean): void {
  persistRaw(readRaw().filter(w => !predicate(w)));
  notify();
}

export function clear(): void {
  persistRaw([]);
  notify();
}

export function getCount(): number {
  return readRaw().length;
}

// writer receives a flat path→value map for a multi-path RTDB update.
export async function flush(writer: (updates: Record<string, unknown>) => Promise<void>): Promise<void> {
  const q = readRaw();
  if (!q.length) return;
  const updates: Record<string, unknown> = {};
  q.forEach(w => { updates[w.path] = w.value; });
  await writer(updates);
  clear();
}

export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
