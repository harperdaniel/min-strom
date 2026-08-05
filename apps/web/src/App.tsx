import {
  ArrowRight,
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
import { type AuthUser, type ElviaConnectionResponse } from "@minstrom/api-contract";
import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState
} from "react";

import {
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
        <span>Minstrøm</span>
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
  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Uavhengig forbruksinnsyn</p>
          <h1>Strømforbruket ditt. Ikke strømselskapets app.</h1>
          <p className="lead">
            Se og forstå ditt eget strømforbruk på ett sted, helt gratis og uavhengig av
            hvilken strømleverandør du bruker.
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
        <div className="hero-snapshot" aria-label="Eksempel på forbruksoversikt">
          <div className="snapshot-topline">
            <span>Hjemme</span>
            <strong>24,7 kWh</strong>
          </div>
          <div className="snapshot-bars" aria-hidden="true">
            {[32, 28, 30, 48, 74, 56, 42].map((height, index) => (
              <span
                key={index}
                style={{ "--bar-height": `${height}%` } as CSSProperties}
              />
            ))}
          </div>
          <div className="snapshot-note">
            <Clock3 aria-hidden="true" size={18} />
            Mest forbruk mellom kl. 17 og 18
          </div>
        </div>
      </section>

      <section className="content-band">
        <div className="section-grid">
          <div>
            <p className="eyebrow">Hvorfor</p>
            <h2>Oversikt skal ikke være en lojalitetsbonus.</h2>
          </div>
          <p>
            Minstrøm finnes fordi lokketilbud, uklare påslag og skiftende vilkår gjør
            strøm vanskeligere enn nødvendig. Du skal kunne forstå ditt eget forbruk
            uten å være bundet til appen til selskapet som selger deg strøm.
          </p>
        </div>
      </section>

      <section className="steps-band">
        <h2>Slik fungerer prototypen</h2>
        <div className="steps-grid">
          {[
            "Opprett en Minstrøm-konto.",
            "Velg nettselskapet ditt.",
            "Følg veiledningen og lim inn personlig token.",
            "Se forbruket ditt i dashboardet."
          ].map((step, index) => (
            <div className="step-card" key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="trust-band">
        <div className="trust-item">
          <ShieldCheck aria-hidden="true" size={24} />
          <span>Token vises aldri igjen etter lagring.</span>
        </div>
        <div className="trust-item">
          <Trash2 aria-hidden="true" size={24} />
          <span>Du kan koble fra og slette egne data.</span>
        </div>
        <div className="trust-item">
          <CheckCircle2 aria-hidden="true" size={24} />
          <span>Ingen betalte rangeringer eller skjult leverandørbias.</span>
        </div>
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
  const [authStatus, setAuthStatus] = useState<string | null>("Sjekker innlogging");
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
        setAuthStatus(result.user ? null : "Opprett bruker eller logg inn.");

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
      const result =
        authMode === "register"
          ? await registerUser(username, password)
          : await loginUser(username, password);

      setUser(result.user);
      setPassword("");
      setAuthStatus(
        authMode === "register" ? "Brukeren er opprettet." : "Du er innlogget."
      );
      await refreshConnection();
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Kunne ikke logge inn.");
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
      setAuthStatus("Du er logget ut.");
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Kunne ikke logge ut.");
    }
  }

  async function onTokenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setTokenStatus("Logg inn før du kobler til Elvia.");
      return;
    }

    setIsSubmittingToken(true);
    setTokenStatus(null);

    try {
      const result = await linkElviaToken(token);
      setConnection(result.connection);
      setToken("");
      setTokenStatus(
        result.validation.userMessage ??
          "Elvia-tokenet er lagret. Datahenting kobles på i neste steg."
      );
    } catch (error) {
      setToken("");
      setTokenStatus(
        error instanceof Error ? error.message : "Kunne ikke koble Elvia."
      );
    } finally {
      setIsSubmittingToken(false);
    }
  }

  return (
    <main className="connect-layout">
      <section className="connect-main">
        <p className="eyebrow">Koble til datakilde</p>
        <h1>Start med Elvia nå. Bytt til Elhub-samtykke senere.</h1>
        <p className="lead">
          Første prototype bruker personlig token fra nettselskapet. Det er en
          midlertidig vei inn til dataene, ikke den langsiktige Minstrøm-flyten.
        </p>

        <div className="provider-row" role="list" aria-label="Datakilder">
          <button className="provider-pill active" type="button">
            <PlugZap aria-hidden="true" size={18} />
            Elvia
          </button>
          <button className="provider-pill" disabled type="button">
            <ShieldCheck aria-hidden="true" size={18} />
            Elhub kommer
          </button>
        </div>

        <div className="guide-panel">
          <h2>Elvia-veiledning</h2>
          <ol>
            <li>Logg inn på Elvia Min side.</li>
            <li>Velg riktig kundeforhold og åpne Tilganger.</li>
            <li>Opprett token for riktig måler og kall det gjerne Minstrøm.</li>
            <li>Kopier tokenet med én gang. Elvia viser det bare én gang.</li>
            <li>Lim det inn her og koble til måleren.</li>
          </ol>
          <p className="warning-text">
            Elvia er nettselskapet, ikke nødvendigvis strømleverandøren din. Tokenet er
            en digital nøkkel til måledataene dine.
          </p>
        </div>
      </section>

      <aside className="connect-side">
        <section className="form-panel">
          <LogIn aria-hidden="true" size={22} />
          <h2>Konto</h2>
          {user ? (
            <div className="account-summary">
              <p>
                Innlogget som <strong>{user.username}</strong>
              </p>
              <button
                className="secondary-action full-width"
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
              <div className="mode-toggle" role="tablist" aria-label="Konto">
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
                name="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="daniel"
                required
                type="text"
                value={username}
              />
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
                <ArrowRight aria-hidden="true" size={18} />
                {isSubmittingAuth
                  ? "Jobber"
                  : authMode === "register"
                    ? "Opprett bruker"
                    : "Logg inn"}
              </button>
            </form>
          )}
          {authStatus && <p className="form-status">{authStatus}</p>}
        </section>

        <form
          className="form-panel"
          onSubmit={(event) => {
            void onTokenSubmit(event);
          }}
        >
          <KeyRound aria-hidden="true" size={22} />
          <h2>Elvia-token</h2>
          {connection && (
            <p className="form-status">{describeConnection(connection)}</p>
          )}
          <label htmlFor="elvia-token">Personlig tilgangstoken</label>
          <input
            autoComplete="off"
            disabled={!user || isSubmittingToken}
            id="elvia-token"
            name="elvia-token"
            onChange={(event) => setToken(event.target.value)}
            placeholder={user ? "Lim inn tokenet fra Elvia" : "Logg inn først"}
            required
            spellCheck={false}
            type="password"
            value={token}
          />
          <button
            className="primary-action full-width"
            disabled={!user || isSubmittingToken}
            type="submit"
          >
            <PlugZap aria-hidden="true" size={18} />
            {isSubmittingToken ? "Kobler" : "Koble Elvia"}
          </button>
          {tokenStatus && <p className="form-status">{tokenStatus}</p>}
        </form>

        <button
          className="secondary-action full-width"
          onClick={() => navigate("/dashboard")}
          type="button"
        >
          <LineChart aria-hidden="true" size={18} />
          Åpne demo-dashboard
        </button>
      </aside>
    </main>
  );
}

function describeConnection(connection: ElviaConnectionResponse["connection"]): string {
  if (connection.status === "LINKED_PENDING_FETCH") {
    return "Elvia er koblet. Datahenting venter på neste dataspike.";
  }

  if (connection.status === "ERROR") {
    return "Elvia-koblingen trenger ny kontroll.";
  }

  return "Elvia er ikke koblet ennå.";
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState(createFallbackDashboard);
  const [status, setStatus] = useState("Laster demo");

  useEffect(() => {
    let isMounted = true;

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
      });

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
            Forbruk, topper og datakvalitet vises fra normaliserte måleverdier.
          </p>
        </div>
        <div className="sync-status">
          <Clock3 aria-hidden="true" size={20} />
          Sist synkronisert {formatDateTime(dashboard.lastSuccessfulSyncAt)}
        </div>
      </section>

      <section className="metric-grid" aria-label="Nøkkeltall">
        <Metric label="I dag" value={`${dashboard.totals.todayKwh} kWh`} />
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
