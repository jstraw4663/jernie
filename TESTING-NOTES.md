# Jernie — Testing Notes

## Philosophy

Tests target pure, side-effect-free logic only. React components and Firebase hooks
are not tested here — the right feedback loop for those is the browser, not a test runner.
The rule: if a function touches the DOM, a network, localStorage, or Firebase, it does
not belong in this suite. If it's a pure function, it should have a test.

## Pre-Deploy Requirement

`npm test` must pass before creating any PR to `main`. All 23 tests must exit with code 0.

## Running Tests

```bash
npm test             # single run — use before every PR to main
npm run test:watch   # watch mode — use during active development on domain helpers
```

**When to use which:**
- `npm test` — before committing, before PRs, CI-mode (exits after result)
- `npm run test:watch` — while actively writing or refactoring domain helpers (reruns on save)

## What's covered

### `src/domain/trip.ts` — 23 tests

All exported helpers are exercised across happy path, edge cases, and boundary conditions.

| Function | Tests | What's verified |
|---|---|---|
| `wmo` | 2 | Known codes resolve correctly; unknown codes return the `🌡️` fallback |
| `DAYS` | 1 | 7-element array, starts Sun, ends Sat |
| `appleMapsUrl` | 2 | URL prefix correct; spaces/special chars encoded, none raw |
| `getActiveStop` | 3 | Finds by id; returns `undefined` for miss; handles empty list |
| `filterStopPlaces` | 2 | Returns only matching stop's places; empty when no match |
| `getActivityDisplayGroup` | 4 | `hike`, `on-the-water`, `sight`, and fallback all map correctly |
| `deriveFlightGroups` | 4 | Groups by date; deduplicates same key; ignores non-flights; empty input |
| `isWithinFlightWindow` | 5 | 24h before ✓; 1h after ✓; 49h before ✗; 25h after ✗; empty flights ✗ |

`isWithinFlightWindow` uses `vi.useFakeTimers()` to pin `Date.now()` — no flakiness from
the real clock. This is the pattern to follow for any future time-dependent helpers.

## What's intentionally not tested

- **React components** — use the browser. Type-checking (Phase 4) catches most
  component-level mistakes at compile time; the rest are caught during manual QA.
- **Firebase hooks** (`useSharedTripState`, `useTripData`) — these require a live
  Firebase project or a complex emulator setup. Not worth it for the POC.
- **`fetchWeatherForStop` / `fetchFlightStatusGroupWithData`** — network-dependent.
  The domain helpers they call (`deriveFlightGroups`, `isWithinFlightWindow`) are
  tested; the fetch wrappers themselves are integration-tested manually.
- **Cache utilities** (`readCache`, `writeCache`) — thin localStorage wrappers.
  Integration tested implicitly via the weather/flight fetch paths in the browser.

## Adding tests

1. New pure helpers in `src/domain/` → add cases to the existing `trip.test.ts`
   or create a new `<module>.test.ts` alongside the module.
2. Keep fixtures in the `makeX()` factory pattern — partial overrides via spread
   make it easy to test one field at a time without boilerplate.
3. For time-dependent tests: always use `vi.useFakeTimers()` + `vi.setSystemTime()`
   in `beforeEach` and `vi.useRealTimers()` in `afterEach`.

## Coverage Summary

| Module | Tested | Notes |
|--------|--------|-------|
| `src/domain/trip.ts` | ✅ 23 tests | All helpers covered; time-dependent via `vi.useFakeTimers()` |
| React components | ❌ intentional | Browser QA; TypeScript catches compile-time mistakes |
| `useSharedTripState` | ❌ intentional | Requires live Firebase; not worth it for POC |
| Network fetch wrappers | ❌ intentional | Integration-tested manually in browser |
| `readCache` / `writeCache` | ❌ intentional | Thin localStorage wrappers; implicitly tested via browser paths |

## Future Test Targets (Phase 2 — prioritized)

1. **`useSharedTripState` write-queue reducer** — extract as pure reducer → unit testable without Firebase
2. **Trip data schema validation** — when `trip.json` is replaced by API responses; validate shape
3. **User-facing formatters** — any utility handling dates, times, currency, or display strings
4. **Route helpers** — once a router is introduced
