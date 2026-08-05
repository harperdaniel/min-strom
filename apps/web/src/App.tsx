import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  KeyRound,
  LineChart,
  LogIn,
  LogOut,
  PlugZap,
  ShieldCheck,
  Trash2
} from "lucide-react";
import {
  type AuthUser,
  type DashboardSummaryResponse,
  type ElviaConnectionResponse
} from "@minstrom/api-contract";
import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  fetchDashboard,
  fetchDemoDashboard,
  fetchElviaConnection,
  fetchMe,
  linkElviaToken,
  loginUser,
  logoutUser,
  registerUser
} from "./api.js";
import { createFallbackDashboard } from "./fallback-dashboard.js";

type Route = "/" | "/connect" | "/dashboard";

const trustedRoutes = new Set<Route>(["/", "/connect", "/dashboard"]);

function getRoute(): Route {
  const path = window.location.pathname as Route;
  return trustedRoutes.has(path) ? path : "/";
}

function useRoute() {
  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    const onPopState = () => setRoute(getRoute());

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (nextRoute: Route) => {
    window.history.pushState(null, "", nextRoute);
    setRoute(nextRoute);
  };

  return { navigate, route };
}

export function App() {
  const { navigate, route } = useRoute();

  return (
    <div className="app-shell">
      <Header navigate={navigate} route={route} />
      {route === "/" && <LandingPage navigate={navigate} />}
      {route === "/connect" && <ConnectPage navigate={navigate} />}
      {route === "/dashboard" && <DashboardPage />}
    </div>
  );
}

function Header({
  navigate,
  route
}: {
  navigate: (route: Route) => void;
  route: Route;
}) {
  return (
    <header className="site-header">
      <button className="brand-button" onClick={() => navigate("/")} type="button">
        <span className="brand-mark">M</span>
        <span className="brand-word">Minstrøm</span>
      </button>
      <nav aria-label="Hovedmeny">
        <button
          aria-current={route === "/" ? "page" : undefined}
          onClick={() => navigate("/")}
          type="button"
        >
          Hjem
        </button>
        <button
          aria-current={route === "/connect" ? "page" : undefined}
          onClick={() => navigate("/connect")}
          type="button"
        >
          Koble til
        </button>
        <button
          aria-current={route === "/dashboard" ? "page" : undefined}
          onClick={() => navigate("/dashboard")}
          type="button"
        >
          Dashboard
        </button>
      </nav>
    </header>
  );
}

function LandingPage({ navigate }: { navigate: (route: Route) => void }) {
  const routeStops = [
    {
      color: "coral",
      icon: PlugZap,
      label: "Start",
      title: "Opprett konto",
      text: "Et enkelt brukernavn og passord holder for prototypen."
    },
    {
      color: "mint",
      icon: KeyRound,
      label: "Elvia",
      title: "Koble datakilden",
      text: "Lim inn personlig token fra Elvia, lagret kryptert hos oss."
    },
    {
      color: "sun",
      icon: Clock3,
      label: "Sync",
      title: "Hent måleverdier",
      text: "Vi normaliserer timesverdier uavhengig av leverandørappen."
    },
    {
      color: "sky",
      icon: LineChart,
      label: "Innsikt",
      title: "Se mønsteret",
      text: "Dashboardet viser topper, rytme og dagsforbruk i klartekst."
    }
  ];

  const promises = [
    {
      icon: ShieldCheck,
      title: "Uavhengig",
      text: "Bygget rundt dine måledata, ikke strømleverandørens agenda."
    },
    {
      icon: Trash2,
      title: "Kontroll",
      text: "Frakobling og sletting bygges inn før offentlig lansering."
    },
    {
      icon: CheckCircle2,
      title: "Ærlig prototype",
      text: "Manuell token-flyt nå, klar vei mot Elhub og ID-porten senere."
    }
  ];

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-kicker" aria-hidden="true">
          <span className="route-dot coral" />
          <span>Minstrøm</span>
          <span className="route-line-short" />
          <span className="route-dot navy" />
          <span>Dine data</span>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">Uavhengig forbruksinnsyn</p>
          <h1>Minstrøm viser hvor strømmen går.</h1>
          <p className="lead">
            Måledataene dine finnes allerede. Vi gjør dem lettere å lese, leke med og
            forstå, uavhengig av hvilken strømleverandør du bruker.
          </p>
          <div className="hero-actions">
            <button
              className="primary-action"
              onClick={() => navigate("/connect")}
              type="button"
            >
              <PlugZap aria-hidden="true" size={20} />
              Kom i gang
            </button>
            <button
              className="secondary-action"
              onClick={() => navigate("/dashboard")}
              type="button"
            >
              <LineChart aria-hidden="true" size={20} />
              Se demo
            </button>
          </div>
        </div>

        <div className="route-board" aria-label="Minstrøm onboarding i fire steg">
          <div className="route-board-track" aria-hidden="true" />
          {routeStops.map((stop, index) => {
            const Icon = stop.icon;

            return (
              <article className={`route-stop ${stop.color}`} key={stop.title}>
                <span className="route-stop-number">{index + 1}</span>
                <div className="route-stop-icon">
                  <Icon aria-hidden="true" size={21} />
                </div>
                <p>{stop.label}</p>
                <h2>{stop.title}</h2>
                <span>{stop.text}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-insight">
        <div className="insight-copy">
          <p className="eyebrow">Fra rådata til retning</p>
          <h2>Et dashboard som føles mer som et kart enn et regneark.</h2>
          <p>
            Første versjon starter med Elvia-token fordi det lar oss hente ekte
            måleverdier nå. Produktet er likevel bygget for at en enklere samtykkeflyt
            kan overta når vi går videre.
          </p>
        </div>

        <div className="energy-map" aria-label="Eksempel på strømforbruk som rutekart">
          <div className="map-header">
            <span>Hjem</span>
            <strong>24,7 kWh</strong>
          </div>
          <div className="map-routes" aria-hidden="true">
            <span className="map-route horizontal coral" />
            <span className="map-route vertical mint" />
            <span className="map-route horizontal sky" />
            <span className="map-route vertical sun" />
            <span className="map-node node-a" />
            <span className="map-node node-b" />
            <span className="map-node node-c" />
            <span className="map-node node-d" />
          </div>
          <div className="map-legend">
            {[
              ["Lav natt", "3,1"],
              ["Morgentopp", "5,8"],
              ["Rolig dag", "2,6"],
              ["Kveld", "8,4"]
            ].map(([label, value]) => (
              <span key={label}>
                <small>{label}</small>
                <strong>{value} kWh</strong>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-statement">
        <p>Oversikt skal ikke være en lojalitetsbonus.</p>
        <h2>
          Du skal kunne forstå hjemmet ditt uten å være låst til appen til selskapet som
          tilfeldigvis fakturerer deg.
        </h2>
      </section>

      <section className="promise-rail" aria-label="Produktløfter">
        {promises.map((promise) => {
          const Icon = promise.icon;

          return (
            <article className="promise-item" key={promise.title}>
              <Icon aria-hidden="true" size={23} />
              <div>
                <h2>{promise.title}</h2>
                <p>{promise.text}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="landing-cta">
        <div>
          <p className="eyebrow">Klar for første måling?</p>
          <h2>Lag konto, koble Elvia, og se hva vi faktisk får ut.</h2>
        </div>
        <button
          className="primary-action"
          onClick={() => navigate("/connect")}
          type="button"
        >
          <ArrowRight aria-hidden="true" size={20} />
          Start onboarding
        </button>
      </section>
    </main>
  );
}

function ConnectPage({ navigate }: { navigate: (route: Route) => void }) {
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [connection, setConnection] = useState<
    ElviaConnectionResponse["connection"] | null
  >(null);
  const [authStatus, setAuthStatus] = useState<string | null>("Sjekker Minstrøm-konto");
  const [token, setToken] = useState("");
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchMe()
      .then(async (result) => {
        if (!isMounted) {
          return;
        }

        setUser(result.user);
        setAuthStatus(
          result.user ? null : "Start med å opprette eller logge inn i Minstrøm."
        );

        if (result.user) {
          await refreshConnection(() => isMounted);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setAuthStatus(
            error instanceof Error ? error.message : "Kunne ikke sjekke innlogging."
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function refreshConnection(canUpdate: () => boolean = () => true) {
    try {
      const result = await fetchElviaConnection();

      if (canUpdate()) {
        setConnection(result.connection);
      }
    } catch {
      if (canUpdate()) {
        setConnection(null);
      }
    }
  }

  async function onAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingAuth(true);
    setAuthStatus(null);

    try {
      const cleanUsername = username.trim();
      const result =
        authMode === "register"
          ? await registerUser(cleanUsername, password)
          : await loginUser(cleanUsername, password);

      setUser(result.user);
      setUsername(result.user.username);
      setPassword("");
      setAuthStatus(
        authMode === "register"
          ? "Minstrøm-kontoen er klar. Nå kan du lime inn Elvia-tokenet."
          : "Du er logget inn i Minstrøm."
      );
      await refreshConnection();
    } catch (error) {
      setAuthStatus(
        error instanceof Error
          ? error.message
          : authMode === "register"
            ? "Kunne ikke opprette Minstrøm-konto."
            : "Kunne ikke logge inn i Minstrøm."
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function onLogout() {
    setAuthStatus(null);

    try {
      await logoutUser();
      setUser(null);
      setConnection(null);
      setToken("");
      setAuthStatus("Du er logget ut av Minstrøm.");
    } catch (error) {
      setAuthStatus(
        error instanceof Error ? error.message : "Kunne ikke logge ut av Minstrøm."
      );
    }
  }

  async function onTokenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanToken = token.trim();

    if (!user) {
      setTokenStatus(
        "Opprett eller logg inn i Minstrøm først. Elvia-innloggingen lager bare tokenet."
      );
      return;
    }

    if (!cleanToken) {
      setTokenStatus("Lim inn tokenet du kopierte fra Elvia.");
      return;
    }

    setIsSubmittingToken(true);
    setTokenStatus(null);

    try {
      const result = await linkElviaToken(cleanToken);
      setConnection(result.connection);
      setToken("");
      setTokenStatus(describeSyncResult(result.sync));
    } catch (error) {
      setTokenStatus(
        error instanceof Error ? error.message : "Kunne ikke koble Elvia."
      );
    } finally {
      setIsSubmittingToken(false);
    }
  }

  return (
    <main className="connect-layout">
      <section className="connect-flow">
        <div className="connect-intro">
          <p className="eyebrow">Koble til Elvia</p>
          <h1>Tre steg. Ett sted. Ferdig.</h1>
          <p className="lead">
            Elvia-tokenet henter måledataene dine. Minstrøm-kontoen trengs bare for å
            lagre koblingen og vise dataene dine neste gang du kommer tilbake.
          </p>
        </div>

        <section className={`flow-step ${user ? "complete" : "active"}`}>
          <span className="flow-step-number">1</span>
          <div className="flow-step-body">
            <div className="flow-step-heading">
              <div>
                <p className="step-label">Minstrøm-konto</p>
                <h2>Opprett brukernavn og passord</h2>
              </div>
              {user && <span className="status-pill">Klar</span>}
            </div>

            {user ? (
              <div className="account-summary">
                <p>
                  Du er innlogget i Minstrøm som <strong>{user.username}</strong>.
                </p>
                <button
                  className="secondary-action"
                  onClick={() => {
                    void onLogout();
                  }}
                  type="button"
                >
                  <LogOut aria-hidden="true" size={18} />
                  Logg ut
                </button>
              </div>
            ) : (
              <form
                className="stacked-form"
                onSubmit={(event) => {
                  void onAuthSubmit(event);
                }}
              >
                <div className="mode-toggle" role="tablist" aria-label="Minstrøm-konto">
                  <button
                    aria-selected={authMode === "register"}
                    onClick={() => setAuthMode("register")}
                    role="tab"
                    type="button"
                  >
                    Opprett
                  </button>
                  <button
                    aria-selected={authMode === "login"}
                    onClick={() => setAuthMode("login")}
                    role="tab"
                    type="button"
                  >
                    Logg inn
                  </button>
                </div>

                <label htmlFor="username">Brukernavn</label>
                <input
                  autoComplete="username"
                  id="username"
                  maxLength={80}
                  minLength={3}
                  name="username"
                  onChange={(event) => setUsername(event.target.value)}
                  pattern="[A-Za-z0-9._-]{3,80}"
                  placeholder="strombruker-1"
                  required
                  title="Bruk minst 3 tegn. Bruk bokstaver, tall, punktum, bindestrek eller understrek."
                  type="text"
                  value={username}
                />
                <p className="field-help">
                  Minst 3 tegn. Ingen mellomrom. Dette er ikke Elvia-brukeren din.
                </p>

                <label htmlFor="password">Passord</label>
                <input
                  autoComplete={
                    authMode === "register" ? "new-password" : "current-password"
                  }
                  id="password"
                  minLength={8}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minst 8 tegn"
                  required
                  type="password"
                  value={password}
                />
                <button
                  className="primary-action full-width"
                  disabled={isSubmittingAuth}
                  type="submit"
                >
                  <LogIn aria-hidden="true" size={18} />
                  {isSubmittingAuth
                    ? "Jobber"
                    : authMode === "register"
                      ? "Opprett Minstrøm-konto"
                      : "Logg inn i Minstrøm"}
                </button>
              </form>
            )}
            {authStatus && <p className="form-status">{authStatus}</p>}
          </div>
        </section>

        <section className="flow-step">
          <span className="flow-step-number">2</span>
          <div className="flow-step-body">
            <div className="flow-step-heading">
              <div>
                <p className="step-label">Elvia-token</p>
                <h2>Finn tokenet hos Elvia</h2>
              </div>
            </div>
            <ol className="token-guide">
              <li>Logg inn på Elvia Min side.</li>
              <li>Gå til kundeforholdet ditt og åpne Tilganger.</li>
              <li>Opprett et personlig token for riktig måler.</li>
              <li>Kopier tokenet med én gang. Elvia viser det bare én gang.</li>
            </ol>
            <p className="warning-text">
              Elvia-innloggingen skjer hos Elvia. Den logger deg ikke inn i Minstrøm.
            </p>
          </div>
        </section>

        <form
          className={`flow-step ${user ? "active" : "locked"}`}
          onSubmit={(event) => {
            void onTokenSubmit(event);
          }}
        >
          <span className="flow-step-number">3</span>
          <div className="flow-step-body">
            <div className="flow-step-heading">
              <div>
                <p className="step-label">Koble data</p>
                <h2>Lim inn tokenet i Minstrøm</h2>
              </div>
              {connection?.status === "ACTIVE" && (
                <span className="status-pill">Koblet</span>
              )}
            </div>

            {connection && (
              <p className="form-status">{describeConnection(connection)}</p>
            )}

            <label htmlFor="elvia-token">Personlig tilgangstoken fra Elvia</label>
            <input
              autoComplete="off"
              disabled={isSubmittingToken}
              id="elvia-token"
              minLength={12}
              name="elvia-token"
              onChange={(event) => setToken(event.target.value)}
              placeholder="Lim inn tokenet fra Elvia her"
              required
              spellCheck={false}
              type="password"
              value={token}
            />
            {!user && (
              <p className="form-status">
                Feltet kan fylles ut, men koblingen lagres først etter steg 1.
              </p>
            )}
            <button
              className="primary-action full-width"
              disabled={!user || isSubmittingToken}
              type="submit"
            >
              <PlugZap aria-hidden="true" size={18} />
              {isSubmittingToken ? "Kobler" : "Koble Elvia"}
            </button>
            {tokenStatus && <p className="form-status">{tokenStatus}</p>}
          </div>
        </form>

        <button
          className="secondary-action connect-dashboard-link"
          onClick={() => navigate("/dashboard")}
          type="button"
        >
          <LineChart aria-hidden="true" size={18} />
          Åpne dashboard
        </button>
      </section>
    </main>
  );
}

function describeSyncResult(sync: {
  meterPointCount: number;
  valueCount: number;
}): string {
  if (sync.valueCount > 0) {
    return `Elvia er koblet. Vi hentet ${sync.valueCount} måleverdier fra ${sync.meterPointCount} måler${
      sync.meterPointCount === 1 ? "" : "e"
    }.`;
  }

  if (sync.meterPointCount > 0) {
    return "Elvia er koblet. Måleverdier hentes direkte fra Elvia når du åpner dashboardet.";
  }

  return "Tokenet ble godtatt, men Elvia returnerte ingen målere ennå.";
}

function describeConnection(connection: ElviaConnectionResponse["connection"]): string {
  if (connection.status === "ACTIVE") {
    return "Elvia er koblet. Egne data hentes direkte fra Elvia.";
  }

  if (connection.status === "LINKED_PENDING_FETCH") {
    return "Elvia er koblet, men vi fant ingen målere ennå.";
  }

  if (connection.status === "ERROR") {
    return "Elvia-koblingen trenger ny kontroll.";
  }

  return "Elvia er ikke koblet ennå.";
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState(createFallbackDashboard);
  const [status, setStatus] = useState("Laster egne data");
  const [yearChartMode, setYearChartMode] = useState<"line" | "bar">("line");

  useEffect(() => {
    let isMounted = true;

    fetchDashboard()
      .then((data) => {
        if (isMounted) {
          setDashboard(data);
          setStatus("Egne Elvia-data");
        }
      })
      .catch(() =>
        fetchDemoDashboard()
          .then((data) => {
            if (isMounted) {
              setDashboard(data);
              setStatus("Demo-data");
            }
          })
          .catch(() => {
            if (isMounted) {
              setStatus("Lokal demo");
            }
          })
      );

    return () => {
      isMounted = false;
    };
  }, []);

  const maxHourly = useMemo(
    () => Math.max(1, ...dashboard.hourly.map((value) => value.valueKwh)),
    [dashboard.hourly]
  );
  const maxDaily = useMemo(
    () => Math.max(1, ...dashboard.daily.map((day) => day.valueKwh)),
    [dashboard.daily]
  );

  return (
    <main className="dashboard-layout">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">{status}</p>
          <h1>{dashboard.meterPoint.name}</h1>
          <p className="lead">
            Forbruk, topper og datakvalitet fra normaliserte måleverdier. Klart nok til
            å skjønne, levende nok til å følge med.
          </p>
        </div>
        <div className="sync-status">
          <Clock3 aria-hidden="true" size={20} />
          Sist synkronisert {formatDateTime(dashboard.lastSuccessfulSyncAt)}
        </div>
      </section>

      <YearConsumptionChart
        mode={yearChartMode}
        monthly={dashboard.monthly}
        setMode={setYearChartMode}
      />

      <section className="metric-grid" aria-label="Nøkkeltall">
        <Metric label="Siste døgn" value={`${dashboard.totals.todayKwh} kWh`} />
        <Metric label="Siste 7 dager" value={`${dashboard.totals.last7DaysKwh} kWh`} />
        <Metric label="Denne måneden" value={`${dashboard.totals.monthKwh} kWh`} />
        <Metric
          label="Høyeste time"
          value={dashboard.peak ? `${dashboard.peak.valueKwh} kWh` : "Ikke nok data"}
        />
      </section>

      <section className="chart-section">
        <div className="chart-heading">
          <h2>Forbruk gjennom døgnet</h2>
          <p>
            Du bruker mest strøm i de timene søylene er høyest. Hvis mønsteret gjentar
            seg, kan samtidige laster som varme, varmtvann og matlaging være en årsak.
          </p>
        </div>
        <div className="hourly-chart" aria-label="Timeverdier">
          {dashboard.hourly.map((value) => (
            <div className="hour-bar" key={value.intervalStart}>
              <span
                className={value.quality === "VERIFIED" ? "verified" : "preliminary"}
                style={
                  {
                    "--bar-height": `${(value.valueKwh / maxHourly) * 100}%`
                  } as CSSProperties
                }
              />
              <small>{formatHour(value.intervalStart)}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="chart-section">
        <div className="chart-heading">
          <h2>Daglig forbruk</h2>
          <p>
            Dagsvisning gjør det enklere å se om endringer skyldes enkelttimer eller en
            faktisk trend over flere dager.
          </p>
        </div>
        <div className="daily-chart" aria-label="Daglige verdier">
          {dashboard.daily.map((day) => (
            <div className="daily-row" key={day.date}>
              <span>{formatShortDate(day.date)}</span>
              <div>
                <span
                  style={
                    {
                      "--bar-width": `${(day.valueKwh / maxDaily) * 100}%`
                    } as CSSProperties
                  }
                />
              </div>
              <strong>{day.valueKwh} kWh</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function YearConsumptionChart({
  mode,
  monthly,
  setMode
}: {
  mode: "line" | "bar";
  monthly: DashboardMonthly;
  setMode: (mode: "line" | "bar") => void;
}) {
  const chart = useMemo(() => createYearChartModel(monthly), [monthly]);

  return (
    <section className="year-chart-section" aria-label="Månedsforbruk så langt i år">
      <div className="chart-heading year-chart-heading">
        <div>
          <p className="eyebrow">Årsforbruk</p>
          <h2>Månedsforbruk så langt i år</h2>
        </div>
        <div className="chart-toolbar">
          <div className="chart-legend" aria-hidden="true">
            <span className="legend-item this-year">I år</span>
            <span className="legend-item last-year">I fjor</span>
            <span className="legend-item estimate">Estimert</span>
          </div>
          <div className="chart-toggle" aria-label="Diagramtype" role="tablist">
            <button
              aria-selected={mode === "line"}
              onClick={() => setMode("line")}
              role="tab"
              type="button"
            >
              <LineChart aria-hidden="true" size={17} />
              Linje
            </button>
            <button
              aria-selected={mode === "bar"}
              onClick={() => setMode("bar")}
              role="tab"
              type="button"
            >
              <BarChart3 aria-hidden="true" size={17} />
              Søyle
            </button>
          </div>
        </div>
      </div>

      {mode === "line" ? (
        <YearLineChart chart={chart} />
      ) : (
        <YearBarChart chart={chart} />
      )}
    </section>
  );
}

type DashboardMonthly = DashboardSummaryResponse["monthly"];

type ChartPoint = {
  label: string;
  value: number;
  x: number;
  y: number;
};

type YearChartModel = {
  estimated: ChartPoint[];
  height: number;
  labels: string[];
  lastYear: ChartPoint[];
  maxValue: number;
  thisYear: ChartPoint[];
  width: number;
};

function YearLineChart({ chart }: { chart: YearChartModel }) {
  return (
    <div className="year-chart-frame line-mode">
      <svg aria-hidden="true" viewBox={"0 0 " + chart.width + " " + chart.height}>
        {createGridLines().map((line) => (
          <line
            className="chart-grid-line"
            key={line}
            x1="44"
            x2="700"
            y1={line}
            y2={line}
          />
        ))}
        <path className="chart-line last-year" d={createSmoothPath(chart.lastYear)} />
        <path className="chart-line this-year" d={createSmoothPath(chart.thisYear)} />
        <path className="chart-line estimate" d={createSmoothPath(chart.estimated)} />
        {[...chart.lastYear, ...chart.thisYear, ...chart.estimated].map(
          (point, index) => (
            <circle
              className="chart-point"
              cx={point.x}
              cy={point.y}
              key={point.label + "-" + point.value + "-" + index}
              r="3.5"
            />
          )
        )}
      </svg>
      <ChartMonthLabels labels={chart.labels} />
    </div>
  );
}

function YearBarChart({ chart }: { chart: YearChartModel }) {
  const maxHeight = 214;

  return (
    <div className="year-chart-frame bar-mode">
      <div className="year-bars" aria-hidden="true">
        {chart.labels.map((label) => {
          const thisYear = chart.thisYear.find((point) => point.label === label);
          const lastYear = chart.lastYear.find((point) => point.label === label);
          const estimate = chart.estimated.find((point) => point.label === label);

          return (
            <div className="year-bar-group" key={label}>
              <span
                className="year-bar this-year"
                style={
                  {
                    "--bar-height":
                      (((thisYear?.value ?? 0) / chart.maxValue) * maxHeight).toFixed(
                        1
                      ) + "px"
                  } as CSSProperties
                }
              />
              <span
                className="year-bar last-year"
                style={
                  {
                    "--bar-height":
                      (((lastYear?.value ?? 0) / chart.maxValue) * maxHeight).toFixed(
                        1
                      ) + "px"
                  } as CSSProperties
                }
              />
              <span
                className="year-bar estimate"
                style={
                  {
                    "--bar-height":
                      (((estimate?.value ?? 0) / chart.maxValue) * maxHeight).toFixed(
                        1
                      ) + "px"
                  } as CSSProperties
                }
              />
            </div>
          );
        })}
      </div>
      <ChartMonthLabels labels={chart.labels} />
    </div>
  );
}

function ChartMonthLabels({ labels }: { labels: string[] }) {
  return (
    <div className="chart-month-labels" aria-hidden="true">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

function createYearChartModel(monthly: DashboardMonthly): YearChartModel {
  const width = 744;
  const height = 300;
  const left = 44;
  const right = 44;
  const top = 26;
  const bottom = 48;
  const labels = monthly.map((month) => month.label);
  const allValues = monthly.flatMap((month) =>
    [month.thisYearKwh, month.lastYearKwh, month.estimatedKwh].filter(
      (value): value is number => typeof value === "number"
    )
  );
  const maxValue = Math.max(1, ...allValues) * 1.12;
  const xForIndex = (index: number) => left + (index * (width - left - right)) / 11;
  const yForValue = (value: number) =>
    height - bottom - (value / maxValue) * (height - top - bottom);
  const toPoint = (label: string, value: number, index: number): ChartPoint => ({
    label,
    value,
    x: xForIndex(index),
    y: yForValue(value)
  });

  return {
    estimated: monthly.flatMap((month, index) =>
      month.estimatedKwh === null
        ? []
        : [toPoint(month.label, month.estimatedKwh, index)]
    ),
    height,
    labels,
    lastYear: monthly.flatMap((month, index) =>
      month.lastYearKwh === null ? [] : [toPoint(month.label, month.lastYearKwh, index)]
    ),
    maxValue,
    thisYear: monthly.flatMap((month, index) =>
      month.thisYearKwh === null ? [] : [toPoint(month.label, month.thisYearKwh, index)]
    ),
    width
  };
}

function createGridLines(): number[] {
  return [0.25, 0.5, 0.75, 1].map((ratio) => 252 - ratio * 214);
}

function createSmoothPath(points: ChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const point = points[0];

    if (!point) {
      return "";
    }

    return (
      "M " + (point.x - 0.1) + " " + point.y + " L " + (point.x + 0.1) + " " + point.y
    );
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return "M " + point.x + " " + point.y;
    }

    const previous = points[index - 1];

    if (!previous) {
      return path;
    }

    const controlDistance = (point.x - previous.x) / 2;

    return (
      path +
      " C " +
      (previous.x + controlDistance) +
      " " +
      previous.y +
      ", " +
      (point.x - controlDistance) +
      " " +
      point.y +
      ", " +
      point.x +
      " " +
      point.y
    );
  }, "");
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "ikke ennå";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Oslo"
  }).format(new Date(value));
}

function formatHour(value: string): string {
  return new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    timeZone: "Europe/Oslo"
  }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Oslo"
  }).format(new Date(`${value}T00:00:00.000Z`));
}
