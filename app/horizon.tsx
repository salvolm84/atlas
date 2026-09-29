"use client";
import { useRef, type PointerEvent } from "react";
import { Slider } from "@/components/ui/slider";
import { bearing, cardinal, clock, fmt, type Sector, type Site, type TargetNight } from "@/lib/sky";

const point = (a: number, r = 76) => ({
  x: 110 + r * Math.sin((a * Math.PI) / 180),
  y: 110 - r * Math.cos((a * Math.PI) / 180),
});
// Tuple-typed so `start`/`span` stay numbers: the previous inline literal
// widened to (string|number)[] and compared a string against sector.start.
const PRESETS: [string, number, number][] = [
  ["All", 0, 360],
  ["North", 315, 90],
  ["East", 45, 90],
  ["South", 135, 90],
  ["West", 225, 90],
];
export function HorizonFilter({
  sector,
  onChange,
}: {
  sector: Sector;
  onChange: (s: Sector) => void;
}) {
  const drag = useRef<"start" | "end" | null>(null);
  const a = point(sector.start),
    b = point(sector.start + sector.span),
    full = sector.span === 360;
  // Pointer and slider events fire far more often than the 5° snap actually
  // changes. Re-emitting an equal sector would still be a new object identity,
  // invalidating the night and seasonality memos for no visible difference.
  const emit = (next: Sector) => {
    if (next.start !== sector.start || next.span !== sector.span) onChange(next);
  };
  function move(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const rect = e.currentTarget.getBoundingClientRect(),
      az = bearing(
        (Math.atan2(
          e.clientX - rect.left - rect.width / 2,
          -(e.clientY - rect.top - rect.height / 2),
        ) *
          180) /
          Math.PI,
      );
    const snapped = bearing(Math.round(az / 5) * 5);
    emit(
      drag.current === "start"
        ? { start: snapped, span: Math.max(5, bearing(sector.start + sector.span - snapped)) }
        : { ...sector, span: Math.max(5, bearing(snapped - sector.start)) },
    );
  }
  return (
    <section className="horizon-filter" aria-label="Cardinal visibility filter">
      <svg
        viewBox="0 0 220 220"
        className="horizon-dial"
        aria-label="Horizon sector: drag either end point, or use the sliders"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect(),
            x = ((e.clientX - r.left) / r.width) * 220,
            y = ((e.clientY - r.top) / r.height) * 220;
          drag.current =
            Math.hypot(x - a.x, y - a.y) < Math.hypot(x - b.x, y - b.y) ? "start" : "end";
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <circle cx="110" cy="110" r="76" fill="#09111f" stroke="#35465b" strokeWidth="2" />
        {full ? (
          <circle cx="110" cy="110" r="76" fill="#78e5ff22" stroke="#78e5ff" strokeWidth="3" />
        ) : (
          <path
            d={`M110 110 L${a.x} ${a.y} A76 76 0 ${sector.span > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`}
            fill="#78e5ff33"
            stroke="#78e5ff"
            strokeWidth="2"
          />
        )}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((az) => {
          const p = point(az, 99);
          return (
            <text key={az} x={p.x} y={p.y + 5} textAnchor="middle" fill="#d9e8f8" fontSize="14">
              {cardinal(az)}
            </text>
          );
        })}
        <circle cx={a.x} cy={a.y} r="9" fill="#78e5ff" stroke="#07101d" strokeWidth="3" />
        <circle cx={b.x} cy={b.y} r="9" fill="#f6c769" stroke="#07101d" strokeWidth="3" />
        <text x="110" y="106" textAnchor="middle" fill="white" fontSize="23">
          {sector.span}°
        </text>
        <text x="110" y="127" textAnchor="middle" fill="#acbfd4" fontSize="12">
          visible
        </text>
      </svg>
      <div className="horizon-settings">
        <p className="eyebrow">Your horizon</p>
        <h3>
          {full
            ? "All directions"
            : `${cardinal(sector.start)} ${sector.start}° → ${cardinal(sector.start + sector.span)} ${bearing(sector.start + sector.span)}°`}
        </h3>
        <p className="caption">
          Select the clear sector clockwise, crossing north if you need to. The filter requires at
          least 30 minutes in darkness, above the altitude threshold and inside the sector.
        </p>
        <div className="horizon-sliders">
          <div>
            <label>
              Start · {cardinal(sector.start)} {sector.start}°
            </label>
            <Slider
              aria-label="Starting azimuth"
              min={0}
              max={355}
              step={5}
              value={[sector.start]}
              onValueChange={(v) => emit({ ...sector, start: v[0] })}
            />
          </div>
          <div>
            <label>Width · {sector.span}°</label>
            <Slider
              aria-label="Sector width"
              min={5}
              max={360}
              step={5}
              value={[sector.span]}
              onValueChange={(v) => emit({ ...sector, span: v[0] })}
            />
          </div>
        </div>
        <div className="horizon-presets">
          {PRESETS.map(([label, start, span]) => (
            <button
              key={label}
              aria-pressed={sector.start === start && sector.span === span}
              onClick={() => emit({ start, span })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="caption">
          True north 0° · east 90° · south 180° · west 270°. Hours, scores and best months all
          update with the sector.
        </p>
      </div>
    </section>
  );
}
export function DirectionDetails({ r, site }: { r: TargetNight; site: Site }) {
  const points = r.curve.filter((p) => p.sun < -18 && p.alt >= 0);
  const samples = points.filter(
    (p, i) => i === 0 || i === points.length - 1 || new Date(p.ms).getUTCMinutes() === 0,
  );
  return (
    <section className="direction-details">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Where to look</p>
          <h3>Direction through the night</h3>
        </div>
        <span className="tag">N · E · S · O</span>
      </div>
      <p>
        {r.hours > 0
          ? `At the peak of the useful window: ${cardinal(r.peakAz)} · azimuth ${fmt(r.peakAz, 0)}°, altitude ${fmt(r.peak, 0)}° at ${clock(r.peakTime, site)}.`
          : "No useful window with the selected filters."}
      </p>
      <p className="caption">
        The direction changes through the night. Azimuth is measured clockwise from true north; it
        is not the sensor orientation or celestial north in the photograph.
      </p>
      {samples.length ? (
        <div className="direction-table">
          <table>
            <thead>
              <tr>
                <th>Local time</th>
                <th>Direction</th>
                <th>Azimuth</th>
                <th>Altitude</th>
                <th>Imaging</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((p) => (
                <tr key={p.ms} className={p.usable ? "direction-usable" : ""}>
                  <td>{clock(p.ms, site)}</td>
                  <td>{cardinal(p.az)}</td>
                  <td>{fmt(p.az, 0)}°</td>
                  <td>{fmt(p.alt, 0)}°</td>
                  <td>
                    {p.usable ? "In sector, above threshold" : "Outside sector / below threshold"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="caption">Object below the horizon throughout astronomical darkness.</p>
      )}
    </section>
  );
}
