const BASE = "https://www.prijsprofeet.be/api/v1";

export default async (request) => {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Gebruik een GET-verzoek." }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Allow": "GET" }
    });
  }
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
  if (q.length < 2) {
    return new Response(JSON.stringify({ error: "Vul minstens twee tekens in." }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const apiUrl = new URL(`${BASE}/search`);
    apiUrl.searchParams.set("q", q);
    apiUrl.searchParams.set("page_size", "30");
    const upstream = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "MONEY-RESCUE/1.0 (Belgian grocery price search)"
      }
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "De externe aanbiedingendatabase is tijdelijk niet beschikbaar." }), {
        status: upstream.status === 429 ? 429 : 502,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch {
    return new Response(JSON.stringify({ error: "Kan de aanbiedingendatabase momenteel niet bereiken." }), {
      status: 502, headers: { "Content-Type": "application/json" }
    });
  }
};
