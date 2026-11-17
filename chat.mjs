const MODEL = "gemini-3.6-flash";

const systemInstruction = `Je bent MONEY RESCUE, een behulpzame Nederlandstalige assistent voor boodschappen, budgetteren, recepten, maaltijdplanning en besparen.
Antwoord duidelijk, vriendelijk en praktisch. Je mag ook algemene vragen beantwoorden, maar wees eerlijk over onzekerheid.
BELANGRIJKE PRIJSREGELS:
- Je hebt geen live toegang tot prijzen, promoties, voorraad of websites van supermarkten.
- Verzin nooit prijzen, aanbiedingen, productbeschikbaarheid, winkelranglijsten of besparingsbedragen.
- Je mag alleen de door de gebruiker opgeslagen prijzen vergelijken die in de context staan.
- Vergelijk alleen dezelfde producten en hoeveelheden. Als verpakkingen verschillen, leg uit dat prijs per kg/liter/stuk nodig is.
- Vermeld bij opgeslagen prijzen altijd winkel en controledatum. Noem een prijs niet actueel als de controledatum oud is.
- Als er onvoldoende gegevens zijn, zeg dat duidelijk en vraag om de ontbrekende prijzen of hoeveelheden.
- Geef geen medisch, juridisch of financieel professioneel advies; verwijs bij hoge risico's naar een deskundige.
- Vraag niet om wachtwoorden, betaalkaartgegevens of andere geheime informatie.
Gebruik de meegegeven budget-, boodschappenlijst- en prijscontext alleen om de vraag te beantwoorden.`;

export default async (request) => {
  const jsonHeaders = { "Content-Type": "application/json", "Cache-Control": "no-store" };

  // Veilige statuscontrole: toont nooit de sleutel of de waarde ervan.
  if (request.method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      function: "MONEY RESCUE Gemini gateway",
      configured: Boolean(process.env.GEMINI_API_KEY),
      model: MODEL
    }), { status: 200, headers: jsonHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Gebruik een POST-verzoek." }), {
      status: 405,
      headers: { ...jsonHeaders, "Allow": "GET, POST" }
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "De Gemini-serverfunctie is gepubliceerd, maar de geheime sleutel ontbreekt. Voeg GEMINI_API_KEY toe bij Netlify → Project configuration → Environment variables en publiceer daarna opnieuw." }), {
      status: 503,
      headers: jsonHeaders
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Ongeldige aanvraag." }), {
      status: 400,
      headers: jsonHeaders
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const context = body.context && typeof body.context === "object" ? body.context : {};
  const safeMessages = messages
    .filter(m => m && ["user", "model"].includes(m.role) && typeof m.text === "string")
    .map(m => ({ role: m.role, parts: [{ text: m.text.slice(0, 4000) }] }));

  if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
    return new Response(JSON.stringify({ error: "Stuur eerst een vraag." }), {
      status: 400,
      headers: jsonHeaders
    });
  }

  const safeContext = {
    budgetEUR: Number(context.budget) || 0,
    shoppingList: Array.isArray(context.shoppingList) ? context.shoppingList.slice(0, 80) : [],
    savedPrices: Array.isArray(context.savedPrices) ? context.savedPrices.slice(-40) : []
  };

  const prompt = `${systemInstruction}\n\nContext van deze gebruiker (alleen lokaal ingevoerde gegevens; geen kassabonfoto's):\n${JSON.stringify(safeContext)}`;

  try {
    const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt }] },
        contents: safeMessages,
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 900
        }
      })
    });

    if (result.status === 429) {
      return new Response(JSON.stringify({ error: "De gratis AI-gebruiksgrens is tijdelijk bereikt. Probeer later opnieuw." }), {
        status: 429,
        headers: jsonHeaders
      });
    }

    const payload = await result.json().catch(() => ({}));
    if (!result.ok) {
      // Geef een veilige, begrijpelijke foutmelding terug; nooit de API-sleutel.
      const providerMessage = String(payload?.error?.message || "").slice(0, 240);
      let friendly = "Gemini kon de vraag niet verwerken. Probeer het later opnieuw.";
      if (result.status === 400) friendly = "Gemini wees het verzoek af. Controleer of je API-sleutel en model toegang hebben.";
      if (result.status === 401 || result.status === 403) friendly = "Gemini weigert de API-sleutel. Controleer in Google AI Studio of de sleutel geldig is en de Gemini API mag gebruiken.";
      if (result.status === 404) friendly = "Het gekozen Gemini-model is niet beschikbaar voor deze API-sleutel. Controleer de modeltoegang in Google AI Studio.";
      if (result.status === 429) friendly = "De gratis Gemini-gebruiksgrens is bereikt. Probeer later opnieuw.";
      return new Response(JSON.stringify({ error: friendly, providerStatus: result.status, detail: providerMessage }), {
        status: result.status === 429 ? 429 : (result.status >= 500 ? 502 : 400),
        headers: jsonHeaders
      });
    }

    const reply = payload?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return new Response(JSON.stringify({ error: "Gemini gaf geen antwoord. Probeer je vraag anders te formuleren." }), {
        status: 502,
        headers: jsonHeaders
      });
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: jsonHeaders
    });
  } catch {
    return new Response(JSON.stringify({ error: "De verbinding met Gemini is tijdelijk mislukt." }), {
      status: 502,
      headers: jsonHeaders
    });
  }
};
