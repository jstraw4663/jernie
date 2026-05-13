import { useEffect, useState } from 'react';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { authReady, firestore } from '../lib/firebase';
import { shouldReadFirestore, markRead } from '../lib/refreshScheduler';
import type { Stop } from '../types';
import type { WeatherDaily } from '../domain/trip';

const WEATHER_TTL_MS = 3 * 3_600_000; // 3 hours
const WEATHER_SESSION_KEY = 'weather_enrichment';

type WeatherFirestoreDoc = WeatherDaily & { cached_at: number };

export function useWeatherEnrichment(
  tripId: string,
  stops: Stop[],
): { weather: Record<string, WeatherDaily>; cachedAtMap: Record<string, number> } {
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherDaily>>({});
  const [cachedAtMap, setCachedAtMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!tripId || stops.length === 0) return;

    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      await authReady;

      const sessionKey = `${WEATHER_SESSION_KEY}:${tripId}`;
      const freshCachedAtMap: Record<string, number> = {};

      if (shouldReadFirestore(sessionKey)) {
        const colRef = collection(firestore, 'weather_enrichment', tripId, 'stops');
        let snapshot;
        try {
          snapshot = await getDocs(colRef);
        } catch (err) {
          console.warn('[useWeatherEnrichment] Firestore read failed:', err);
          return;
        }
        if (cancelled) return;

        const firestoreMap: Record<string, WeatherDaily> = {};
        snapshot.forEach(docSnap => {
          const { cached_at, ...weather } = docSnap.data() as WeatherFirestoreDoc;
          firestoreMap[docSnap.id] = weather as WeatherDaily;
          freshCachedAtMap[docSnap.id] = cached_at;
        });

        markRead(sessionKey);

        if (Object.keys(firestoreMap).length > 0) {
          setWeatherMap(firestoreMap);
          setCachedAtMap(freshCachedAtMap);
        }
      }

      if (!navigator.onLine) return;

      // Merge freshCachedAtMap (just read) with React state (previous read) for TTL check.
      // freshCachedAtMap wins when Firestore was read this call; state wins when skipped.
      const effectiveCachedAtMap = { ...cachedAtMap, ...freshCachedAtMap };

      const now = Date.now();
      const needsRefresh = stops.filter(s => {
        const daysUntilTrip = Math.ceil((new Date(s.weather_start).getTime() - now) / 86_400_000);
        if (daysUntilTrip > 16) return false;
        const cachedAt = effectiveCachedAtMap[s.id];
        return !cachedAt || (now - cachedAt) > WEATHER_TTL_MS;
      });

      if (needsRefresh.length === 0) return;

      const results = await Promise.allSettled(
        needsRefresh.map(s => fetchWeatherForStop(s, controller.signal))
      );
      if (cancelled) return;

      const fetchedAt = Date.now();
      const updates: Record<string, WeatherDaily> = {};
      const freshTimestamps: Record<string, number> = {};
      const writes: Promise<void>[] = [];
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled' || !r.value) return;
        const stop = needsRefresh[i];
        updates[stop.id] = r.value;
        freshTimestamps[stop.id] = fetchedAt;
        const docRef = doc(firestore, 'weather_enrichment', tripId, 'stops', stop.id);
        writes.push(setDoc(docRef, { ...r.value, cached_at: fetchedAt }, { merge: true }));
      });

      Promise.all(writes).catch(err =>
        console.warn('[useWeatherEnrichment] Firestore write failed:', err)
      );

      if (Object.keys(updates).length > 0) {
        setWeatherMap(prev => ({ ...prev, ...updates }));
        setCachedAtMap(prev => ({ ...prev, ...freshTimestamps }));
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, stops.map(s => s.id).join(',')]);

  return { weather: weatherMap, cachedAtMap };
}

async function fetchWeatherForStop(s: Stop, signal: AbortSignal): Promise<WeatherDaily | null> {
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=' + s.lat +
      '&longitude=' + s.lon +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode' +
      '&temperature_unit=fahrenheit&timezone=America%2FNew_York' +
      '&start_date=' + s.weather_start + '&end_date=' + s.weather_end;
    const r = await fetch(url, { signal });
    const d = await r.json() as { error?: boolean; daily?: WeatherDaily };
    if (d.error || !d.daily?.time?.length) return null;
    return d.daily;
  } catch {
    return null;
  }
}
