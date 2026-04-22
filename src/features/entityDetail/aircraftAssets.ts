// aircraftAssets.ts — Aircraft metadata for flight detail views.
//
// Images served from /public/assets/aircraft/{slug}.webp — in-app storage, no CDN.
// unknown-aircraft.webp is the fallback for unrecognized or unset aircraft types.
// ICAO_TO_SLUG maps 4-char ICAO type codes to slugs for auto-matching FlightAware data.
// Military / GA aircraft are in AIRCRAFT_IMAGES for completeness but excluded from
// AIRCRAFT_OPTIONS (the PillSelect list shown to users).

export const AIRCRAFT_IMAGES: Record<string, string> = {
  'airbus-a318-100':         '/assets/aircraft/airbus-a318-100.webp',
  'airbus-a319-100':         '/assets/aircraft/airbus-a319-100.webp',
  'airbus-a320-200':         '/assets/aircraft/airbus-a320-200.webp',
  'airbus-a321-200':         '/assets/aircraft/airbus-a321-200.webp',
  'airbus-a220-300':         '/assets/aircraft/airbus-a220-300.webp',
  'airbus-a330-200f':        '/assets/aircraft/airbus-a330-200f.webp',
  'airbus-a330-300':         '/assets/aircraft/airbus-a330-300.webp',
  'airbus-a330-900neo':      '/assets/aircraft/airbus-a330-900neo.webp',
  'airbus-a340-600':         '/assets/aircraft/airbus-a340-600.webp',
  'airbus-a350-900':         '/assets/aircraft/airbus-a350-900.webp',
  'airbus-a380-800':         '/assets/aircraft/airbus-a380-800.webp',
  'boeing-717-200':          '/assets/aircraft/boeing-717-200.webp',
  'boeing-737-700':          '/assets/aircraft/boeing-737-700.webp',
  'boeing-737-800':          '/assets/aircraft/boeing-737-800.webp',
  'boeing-737-900':          '/assets/aircraft/boeing-737-900.webp',
  'boeing-737-8-max':        '/assets/aircraft/boeing-737-8-max.webp',
  'boeing-747-200':          '/assets/aircraft/boeing-747-200.webp',
  'boeing-747-400':          '/assets/aircraft/boeing-747-400.webp',
  'boeing-747-8':            '/assets/aircraft/boeing-747-8.webp',
  'boeing-757-200':          '/assets/aircraft/boeing-757-200.webp',
  'boeing-767-300':          '/assets/aircraft/boeing-767-300.webp',
  'boeing-777-200er':        '/assets/aircraft/boeing-777-200er.webp',
  'boeing-777-200lr':        '/assets/aircraft/boeing-777-200lr.webp',
  'boeing-777-300er':        '/assets/aircraft/boeing-777-300er.webp',
  'boeing-777f':             '/assets/aircraft/boeing-777f.webp',
  'boeing-787-8':            '/assets/aircraft/boeing-787-8.webp',
  'boeing-787-9':            '/assets/aircraft/boeing-787-9.webp',
  'boeing-787-10':           '/assets/aircraft/boeing-787-10.webp',
  'bombardier-challenger-350': '/assets/aircraft/bombardier-challenger-350.webp',
  'bombardier-crj-200':      '/assets/aircraft/bombardier-crj-200.webp',
  'bombardier-crj-700':      '/assets/aircraft/bombardier-crj-700.webp',
  'bombardier-crj-900':      '/assets/aircraft/bombardier-crj-900.webp',
  'bombardier-crj-1000':     '/assets/aircraft/bombardier-crj-1000.webp',
  'dehavilland-dash-8-q400': '/assets/aircraft/dehavilland-dash-8-q400.webp',
  'embraer-e175':            '/assets/aircraft/embraer-e175.webp',
  'embraer-e190':            '/assets/aircraft/embraer-e190.webp',
  'unknown-aircraft':        '/assets/aircraft/unknown-aircraft.webp',
};

export const AIRCRAFT_LABELS: Record<string, string> = {
  'airbus-a318-100':         'Airbus A318',
  'airbus-a319-100':         'Airbus A319',
  'airbus-a320-200':         'Airbus A320',
  'airbus-a321-200':         'Airbus A321',
  'airbus-a220-300':         'Airbus A220',
  'airbus-a330-200f':        'Airbus A330-200F',
  'airbus-a330-300':         'Airbus A330-300',
  'airbus-a330-900neo':      'Airbus A330-900neo',
  'airbus-a340-600':         'Airbus A340-600',
  'airbus-a350-900':         'Airbus A350-900',
  'airbus-a380-800':         'Airbus A380',
  'boeing-717-200':          'Boeing 717',
  'boeing-737-700':          'Boeing 737-700',
  'boeing-737-800':          'Boeing 737-800',
  'boeing-737-900':          'Boeing 737-900',
  'boeing-737-8-max':        'Boeing 737 MAX 8',
  'boeing-747-200':          'Boeing 747-200',
  'boeing-747-400':          'Boeing 747-400',
  'boeing-747-8':            'Boeing 747-8',
  'boeing-757-200':          'Boeing 757-200',
  'boeing-767-300':          'Boeing 767-300',
  'boeing-777-200er':        'Boeing 777-200ER',
  'boeing-777-200lr':        'Boeing 777-200LR',
  'boeing-777-300er':        'Boeing 777-300ER',
  'boeing-777f':             'Boeing 777F',
  'boeing-787-8':            'Boeing 787-8 Dreamliner',
  'boeing-787-9':            'Boeing 787-9 Dreamliner',
  'boeing-787-10':           'Boeing 787-10 Dreamliner',
  'bombardier-challenger-350': 'Bombardier Challenger 350',
  'bombardier-crj-200':      'Bombardier CRJ-200',
  'bombardier-crj-700':      'Bombardier CRJ-700',
  'bombardier-crj-900':      'Bombardier CRJ-900',
  'bombardier-crj-1000':     'Bombardier CRJ-1000',
  'dehavilland-dash-8-q400': 'De Havilland Dash 8 Q400',
  'embraer-e175':            'Embraer E175',
  'embraer-e190':            'Embraer E190',
};

// Commercial airline slugs shown in PillSelect — alphabetical by manufacturer, then numerical by variant.
export const AIRCRAFT_OPTIONS: string[] = [
  'airbus-a220-300',
  'airbus-a318-100',
  'airbus-a319-100',
  'airbus-a320-200',
  'airbus-a321-200',
  'airbus-a330-300',
  'airbus-a330-900neo',
  'airbus-a340-600',
  'airbus-a350-900',
  'airbus-a380-800',
  'boeing-717-200',
  'boeing-737-700',
  'boeing-737-800',
  'boeing-737-900',
  'boeing-737-8-max',
  'boeing-747-400',
  'boeing-747-8',
  'boeing-757-200',
  'boeing-767-300',
  'boeing-777-200er',
  'boeing-777-300er',
  'boeing-787-8',
  'boeing-787-9',
  'boeing-787-10',
  'bombardier-crj-200',
  'bombardier-crj-700',
  'bombardier-crj-900',
  'bombardier-crj-1000',
  'dehavilland-dash-8-q400',
  'embraer-e175',
  'embraer-e190',
];

// ICAO type code → slug. Covers all common US airline codes.
export const ICAO_TO_SLUG: Record<string, string> = {
  // Boeing 737 family
  B737: 'boeing-737-700',
  B738: 'boeing-737-800',
  B739: 'boeing-737-900',
  B73M: 'boeing-737-8-max',
  B38M: 'boeing-737-8-max',
  B39M: 'boeing-737-8-max', // 737 MAX 9
  // Boeing 757/767/777/787
  B752: 'boeing-757-200',
  B762: 'boeing-767-300',
  B763: 'boeing-767-300',
  B772: 'boeing-777-200er',
  B77L: 'boeing-777-200lr',
  B77W: 'boeing-777-300er',
  B788: 'boeing-787-8',
  B789: 'boeing-787-9',
  B78X: 'boeing-787-10',
  B744: 'boeing-747-400',
  B748: 'boeing-747-8',
  B717: 'boeing-717-200',
  // Airbus A3xx family
  A318: 'airbus-a318-100',
  A319: 'airbus-a319-100',
  A320: 'airbus-a320-200',
  A321: 'airbus-a321-200',
  A20N: 'airbus-a320-200', // A320neo
  A21N: 'airbus-a321-200', // A321neo
  A221: 'airbus-a220-300', // A220-100 (close enough)
  A223: 'airbus-a220-300',
  A332: 'airbus-a330-300',
  A333: 'airbus-a330-300',
  A339: 'airbus-a330-900neo',
  A35K: 'airbus-a350-900',
  A359: 'airbus-a350-900',
  A388: 'airbus-a380-800',
  A346: 'airbus-a340-600',
  // Bombardier CRJ family
  CRJ2: 'bombardier-crj-200',
  CRJ7: 'bombardier-crj-700',
  CRJ9: 'bombardier-crj-900',
  CRJX: 'bombardier-crj-1000',
  // Embraer
  E75L: 'embraer-e175',
  E75S: 'embraer-e175',
  E170: 'embraer-e175', // close enough
  E190: 'embraer-e190',
  E195: 'embraer-e190',
  // De Havilland / Bombardier Dash 8
  DH8D: 'dehavilland-dash-8-q400',
  DH8C: 'dehavilland-dash-8-q400',
};

/**
 * Normalize a raw aircraft type string (from FlightAware or user input) to a known slug.
 * Strategy: exact slug → ICAO code lookup → keyword fuzzy match.
 * Returns null when no match found (caller should show unknown-aircraft or empty state).
 */
export function matchAircraftSlug(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim();
  if (!normalized) return null;

  // 1. Exact slug match
  if (AIRCRAFT_IMAGES[normalized]) return normalized;

  // 2. ICAO type code — typically 4 uppercase chars e.g. "B738", "A320"
  const upper = normalized.toUpperCase();
  if (ICAO_TO_SLUG[upper]) return ICAO_TO_SLUG[upper];

  // 3. Fuzzy keyword match against known slugs
  const lower = normalized.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  // Boeing matches
  if (lower.includes('boeing') || lower.includes('737') || lower.includes('747') ||
      lower.includes('757') || lower.includes('767') || lower.includes('777') ||
      lower.includes('787') || lower.includes('717')) {
    if (lower.includes('737')) {
      if (lower.includes('max') || lower.includes('8200') || lower.includes(' 8 ') || lower.endsWith(' 8')) return 'boeing-737-8-max';
      if (lower.includes('900')) return 'boeing-737-900';
      if (lower.includes('800')) return 'boeing-737-800';
      if (lower.includes('700')) return 'boeing-737-700';
      return 'boeing-737-800'; // most common 737 variant
    }
    if (lower.includes('747')) {
      if (lower.includes(' 8') || lower.includes('-8')) return 'boeing-747-8';
      return 'boeing-747-400';
    }
    if (lower.includes('757')) return 'boeing-757-200';
    if (lower.includes('767')) return 'boeing-767-300';
    if (lower.includes('777')) {
      if (lower.includes('300') || lower.includes('77w')) return 'boeing-777-300er';
      if (lower.includes('lr')) return 'boeing-777-200lr';
      return 'boeing-777-200er';
    }
    if (lower.includes('787')) {
      if (lower.includes('10')) return 'boeing-787-10';
      if (lower.includes(' 9') || lower.endsWith('-9')) return 'boeing-787-9';
      return 'boeing-787-8';
    }
    if (lower.includes('717')) return 'boeing-717-200';
  }

  // Airbus matches
  if (lower.includes('airbus') || /\ba3[0-9][0-9]\b/.test(lower) || /a2[012][0-9]/.test(lower)) {
    if (lower.includes('380')) return 'airbus-a380-800';
    if (lower.includes('350')) return 'airbus-a350-900';
    if (lower.includes('340')) return 'airbus-a340-600';
    if (lower.includes('330')) {
      if (lower.includes('900') || lower.includes('neo')) return 'airbus-a330-900neo';
      return 'airbus-a330-300';
    }
    if (lower.includes('321')) return 'airbus-a321-200';
    if (lower.includes('320')) return 'airbus-a320-200';
    if (lower.includes('319')) return 'airbus-a319-100';
    if (lower.includes('318')) return 'airbus-a318-100';
    if (lower.includes('220') || lower.includes('a22')) return 'airbus-a220-300';
    return 'airbus-a320-200'; // most common Airbus
  }

  // Embraer
  if (lower.includes('embraer') || lower.includes('e175') || lower.includes('e190') ||
      lower.includes('erj') || lower.includes(' 175') || lower.includes(' 190')) {
    if (lower.includes('175') || lower.includes('e75')) return 'embraer-e175';
    if (lower.includes('190') || lower.includes('195')) return 'embraer-e190';
    return 'embraer-e175';
  }

  // Bombardier CRJ
  if (lower.includes('bombardier') || lower.includes('crj') || lower.includes('canadair')) {
    if (lower.includes('1000')) return 'bombardier-crj-1000';
    if (lower.includes('900')) return 'bombardier-crj-900';
    if (lower.includes('700')) return 'bombardier-crj-700';
    if (lower.includes('200') || lower.includes('100')) return 'bombardier-crj-200';
    return 'bombardier-crj-900'; // most common CRJ in US
  }

  // De Havilland / Dash 8
  if (lower.includes('dash') || lower.includes('dehavilland') || lower.includes('de havilland') ||
      lower.includes('q400') || lower.includes('dhc')) {
    return 'dehavilland-dash-8-q400';
  }

  return null;
}

export function getAircraftImageUrl(slug: string | null): string | null {
  if (!slug) return null;
  return AIRCRAFT_IMAGES[slug] ?? AIRCRAFT_IMAGES['unknown-aircraft'] ?? null;
}
