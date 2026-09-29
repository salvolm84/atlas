"use client";
import { useMemo, useState, useDeferredValue } from "react";
import {
  Orbit,
  MapPin,
  Moon,
  Search,
  ArrowUpRight,
  CalendarDays,
  Focus,
  ChevronRight,
  Stars,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { it } from "date-fns/locale";
import { HorizonFilter } from "./horizon";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  cardinal,
  clock,
  fmt,
  makeNight,
  objects,
  scopes,
  targetNight,
  type ScopeId,
  type Sector,
} from "@/lib/sky";
import { Choice } from "./choice";
import { ObjectDetails } from "./object-details";
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
                <ObjectDetails
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
