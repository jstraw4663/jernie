const SYS_PROMPT =
  "You are a flight status assistant. Search for the current real-time status of each flight. " +
  "Return ONLY a valid JSON array with no markdown, no backticks, no explanation. " +
  'Each element must include: {"key":"","status":"On Time|Delayed|Cancelled|Scheduled",' +
  '"actualDep":"","actualArr":"","gate":"","terminal":"","delayMin":0}. ' +
  "If real-time data is unavailable use status Scheduled and empty strings for actual times.";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key not configured" }) };
  }

  let flights;
  try {
    ({ flights } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
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
