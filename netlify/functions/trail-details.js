// trail-details — Trail enrichment data proxy.
//
// POST { tripId, places: Array<{ id, name, url }> }
// Returns Record<placeId, TrailEnrichment> — one entry per input place.
// Individual failures return null and don't abort the batch.
//
// Phase 1: statically curated data for the 6 Maine trails keyed by AllTrails slug.
// Phase 2: swap lookupTrailData() for an OSM Overpass API call or AllTrails API
//          if/when official access becomes available.
//
// Caching is handled client-side in Firestore (30-day TTL).

// Derive AllTrails slug from a full AllTrails URL.
// "https://www.alltrails.com/trail/us/maine/the-beehive-loop-trail" → "us/maine/the-beehive-loop-trail"
function slugFromUrl(url) {
  if (!url) return null;
  const m = url.match(/alltrails\.com\/trail\/(.+)/);
  return m ? m[1].replace(/\?.*$/, '') : null;
}

// Static trail data for Maine POC — Phase 1.
// Keyed by AllTrails slug. Each entry matches the TrailEnrichment interface.
const TRAIL_DATA = {
  'us/maine/the-beehive-loop-trail': {
    elevation_gain: '520 ft',
    route_type: 'loop',
    dogs_allowed: false,
    features: ['ocean views', 'iron rungs', 'exposed ledges', 'scrambling'],
  },
  'us/maine/cadillac-north-ridge-trail': {
    elevation_gain: '1,194 ft',
    route_type: 'out-and-back',
    dogs_allowed: true,
    features: ['summit', 'panoramic views', 'sunrise', 'alpine'],
  },
  'us/maine/jordan-pond-path': {
    elevation_gain: '165 ft',
    route_type: 'loop',
    dogs_allowed: true,
    features: ['lake', 'mountain views', 'wildlife', 'carriage roads'],
  },
  'us/maine/ship-harbor-trail': {
    elevation_gain: '50 ft',
    route_type: 'loop',
    dogs_allowed: true,
    features: ['coastal', 'tidal pools', 'spruce forest', 'rocky shore'],
  },
  'us/maine/acadia-mountain-trail': {
    elevation_gain: '490 ft',
    route_type: 'out-and-back',
    dogs_allowed: true,
    features: ['summit', 'fjord views', 'Somes Sound', 'forest'],
  },
  'us/maine/beech-mountain-loop-trail': {
    elevation_gain: '620 ft',
    route_type: 'loop',
    dogs_allowed: true,
    features: ['fire tower', '360° views', 'Echo Lake', 'forest'],
  },
};

function lookupTrailData(place) {
  const slug = slugFromUrl(place.url);
  if (!slug) return null;
  const data = TRAIL_DATA[slug];
  if (!data) return null;
  return {
    trail_id: slug,
    elevation_gain: data.elevation_gain,
    route_type: data.route_type,
    dogs_allowed: data.dogs_allowed,
    features: data.features,
    cached_at: Date.now(),
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const origin = event.headers.origin || '';
  const allowed = new Set(['http://100.123.229.87:8888', 'http://localhost:8888', process.env.URL].filter(Boolean));
  if (origin && !allowed.has(origin)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const places = body.places;
  if (!Array.isArray(places) || places.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'places array required' }) };
  }

  const enrichmentMap = {};
  for (const place of places) {
    try {
      enrichmentMap[place.id] = lookupTrailData(place);
    } catch (err) {
      console.error(`[trail-details] Failed for "${place.name}":`, err.message);
      enrichmentMap[place.id] = null;
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enrichmentMap),
  };
};
