import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  KeyRound,
  LineChart,
  LogIn,
  PlugZap,
  ShieldCheck,
  Trash2
} from "lucide-react";
import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState
} from "react";

import { fetchDemoDashboard, requestMagicLink, validateElviaToken } from "./api.js";
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
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);

  async function onEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailStatus(null);

    try {
      await requestMagicLink(email);
      setEmailStatus("Vi sender en innloggingslenke hvis e-posten kan brukes.");
    } catch (error) {
      setEmailStatus(
        error instanceof Error ? error.message : "Kunne ikke sende lenke."
      );
    }
  }

  async function onTokenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingToken(true);
    setTokenStatus(null);

    try {
      const result = await validateElviaToken(token);
      setToken("");
      setTokenStatus(
        result.userMessage ??
          (result.valid
            ? "Tokenet ble validert."
            : "Tokenet kunne ikke valideres akkurat nå.")
      );
    } catch (error) {
      setToken("");
      setTokenStatus(
        error instanceof Error ? error.message : "Kunne ikke validere token."
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
        <form
          className="form-panel"
          onSubmit={(event) => {
            void onEmailSubmit(event);
          }}
        >
          <LogIn aria-hidden="true" size={22} />
          <h2>Konto</h2>
          <label htmlFor="email">E-post</label>
          <input
            autoComplete="email"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="deg@example.no"
            required
            type="email"
            value={email}
          />
          <button className="primary-action full-width" type="submit">
            <ArrowRight aria-hidden="true" size={18} />
            Send lenke
          </button>
          {emailStatus && <p className="form-status">{emailStatus}</p>}
        </form>

        <form
          className="form-panel"
          onSubmit={(event) => {
            void onTokenSubmit(event);
          }}
        >
          <KeyRound aria-hidden="true" size={22} />
          <h2>Elvia-token</h2>
          <label htmlFor="elvia-token">Personlig tilgangstoken</label>
          <input
            autoComplete="off"
            id="elvia-token"
            name="elvia-token"
            onChange={(event) => setToken(event.target.value)}
            placeholder="Lim inn tokenet fra Elvia"
            required
            spellCheck={false}
            type="password"
            value={token}
          />
          <button
            className="primary-action full-width"
            disabled={isSubmittingToken}
            type="submit"
          >
            <PlugZap aria-hidden="true" size={18} />
            {isSubmittingToken ? "Tester" : "Test tilkobling"}
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
