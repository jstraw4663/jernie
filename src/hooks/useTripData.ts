import { useState, useEffect } from "react";
import type { TripData } from "../types";

// Cache trip.json in localStorage so iOS PWA reloads skip the loading spinner.
// The fetch still runs on every mount to pick up any content updates; if the
// seed exists, the UI is already rendered while the fetch completes in the background.
const LS_TRIP_KEY = "jernie_trip_data";

function readSeed(): TripData | null {
  try {
    const raw = localStorage.getItem(LS_TRIP_KEY);
    return raw ? (JSON.parse(raw) as TripData) : null;
  } catch { return null; }
}

export function useTripData() {
  const seed = readSeed();
  const [data, setData] = useState<TripData | null>(seed);
  const [loading, setLoading] = useState(!seed);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch("/trip.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load trip data: " + r.status);
        return r.json() as Promise<TripData>;
      })
      .then((fresh) => {
        try { localStorage.setItem(LS_TRIP_KEY, JSON.stringify(fresh)); } catch {}
        setData(fresh);
      })
      .catch((e) => {
        // If we have a seed, stay silent — stale data is better than an error screen.
        if (!seed) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error };
}
