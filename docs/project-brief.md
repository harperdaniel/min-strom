# Minstrøm – prosjektbrief og teknisk retning

> Arbeidsdokument for produkt, prototype og videre Elhub-integrasjon  
> Status: Første prosjektbrief  
> Sist oppdatert: 5. august 2026

## 1. Kortversjonen

**Minstrøm** skal være en gratis og helt uavhengig tjeneste hvor privatpersoner kan se, forstå og etter hvert administrere sitt eget strømforbruk – uavhengig av hvilken strømleverandør de bruker.

Første versjon bygges som en reell, flerbruker prototype. Brukeren oppretter en konto, følger en enkel veiledning for sitt nettselskap og legger selv inn nødvendig tilgang, for eksempel et personlig API-token fra Elvia. Deretter henter Minstrøm måleverdier automatisk og viser dem i et forståelig dashboard.

Den manuelle tokenflyten er en midlertidig inngang til produktet, ikke en del av den langsiktige visjonen. Arkitektur, datamodell, sider og språk skal fra første dag være tilrettelagt for at denne senere kan erstattes med:

> Koble til Elhub → logg inn med ID-porten → velg strømmåler → godkjenn → tilbake til Minstrøm.

Brukeren skal da slippe å finne målepunkt-ID, opprette eller kopiere tokens og forstå forskjellen mellom strømleverandør og nettselskap.

## 2. Produktvisjon

### Formål

Strømkunder bør kunne ha kontroll på eget forbruk uten å være avhengige av appen eller kundesidene til selskapet som selger dem strøm.

Minstrøm skal derfor være:

- Helt uavhengig av strømleverandører.
- Gratis å bruke for innsyn i eget forbruk.
- Tydelig på priser, databruk og eventuelle begrensninger.
- Enkel nok for vanlige, ikke-tekniske brukere.
- Nyttig uansett hvilken strømleverandør brukeren velger.
- På brukerens side når strømavtaler, kampanjer og vilkår skal forstås.

### Foreløpig hovedbudskap

> **Minstrøm**  
> Se og forstå strømforbruket ditt – helt uavhengig av strømleverandør.

### Holdning og tone

Tjenesten oppstår fordi strømbransjen ofte oppleves som unødvendig uoversiktlig: lokketilbud, tidsbegrensede vilkår, uklare påslag og apper som binder forbruksinnsyn til leverandøren. Minstrøm skal være det motsatte: direkte, forståelig, transparent og konsekvent på brukerens side.

Kommunikasjonen kan gjerne ha brodd, men bør angripe praksiser og problemer fremfor å komme med udokumenterbare påstander om navngitte selskaper. En mulig formulering på landingssiden er:

> Vi er lei av lokketilbud, uoversiktlige påslag og vilkår som endrer seg når kampanjeperioden er over. Minstrøm er laget for å gi deg kontroll over dine egne strømdata – uten binding til en strømleverandør, skjulte anbefalinger eller betalte plasseringer.

Påstander som «ingen betalte plasseringer», «helt gratis» og «ingen tilknytning» skal bare brukes så lenge de faktisk er sanne. Hvis forretningsmodellen senere endres, skal dette kommuniseres åpent.

## 3. Avgrensning for fase 1

Fase 1 er en fungerende produktprototype, ikke bare en klikkbar design.

Den skal støtte flere brukere og være bygget generisk, men første støttede datakilde blir Elvias MeterValue API med personlig token. Det er viktig å skille mellom:

- **Strømleverandøren**, for eksempel Jærkraft, som selger strømavtalen.
- **Nettselskapet**, for eksempel Elvia, som eier strømnettet og mottar måledata.

Bytte av strømleverandør påvirker ikke tilgangen til Elvias API så lenge Elvia fortsatt er brukerens nettselskap.

### Inkludert i fase 1

- Landingsside.
- Kontoopprettelse og innlogging.
- En veiledet tilkoblingsside hvor brukeren legger til datakilde og token.
- Sikker lagring og validering av token.
- Automatisk innhenting av måleverdier.
- Et enkelt, nyttig forbruksdashboard.
- Mulighet for å koble fra en datakilde og slette egne data.
- Grunnarkitektur for flere nettselskaper/dataleverandører.
- En tydelig overgangsvei til framtidig Elhub-samtykke.

### Ikke inkludert i fase 1

- Automatisk Elhub/ID-porten-onboarding.
- Automatisk bytte av strømleverandør.
- Betaling av strømfakturaer.
- Full sammenligning av strømavtaler.
- Automatisk uthenting av kampanjevilkår eller utløpsdato.
- Sanntidsdata fra HAN-porten.
- Mobilapp. Nettsiden skal i stedet være responsiv og fungere godt på mobil.

## 4. De tre sidene

Applikasjonen skal i første omgang oppleves som tre enkle hovedsider. Juridiske undersider som personvern og vilkår kan eksistere uten å regnes som en del av hovedflyten.

### 4.1 Landingsside – `/`

Landingssiden skal forklare produktet uten markedsføringsrøyk.

Den må svare på:

1. Hva er Minstrøm?
2. Hvorfor finnes siden?
3. Er den knyttet til en strømleverandør?
4. Hva koster den?
5. Hvordan får den tilgang til data?
6. Hva kan brukeren se etter tilkobling?

#### Første utkast til innhold

**Hero**

> # Strømforbruket ditt. Ikke strømselskapets app.
>
> Se og forstå ditt eget strømforbruk på ett sted – helt gratis og uavhengig av hvilken strømleverandør du bruker.
>
> **[Kom i gang]**

**Hvorfor Minstrøm finnes**

> Vi er lei av lokketilbud, uoversiktlige påslag og avtalevilkår som blir dårligere når kampanjeperioden er over. Du skal ikke måtte være lojal mot et strømselskap for å få god oversikt over ditt eget forbruk.
>
> Minstrøm er en uavhengig tjeneste uten betalte rangeringer eller skjult leverandørbias. Målet er enkelt: å gi deg kontroll over egne strømdata og gjøre det lettere å ta gode valg.

**Slik fungerer det i prototypen**

> 1. Opprett en Minstrøm-konto.
> 2. Følg veiledningen for nettselskapet ditt.
> 3. Koble til måleren med et personlig tilgangstoken.
> 4. Se forbruket ditt i Minstrøm.

Det skal forklares tydelig at tokenprosessen er en midlertidig prototypeløsning. Siden skal ikke late som om flyten er enklere enn den er.

**Tillit og personvern**

- Dataene brukes kun for å levere funksjonene brukeren ber om.
- Token vises aldri igjen etter lagring.
- Brukeren kan koble fra og slette data.
- Minstrøm selger ikke forbruksdata.
- Brukeren får vite nøyaktig hva tjenesten lagrer.

### 4.2 Innlogging og tilkobling – `/connect`

Dette er én sammenhengende opplevelse, selv om den teknisk kan bestå av flere steg eller komponenter.

#### Foreslått prototypeflyt

1. **Opprett konto eller logg inn**
   - E-post og magic link anbefales i første versjon.
   - Alternativt e-post og passord dersom det er ønskelig.
   - Kontoen er nødvendig fordi tilgangstokens og forbruksdata må knyttes sikkert til riktig bruker.

2. **Velg nettselskap/dataleverandør**
   - Elvia er første og eneste aktive valg i første versjon.
   - Andre leverandører kan vises som «ikke støttet ennå», men ikke dersom det skaper unødvendig støy.
   - Strømleverandøren skal ikke etterspørres her; Jærkraft, Agva og lignende er ikke datakilden.

3. **Vis en enkel Elvia-veiledning**
   - Logg inn på Elvia Min side.
   - Velg riktig kundeforhold.
   - Åpne **Tilganger**.
   - Velg **Opprett token**.
   - Velg riktig måler og gi tokenet et forståelig navn, for eksempel «Minstrøm».
   - Kopier tokenet. Elvia viser det bare én gang.
   - Gå tilbake til Minstrøm og lim det inn.

4. **Koble til**
   - Token sendes direkte til backend over HTTPS.
   - Backend tester tokenet mot datakilden.
   - Ved gyldig respons hentes tilgjengelige målepunkter.
   - Brukeren velger målepunkt hvis tokenet gir tilgang til flere.
   - Token krypteres og lagres.
   - Første synkronisering starter.

5. **Resultat**
   - Vis tydelig suksess eller en konkret feil.
   - Send brukeren til dashboardet når første data er klare.
   - Ved langvarig førstegangssynkronisering kan dashboardet åpnes med statusvisning.

#### Krav til veiledningen

- Den må være forståelig uten teknisk bakgrunn.
- Den bør bruke bilder/skjermbilder dersom Elvia tillater og skjermbildene holdes oppdatert.
- Den må forklare at Elvia er nettselskap, ikke brukerens valgte strømleverandør.
- Den må advare om at tokenet er en digital nøkkel til måledataene.
- Token må aldri sendes i e-post, query-parametere eller supportlogger.
- Ved feil skal brukeren få handlingsrettet hjelp, ikke rå API-feil.

#### Tilrettelegging for senere Elhub-flyt

UI-et skal ikke bygges rundt feltet «lim inn token». Det skal bygges rundt konseptet **koble til datakilde**.

Prototype:

> Velg datakilde → følg veiledning → lim inn token → bekreft måler

Senere:

> Koble til Elhub → redirect til ID-porten/Elhub → velg måler og godkjenn → callback → ferdig

Begge flytene skal ende i samme interne resultat: én `DataConnection` med ett eller flere godkjente `MeterPoint`-objekter.

### 4.3 Forbruksdashboard – `/dashboard`

Dashboardets nøyaktige innhold skal bestemmes i en sparringsrunde etter at vi har undersøkt faktiske Elvia-responser, datakvalitet, historikklengde og oppdateringsfrekvens.

Første utkast bør bestå av følgende:

#### Nøkkeltall

- Forbruk hittil i dag eller siste tilgjengelige døgn.
- Forbruk siste 7 dager.
- Forbruk inneværende måned.
- Sammenligning med forrige tilsvarende periode.
- Estimert årsforbruk dersom datagrunnlaget er tilstrekkelig.
- Tidspunkt og verdi for høyeste forbrukstime i valgt periode.
- Tidspunkt for siste vellykkede datasynkronisering.

#### Diagrammer

1. **Forbruk gjennom døgnet**  
   Linje- eller søylediagram med timeverdier for valgt dag.

2. **Daglig forbruk**  
   Søylediagram for de siste 7 eller 30 dagene.

3. **Månedsutvikling**  
   Sammenligning av inneværende måned med forrige måned eller samme måned året før.

4. **Effekttopper**  
   Oversikt over de høyeste timene i måneden, fordi dette kan være relevant for nettleietrinn.

5. **Forbruksmønster** – kandidat, ikke besluttet  
   Fordeling mellom natt, morgen, dag og kveld, dersom det faktisk hjelper brukeren å forstå forbruket.

#### Forklaringstekst

Hver graf skal forklare hva den viser og hvorfor den er nyttig. Vi skal unngå et «energi-nerd-dashboard» fullt av tall som en vanlig bruker ikke kan handle på.

Eksempel:

> Du brukte mest strøm mellom kl. 07 og 08. Hvis dette gjentar seg, kan det være varmtvannsbereder, gulvvarme og matlaging som kjører samtidig.

Slike forklaringer må formuleres som mulige årsaker, ikke som sikre konklusjoner uten sensordata.

#### Funksjoner rundt dataene

- Velg målepunkt hvis brukeren har flere boliger eller en hytte.
- Velg periode.
- Se om måleverdier er verifisert eller foreløpige dersom API-et oppgir dette.
- Start ny synkronisering innenfor forsvarlige rate limits.
- Last ned egne data.
- Administrer eller koble fra datakilde.
- Slett konto og tilhørende data.

## 5. Tilgjengelige data i prototypen

Elvia dokumenterer to relevante API-operasjoner for privatkunder:

- `metervalues`: måleverdier for forbruk og eventuell produksjon.
- `maxhours`: timer med maksimalt forbruk for valgte måneder.

Responsen kan også opplyse om en måleverdi er ferdig validert (`verified=true`) eller foreløpig (`verified=false`). Det eksakte responsformatet, periodegrensene og rate limits må kartlegges gjennom API-dokumentasjonen og faktiske testkall før dashboardspesifikasjonen låses.

Elvias offisielle veiledning:  
https://www.elvia.no/smart-forbruk/api-er-for-smartere-hjem-og-bedrifter/slik-kan-du-ta-i-bruk-metervalue-api/

Elvias utviklerportal:  
https://developers.elvia.no/

### Alternativ import for utvikling

Elhub Min side lar privatpersoner laste ned egne måleverdier som CSV, én måned av gangen. CSV-import kan brukes til lokal utvikling, demodata og feilsøking, men er ikke tenkt som hovedflyt for brukerne.

Elhubs veiledning:  
https://elhub.no/artikler/veiledning-til-mine-strommalere

## 6. Teknisk arkitektur

### Teknologistack

- **Språk:** TypeScript i frontend, backend og delte pakker.
- **Frontend:** React + Vite.
- **Backend:** Node.js + Express.
- **Monorepo:** pnpm workspaces anbefales.
- **Validering:** Zod for delte request-, response- og domeneskjemaer.
- **Database:** PostgreSQL anbefales fra starten fordi prototypen er flerbruker.
- **Databaseverktøy:** Drizzle ORM er et lett alternativ; Prisma er også mulig. Endelig valg tas ved oppstart.
- **Bakgrunnsjobber:** Start enkelt med en separat worker-prosess og databasebasert jobbkø. BullMQ/Redis kan innføres hvis behovet faktisk oppstår.
- **Diagrammer:** Et React-bibliotek som Recharts, Nivo eller Apache ECharts vurderes etter ønsket design og datamengde.
- **Testing:** Vitest for enhetstester, Supertest for API og Playwright for de viktigste brukerflytene.

### Foreslått monorepo

```text
minstrom/
├── apps/
│   ├── web/                 # React/Vite
│   ├── api/                 # Express API
│   └── worker/              # Planlagte synkroniseringer
├── packages/
│   ├── domain/              # Domenetyper og forretningsregler
│   ├── providers/           # ElviaProvider, senere ElhubProvider
│   ├── api-contract/        # Zod-skjemaer og delte API-typer
│   ├── database/            # Skjema, migrasjoner og repositories
│   └── config/              # Delt TypeScript/ESLint-konfigurasjon
├── infra/                   # Lokal Docker og deployoppsett
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Dette er et bevisst skille mellom applikasjon, domene og eksterne datakilder. Det gjør det mulig å erstatte eller supplere Elvia uten å skrive om dashboard, brukerkontoer eller intern datamodell.

### Provider-grensesnitt

Eksterne API-responser skal oversettes til Minstrøms egne domenetyper ved integrasjonsgrensen.

```ts
export interface ConsumptionProvider {
  readonly type: ProviderType;

  validateCredentials(
    credentials: ProviderCredentials
  ): Promise<CredentialValidationResult>;

  listMeterPoints(
    connection: DataConnection
  ): Promise<MeterPoint[]>;

  getMeterValues(
    connection: DataConnection,
    meterPointId: string,
    period: DateRange
  ): Promise<MeterValue[]>;

  revoke?(connection: DataConnection): Promise<void>;
}
```

Første implementasjon blir `ElviaProvider`. Senere `ElhubProvider` skal implementere samme funksjonelle kontrakt, selv om autentiseringen skjer med Maskinporten og samtykket kommer fra en redirect/callback-flyt.

UI og domene skal ikke kjenne Elvias rå responsformat eller lagre Elvia-spesifikke felter som generelle sannheter.

## 7. Foreslått datamodell

### `User`

- `id`
- `email`
- `emailVerifiedAt`
- `createdAt`
- `updatedAt`
- `deletedAt`

### `DataConnection`

Representerer en brukers forbindelse til en ekstern datakilde.

- `id`
- `userId`
- `providerType` – for eksempel `ELVIA_TOKEN` eller senere `ELHUB_CONSENT`
- `status` – `PENDING`, `ACTIVE`, `ERROR`, `REVOKED`
- `encryptedCredentials` – kun for provider-typer som trenger dette
- `credentialKeyVersion`
- `externalGrantId` – for framtidig Elhub-samtykke
- `accessStartsAt`
- `accessEndsAt`
- `lastSyncAt`
- `lastSuccessfulSyncAt`
- `lastErrorCode`
- `createdAt`
- `updatedAt`
- `revokedAt`

### `MeterPoint`

- `id` – intern ID
- `connectionId`
- `externalMeterPointId` – krypteres eller pseudonymiseres der det er hensiktsmessig
- `name` – brukerens navn, for eksempel «Hjemme»
- `address`
- `priceArea`
- `gridOwner`
- `consumptionType`
- `activeFrom`
- `activeTo`
- `createdAt`
- `updatedAt`

### `MeterValue`

- `meterPointId`
- `intervalStart`
- `intervalEnd`
- `valueKwh`
- `direction` – `CONSUMPTION` eller `PRODUCTION`
- `quality` eller `verified`
- `sourceRevision`
- `receivedAt`
- `updatedAt`

Unik nøkkel bør minst dekke målepunkt, intervallstart og retning, slik at korrigerte verdier kan oppdateres uten duplikater.

### `SyncRun`

- `id`
- `connectionId`
- `meterPointId`
- `status`
- `periodFrom`
- `periodTo`
- `startedAt`
- `finishedAt`
- `recordsReceived`
- `recordsInserted`
- `recordsUpdated`
- `errorCode`
- `errorMessageSanitized`

Rå tokens og andre hemmeligheter skal aldri lagres i `SyncRun`, logger eller analyseverktøy.

## 8. API-utkast

Alle endepunkter under brukerområdet krever autentisert bruker og eierskapskontroll.

```text
POST   /api/auth/request-link
POST   /api/auth/verify
POST   /api/auth/logout
GET    /api/me

GET    /api/providers
POST   /api/connections/elvia/validate
POST   /api/connections/elvia
GET    /api/connections
DELETE /api/connections/:connectionId

GET    /api/meter-points
PATCH  /api/meter-points/:meterPointId
GET    /api/meter-points/:meterPointId/values?from=&to=&resolution=
GET    /api/meter-points/:meterPointId/summary?from=&to=
POST   /api/meter-points/:meterPointId/sync
GET    /api/sync-runs/:syncRunId

GET    /api/export
DELETE /api/account
```

Senere Elhub-endepunkter kan legges til uten å endre dashboard-API-et:

```text
POST /api/connections/elhub/authorize
POST /api/connections/elhub/callback
POST /api/connections/elhub/revoke
```

Frontend skal bruke de generelle `connections`, `meter-points`, `values` og `summary`-kontraktene etter at en datakilde er koblet til.

## 9. Synkronisering og databehandling

### Første tilkobling

1. Valider token.
2. Hent tilgjengelige målepunkter.
3. Opprett `DataConnection` og `MeterPoint` i én kontrollert prosess.
4. Kølegg historisk innhenting i avgrensede perioder.
5. Normaliser og upsert måleverdier.
6. Beregn nødvendige sammendrag ved lesing eller som mellomlagrede aggregater.
7. Oppdater synkroniseringsstatus.

### Løpende oppdatering

- Worker henter nye måleverdier på en fast plan.
- Det skal være overlapp med tidligere periode slik at korrigerte/validerte verdier oppdateres.
- Jobbene må være idempotente.
- Provider-spesifikke rate limits og periodegrenser skal respekteres.
- Feil skal klassifiseres, for eksempel utløpt/tilbakekalt token, rate limit, midlertidig leverandørfeil og ugyldig respons.
- Brukeren skal se en forståelig status og få veiledning hvis ny tilkobling kreves.

## 10. Sikkerhet og personvern

Måleverdier kan avsløre når mennesker er hjemme, sover eller bruker bestemte typer utstyr. De skal behandles som sensitive personopplysninger i produktets risikovurdering, selv om de ikke er en særskilt kategori etter GDPR.

### Minimumskrav

- HTTPS overalt.
- Tokens sendes kun i request body, aldri URL.
- Tokens lagres kryptert med en nøkkel som holdes utenfor databasen.
- Støtte for nøkkelversjon og framtidig rotasjon.
- Tokens returneres aldri til frontend etter opprettelse.
- Tokens og målepunkt-ID-er filtreres fra logger og feilsporing.
- Streng eierskapskontroll på alle ressurser.
- Rate limiting på autentisering, tokenvalidering og manuell synkronisering.
- CSRF-beskyttelse dersom autentisering bruker cookies.
- `HttpOnly`, `Secure` og hensiktsmessig `SameSite` på sesjonscookies.
- Ingen tokens i `localStorage` eller `sessionStorage`.
- Kryptert backup og dokumentert sletting.
- Brukeren kan tilbakekalle tilkobling og slette konto/data.
- Dataminimering: lagre bare det produktet faktisk trenger.
- Revisjonslogg for tilkobling, tilbakekalling og sletting, uten hemmeligheter.
- Secrets skal aldri committes til Git.

Før offentlig lansering må prosjektet ha personvernerklæring, behandlingsgrunnlag, databehandleravtaler med driftsleverandører, sletterutiner og en vurdering av personvernkonsekvenser.

## 11. Veien til naturlig Elhub-onboarding

Elhub har en nasjonal tredjepartsflyt, BRS-NO-624, hvor en godkjent tredjepart sender brukeren til Elhub Min side. Brukeren logger inn via ID-porten, velger målepunkt og godkjenner tilgang. Elhub sender deretter målepunktinformasjon tilbake til tredjeparten.

Dokumentasjon:  
https://dok.elhub.no/e27/brs-no-624-oppdatering-av-tredjepartstilgang-via-u

For produksjon må Minstrøm blant annet ha norsk organisasjonsnummer, GLN, Elhub-avtale, korrekt aktørregistrering, Maskinporten/virksomhetssertifikat og oppfylle sikkerhetskravene. Den regulerte tredjepartsavgiften er per 2026 oppgitt til 69 000 kroner per år, uten målepunktbasert gebyr for tredjeparter.

Elhub-registrering:  
https://elhub.no/fagomrader/aktor-og-markedsstruktur/opprette-endre-og-avslutte-aktorer?article=slik-blir-du-tredjepart

Elhub testmiljø:  
https://elhub.no/fagomrader/aktor-og-markedsstruktur/testing?article=testing-for-tredjepart

### Arkitekturkrav som beskytter overgangen

- Brukeren eier konto og dashboard uavhengig av provider.
- `DataConnection` støtter både lagrede credentials og eksterne samtykkegrant.
- Målepunkter har interne ID-er; UI bruker ikke providerens ID som primærnøkkel.
- Alle måleverdier normaliseres til samme interne format.
- Provider-autentisering ligger kun i providerlaget.
- Dashboardet henter aldri data direkte fra Elvia eller Elhub.
- Callback/redirect kan legges til som en ny tilkoblingsmetode.
- En bruker kan senere ha flere forbindelser og målepunkter samtidig.
- Tilgangens start, slutt og tilbakekalling er del av datamodellen fra første versjon.

## 12. Framtidige produktmuligheter

Disse er retning, ikke fase-1-krav:

### Avtaleoversikt og varsler

- Registrere strømavtale, påslag, månedspris og vilkårsgaranti.
- Varsle før kampanje eller vilkårsgaranti utløper.
- Tolke opplastet faktura eller kontrakt med brukerens samtykke.
- Forklare kostnader og avtaleendringer i klart språk.

Elhubs forbruksdata inneholder ikke nødvendigvis kampanjepris, påslag eller utløpsdato. Disse opplysningene trenger derfor en separat datakilde eller manuell registrering.

### Kostnadsberegning

- Kombinere forbruk med offentlige spotpriser.
- Inkludere nettleie, avgifter og Norgespris der beregningsgrunnlaget er sikkert.
- Vise estimat med tydelig forklaring og skille mellom estimert og fakturert beløp.

### Avtalebytte

- Uavhengig sammenligning av avtaler.
- Varsel når en eksisterende avtale ikke lenger er konkurransedyktig.
- Senere eventuell assistert eller automatisk bytteflyt.

Dette krever egne avtaler, gode prisdata, fullmakts-/samtykkeflyt og en forretningsmodell som ikke undergraver Minstrøms uavhengighet.

### Fakturabetaling

En framtidig «one-stop-shop» kan samle eller betale strømfakturaer, men dette innebærer betalings-, bank- og regulatorisk kompleksitet. Det skal behandles som et separat initiativ og ikke påvirke den første arkitekturen unødvendig.

## 13. Faseplan

### Fase 0 – avklaringer og dataspike

- Bekreft domenenavn og merkevare.
- Opprett personlig Elvia-token.
- Gjør faktiske kall mot `metervalues` og `maxhours`.
- Dokumenter responsformat, periodestørrelse, historikk, rate limits og feilresponser.
- Undersøk om Elvia krever en separat utviklernøkkel i tillegg til personlig token.
- Last ned Elhub-CSV som sammenligningsgrunnlag.
- Gjennomfør sparringsrunde om dashboardet basert på ekte data.

**Leveranse:** Et lite teknisk notat, anonymiserte eksempelresponser og besluttet første dashboard.

### Fase 1 – flerbruker prototype

- Sett opp monorepo og lokal utvikling.
- Implementer autentisering.
- Implementer `ElviaProvider`.
- Bygg tilkoblingsveiledning og sikker tokenlagring.
- Bygg synkroniseringsworker og normalisert datalagring.
- Bygg de tre hovedsidene.
- Implementer eksport, frakobling og sletting.
- Legg til minimumstester og produksjonslogging uten persondata/secrets.
- Deploy en begrenset beta.

**Leveranse:** Andre Elvia-privatkunder kan opprette konto, legge inn eget token og se egne data.

### Fase 2 – produktvalidering

- Test med et lite antall frivillige brukere.
- Observer hvor tokenflyten stopper opp.
- Finn hvilke grafer som faktisk blir brukt og forstått.
- Mål aktivering, vellykket tilkobling, synkroniseringsfeil og returbruk.
- Forbedre språk, veiledning og tillitssignaler.
- Kontakt Elhub med konkret trafikk- og produktgrunnlag.

### Fase 3 – Elhub-produksjon

- Etabler nødvendig selskap/aktørrolle og avtaler.
- Skaff GLN, Maskinporten-oppsett og sertifikater.
- Implementer og test Elhub-provider.
- Erstatt primær onboarding med ID-porten/Elhub-samtykke.
- Behold manuelle providers kun hvis de fortsatt har en dokumentert verdi.

## 14. Akseptansekriterier for fase 1

Fase 1 er vellykket når:

- En ny bruker forstår på landingssiden at Minstrøm er uavhengig og hva prototypen krever.
- Brukeren kan opprette konto og fullføre Elvia-tokenveiledningen.
- Ugyldige tokens avvises med en forståelig beskjed.
- Gyldige tokens lagres kryptert og vises aldri igjen.
- Brukeren kan hente og se egne, ekte måleverdier.
- Dashboardet fungerer på mobil og desktop.
- Synkronisering tåler gjentatte kjøringer uten duplikater.
- Korrigerte måleverdier kan oppdateres.
- Brukeren kan koble fra datakilden.
- Brukeren kan slette konto, token og lagrede forbruksdata.
- Ingen token eller komplett målepunkt-ID finnes i klientlagring, URL-er eller logger.
- En framtidig Elhub-provider kan legges til uten å endre dashboardets datakontrakt.

## 15. Åpne spørsmål for første sparringsrunde

1. Hvor mye historikk returnerer Elvia, og i hvor store perioder kan den hentes?
2. Hvilken tidsoppløsning får nye og eldre måleverdier – time eller 15 minutter?
3. Hva er Elvias dokumenterte og praktiske rate limits?
4. Trengs en egen API subscription key i tillegg til personlig token?
5. Inneholder API-et målepunktinformasjon nok til automatisk navngivning og områdevalg?
6. Hvor raskt blir gårsdagens verdier tilgjengelige?
7. Hvilke `verified`-endringer ser vi i praksis?
8. Hvilke tre grafer gir mest verdi uten å overvelde brukeren?
9. Skal kostnadsestimat inn i fase 1, eller skal første versjon være ren kWh-visning?
10. Skal autentisering være magic link, passord eller passkey?
11. Hvor lenge skal historikk lagres lokalt når kilden også lagrer data?
12. Hvilken konkret, bærekraftig modell kan finansiere Elhub-avgift og drift uten leverandørbias?

## 16. Beslutninger som er tatt

- Arbeidsnavnet er **Minstrøm**.
- Kjernebudskapet er uavhengig innsyn i eget strømforbruk.
- Første versjon er gratis og ærlig om at den er en prototype.
- Fase 1 bruker brukerskapte tokens og støtter flere brukere, ikke bare grunnleggerens måler.
- Elvia er første provider fordi Elvia tilbyr personlig MeterValue API-token til privatkunder.
- Arkitekturen skal være provider-uavhengig fra starten.
- Den langsiktige onboardingen er Elhub + ID-porten uten manuell tokenhåndtering.
- Frontend bygges med React og Vite.
- Backend bygges med Node.js og Express.
- Løsningen bygges som TypeScript-monorepo med delte kontrakter.
- Dashboardets endelige innhold avgjøres etter en dataspike og sparringsrunde.
- Automatisk bytte og fakturabetaling ligger utenfor første versjon.

---

## Prosjektets ledestjerne

Når vi er usikre på et produkt- eller teknologivalg, skal vi spørre:

> Gjør dette det enklere for en vanlig strømkunde å forstå og kontrollere sitt eget forbruk, uten å gjøre brukeren mer avhengig av et strømselskap eller av Minstrøm?

Hvis svaret er nei, hører funksjonen sannsynligvis ikke hjemme i kjernen av produktet.
