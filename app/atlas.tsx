"use client";
import { useMemo, useState, useEffect, useDeferredValue } from "react";
import {
  Orbit,
  MapPin,
  Moon,
  Search,
  ArrowUpRight,
  CalendarDays,
  Focus,
  RotateCcw,
  ChevronRight,
  Info,
  Stars,
  LoaderCircle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  BarChart,
  Bar,
} from "recharts";
import { it } from "date-fns/locale";
import { HorizonFilter, DirectionDetails } from "./horizon";
import { ErrorBoundary } from "@/components/error-boundary";
import { cardinal, type Sector } from "@/lib/sky";
import {
  objects,
  scopes,
  fov,
  fmt,
  distanceText,
  makeNight,
  targetNight,
  seasonal,
  surfaceBrightness,
  photoAdvice,
  surveyURL,
  clock,
  DEG,
  type DSO,
  type ScopeId,
  type TargetNight,
} from "@/lib/sky";

function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="atlas-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function frameFit(o: DSO, scope: ScopeId, angle: number) {
  if (!o.major || !o.minor) return null;
  const f = fov(scope),
    a = o.major / 60 / 2,
    b = o.minor / 60 / 2,
    t = (o.pa - angle) * DEG;
  return (
    2 * Math.sqrt(a * a * Math.sin(t) ** 2 + b * b * Math.cos(t) ** 2) <= f.width &&
    2 * Math.sqrt(a * a * Math.cos(t) ** 2 + b * b * Math.sin(t) ** 2) <= f.height
  );
}
function FovView({ o, scope }: { o: DSO; scope: ScopeId }) {
  const [angle, setAngle] = useState(0),
    [scale, setScale] = useState("1"),
    [attempt, setAttempt] = useState(0);
  const f = fov(scope),
    field = Math.min(20, Math.max(5.8, ((o.major ?? 0) / 60) * 1.22)) / Number(scale),
    url = surveyURL(o, field);
  const [loaded, setLoaded] = useState(""),
    [failed, setFailed] = useState("");
  const key = url + "#" + attempt,
    ok = loaded === key,
    err = failed === key;
  useEffect(() => {
    const timer = setTimeout(() => setFailed(key), 30000);
    return () => clearTimeout(timer);
  }, [key]);
  const proj = (d: number) => (Math.tan((d / 2) * DEG) / Math.tan((field / 2) * DEG)) * 1000;
  const w = proj(f.width),
    h = proj(f.height),
    fit = frameFit(o, scope, angle);
  return (
    <div className="fov-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Simulatore di campo</p>
          <h3>Il tuo Seestar, su cielo reale</h3>
        </div>
        <span className="tag">DSS2 · ottico</span>
      </div>
      <div className="sky-view">
        {/* The survey frame is fetched live from CDS and this view also ships in the
       portable `file://` release, where next/image has no optimizer to call. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={key}
          src={url + (attempt ? "&retry=" + attempt : "")}
          alt={"Campo astronomico DSS2 centrato su " + o.key}
          onLoad={() => setLoaded(key)}
          onError={() => setFailed(key)}
          className={ok ? "ready" : ""}
        />
        {!ok && (
          <div className="survey-status">
            {err ? (
              <>
                <Info size={22} />
                <strong>Survey non disponibile</strong>
                <span>
                  La geometria del campo resta valida. Nessuna immagine simulata del cielo.
                </span>
                <button onClick={() => setAttempt(attempt + 1)}>Riprova immagine</button>
              </>
            ) : (
              <>
                <LoaderCircle className="spin" size={24} />
                <span>Caricamento survey astronomica…</span>
              </>
            )}
          </div>
        )}
        <svg
          viewBox="0 0 1000 1000"
          role="img"
          aria-label={
            "Campo " +
            scopes[scope].name +
            ": " +
            f.width.toFixed(2) +
            " per " +
            f.height.toFixed(2) +
            " gradi"
          }
        >
          <defs>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="white" strokeOpacity=".075" />
            </pattern>
          </defs>
          <rect width="1000" height="1000" fill="url(#grid)" />
          {o.major && o.minor && (
            <ellipse
              cx="500"
              cy="500"
              rx={proj(o.minor / 60) / 2}
              ry={proj(o.major / 60) / 2}
              transform={"rotate(" + -o.pa + " 500 500)"}
              stroke="#f6c769"
              strokeWidth="2"
              strokeDasharray="8 7"
              fill="none"
            />
          )}
          <g transform={"rotate(" + -angle + " 500 500)"}>
            <rect
              x={500 - w / 2}
              y={500 - h / 2}
              width={w}
              height={h}
              fill="#71e5ff0b"
              stroke="#78e5ff"
              strokeWidth="3"
            />
            <path
              d={`M ${500 - w / 2} ${500 - h / 2 + 24} v -24 h 24 M ${500 + w / 2 - 24} ${500 - h / 2} h 24 v 24 M ${500 - w / 2} ${500 + h / 2 - 24} v 24 h 24 M ${500 + w / 2 - 24} ${500 + h / 2} h 24 v -24`}
              fill="none"
              stroke="#c7f8ff"
              strokeWidth="6"
            />
          </g>
          <path
            d="M 485 500 h 30 M 500 485 v 30"
            stroke="#fff"
            strokeOpacity=".8"
            strokeWidth="2"
          />
          <text x="500" y="48" textAnchor="middle" fill="white" fontSize="24">
            N
          </text>
          <text x="30" y="510" fill="white" fontSize="24">
            E
          </text>
        </svg>
        <div className="fov-label">
          <Focus size={15} />
          {scopes[scope].name}
          <strong>
            {fmt(f.width, 2)}° × {fmt(f.height, 2)}°
          </strong>
        </div>
      </div>
      <div className="frame-controls">
        <div className="rotation">
          <label>
            Angolo di posizione <b>{angle}°</b>
          </label>
          <Slider
            aria-label="Angolo di posizione del campo"
            min={0}
            max={180}
            step={1}
            value={[angle]}
            onValueChange={(v) => setAngle(v[0])}
          />
        </div>
        <Choice
          label="Zoom della mappa"
          value={scale}
          onChange={setScale}
          options={[
            ["1", "Campo largo"],
            ["2", "Zoom ×2"],
            ["4", "Zoom ×4"],
          ]}
        />
        <button
          className="icon-btn"
          aria-label="Ripristina inquadratura"
          onClick={() => {
            setAngle(0);
            setScale("1");
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className={"fit-note " + (fit === false ? "warning" : "")}>
        <span>
          {fit === null
            ? "Dimensioni non disponibili"
            : fit
              ? "Sagoma catalogata contenuta nel singolo campo"
              : "Sagoma oltre il campo: valuta rotazione o mosaico"}
        </span>
        <b>{fmt(f.scale, 2)}″/px</b>
      </div>
      <p className="caption">
        Ciano: sensore nativo, formato verticale. Giallo: ellisse delle dimensioni catalogate, non
        il limite esatto della nebulosità. Nord in alto, est a sinistra; PA da nord verso est.
        Rotazione geometrica, non un comando al telescopio. In alt-az il campo ruota; crop e mosaici
        non sono simulati.
      </p>
      <p className="caption">
        DSS2/STScI via CDS HiPS2FITS: fotografie di survey, non una previsione di dettaglio, colore
        o rumore ottenibile con Seestar.{" "}
        <a href={url} target="_blank" rel="noreferrer">
          Apri survey ↗
        </a>
      </p>
    </div>
  );
}
function Details({
  r,
  day,
  minAlt,
  scope,
  sector,
}: {
  r: TargetNight;
  day: string;
  minAlt: number;
  scope: ScopeId;
  sector: Sector;
}) {
  const o = r.o,
    year = Number(day.slice(0, 4));
  const seasons = useMemo(() => seasonal(o, year, minAlt, sector), [o, year, minAlt, sector]),
    best = Math.max(...seasons.map((s) => s.hours));
  const bestMonths = seasons
    .filter((s) => best > 0 && s.hours >= best * 0.8)
    .map((s) => s.label)
    .join(" · ");
  const maxPossible = 90 - Math.abs(44.6471 - o.dec),
    sb = surfaceBrightness(o);
  const chart = r.curve
    .filter((p) => p.sun < 5)
    .map((p) => ({ ...p, alt: Math.round(p.alt * 10) / 10, moon: Math.round(p.moon * 10) / 10 }));
  const firstDark = chart.find((p) => p.sun < -18),
    lastDark = [...chart].reverse().find((p) => p.sun < -18);
  return (
    <article className="object-panel">
      <header className="object-title">
        <div>
          <p className="eyebrow">
            {o.key} <span> / {o.kind}</span>
          </p>
          <h2>{o.name}</h2>
          <p className="aliases">{o.aliases.join(" · ")}</p>
        </div>
        <div className="score">
          <strong>{r.score}</strong>
          <span>/100 questa notte</span>
        </div>
      </header>
      {maxPossible <= 0 ? (
        <div className="notice warning">
          Non sorge mai da Modena: declinazione {fmt(o.dec, 1)}°. Rimane consultabile nell’atlante.
        </div>
      ) : r.hours === 0 ? (
        <div className="notice warning">
          Nessuna finestra con Sole sotto −18° e oggetto sopra {minAlt}° nel settore scelto, nella
          notte selezionata.
        </div>
      ) : (
        <div className="notice">
          <Stars size={17} />
          <span>
            {fmt(r.hours)} h utili sopra {minAlt}° · massimo utile {fmt(r.peak, 0)}° ·{" "}
            {cardinal(r.peakAz)} {fmt(r.peakAz, 0)}° alle {clock(r.peakTime)}
          </span>
        </div>
      )}
      <div className="facts-grid">
        <div>
          <span>Distanza ≈</span>
          <strong>{distanceText(o.distance)}</strong>
        </div>
        <div>
          <span>Magnitudine apparente</span>
          <strong>
            {o.mag === null ? "Non disponibile" : fmt(o.mag, 2) + " (" + o.band + ")"}
          </strong>
        </div>
        <div>
          <span>Dimensioni angolari</span>
          <strong>
            {o.major ? fmt(o.major, 1) + "′ × " + fmt(o.minor, 1) + "′" : "Non disponibili"}
          </strong>
        </div>
        <div>
          <span>Brillanza media stimata</span>
          <strong>{sb ? fmt(sb, 1) + " mag/arcsec²" : "Non disponibile"}</strong>
        </div>
        <div>
          <span>Coordinate J2000</span>
          <strong>
            {fmt(o.ra / 15, 4)} h / {fmt(o.dec, 4)}°
          </strong>
        </div>
        <div>
          <span>Morfologia / classe</span>
          <strong>{o.morphology || o.kind}</strong>
        </div>
      </div>
      <p className="caption">
        Magnitudine: valori più piccoli indicano più luce integrata, non necessariamente un soggetto
        più facile. La brillanza media deriva da magnitudine e area ellittica e dipende dalla banda;
        non è una luminosità intrinseca. Distanze e dimensioni sono stime di catalogo.
      </p>
      <DirectionDetails r={r} />
      <ErrorBoundary area="Il simulatore di campo" resetKey={o.id + scope}>
        <FovView o={o} scope={scope} />
      </ErrorBoundary>
      <section className="night-detail">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Modena · Europe/Rome</p>
            <h3>La finestra di questa notte</h3>
          </div>
          <span className="tag">Soglia {minAlt}°</span>
        </div>
        <div className="window-list">
          {r.windows.length ? (
            r.windows.map((w) => (
              <span key={w.start}>
                {clock(w.start)} → {clock(w.end)}
              </span>
            ))
          ) : (
            <span>Nessuna finestra utile</span>
          )}
        </div>
        <ChartContainer
          config={{
            alt: { label: o.key, color: "#78e5ff" },
            moon: { label: "Luna", color: "#b09dfc" },
          }}
          className="altitude-chart"
        >
          <LineChart
            accessibilityLayer
            data={chart}
            margin={{ top: 15, right: 15, bottom: 5, left: -15 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="ms"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => clock(v)}
              minTickGap={50}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[-20, 90]}
              ticks={[0, 30, 60, 90]}
              tickFormatter={(v) => v + "°"}
              tick={{ fontSize: 12 }}
            />
            {firstDark && lastDark && (
              <ReferenceArea x1={firstDark.ms} x2={lastDark.ms} fill="#78e5ff" fillOpacity={0.04} />
            )}
            <ReferenceLine y={minAlt} stroke="#7f95ad" strokeDasharray="4 4" />
            <ReferenceLine y={0} stroke="#4b576a" />
            <ChartTooltip
              labelFormatter={(v) => clock(Number(v))}
              formatter={(v, n) => [fmt(Number(v)) + "°", n === "alt" ? o.key : "Luna"]}
              contentStyle={{ background: "#101a2c", border: "1px solid #334155", color: "white" }}
            />
            <Line
              type="monotone"
              dataKey="alt"
              stroke="#78e5ff"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="moon"
              stroke="#b09dfc"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
        <p className="caption">
          <span className="cyan">Oggetto: ciano</span> ·{" "}
          <span className="lilac">Luna: viola tratteggiato</span> · fondo azzurro: buio astronomico.
          Campioni ogni 15 minuti; dopo mezzanotte si intende il giorno successivo. Separazione
          minima dalla Luna nella finestra utile:{" "}
          <b>
            {r.moonSeparation === null
              ? "Luna assente / nessuna finestra"
              : fmt(r.moonSeparation, 0) + "°"}
          </b>
          .
        </p>
      </section>
      <section className="season-detail">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Stagionalità {year}</p>
            <h3>
              {maxPossible <= 0
                ? "Non osservabile da Modena"
                : best > 0
                  ? "Mesi migliori: " + bestMonths
                  : "Nessuna finestra nel settore e sopra soglia"}
            </h3>
          </div>
        </div>
        <ChartContainer
          config={{ hours: { label: "Ore utili", color: "#78e5ff" } }}
          className="season-chart"
        >
          <BarChart
            data={seasons}
            accessibilityLayer
            margin={{ top: 5, right: 0, bottom: 0, left: -25 }}
          >
            <XAxis dataKey="label" interval={0} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v + "h"} />
            <ChartTooltip
              formatter={(v) => [fmt(Number(v)) + " h", "Buio sopra soglia"]}
              contentStyle={{ background: "#101a2c", border: "1px solid #334155" }}
            />
            <Bar dataKey="hours" fill="#78e5ff" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
        <p className="caption">
          Ore sopra {minAlt}° con Sole sotto −18°, nel settore scelto, calcolate il 15 di ogni mese
          senza penalità lunare. “Migliori”: almeno l’80% del massimo annuo. Altezza massima teorica
          al transito: {fmt(maxPossible, 0)}°; edifici e ostacoli locali non inclusi.
        </p>
      </section>
      <section className="advice">
        <h3>Indicazioni di ripresa</h3>
        <p>{photoAdvice(o)}</p>
        {o.major && (o.major * 60) / fov(scope).scale < 120 && (
          <p className="warning">
            Soggetto piccolo: circa {fmt((o.major * 60) / fov(scope).scale, 0)} pixel sul lato
            maggiore al campionamento nativo. Non aspettarti i dettagli delle immagini Hubble.
          </p>
        )}
      </section>
      <div className="object-sources">
        <span>Fonte distanza: {o.distanceSource}</span>
        <a href={o.distanceUrl} target="_blank" rel="noreferrer">
          Dati originali <ArrowUpRight size={14} />
        </a>
        <a
          href={
            "https://simbad.cds.unistra.fr/simbad/sim-id?Ident=" +
            encodeURIComponent(
              o.aliases.find((a) => a.startsWith("NGC") || a.startsWith("IC")) || o.key,
            )
          }
          target="_blank"
          rel="noreferrer"
        >
          SIMBAD <ArrowUpRight size={14} />
        </a>
      </div>
    </article>
  );
}
export default function Atlas({
  initialDate,
  localMode = false,
}: {
  initialDate: string;
  localMode?: boolean;
}) {
  const [sector, setSector] = useState<Sector>({ start: 0, span: 360 });
  const [day, setDay] = useState(initialDate),
    [dateOpen, setDateOpen] = useState(false),
    [scope, setScope] = useState<ScopeId>("s50");
  const [mode, setMode] = useState("night"),
    [catalog, setCatalog] = useState("all"),
    [type, setType] = useState("deep"),
    [query, setQuery] = useState(""),
    [minAlt, setMinAlt] = useState("30");
  const [selected, setSelected] = useState(objects.find((o) => o.messier === 31)!.id);
  const n = useMemo(() => makeNight(day), [day]);
  // Canonical sector identity: the memos below sweep 248 objects × 96 samples,
  // so they must not re-run when a caller hands back an equal-valued sector.
  const { start: sectorStart, span: sectorSpan } = sector;
  const nightSector = useMemo(
    () => ({ start: sectorStart, span: sectorSpan }),
    [sectorStart, sectorSpan],
  );
  // Seasonality is another ~12 full-night sweeps feeding a chart nobody reads
  // mid-drag, so let the ranked list repaint first and settle the panel after.
  const detailSector = useDeferredValue(nightSector);
  const ranked = useMemo(
    () =>
      objects
        .map((o) => targetNight(o, n, Number(minAlt), scope, nightSector))
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.hours - a.hours ||
            a.o.key.localeCompare(b.o.key, "it", { numeric: true }),
        ),
    [n, minAlt, scope, nightSector],
  );
  const filtered = useMemo(() => {
    // Normalise the query once, not once per catalogue entry.
    const q = query
      .toLowerCase()
      .replace(/messier/g, "m")
      .replace(/caldwell/g, "c")
      .replace(/\s/g, "");
    return ranked.filter((r) => {
      const o = r.o;
      return (
        (mode !== "night" || r.score > 0) &&
        (sectorSpan === 360 || r.hours >= 0.5) &&
        (catalog === "all" ||
          (catalog === "M" && o.messier) ||
          (catalog === "C" && o.caldwell) ||
          (catalog === "extra" && !o.messier && !o.caldwell)) &&
        (type === "all" ||
          (type === "deep" && ["nebula", "galaxy"].includes(o.group)) ||
          o.group === type) &&
        (!q ||
          [o.name, o.kind, ...o.aliases].join(" ").toLowerCase().replace(/\s/g, "").includes(q))
      );
    });
  }, [ranked, mode, catalog, type, query, sectorSpan]);
  const rows =
    mode === "catalog"
      ? [...filtered].sort((a, b) => objects.indexOf(a.o) - objects.indexOf(b.o))
      : filtered;
  // Derive the effective selection during render instead of syncing it from an
  // effect: when the filters drop the selected object the panel falls back to the
  // first visible row in the same pass, so it can never show an object the list
  // has already filtered out. The user's own pick is kept, so relaxing a filter
  // brings their object back rather than stranding them on rows[0].
  const activeId = rows.some((r) => r.o.id === selected) ? selected : rows[0]?.o.id;
  const current = activeId ? ranked.find((r) => r.o.id === activeId) : undefined;
  const calendarDate = new Date(day + "T12:00:00");
  function pickDate(d: string) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
      Number(d.slice(0, 4)) < 2000 ||
      Number(d.slice(0, 4)) > 2100
    )
      return;
    setDay(d);
    setDateOpen(false);
  }
  const choose = (id: string) => {
    setSelected(id);
    if (window.innerWidth < 1000)
      document
        .getElementById("object-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <main className="atlas-app">
      <header className="atlas-header">
        <a className="atlas-brand" href={localMode ? "./index.html" : "/"}>
          <span className="brand-mark">
            <Orbit />
          </span>
          <span>
            Atlante <b>Deep Sky</b>
          </span>
        </a>
        <nav>
          <a href={localMode ? "./morfologia.html" : "/morfologia"}>
            Tipologie di galassie <ArrowUpRight size={14} />
          </a>
          <a href="#method">Metodo e fonti</a>
        </nav>
        <span className="location">
          <MapPin size={15} />
          Modena, Italia <small>44,65° N · 10,93° E</small>
        </span>
      </header>
      <div className="atlas-workspace">
        <div className="atlas-intro">
          <div>
            <p className="eyebrow">Il cielo, dalla tua prospettiva</p>
            <h1>Cosa fotografiamo stanotte?</h1>
            <p>248 schede · Messier 1–110 · Caldwell 1–109 · altri NGC, IC, Sharpless e Barnard.</p>
          </div>
          <span className="atlas-count">
            <b>110 + 109</b>
            <span>cataloghi completi</span>
          </span>
        </div>
        <section className="planner-controls" aria-label="Impostazioni della notte">
          <div>
            <label>Notte che inizia il</label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <button className="date-button">
                  <CalendarDays size={17} />
                  {calendarDate.toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-3">
                <Calendar
                  mode="single"
                  locale={it}
                  selected={calendarDate}
                  defaultMonth={calendarDate}
                  captionLayout="dropdown"
                  startMonth={new Date(2000, 0)}
                  endMonth={new Date(2100, 11)}
                  onSelect={(d) => {
                    if (d)
                      pickDate(
                        d.getFullYear() +
                          "-" +
                          String(d.getMonth() + 1).padStart(2, "0") +
                          "-" +
                          String(d.getDate()).padStart(2, "0"),
                      );
                  }}
                />
                <label className="date-input-label">
                  Oppure inserisci una data
                  <Input
                    type="date"
                    aria-label="Data della notte"
                    min="2000-01-01"
                    max="2100-12-31"
                    value={day}
                    onInput={(e) => pickDate(e.currentTarget.value)}
                  />
                </label>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label>Telescopio · camera principale</label>
            <Choice
              label="Telescopio"
              value={scope}
              onChange={(s) => setScope(s as ScopeId)}
              options={[
                ["s30", "Seestar S30 Pro"],
                ["s50", "Seestar S50 Pro"],
              ]}
            />
          </div>
          <div>
            <label>Altezza minima</label>
            <Choice
              label="Altezza minima"
              value={minAlt}
              onChange={setMinAlt}
              options={[
                ["20", "20° · orizzonte libero"],
                ["30", "30° · consigliata"],
                ["40", "40° · più selettiva"],
              ]}
            />
          </div>
          <div className="night-summary">
            <Moon size={21} />
            <div>
              <strong>Luna {fmt(n.moonLight * 100, 0)}%</strong>
              <span>illuminazione a mezzanotte</span>
            </div>
          </div>
          <div className="night-summary">
            <Stars size={21} />
            <div>
              <strong>{fmt(n.dark.length * 0.25)} h di buio</strong>
              <span>
                {n.dark.length
                  ? clock(n.dark[0].ms) + " – " + clock(n.dark.at(-1)!.ms + 15 * 60000)
                  : "Nessun buio astronomico"}
              </span>
            </div>
          </div>
        </section>
        <HorizonFilter sector={sector} onChange={setSector} />
        <div className="atlas-columns">
          <aside className="catalog-panel">
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="catalog-tabs">
                <TabsTrigger value="night">Questa notte</TabsTrigger>
                <TabsTrigger value="catalog">Tutto l’atlante</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="search-field">
              <Search size={17} />
              <Input
                aria-label="Cerca un oggetto"
                placeholder="M42, C20, Cuore…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="catalog-filters">
              <Choice
                label="Catalogo"
                value={catalog}
                onChange={setCatalog}
                options={[
                  ["all", "Tutti i cataloghi"],
                  ["M", "Messier"],
                  ["C", "Caldwell"],
                  ["extra", "Altri NGC / IC / Sh2"],
                ]}
              />
              <Choice
                label="Tipo di oggetto"
                value={type}
                onChange={setType}
                options={[
                  ["deep", "Nebulose e galassie"],
                  ["nebula", "Nebulose"],
                  ["galaxy", "Galassie"],
                  ["cluster", "Ammassi"],
                  ["other", "Altri oggetti"],
                  ["all", "Tutte le tipologie"],
                ]}
              />
            </div>
            <div className="results-heading">
              <span>
                {rows.length} oggetti {mode === "night" ? "utili" : "in elenco"}
              </span>
              <span>{mode === "night" ? "Per idoneità ↓" : "Per catalogo"}</span>
            </div>
            <div className="object-list" aria-label="Elenco degli oggetti">
              {!rows.length ? (
                <div className="empty-state">
                  <Orbit size={28} />
                  <h3>Nessun oggetto corrisponde</h3>
                  <p>Cambia settore o data, abbassa la soglia oppure ripristina tutto l’atlante.</p>
                  <button
                    onClick={() => {
                      setQuery("");
                      setCatalog("all");
                      setType("deep");
                      setMode("catalog");
                      setSector({ start: 0, span: 360 });
                    }}
                  >
                    Mostra l’atlante
                  </button>
                </div>
              ) : (
                rows.map((r, i) => (
                  <button
                    key={r.o.id}
                    className={"object-row " + (activeId === r.o.id ? "selected" : "")}
                    onClick={() => choose(r.o.id)}
                    aria-pressed={activeId === r.o.id}
                  >
                    <span className={"object-symbol " + r.o.group}>
                      {r.o.group === "galaxy" ? (
                        <Orbit size={21} />
                      ) : r.o.group === "nebula" ? (
                        <Stars size={21} />
                      ) : (
                        <Focus size={21} />
                      )}
                    </span>
                    <span className="object-row-info">
                      <strong>
                        {r.o.key} <small>{mode === "night" && i < 3 ? "TOP " + (i + 1) : ""}</small>
                      </strong>
                      <span>{r.o.name === r.o.key ? r.o.kind : r.o.name}</span>
                      <small>
                        {r.hours
                          ? fmt(r.hours) +
                            " h · " +
                            fmt(r.peak, 0) +
                            "° max · " +
                            cardinal(r.peakAz)
                          : r.o.dec < -45.3529
                            ? "Non sorge da Modena"
                            : "Fuori finestra"}
                        {r.o.mag !== null ? " · mag " + fmt(r.o.mag, 1) : ""}
                      </small>
                    </span>
                    <span className="row-score">
                      {r.score}
                      <ChevronRight size={14} />
                    </span>
                  </button>
                ))
              )}
            </div>
            <p className="catalog-footnote">
              I cataloghi comprendono anche ammassi: seleziona “Tutte le tipologie” per consultarli.
              C14 ha due componenti. Gli oggetti australi non visibili da Modena sono esclusi solo
              dai suggerimenti notturni.
            </p>
          </aside>
          <div id="object-detail">
            {current ? (
              <ErrorBoundary area="La scheda dell’oggetto" resetKey={current.o.id}>
                <Details
                  key={current.o.id}
                  r={current}
                  day={day}
                  minAlt={Number(minAlt)}
                  scope={scope}
                  sector={detailSector}
                />
              </ErrorBoundary>
            ) : (
              <div className="object-panel">
                <h2>Nessun oggetto nel settore selezionato</h2>
                <p>Cambia settore, data o altri filtri per trovare una finestra utile.</p>
              </div>
            )}
          </div>
        </div>
        <section id="method" className="method-panel">
          <div>
            <p className="eyebrow">Trasparenza dei calcoli</p>
            <h2>Un piano astronomico, non una previsione meteo.</h2>
            <p>
              Punteggio 0–100 euristico: 50% durata utile, 35% altezza media, 15% magnitudine;
              penalità per Luna e oggetti piccoli rispetto al campionamento. Occorrono almeno 30
              minuti di finestra. Non misura il rapporto segnale/rumore e non include nuvole,
              seeing, ostacoli, umidità o inquinamento luminoso locale.
            </p>
            <p>
              Coordinate J2000 precesse alla data con Astronomy Engine; Sole e Luna topocentrici,
              orizzonte geometrico. Buio: Sole sotto −18°. Campionamento ogni 15 minuti, accuratezza
              temporale indicativa ±15 minuti. Orari Europe/Rome con cambi di ora.
            </p>
          </div>
          <div>
            <h3>Strumenti e provenienza</h3>
            <p>
              <a href={scopes[scope].source} target="_blank" rel="noreferrer">
                {scopes[scope].name} · specifiche ZWO ↗
              </a>
              <br />
              {scopes[scope].aperture} mm · {scopes[scope].focal} mm · {scopes[scope].sensor}
              <br />
              2160 × 3840 px · pixel 2,9 μm · singolo frame senza crop.
            </p>
            <p>
              FOV = 2 atan(dimensione sensore / 2f). I 4,6° e 2,8° pubblicizzati sono
              approssimativamente le diagonali, non larghezza × altezza.
            </p>
            <div className="source-links">
              <a
                href="https://github.com/Stellarium/stellarium/blob/master/nebulae/default/catalog.txt"
                target="_blank"
                rel="noreferrer"
              >
                Stellarium DSO 3.23
              </a>
              <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noreferrer">
                Astronomy Engine
              </a>
              <a
                href="https://alasky.cds.unistra.fr/hips-image-services/hips2fits"
                target="_blank"
                rel="noreferrer"
              >
                CDS HiPS2FITS / DSS2
              </a>
              <a href={localMode ? "./data/NOTICE.txt" : "/data/NOTICE.txt"}>Crediti e licenze</a>
              <a href={localMode ? "./data/catalog.json" : "/data/catalog.json"}>
                Dati dell’atlante
              </a>
            </div>
            <p className="caption">
              Dati selezionati e tradotti; valori mancanti indicati esplicitamente. M65 e C68:
              distanza integrata da NASA/Hubble. Le stime possono differire fra fonti.
            </p>
          </div>
        </section>
      </div>
      <footer className="atlas-footer">
        Atlante Deep Sky · Modena <span>Esplora, inquadra, scegli la notte.</span>
      </footer>
    </main>
  );
}
