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
          <span>/100 tonight</span>
        </div>
      </header>
      {maxPossible <= 0 ? (
        <div className="notice warning">
          Never rises from {site.name}: declination {fmt(o.dec, 1)}°. Still browsable in the atlas.
        </div>
      ) : r.hours === 0 ? (
        <div className="notice warning">
          No window with the Sun below −18° and the object above {minAlt}° inside the chosen sector,
          on the selected night.
        </div>
      ) : (
        <div className="notice">
          <Stars size={17} />
          <span>
            {fmt(r.hours)} useful h above {minAlt}° · useful peak {fmt(r.peak, 0)}° ·{" "}
            {cardinal(r.peakAz)} {fmt(r.peakAz, 0)}° at {clock(r.peakTime, site)}
          </span>
        </div>
      )}
      <div className="facts-grid">
        <div>
          <span>Distance ≈</span>
          <strong>{distanceText(o.distance)}</strong>
        </div>
        <div>
          <span>Apparent magnitude</span>
          <strong>{o.mag === null ? "Not available" : fmt(o.mag, 2) + " (" + o.band + ")"}</strong>
        </div>
        <div>
          <span>Angular size</span>
          <strong>
            {o.major ? fmt(o.major, 1) + "′ × " + fmt(o.minor, 1) + "′" : "Not available"}
          </strong>
        </div>
        <div>
          <span>Estimated mean surface brightness</span>
          <strong>{sb ? fmt(sb, 1) + " mag/arcsec²" : "Not available"}</strong>
        </div>
        <div>
          <span>J2000 coordinates</span>
          <strong>
            {fmt(o.ra / 15, 4)} h / {fmt(o.dec, 4)}°
          </strong>
        </div>
        <div>
          <span>Morphology / class</span>
          <strong>{o.morphology || o.kind}</strong>
        </div>
      </div>
      <p className="caption">
        Magnitude: smaller values mean more integrated light, not necessarily an easier subject.
        Mean surface brightness is derived from the magnitude and an elliptical area and depends on
        the band; it is not an intrinsic luminosity. Distances and sizes are catalogue estimates.
      </p>
      <DirectionDetails r={r} site={site} />
      <ErrorBoundary area="Il simulatore di campo" resetKey={o.id + scope}>
        <FovView o={o} scope={scope} />
      </ErrorBoundary>
      <section className="night-detail">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Modena · Europe/Rome</p>
            <h3>Tonight’s window</h3>
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
            <span>No useful window</span>
          )}
        </div>
        <ChartContainer
          config={{
            alt: { label: o.key, color: "#78e5ff" },
            moon: { label: "Moon", color: "#b09dfc" },
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
              formatter={(v, n) => [fmt(Number(v)) + "°", n === "alt" ? o.key : "Moon"]}
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
          <span className="cyan">Object: cyan</span> ·{" "}
          <span className="lilac">Moon: dashed violet</span> · blue background: astronomical
          darkness. Sampled every 15 minutes; times after midnight belong to the following day.
          Minimum separation from the Moon within the useful window:{" "}
          <b>
            {r.moonSeparation === null ? "Moon absent / no window" : fmt(r.moonSeparation, 0) + "°"}
          </b>
          .
        </p>
      </section>
      <section className="season-detail">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Seasonality {year}</p>
            <h3>
              {maxPossible <= 0
                ? "Not observable from " + site.name
                : best > 0
                  ? "Best months: " + bestMonths
                  : "No window inside the sector and above the threshold"}
            </h3>
          </div>
        </div>
        <ChartContainer
          config={{ hours: { label: "Useful hours", color: "#78e5ff" } }}
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
              formatter={(v) => [fmt(Number(v)) + " h", "Darkness above threshold"]}
              contentStyle={{ background: "#101a2c", border: "1px solid #334155" }}
            />
            <Bar dataKey="hours" fill="#78e5ff" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
        <p className="caption">
          Hours above {minAlt}° with the Sun below −18°, inside the chosen sector, computed on the
          15th of each month with no lunar penalty. “Best” means at least 80% of the annual maximum.
          Theoretical peak altitude at transit: {fmt(maxPossible, 0)}°; local buildings and
          obstructions are not included.
        </p>
      </section>
      <section className="advice">
        <h3>Imaging notes</h3>
        <p>{photoAdvice(o)}</p>
        {o.major && (o.major * 60) / fov(scope).scale < 120 && (
          <p className="warning">
            Small subject: roughly {fmt((o.major * 60) / fov(scope).scale, 0)} pixels along the
            major axis at native sampling. Do not expect Hubble-level detail.
          </p>
        )}
      </section>
      <div className="object-sources">
        <span>Distance source: {o.distanceSource}</span>
        <a href={o.distanceUrl} target="_blank" rel="noreferrer">
          Original data <ArrowUpRight size={14} />
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
