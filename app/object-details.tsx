"use client";
import { useMemo } from "react";
import { ArrowUpRight, Cloud, Stars } from "lucide-react";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  buildOutlook,
  cloudAt,
  cloudBandClass,
  cloudOverWindows,
  describeCloud,
  type CloudForecast,
} from "@/lib/weather";
import {
  Area,
  ComposedChart,
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
  makeNight,
  photoAdvice,
  seasonal,
  surfaceBrightness,
  targetNight,
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
  clouds,
  outlook,
  outlookDays,
  today,
  onPickDate,
}: {
  r: TargetNight;
  day: string;
  minAlt: number;
  scope: ScopeId;
  sector: Sector;
  site: Site;
  clouds: CloudForecast;
  outlook: CloudForecast;
  outlookDays: string[];
  today: string;
  onPickDate: (day: string) => void;
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
  const cloudHours = clouds.state === "ready" ? clouds.hours : [];
  const chart = r.curve
    .filter((p) => p.sun < 5)
    .map((p) => ({
      ...p,
      alt: Math.round(p.alt * 10) / 10,
      moon: Math.round(p.moon * 10) / 10,
      // null leaves a gap rather than drawing a guessed value.
      cloud: cloudHours.length ? cloudAt(cloudHours, p.ms) : null,
    }));
  const firstDark = chart.find((p) => p.sun < -18),
    lastDark = [...chart].reverse().find((p) => p.sun < -18);
  // Mean cover across this target's useful windows, which is the number that
  // decides whether tonight is worth setting up for.
  const windowCloud = cloudHours.length ? cloudOverWindows(cloudHours, r.windows) : null;
  // Astronomy for each coming night, paired with its forecast. makeNight is
  // cached per site and date, so changing object only redoes the cheap half.
  const nights = useMemo(
    () =>
      buildOutlook(
        outlookDays,
        (d) => {
          const result = targetNight(o, makeNight(d, site), minAlt, scope, sector);
          return { hours: result.hours, windows: result.windows };
        },
        outlook.state === "ready" ? outlook.hours : [],
      ),
    [outlookDays, o, site, minAlt, scope, sector, outlook],
  );
  const clearNights = nights.filter((n) => n.promising).length;
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
            <p className="eyebrow">
              {site.name} · {site.timeZone}
            </p>
            <h3>Tonight’s window</h3>
          </div>
          <span className="tag">Threshold {minAlt}°</span>
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
            cloud: { label: "Cloud", color: "#94a3b8" },
          }}
          className="altitude-chart"
        >
          <ComposedChart
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
              yAxisId="alt"
              domain={[-20, 90]}
              ticks={[0, 30, 60, 90]}
              tickFormatter={(v) => v + "°"}
              tick={{ fontSize: 12 }}
            />
            {/* Percent, on its own hidden scale so it cannot be misread as degrees. */}
            <YAxis yAxisId="cloud" domain={[0, 100]} hide />
            {cloudHours.length > 0 && (
              <Area
                yAxisId="cloud"
                type="monotone"
                dataKey="cloud"
                stroke="#94a3b8"
                strokeWidth={1}
                fill="#94a3b8"
                fillOpacity={0.16}
                connectNulls={false}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {firstDark && lastDark && (
              <ReferenceArea
                yAxisId="alt"
                x1={firstDark.ms}
                x2={lastDark.ms}
                fill="#78e5ff"
                fillOpacity={0.04}
              />
            )}
            <ReferenceLine yAxisId="alt" y={minAlt} stroke="#7f95ad" strokeDasharray="4 4" />
            <ReferenceLine yAxisId="alt" y={0} stroke="#4b576a" />
            <ChartTooltip
              labelFormatter={(v) => clock(Number(v), site)}
              formatter={(v, n) =>
                n === "cloud"
                  ? [fmt(Number(v), 0) + "%", "Cloud"]
                  : [fmt(Number(v)) + "°", n === "alt" ? o.key : "Moon"]
              }
              contentStyle={{ background: "#101a2c", border: "1px solid #334155", color: "white" }}
            />
            <Line
              yAxisId="alt"
              type="monotone"
              dataKey="alt"
              stroke="#78e5ff"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="alt"
              type="monotone"
              dataKey="moon"
              stroke="#b09dfc"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
        {clouds.state === "loading" ? (
          <p className="caption">Loading the cloud forecast…</p>
        ) : clouds.state === "unavailable" ? (
          <p className="caption">Cloud forecast unavailable. {clouds.reason}</p>
        ) : windowCloud && windowCloud.covered > 0 ? (
          <p className="notice">
            <Cloud size={17} />
            <span>
              Forecast {describeCloud(windowCloud.mean)} during the useful window:{" "}
              {fmt(windowCloud.mean, 0)}% mean cloud cover
              {windowCloud.covered < windowCloud.total ? ", covering only part of the window" : ""}.
              A forecast, not a measurement, and no part of the score.
            </span>
          </p>
        ) : cloudHours.length && r.windows.length === 0 ? (
          <p className="caption">
            Cloud forecast loaded, but this target has no useful window tonight to report it over.
          </p>
        ) : null}
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
      <section className="outlook-detail">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The next {outlookDays.length} nights</p>
            <h3>
              {outlook.state === "loading"
                ? "Checking the forecast\u2026"
                : outlook.state === "unavailable"
                  ? "Usable nights for " + o.key
                  : clearNights > 0
                    ? `${clearNights} promising ${clearNights === 1 ? "night" : "nights"} for ${o.key}`
                    : "No clear night forecast for " + o.key}
            </h3>
          </div>
          <span className="tag">Threshold {minAlt}\u00b0</span>
        </div>
        <div className="outlook-grid">
          {nights.map((night) => {
            const selected = night.day === day;
            const band = cloudBandClass(night.cloud);
            return (
              <button
                key={night.day}
                className={
                  "outlook-night" +
                  (selected ? " selected" : "") +
                  (night.promising ? " promising" : "") +
                  (night.hours === 0 ? " unusable" : "")
                }
                onClick={() => onPickDate(night.day)}
                aria-pressed={selected}
                aria-label={
                  `${night.day}: ` +
                  (night.hours === 0 ? `${o.key} not usable` : `${fmt(night.hours)} useful hours`) +
                  ", " +
                  (night.cloud === null
                    ? "no forecast"
                    : `${fmt(night.cloud, 0)} per cent cloud, ${describeCloud(night.cloud)}`) +
                  (night.day === today ? ", tonight" : "")
                }
              >
                <strong>
                  {night.day === today
                    ? "Tonight"
                    : new Date(night.day + "T12:00:00").toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                      })}
                </strong>
                <span>{night.hours === 0 ? "\u2014" : fmt(night.hours) + " h"}</span>
                <span className={"outlook-cloud " + band}>
                  {night.cloud === null ? "no data" : fmt(night.cloud, 0) + "%"}
                </span>
              </button>
            );
          })}
        </div>
        <p className="caption">
          Useful hours come from the same altitude, darkness and sector filters as the list; mean
          cloud is the forecast across those hours only. The two are reported side by side and never
          combined \u2014 pick the night yourself. Select a night to plan it.
          {outlook.state === "unavailable" ? " " + outlook.reason : ""}
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
