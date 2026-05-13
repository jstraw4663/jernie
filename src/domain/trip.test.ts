import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  wmo,
  DAYS,
  appleMapsUrl,
  getActiveStop,
  filterStopPlaces,
  getActivityDisplayGroup,
  deriveFlightGroups,
  isWithinFlightWindow,
} from './trip';
import type { Booking, Place, Stop } from '../types';

// ── Fixtures ──────────────────────────────────────────────────

const makeStop = (overrides: Partial<Stop> = {}): Stop => ({
  id: 'portland',
  trip_id: 'trip-1',
  city: 'Portland',
  dates: 'May 22–24',
  emoji: '🦞',
  summary: 'A great city.',
  lat: 43.66,
  lon: -70.25,
  weather_start: '2026-05-22',
  weather_end: '2026-05-24',
  status: 'confirmed',
  ...overrides,
});

const makePlace = (overrides: Partial<Place> = {}): Place => ({
  id: 'p1',
  stop_id: 'portland',
  category: 'restaurant',
  subcategory: 'seafood',
  name: 'The Porthole',
  emoji: '🍤',
  note: null,
  url: null,
  must: false,
  rating: null,
  source: 'guide',
  attribution_handle: null,
  group_ids: null,
  flag: null,
  price: '$$',
  difficulty: null,
  duration: null,
  distance: null,
  ...overrides,
});

const makeFlightBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  stop_id: 'portland',
  trip_id: 'trip-1',
  display_order: 1,
  group_ids: null,
  type: 'flight',
  icon: '✈️',
  label: 'Outbound Flights',
  url: null,
  addr: null,
  note: null,
  confirmation: null,
  lines: null,
  confirmation_link: null,
  flights: [
    {
      key: 'UA100',
      num: 'UA 100',
      airline: 'United',
      route: 'BOS → PWM',
      dep: '8:20 AM',
      arr: '9:30 AM',
      date: 'May 22 2026',
      trackingUrl: '',
    },
  ],
  ...overrides,
});

// ── wmo ───────────────────────────────────────────────────────

describe('wmo', () => {
  it('resolves a known WMO code', () => {
    expect(wmo(0)).toEqual({ e: '☀️', d: 'Clear' });
    expect(wmo(3)).toEqual({ e: '☁️', d: 'Overcast' });
    expect(wmo(95)).toEqual({ e: '⛈️', d: 'Thunderstorm' });
  });

  it('returns the fallback for an unknown code', () => {
    expect(wmo(999)).toEqual({ e: '🌡️', d: '—' });
    expect(wmo(-1)).toEqual({ e: '🌡️', d: '—' });
  });
});

// ── DAYS ──────────────────────────────────────────────────────

describe('DAYS', () => {
  it('has 7 entries starting with Sun', () => {
    expect(DAYS).toHaveLength(7);
    expect(DAYS[0]).toBe('Sun');
    expect(DAYS[6]).toBe('Sat');
  });
});

// ── appleMapsUrl ──────────────────────────────────────────────

describe('appleMapsUrl', () => {
  it('builds a valid Apple Maps URL', () => {
    const url = appleMapsUrl('123 Main St, Portland ME');
    expect(url).toMatch(/^https:\/\/maps\.apple\.com\/\?q=/);
  });

  it('encodes spaces and special characters', () => {
    const url = appleMapsUrl('Bar Harbor, ME 04609');
    expect(url).toContain('Bar%20Harbor');
    expect(url).not.toContain(' ');
  });
});

// ── getActiveStop ─────────────────────────────────────────────

describe('getActiveStop', () => {
  const stops = [makeStop({ id: 'portland' }), makeStop({ id: 'barharbor', city: 'Bar Harbor' })];

  it('returns the matching stop', () => {
    expect(getActiveStop(stops, 'barharbor')?.city).toBe('Bar Harbor');
  });

  it('returns undefined for an unknown id', () => {
    expect(getActiveStop(stops, 'nope')).toBeUndefined();
  });

  it('returns undefined for an empty list', () => {
    expect(getActiveStop([], 'portland')).toBeUndefined();
  });
});

// ── filterStopPlaces ──────────────────────────────────────────

describe('filterStopPlaces', () => {
  const places = [
    makePlace({ id: 'p1', stop_id: 'portland' }),
    makePlace({ id: 'p2', stop_id: 'barharbor' }),
    makePlace({ id: 'p3', stop_id: 'portland' }),
  ];

  it('returns only places for the given stop', () => {
    const result = filterStopPlaces(places, 'portland');
    expect(result).toHaveLength(2);
    expect(result.every(p => p.stop_id === 'portland')).toBe(true);
  });

  it('returns an empty array when no places match', () => {
    expect(filterStopPlaces(places, 'swharbor')).toHaveLength(0);
  });
});

// ── getActivityDisplayGroup ───────────────────────────────────

describe('getActivityDisplayGroup', () => {
  it('maps hike → Hikes', () => {
    expect(getActivityDisplayGroup(makePlace({ category: 'hike' }))).toBe('Hikes');
  });

  it('maps on-the-water subcategory → On the Water', () => {
    expect(getActivityDisplayGroup(makePlace({ category: 'attraction', subcategory: 'on-the-water' }))).toBe('On the Water');
  });

  it('maps sight → Walks & Views', () => {
    expect(getActivityDisplayGroup(makePlace({ category: 'sight' }))).toBe('Walks & Views');
  });

  it('defaults everything else → Nature & Culture', () => {
    expect(getActivityDisplayGroup(makePlace({ category: 'museum', subcategory: 'history' }))).toBe('Nature & Culture');
    expect(getActivityDisplayGroup(makePlace({ category: 'beach' }))).toBe('Nature & Culture');
  });
});

// ── deriveFlightGroups ────────────────────────────────────────

describe('deriveFlightGroups', () => {
  it('groups flights by departure date', () => {
    const groups = deriveFlightGroups([makeFlightBooking()]);
    const keys = Object.keys(groups);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe('2026-05-22');
    expect(groups['2026-05-22'].flights).toHaveLength(1);
    expect(groups['2026-05-22'].flights[0].key).toBe('UA100');
  });

  it('deduplicates flights with the same key across bookings', () => {
    const booking = makeFlightBooking();
    const groups = deriveFlightGroups([booking, booking]);
    expect(groups['2026-05-22'].flights).toHaveLength(1);
  });

  it('ignores non-flight bookings', () => {
    const hotel: Booking = { ...makeFlightBooking(), type: 'accommodation', flights: null };
    expect(Object.keys(deriveFlightGroups([hotel]))).toHaveLength(0);
  });

  it('returns an empty object for an empty booking list', () => {
    expect(deriveFlightGroups([])).toEqual({});
  });
});

// ── isWithinFlightWindow ──────────────────────────────────────

describe('isWithinFlightWindow', () => {
  const HOUR = 3_600_000;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const flights = [{ schedDep: '8:20 AM' }];

  it('returns true when now is 24 hours before departure', () => {
    // Set now to 24h before May 22 2026 8:20 AM
    const dep = new Date('May 22 2026 8:20 AM').getTime();
    vi.setSystemTime(dep - 24 * HOUR);
    expect(isWithinFlightWindow('2026-05-22', flights)).toBe(true);
  });

  it('returns true when now is 1 hour after departure', () => {
    const dep = new Date('May 22 2026 8:20 AM').getTime();
    vi.setSystemTime(dep + HOUR);
    expect(isWithinFlightWindow('2026-05-22', flights)).toBe(true);
  });

  it('returns false when now is 49 hours before departure', () => {
    const dep = new Date('May 22 2026 8:20 AM').getTime();
    vi.setSystemTime(dep - 49 * HOUR);
    expect(isWithinFlightWindow('2026-05-22', flights)).toBe(false);
  });

  it('returns false when now is 25 hours after departure', () => {
    const dep = new Date('May 22 2026 8:20 AM').getTime();
    vi.setSystemTime(dep + 25 * HOUR);
    expect(isWithinFlightWindow('2026-05-22', flights)).toBe(false);
  });

  it('returns false for an empty flights array', () => {
    expect(isWithinFlightWindow('2026-05-22', [])).toBe(false);
  });
});
