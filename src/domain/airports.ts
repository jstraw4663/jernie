// airports.ts — Static IATA airport lookup table.
//
// Covers:
//   - All airports found in trip.json (BGR, BWI, CLT, LGA, PWM)
//   - The 30 busiest US airports by annual passenger volume
//
// lat/lon: approximate airfield coordinates for Haversine distance calculations.

export interface AirportRecord {
  name: string;
  city: string;
  url: string;
  lat: number;
  lon: number;
}

export const IATA_AIRPORTS: Record<string, AirportRecord> = {
  // ── trip.json airports ────────────────────────────────────────────────────
  BGR: { name: 'Bangor International Airport',                    city: 'Bangor, ME',       url: 'https://www.flybangor.com',                        lat: 44.8074,  lon: -68.8281 },
  BWI: { name: 'Baltimore/Washington International Thurgood Marshall Airport', city: 'Baltimore, MD', url: 'https://www.bwiairport.com',              lat: 39.1754,  lon: -76.6682 },
  CLT: { name: 'Charlotte Douglas International Airport',         city: 'Charlotte, NC',    url: 'https://www.cltairport.com',                       lat: 35.2140,  lon: -80.9431 },
  LGA: { name: 'LaGuardia Airport',                               city: 'New York, NY',     url: 'https://www.laguardiaairport.com',                  lat: 40.7769,  lon: -73.8740 },
  PWM: { name: 'Portland International Jetport',                  city: 'Portland, ME',     url: 'https://www.portlandjetport.org',                  lat: 43.6462,  lon: -70.3093 },

  // ── 30 busiest US airports ────────────────────────────────────────────────
  ATL: { name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta, GA',     url: 'https://www.atl.com',                             lat: 33.6407,  lon: -84.4277 },
  LAX: { name: 'Los Angeles International Airport',               city: 'Los Angeles, CA',  url: 'https://www.flylax.com',                           lat: 33.9425,  lon: -118.4081 },
  ORD: { name: "O'Hare International Airport",                    city: 'Chicago, IL',      url: 'https://www.flychicago.com/ohare',                 lat: 41.9742,  lon: -87.9073 },
  DFW: { name: 'Dallas/Fort Worth International Airport',         city: 'Dallas, TX',       url: 'https://www.dfwairport.com',                       lat: 32.8998,  lon: -97.0403 },
  DEN: { name: 'Denver International Airport',                    city: 'Denver, CO',       url: 'https://www.flydenver.com',                        lat: 39.8561,  lon: -104.6737 },
  JFK: { name: 'John F. Kennedy International Airport',           city: 'New York, NY',     url: 'https://www.jfkairport.com',                       lat: 40.6413,  lon: -73.7781 },
  SFO: { name: 'San Francisco International Airport',             city: 'San Francisco, CA',url: 'https://www.flysfo.com',                           lat: 37.6213,  lon: -122.3790 },
  SEA: { name: 'Seattle-Tacoma International Airport',            city: 'Seattle, WA',      url: 'https://www.portseattle.org/sea-tac',              lat: 47.4502,  lon: -122.3088 },
  LAS: { name: 'Harry Reid International Airport',                city: 'Las Vegas, NV',    url: 'https://www.harryreidairport.com',                 lat: 36.0840,  lon: -115.1537 },
  MCO: { name: 'Orlando International Airport',                   city: 'Orlando, FL',      url: 'https://www.orlandoairports.net',                  lat: 28.4312,  lon: -81.3081 },
  MIA: { name: 'Miami International Airport',                     city: 'Miami, FL',        url: 'https://www.miami-airport.com',                    lat: 25.7959,  lon: -80.2870 },
  IAH: { name: 'George Bush Intercontinental Airport',            city: 'Houston, TX',      url: 'https://www.fly2houston.com/iah',                  lat: 29.9902,  lon: -95.3368 },
  BOS: { name: 'Boston Logan International Airport',              city: 'Boston, MA',       url: 'https://www.massport.com/logan-airport',           lat: 42.3656,  lon: -71.0096 },
  MSP: { name: 'Minneapolis-Saint Paul International Airport',    city: 'Minneapolis, MN',  url: 'https://www.mspairport.com',                       lat: 44.8848,  lon: -93.2223 },
  DTW: { name: 'Detroit Metropolitan Wayne County Airport',       city: 'Detroit, MI',      url: 'https://www.metroairport.com',                     lat: 42.2162,  lon: -83.3554 },
  PHL: { name: 'Philadelphia International Airport',              city: 'Philadelphia, PA', url: 'https://www.phl.org',                              lat: 39.8721,  lon: -75.2411 },
  EWR: { name: 'Newark Liberty International Airport',            city: 'Newark, NJ',       url: 'https://www.newarkairport.com',                    lat: 40.6895,  lon: -74.1745 },
  SLC: { name: 'Salt Lake City International Airport',            city: 'Salt Lake City, UT',url: 'https://www.slcairport.com',                      lat: 40.7899,  lon: -111.9791 },
  DCA: { name: 'Ronald Reagan Washington National Airport',       city: 'Washington, DC',   url: 'https://www.flyreagan.com',                        lat: 38.8512,  lon: -77.0402 },
  IAD: { name: 'Washington Dulles International Airport',         city: 'Dulles, VA',       url: 'https://www.flydulles.com',                        lat: 38.9531,  lon: -77.4565 },
  FLL: { name: 'Fort Lauderdale-Hollywood International Airport', city: 'Fort Lauderdale, FL',url: 'https://www.broward.org/airport',                lat: 26.0726,  lon: -80.1527 },
  PHX: { name: 'Phoenix Sky Harbor International Airport',        city: 'Phoenix, AZ',      url: 'https://www.skyharbor.com',                        lat: 33.4373,  lon: -112.0078 },
  MDW: { name: 'Chicago Midway International Airport',            city: 'Chicago, IL',      url: 'https://www.flychicago.com/midway',                lat: 41.7868,  lon: -87.7522 },
  TPA: { name: 'Tampa International Airport',                     city: 'Tampa, FL',        url: 'https://www.tampaairport.com',                     lat: 27.9755,  lon: -82.5332 },
  SAN: { name: 'San Diego International Airport',                 city: 'San Diego, CA',    url: 'https://www.san.org',                              lat: 32.7338,  lon: -117.1933 },
  BWI2: { name: 'placeholder — do not use',                       city: '',                 url: '',                                                 lat: 0,        lon: 0 }, // slot reserved
  BNA: { name: 'Nashville International Airport',                 city: 'Nashville, TN',    url: 'https://www.flynashville.com',                     lat: 36.1245,  lon: -86.6782 },
  AUS: { name: 'Austin-Bergstrom International Airport',          city: 'Austin, TX',       url: 'https://www.austintexas.gov/airport',              lat: 30.1975,  lon: -97.6664 },
  HNL: { name: 'Daniel K. Inouye International Airport',          city: 'Honolulu, HI',     url: 'https://www.airports.hawaii.gov/hnl',              lat: 21.3245,  lon: -157.9251 },
  PDX: { name: 'Portland International Airport',                  city: 'Portland, OR',     url: 'https://www.pdx.com',                              lat: 45.5898,  lon: -122.5951 },
  MCI: { name: 'Kansas City International Airport',               city: 'Kansas City, MO',  url: 'https://www.flykci.com',                           lat: 39.2976,  lon: -94.7139 },
  OAK: { name: 'Oakland International Airport',                   city: 'Oakland, CA',      url: 'https://www.oaklandairport.com',                   lat: 37.7213,  lon: -122.2208 },
  SMF: { name: 'Sacramento International Airport',                city: 'Sacramento, CA',   url: 'https://www.sacramento.aero/smf',                  lat: 38.6954,  lon: -121.5908 },
  STL: { name: 'St. Louis Lambert International Airport',         city: 'St. Louis, MO',    url: 'https://www.flystl.com',                           lat: 38.7487,  lon: -90.3700 },
};

// Remove the placeholder entry we used to fill the slot
delete (IATA_AIRPORTS as Record<string, AirportRecord | undefined>)['BWI2'];

/**
 * Returns the full airport name for a given IATA code.
 * Falls back to the code itself if not found.
 */
export function getAirportName(iata: string): string {
  return IATA_AIRPORTS[iata.toUpperCase()]?.name ?? iata.toUpperCase();
}

/**
 * Returns the airport's official website URL, or null if not found.
 */
export function getAirportUrl(iata: string): string | null {
  const record = IATA_AIRPORTS[iata.toUpperCase()];
  return record?.url || null;
}

/**
 * Parses a route string into origin/dest IATA codes.
 * Handles "BOS → BHB", "BOS->BHB", "BOS-BHB", "BOS BHB".
 * Returns null if the string cannot be parsed into two 2–4 char codes.
 */
export function parseIataFromRoute(route: string): { origin: string; dest: string } | null {
  // Normalise separators
  const normalised = route.replace(/→|->|–/g, '-').trim();
  // Try splitting on common separators
  const parts = normalised.split(/[-\s]+/).map(p => p.trim().toUpperCase()).filter(p => /^[A-Z]{2,4}$/.test(p));
  if (parts.length < 2) return null;
  return { origin: parts[0], dest: parts[parts.length - 1] };
}
