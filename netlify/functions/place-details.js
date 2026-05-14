// place-details — Google Places API proxy.
//
// POST { places: Array<{ id, name?, addr?, google_place_id? }>, mode?: 'core' | 'reviews' }
// Returns Record<placeId, PlaceEnrichment> — one entry per input place.
// Individual failures return null for that entry and don't abort the batch.
//
// Two modes (billed at different tiers — never mix fields across modes):
//   core    (default) — Pro-tier fields; 14-day TTL client-side
//   reviews            — Enterprise-tier fields only; 60-day TTL client-side
//
// Caching is handled client-side in Firestore. This function always fetches fresh data.

const PLACES_BASE = 'https://places.googleapis.com/v1';

// Pro-tier fields only. No Enterprise fields — keeping this mask clean is what
// drops billing from Enterprise to Pro (5,000 free/month vs 1,000).
const FIELD_MASK_CORE = [
  'id',
  'location',
  'rating',
  'userRatingCount',
  'priceLevel',
  'nationalPhoneNumber',
  'formattedAddress',
  'currentOpeningHours',
  'regularOpeningHours',
  'photos',
  'websiteUri',
].join(',');

// Enterprise-tier fields. Fetched separately on a 60-day TTL so the core
// refresh cycle stays at Pro pricing.
const FIELD_MASK_REVIEWS = [
  'reviews',
  'editorialSummary',
  'parkingOptions',
  'accessibilityOptions',
].join(',');

const PRICE_MAP = {
  PRICE_LEVEL_FREE: '$',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
};

async function findPlaceId(name, addr, apiKey) {
  const textQuery = addr ? `${name}, ${addr}` : name;
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.name,places.id',
    },
    body: JSON.stringify({ textQuery, maxResultCount: 1 }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Text Search failed: ${res.status} — ${errBody}`);
  }
  const json = await res.json();
  const place = json.places?.[0];
  if (!place) throw new Error(`No results for: ${textQuery}`);
  return { resourceName: place.name, placeId: place.id };
}

async function fetchPlaceDetails(resourceName, apiKey, fieldMask) {
  const res = await fetch(`${PLACES_BASE}/${resourceName}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Place Details failed: ${res.status} — ${errBody}`);
  }
  return res.json();
}

// Resolves a Places photo resource name to a public googleusercontent.com URL.
// skipHttpRedirect=true returns JSON { photoUri } — the URI is a public CDN URL,
// no key needed once resolved, safe to store in Firestore and serve to clients.
async function resolvePhotoUrl(photoName, apiKey) {
  try {
    const res = await fetch(
      `${PLACES_BASE}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${apiKey}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.photoUri ?? null;
  } catch {
    return null;
  }
}

async function normalizeCoreEnrichment(details, googlePlaceId, apiKey) {
  const currentHours = details.currentOpeningHours;
  const regularHours = details.regularOpeningHours;
  const hours   = currentHours?.weekdayDescriptions ?? regularHours?.weekdayDescriptions ?? null;
  const openNow = currentHours?.openNow             ?? regularHours?.openNow             ?? null;

  // Resolve photo references to public CDN URLs in parallel (up to 5).
  // Photo URLs are stored in Firestore and served to clients at no additional cost.
  const photoNames = (details.photos ?? []).slice(0, 5).map(p => p.name);
  const resolvedPhotos = await Promise.all(photoNames.map(n => resolvePhotoUrl(n, apiKey)));
  const photos = resolvedPhotos.filter(Boolean);

  return {
    google_place_id: googlePlaceId,
    lat: details.location?.latitude ?? null,
    lon: details.location?.longitude ?? null,
    rating: details.rating ?? null,
    user_ratings_total: details.userRatingCount ?? null,
    price_level: PRICE_MAP[details.priceLevel] ?? null,
    phone: details.nationalPhoneNumber ?? null,
    addr: details.formattedAddress ?? null,
    website: details.websiteUri ?? null,
    open_now: openNow,
    hours,
    photos: photos.length > 0 ? photos : null,
    cached_at: Date.now(),
  };
}

function normalizeReviewsEnrichment(details, googlePlaceId) {
  const reviews = (details.reviews ?? [])
    .slice(0, 5)
    .map(r => ({
      author: r.authorAttribution?.displayName ?? 'Anonymous',
      rating: r.rating ?? 0,
      text: r.text?.text ?? '',
      time: r.relativePublishTimeDescription ?? '',
    }));

  const amenityList = [];
  const pk = details.parkingOptions ?? {};
  const ac = details.accessibilityOptions ?? {};
  if (pk.freeParkingLot || pk.freeGarage)   amenityList.push('Free Parking');
  if (pk.valetParking)                      amenityList.push('Valet Parking');
  if (pk.paidParkingLot || pk.paidGarage)   amenityList.push('Paid Parking');
  if (ac.wheelchairAccessibleEntrance)      amenityList.push('Accessible');

  return {
    google_place_id: googlePlaceId,
    reviews: reviews.length > 0 ? reviews : null,
    editorial_summary: details.editorialSummary?.text ?? null,
    amenities: amenityList.length > 0 ? amenityList : null,
    reviews_cached_at: Date.now(),
  };
}

async function enrichPlace(place, apiKey, mode) {
  try {
    if (mode === 'reviews') {
      if (!place.google_place_id) throw new Error('google_place_id required for reviews mode');
      const details = await fetchPlaceDetails(`places/${place.google_place_id}`, apiKey, FIELD_MASK_REVIEWS);
      return normalizeReviewsEnrichment(details, place.google_place_id);
    }

    // Core mode — skip Text Search when google_place_id is already known
    const { resourceName, placeId } = place.google_place_id
      ? { resourceName: `places/${place.google_place_id}`, placeId: place.google_place_id }
      : await findPlaceId(place.name, place.addr, apiKey);
    const details = await fetchPlaceDetails(resourceName, apiKey, FIELD_MASK_CORE);
    return await normalizeCoreEnrichment(details, placeId, apiKey);
  } catch (err) {
    console.error(`[place-details] Failed for "${place.name}" (mode: ${mode}):`, err.message);
    return null;
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const origin = event.headers.origin || '';
  const allowed = new Set(['http://100.123.229.87:8888', 'http://localhost:8888', 'http://100.123.229.87:5173', 'http://localhost:5173', process.env.URL].filter(Boolean));
  if (origin && !allowed.has(origin)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const appSecret = process.env.APP_SECRET;
  if (appSecret && (event.headers['x-app-token'] || '') !== appSecret) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GOOGLE_PLACES_API_KEY not set' }) };
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
  if (places.length > 20) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Max 20 places per request' }) };
  }

  const mode = body.mode === 'reviews' ? 'reviews' : 'core';

  // Enrich all places in parallel — individual failures return null
  const results = await Promise.all(places.map(p => enrichPlace(p, apiKey, mode)));

  const enrichmentMap = {};
  places.forEach((p, i) => {
    enrichmentMap[p.id] = results[i];
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enrichmentMap),
  };
};
