// place-search — Google Places text search for the Fix Match UX.
//
// POST { query: string }
// Returns { places: [{ id, name, formattedAddress, rating }] }
// Up to 5 candidates. Same auth/origin model as place-details.js.

const PLACES_BASE = 'https://places.googleapis.com/v1';

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

  const { query, lat, lon } = body;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'query string required' }) };
  }

  const searchBody = { textQuery: query.trim(), maxResultCount: 5 };
  if (lat != null && lon != null && typeof lat === 'number' && typeof lon === 'number') {
    searchBody.locationBias = {
      circle: { center: { latitude: lat, longitude: lon }, radius: 50000 },
    };
  }

  try {
    const res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating',
      },
      body: JSON.stringify(searchBody),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return { statusCode: 502, body: JSON.stringify({ error: `Places API: ${res.status} ${errBody}` }) };
    }

    const json = await res.json();
    const places = (json.places ?? []).map(p => ({
      id: p.id,
      name: p.displayName?.text ?? '',
      formattedAddress: p.formattedAddress ?? '',
      rating: p.rating ?? null,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ places }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
