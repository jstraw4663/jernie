// brandAssets.ts — static logo/brand lookups for airlines, hotel chains, and car rental.
//
// Airlines: Google's public airline logo CDN — reliable, no auth, 70×70px PNGs.
// URL format: https://www.gstatic.com/flights/airline_logos/70px/{IATA}.png
//
// Hotels & car rental: Clearbit Logo API — free for low volume, returns square PNGs.
// URL format: https://logo.clearbit.com/{domain}
//
// Both CDNs work offline once cached by the service worker.

// ── Airline logos ─────────────────────────────────────────────

/**
 * Derive the IATA carrier code from a flight number string.
 * "WN 351" → "WN", "AA 1463" → "AA", "DL5254" → "DL"
 */
export function iataFromFlightNum(num: string): string {
  return num.trim().replace(/\s+/, ' ').split(' ')[0].replace(/[^A-Z]/g, '').slice(0, 2).toUpperCase();
}

/**
 * Return the logo URL for an airline IATA code.
 * Returns null if the code is empty (prevents broken img tags).
 */
export function airlineLogoUrl(iata: string): string | null {
  if (!iata || iata.length < 2) return null;
  return `https://www.gstatic.com/flights/airline_logos/70px/${iata}.png`;
}

// Friendly airline display names keyed by IATA code
const AIRLINE_NAMES: Record<string, string> = {
  WN: 'Southwest Airlines',
  AA: 'American Airlines',
  DL: 'Delta Air Lines',
  UA: 'United Airlines',
  B6: 'JetBlue',
  AS: 'Alaska Airlines',
  F9: 'Frontier',
  NK: 'Spirit',
  G4: 'Allegiant',
};

export function airlineDisplayName(iata: string, fallback: string): string {
  return AIRLINE_NAMES[iata] ?? fallback;
}

// ── Label-based brand fallback ────────────────────────────────
// Used when booking.url is null (e.g. rental car bookings with no website link).
// Matches known brand keywords in the booking label to a root domain.

const LABEL_BRAND_MAP: Array<{ keywords: string[]; domain: string }> = [
  { keywords: ['avis'],                                          domain: 'avis.com' },
  { keywords: ['hertz'],                                         domain: 'hertz.com' },
  { keywords: ['enterprise'],                                    domain: 'enterprise.com' },
  { keywords: ['national car', 'national rental'],               domain: 'nationalcar.com' },
  { keywords: ['budget car', 'budget rental'],                   domain: 'budget.com' },
  { keywords: ['alamo'],                                         domain: 'alamo.com' },
  { keywords: ['courtyard', 'marriott', 'westin', 'sheraton'],   domain: 'marriott.com' },
  { keywords: ['canopy by hilton', 'hilton', 'hampton inn'],     domain: 'hilton.com' },
  { keywords: ['hyatt'],                                         domain: 'hyatt.com' },
  { keywords: ['delta airlines', 'delta air'],                   domain: 'delta.com' },
  { keywords: ['american airlines'],                             domain: 'aa.com' },
  { keywords: ['southwest airlines', 'southwest'],               domain: 'southwest.com' },
];

/**
 * Derive a brand domain from a booking label when booking.url is absent.
 * Case-insensitive. Returns null if no known brand is detected.
 */
export function labelToBrandDomain(label: string): string | null {
  const lower = label.toLowerCase();
  for (const entry of LABEL_BRAND_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.domain;
  }
  return null;
}

// ── Hotel / brand logos ───────────────────────────────────────

/**
 * Extract the root domain from a URL for use with Clearbit.
 * "https://www.marriott.com/en-us/hotels/..." → "marriott.com"
 */
export function domainFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname || null;
  } catch {
    return null;
  }
}

/**
 * Return a Clearbit logo URL for a domain.
 * Size param requests the nearest available square size.
 */
export function brandLogoUrl(domain: string, size = 80): string {
  return `https://logo.clearbit.com/${domain}?size=${size}`;
}

// ── Brand color overrides ─────────────────────────────────────
// When we know the brand color, use it for the hero gradient instead of navy.
// Keyed by root domain.

const BRAND_COLORS: Record<string, string> = {
  'southwest.com':    '#E31837',  // Southwest red
  'aa.com':           '#0078D2',  // American blue
  'delta.com':        '#003366',  // Delta dark blue
  'marriott.com':     '#AF1B3F',  // Marriott burgundy
  'hilton.com':       '#002B5C',  // Hilton navy
  'avis.com':         '#CC2200',  // Avis red
  'barharborinn.com': '#1B3A5C',  // Bar Harbor Inn blue
  'opalcollection.com': '#2D4A3E', // Opal/West Street green
  'theclaremonthotel.com': '#5B3A1A', // Claremont warm brown
};

export function brandColor(domain: string | null): string | null {
  if (!domain) return null;
  return BRAND_COLORS[domain] ?? null;
}
