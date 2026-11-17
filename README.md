# MONEY RESCUE — Gemini AI-koppeling (voorbereide versie)

Deze projectversie bevat:
- De bestaande boodschappenlijst, planner, prijsinvoer en uitgavenregistratie.
- Een chatinterface die echte antwoorden opvraagt bij Gemini.
- Een Netlify Function als beveiligde tussenlaag. De Gemini API-sleutel staat NIET in de browsercode.
- Context uit het ingestelde budget, de boodschappenlijst en handmatig ingevoerde prijsnotities.
- Instructies in de AI om nooit live winkelprijzen of aanbiedingen te verzinnen.

## Belangrijke grenzen
- De Gemini-chat gebruikt een Netlify Function als beveiligde tussenlaag. De API-sleutel blijft server-side en staat niet in de browsercode.
- De functie moet via een Netlify-build gepubliceerd worden. Een gewone statische ZIP/drag-and-drop deploy activeert Netlify Functions niet.
- Na publicatie kun je de veilige statuscontrole openen op `https://JOUW-SITE.netlify.app/api/chat`. Die toont alleen of de functie en sleutelconfiguratie aanwezig zijn, nooit de sleutel zelf.
- De gekozen Gemini Free Tier heeft gebruikslimieten en Google geeft aan dat inhoud die via de gratis API wordt ingediend gebruikt kan worden om producten te verbeteren. Deel daarom geen gevoelige gegevens.
- De AI heeft geen live winkelprijsfeed. De vergelijker kan alleen prijzen vergelijken die in MONEY RESCUE zijn ingevoerd.
- Deze starter heeft nog geen account/login, sterke misbruikbeveiliging, productieprivacybeleid of GDPR-review. Zet hem niet breed open voor publiek gebruik voordat die onderdelen zijn aangepakt.
- De service kan veranderen; controleer modelbeschikbaarheid en gratis quota in Google AI Studio.

## Publicatie
Deze versie bevat Netlify Functions. Een gewone statische drag-and-drop-upload publiceert de sitebestanden, maar Netlify moet de function tijdens een build verwerken. Koppel daarom de projectmap aan een Git-provider (bijvoorbeeld GitHub) en laat Netlify het project bouwen, of gebruik de Netlify CLI.

Netlify Build-instellingen:
- Base directory: leeg / project root
- Build command: leeg (statische site)
- Publish directory: `.`
- Functions directory: `netlify/functions`

Koppel de repository via Netlify → Add new project → Import an existing project → GitHub. Upload de volledige uitgepakte projectmap naar een GitHub-repository en selecteer die repository in Netlify. Gebruik niet alleen Netlify Drop voor deze versie.

Voeg daarna in Netlify bij Project configuration → Environment variables toe:
- Key: `GEMINI_API_KEY`
- Value: jouw Gemini API-sleutel
- Scope: Functions (of All scopes als Netlify geen aparte scope-keuze toont)

Start daarna een nieuwe production deploy zodat de functie de nieuwe variabele ontvangt.

Bewaar de API-sleutel geheim. Plak hem nooit in `index.html`, `app.js`, een openbare GitHub-repository of een chatbericht.

Model in deze starter: `gemini-3.6-flash`. Controleer in Google AI Studio of dit model op jouw account beschikbaar is.


## Prijsvergelijker (gratis gegevenslaag)
- De tab Vergelijk zoekt Belgische supermarkt-aanbiedingen via de publieke PrijsProfeet `/search` API.
- De bronvermelding en link naar PrijsProfeet staan zichtbaar bij de resultaten, zoals het gratis plan vereist.
- De gratis API biedt zoek-/aanbiedingsgegevens. Cross-retailer matching van exact hetzelfde product, volledige schapprijzen en prijsgeschiedenis zijn betaalde functies. Daarom claimt MONEY RESCUE niet dat elke aanbieding exact hetzelfde product is of dat alle winkels altijd resultaten hebben.
- Gebruikers kunnen daarnaast zelf gecontroleerde prijzen opslaan en dezelfde exacte productnaam lokaal vergelijken.
- Alleen de productzoekterm wordt naar PrijsProfeet gestuurd; geen boodschappenlijst, accountgegevens of kassabon.
- Controleer de voorwaarden voordat MONEY RESCUE commercieel wordt gelanceerd: de gratis laag is beschreven als bedoeld voor hobby-/studieprojecten en vereist bronvermelding.


## Testen van de beveiligde verbinding
1. Open `https://JOUW-SITE.netlify.app/api/chat` in Safari.
2. Als de functie actief is, zie je JSON met `ok: true`.
3. `configured: false` betekent dat `GEMINI_API_KEY` nog ontbreekt of niet beschikbaar is voor Functions.
4. `configured: true` betekent dat Netlify de sleutel ziet; stuur daarna een testvraag via de chat.

## Beveiligingswaarschuwing
De sleutel wordt server-side bewaard, maar de chat-endpoint is publiek bereikbaar zolang de website publiek is. Dit pakket heeft nog geen gebruikerslogin of robuuste misbruik-/rate-limitbeveiliging. Deel de site niet breed voordat die beveiligingslaag is toegevoegd. Google Gemini Free Tier heeft eigen voorwaarden en limieten; stuur geen gevoelige gegevens.


## App-icoon
Deze versie vervangt het oude E-icoon door het minimalistische MR-monogram in mintgroen op donkergroen. `icon.svg` wordt gebruikt als favicon/PWA-icoon en `apple-touch-icon.png` is toegevoegd voor het beginscherm van iPhone. Na publicatie moet de gebruiker de webapp opnieuw openen; als het oude beginschermicoon blijft staan, verwijder de oude snelkoppeling en voeg de site opnieuw toe aan het beginscherm.
