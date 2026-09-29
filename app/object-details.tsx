"use client";
import { useMemo } from "react";
import { ArrowUpRight, Stars } from "lucide-react";
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
import { DirectionDetails } from "./horizon";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  cardinal,
  clock,
  distanceText,
  fmt,
  fov,
  photoAdvice,
  seasonal,
  surfaceBrightness,
  transitAltitude,
  type Site,
  type ScopeId,
  type Sector,
  type TargetNight,
} from "@/lib/sky";
import { FovView } from "./fov-view";
export function ObjectDetails({
  r,
  day,
  minAlt,
  scope,
  sector,
  site,
}: {
  r: TargetNight;
  day: string;
  minAlt: number;
  scope: ScopeId;
  sector: Sector;
  site: Site;
}) {
  const o = r.o,
    year = Number(day.slice(0, 4));
  const seasons = useMemo(
      () => seasonal(o, year, site, minAlt, sector),
      [o, year, site, minAlt, sector],
    ),
    best = Math.max(...seasons.map((s) => s.hours));
  const bestMonths = seasons
    .filter((s) => best > 0 && s.hours >= best * 0.8)
    .map((s) => s.label)
    .join(" · ");
  const maxPossible = transitAltitude(o.dec, site),
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
            {cardinal(r.peakAz)} {fmt(r.peakAz, 0)}° alle {clock(r.peakTime, site)}
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
      <DirectionDetails r={r} site={site} />
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
                {clock(w.start, site)} → {clock(w.end, site)}
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
              tickFormatter={(v) => clock(v, site)}
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
              labelFormatter={(v) => clock(Number(v), site)}
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
