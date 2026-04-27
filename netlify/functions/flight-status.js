const SYS_PROMPT =
  "You are a flight status assistant. Search for the current real-time status of each flight. " +
  "Return ONLY a valid JSON array with no markdown, no backticks, no explanation. " +
  'Each element must include: {"key":"","status":"On Time|Delayed|Cancelled|Scheduled",' +
  '"actualDep":"","actualArr":"","gate":"","terminal":"","delayMin":0,"aircraftType":""}. ' +
  "For aircraftType include the full aircraft name as shown on FlightAware (e.g. \"Boeing 737-800\", \"Airbus A320\"). " +
  "If real-time data is unavailable use status Scheduled and empty strings for actual times.";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const origin = event.headers.origin || '';
  const allowed = new Set(['http://100.123.229.87:8888', 'http://localhost:8888', process.env.URL].filter(Boolean));
  if (origin && !allowed.has(origin)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const appSecret = process.env.APP_SECRET;
  if (appSecret && (event.headers['x-app-token'] || '') !== appSecret) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key not configured" }) };
  }

  const body = event.body ? JSON.parse(event.body) : {};
  const flights = body.flights;
  if (!flights || flights.length === 0) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) };
  }
  if (flights.length > 10) {
    return { statusCode: 400, body: JSON.stringify({ error: "Max 10 flights per request" }) };
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "web-search-20250305",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: SYS_PROMPT,
      messages: [{ role: "user", content: "Get current status for these flights and return a JSON array only: " + JSON.stringify(flights) }],
    }),
  });

  if (!resp.ok) {
    return { statusCode: resp.status, body: JSON.stringify({ error: "Anthropic API error" }) };
  }

  const data = await resp.json();
  const txt = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const arr = JSON.parse(txt.replace(/```json|```/g, "").trim());
  const map = {};
  arr.forEach((f) => { map[f.key] = f; });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(map),
  };
};
