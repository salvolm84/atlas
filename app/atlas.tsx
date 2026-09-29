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
import { enGB } from "date-fns/locale";
import { HorizonFilter } from "./horizon";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  cardinal,
  clock,
  fmt,
  makeNight,
  MODENA,
  neverRises,
  objects,
  scopes,
  targetNight,
  type ScopeId,
  type Site,
  type Sector,
} from "@/lib/sky";
import { Choice } from "./choice";
import { ObjectDetails } from "./object-details";
export default function Atlas({
  initialDate,
  localMode = false,
  site = MODENA,
}: {
  initialDate: string;
  localMode?: boolean;
  site?: Site;
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
  const n = useMemo(() => makeNight(day, site), [day, site]);
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
            Deep Sky <b>Atlas</b>
          </span>
        </a>
        <nav>
          <a href={localMode ? "./morfologia.html" : "/morfologia"}>
            Galaxy types <ArrowUpRight size={14} />
          </a>
          <a href="#method">Method and sources</a>
        </nav>
        <span className="location">
          <MapPin size={15} />
          {site.name}{" "}
          <small>
            {fmt(Math.abs(site.latitude), 2)}° {site.latitude >= 0 ? "N" : "S"} ·{" "}
            {fmt(Math.abs(site.longitude), 2)}° {site.longitude >= 0 ? "E" : "W"}
          </small>
        </span>
      </header>
      <div className="atlas-workspace">
        <div className="atlas-intro">
          <div>
            <p className="eyebrow">The sky, from where you stand</p>
            <h1>What shall we photograph tonight?</h1>
            <p>
              248 entries · Messier 1–110 · Caldwell 1–109 · selected NGC, IC, Sharpless and
              Barnard.
            </p>
          </div>
          <span className="atlas-count">
            <b>110 + 109</b>
            <span>complete catalogues</span>
          </span>
        </div>
        <section className="planner-controls" aria-label="Night settings">
          <div>
            <label>Night beginning</label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <button className="date-button">
                  <CalendarDays size={17} />
                  {calendarDate.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-3">
                <Calendar
                  mode="single"
                  locale={enGB}
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
                  Or type a date
                  <Input
                    type="date"
                    aria-label="Date of the night"
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
            <label>Telescope · main camera</label>
            <Choice
              label="Telescope"
              value={scope}
              onChange={(s) => setScope(s as ScopeId)}
              options={[
                ["s30", "Seestar S30 Pro"],
                ["s50", "Seestar S50 Pro"],
              ]}
            />
          </div>
          <div>
            <label>Minimum altitude</label>
            <Choice
              label="Minimum altitude"
              value={minAlt}
              onChange={setMinAlt}
              options={[
                ["20", "20° · clear horizon"],
                ["30", "30° · recommended"],
                ["40", "40° · more selective"],
              ]}
            />
          </div>
          <div className="night-summary">
            <Moon size={21} />
            <div>
              <strong>Moon {fmt(n.moonLight * 100, 0)}%</strong>
              <span>illumination at midnight</span>
            </div>
          </div>
          <div className="night-summary">
            <Stars size={21} />
            <div>
              <strong>{fmt(n.dark.length * 0.25)} h of darkness</strong>
              <span>
                {n.dark.length
                  ? clock(n.dark[0].ms, site) + " – " + clock(n.dark.at(-1)!.ms + 15 * 60000, site)
                  : "No astronomical darkness"}
              </span>
            </div>
          </div>
        </section>
        <HorizonFilter sector={sector} onChange={setSector} />
        <div className="atlas-columns">
          <aside className="catalog-panel">
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="catalog-tabs">
                <TabsTrigger value="night">Tonight</TabsTrigger>
                <TabsTrigger value="catalog">Whole atlas</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="search-field">
              <Search size={17} />
              <Input
                aria-label="Search for an object"
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
                  ["all", "All catalogues"],
                  ["M", "Messier"],
                  ["C", "Caldwell"],
                  ["extra", "Other NGC / IC / Sh2"],
                ]}
              />
              <Choice
                label="Tipo di oggetto"
                value={type}
                onChange={setType}
                options={[
                  ["deep", "Nebulae and galaxies"],
                  ["nebula", "Nebulae"],
                  ["galaxy", "Galaxies"],
                  ["cluster", "Clusters"],
                  ["other", "Other objects"],
                  ["all", "Tutte le tipologie"],
                ]}
              />
            </div>
            <div className="results-heading">
              <span>
                {rows.length} objects {mode === "night" ? "usable" : "listed"}
              </span>
              <span>{mode === "night" ? "By suitability ↓" : "By catalogue"}</span>
            </div>
            <div className="object-list" aria-label="Object list">
              {!rows.length ? (
                <div className="empty-state">
                  <Orbit size={28} />
                  <h3>No object matches</h3>
                  <p>
                    Change the sector or date, lower the threshold, or go back to the whole atlas.
                  </p>
                  <button
                    onClick={() => {
                      setQuery("");
                      setCatalog("all");
                      setType("deep");
                      setMode("catalog");
                      setSector({ start: 0, span: 360 });
                    }}
                  >
                    Show the atlas
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
                          : neverRises(r.o.dec, site)
                            ? "Never rises here"
                            : "Outside window"}
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
              The catalogues also include clusters: choose “All types” to browse them. C14 has two
              components. Objects that never rise at your location are excluded only dai
              suggerimenti notturni.
            </p>
          </aside>
          <div id="object-detail">
            {current ? (
              <ErrorBoundary area="The object panel" resetKey={current.o.id}>
                <ObjectDetails
                  key={current.o.id}
                  r={current}
                  day={day}
                  minAlt={Number(minAlt)}
                  scope={scope}
                  sector={detailSector}
                  site={site}
                />
              </ErrorBoundary>
            ) : (
              <div className="object-panel">
                <h2>No object in the selected sector</h2>
                <p>Change the sector, the date or the other filters to find a useful window.</p>
              </div>
            )}
          </div>
        </div>
        <section id="method" className="method-panel">
          <div>
            <p className="eyebrow">How the numbers are made</p>
            <h2>Un piano astronomico, non una previsione meteo.</h2>
            <p>
              The 0–100 score is a heuristic: 50% useful duration, 35% mean altitude, 15% magnitude,
              then penalties for the Moon and for objects small against the sampling. At least 30
              minutes of window are required. It does not measure signal-to-noise, and it excludes
              cloud, seeing, obstructions, humidity and local light pollution.
            </p>
            <p>
              J2000 coordinates precessed to the date with Astronomy Engine; Sun and Moon
              topocentric, horizon altitudes geometric. Darkness means the Sun below −18°. Sampled
              every 15 minutes, so times are accurate to roughly ±15 minutes. Times are shown in{" "}
              {site.timeZone}, including daylight saving.
            </p>
          </div>
          <div>
            <h3>Instruments and provenance</h3>
            <p>
              <a href={scopes[scope].source} target="_blank" rel="noreferrer">
                {scopes[scope].name} · ZWO specifications ↗
              </a>
              <br />
              {scopes[scope].aperture} mm · {scopes[scope].focal} mm · {scopes[scope].sensor}
              <br />
              2160 × 3840 px · 2.9 μm pixels · a single frame, uncropped.
            </p>
            <p>
              FOV = 2 atan(sensor dimension / 2f). The advertised 4.6° and 2.8° are approximately
              the diagonals, not width × height.
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
              <a href={localMode ? "./data/NOTICE.txt" : "/data/NOTICE.txt"}>
                Credits and licences
              </a>
              <a href={localMode ? "./data/catalog.json" : "/data/catalog.json"}>Atlas data</a>
            </div>
            <p className="caption">
              Curated catalogue data; missing values are stated explicitly. M65 and C68 take their
              distance from NASA/Hubble. Estimates can differ between sources.
            </p>
          </div>
        </section>
      </div>
      <footer className="atlas-footer">
        Deep Sky Atlas <span>Explore, frame, pick your night.</span>
      </footer>
    </main>
  );
}
