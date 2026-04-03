import { useState, useEffect } from "react";
import type { TripData } from "../types";

export function useTripData() {
  const [data, setData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch("/trip.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load trip data: " + r.status);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
