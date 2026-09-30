"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import { RotateCcw, Info, LoaderCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { DEG, fmt, fov, scopes, surveyURL, type DSO, type ScopeId } from "@/lib/sky";
import { frameFit } from "@/lib/framing";
import { Choice } from "./choice";
/** Frame colours, kept clear of the yellow catalogue ellipse. */
export const FRAME_COLORS = ["#78e5ff", "#ff7ac6", "#a3e635", "#ff9f5a", "#a78bfa", "#f87171"];
/** A telescope drawn in the simulator, with the colour it keeps while selected. */
export type Framed = { id: ScopeId; color: string };

// The picker groups models under their maker, in table order.
const makers = Object.entries(scopes).reduce<[string, ScopeId[]][]>((groups, [id, s]) => {
  const last = groups.at(-1);
  if (last?.[0] === s.maker) last[1].push(id as ScopeId);
  else groups.push([s.maker, [id as ScopeId]]);
  return groups;
}, []);

// Phones draw the map at ~330 px for a 1000-unit view box, so labels need larger
// type there to stay readable.
const narrowQuery = "(max-width: 580px)";
const subscribeNarrow = (onChange: () => void) => {
  const m = window.matchMedia(narrowQuery);
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
};

export function FovView({
  o,
  scope,
  framed,
  onToggle,
  onScoreWith,
}: {
  o: DSO;
  /** The telescope the score and pixel counts use; always one of `framed`. */
  scope: ScopeId;
  framed: Framed[];
  onToggle: (id: ScopeId) => void;
  onScoreWith: (id: ScopeId) => void;
}) {
  const [angle, setAngle] = useState(0),
    [scale, setScale] = useState("1"),
    [attempt, setAttempt] = useState(0);
  const full = framed.length >= FRAME_COLORS.length;
  const field = Math.min(20, Math.max(5.8, ((o.major ?? 0) / 60) * 1.22)) / Number(scale),
    url = surveyURL(o, field);
  const [loaded, setLoaded] = useState(""),
    [failed, setFailed] = useState("");
  const key = url + "#" + attempt,
    ok = loaded === key,
    err = failed === key;
  useEffect(() => {
    // Once the image is in, there is nothing left to time out. Without this the
    // timer still fired 30 s after every successful load, marking the survey
    // failed and re-rendering for nothing.
    if (ok) return;
    const timer = setTimeout(() => setFailed(key), 30000);
    return () => clearTimeout(timer);
  }, [key, ok]);
  const proj = (d: number) => (Math.tan((d / 2) * DEG) / Math.tan((field / 2) * DEG)) * 1000;
  // Largest first, so a small frame is never hidden under a bigger one. Labels
  // sit inside each frame's top-left corner and step down when two would touch.
  const frames = framed
    .map((x) => {
      const f = fov(x.id);
      return { ...x, f, w: proj(f.width), h: proj(f.height), fit: frameFit(o, x.id, angle) };
    })
    .sort((a, b) => b.w * b.h - a.w * a.h);
  // Widths are estimated from the glyph count: close enough to keep two labels
  // apart, and the dark pill behind each hides any frame edge it crosses.
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(narrowQuery).matches,
    () => false,
  );
  const type = narrow ? 42 : 27,
    lineHeight = Math.round(type * 1.3);
  const labels: { x: number; y: number; width: number }[] = [];
  for (const r of frames) {
    const width = scopes[r.id].name.length * type * 0.57 + 16;
    const x = Math.min(Math.max(500 - r.w / 2 + 10, 8), 992 - width);
    let y = Math.min(Math.max(500 - r.h / 2 + 10, 10), 990 - lineHeight);
    while (
      labels.some((l) => x < l.x + l.width && l.x < x + width && Math.abs(l.y - y) < lineHeight + 2)
    )
      y += lineHeight + 4;
    labels.push({ x, y, width });
  }
  return (
    <div className="fov-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Field simulator</p>
          <h3>Compare telescopes on the real sky</h3>
        </div>
        <span className="tag">DSS2 · optical</span>
      </div>
      <div className="scope-picker" role="group" aria-label="Telescopes to compare">
        {makers.map(([maker, ids]) => (
          <div className="scope-group" key={maker}>
            <span>{maker}</span>
            {ids.map((id) => {
              const on = framed.find((x) => x.id === id);
              return (
                <button
                  key={id}
                  className="scope-chip"
                  aria-pressed={!!on}
                  disabled={!on && full}
                  onClick={() => onToggle(id)}
                  style={on ? ({ "--chip": on.color } as React.CSSProperties) : undefined}
                >
                  <span className="swatch" aria-hidden="true" />
                  {scopes[id].name}
                </button>
              );
            })}
          </div>
        ))}
        <p className="scope-note">
          {full
            ? `Up to ${FRAME_COLORS.length} at once: remove one to add another.`
            : `Select up to ${FRAME_COLORS.length} to compare their frames.`}
        </p>
        {framed.length > 1 && (
          <div className="score-with">
            <span>Score with</span>
            <Choice
              label="Telescope used for the score"
              value={scope}
              onChange={(id) => onScoreWith(id as ScopeId)}
              options={framed.map((x) => [x.id, scopes[x.id].maker + " " + scopes[x.id].name])}
            />
          </div>
        )}
      </div>
      <div className="sky-view">
        {/* The survey frame is fetched live from CDS and this view also ships in the
       portable `file://` release, where next/image has no optimizer to call. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={key}
          src={url + (attempt ? "&retry=" + attempt : "")}
          alt={"DSS2 sky field centred on " + o.key}
          onLoad={() => setLoaded(key)}
          onError={() => setFailed(key)}
          className={ok ? "ready" : ""}
        />
        {!ok && (
          <div className="survey-status">
            {err ? (
              <>
                <Info size={22} />
                <strong>Survey unavailable</strong>
                <span>The field geometry is still valid. No simulated sky image is shown.</span>
                <button onClick={() => setAttempt(attempt + 1)}>Retry image</button>
              </>
            ) : (
              <>
                <LoaderCircle className="spin" size={24} />
                <span>Loading sky survey…</span>
              </>
            )}
          </div>
        )}
        <svg
          viewBox="0 0 1000 1000"
          role="img"
          aria-label={
            "Telescope fields: " +
            frames
              .map(
                (r) =>
                  scopes[r.id].name +
                  " " +
                  r.f.width.toFixed(2) +
                  " by " +
                  r.f.height.toFixed(2) +
                  " degrees",
              )
              .join("; ")
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
            {frames.map(({ id, color, w, h }) => (
              <g key={id}>
                <rect
                  x={500 - w / 2}
                  y={500 - h / 2}
                  width={w}
                  height={h}
                  fill={color}
                  fillOpacity=".04"
                  stroke={color}
                  strokeWidth="3"
                />
                <path
                  d={`M ${500 - w / 2} ${500 - h / 2 + 24} v -24 h 24 M ${500 + w / 2 - 24} ${500 - h / 2} h 24 v 24 M ${500 - w / 2} ${500 + h / 2 - 24} v 24 h 24 M ${500 + w / 2 - 24} ${500 + h / 2} h 24 v -24`}
                  fill="none"
                  stroke={color}
                  strokeWidth="6"
                />
              </g>
            ))}
          </g>
          <path
            d="M 485 500 h 30 M 500 485 v 30"
            stroke="#fff"
            strokeOpacity=".8"
            strokeWidth="2"
          />
          {/* Labels last, so no frame edge or the crosshair is drawn over one. */}
          <g transform={"rotate(" + -angle + " 500 500)"}>
            {frames.map(({ id, color }, i) => (
              <g key={id}>
                <rect
                  x={labels[i].x}
                  y={labels[i].y}
                  width={labels[i].width}
                  height={lineHeight}
                  rx="7"
                  fill="#050a13"
                  fillOpacity=".82"
                  stroke={color}
                  strokeOpacity=".45"
                />
                <text
                  x={labels[i].x + 8}
                  y={labels[i].y + type * 0.96}
                  fill={color}
                  fontSize={type}
                  fontWeight="600"
                >
                  {scopes[id].name}
                </text>
              </g>
            ))}
          </g>
          <text x="500" y="48" textAnchor="middle" fill="white" fontSize="24">
            N
          </text>
          <text x="30" y="510" fill="white" fontSize="24">
            E
          </text>
        </svg>
      </div>
      <ul className="fov-legend" aria-label="Frames drawn">
        {/* Listed in the order they were picked, not the drawing order. */}
        {framed
          .map((x) => frames.find((r) => r.id === x.id)!)
          .map(({ id, color, f, fit }) => (
            <li key={id}>
              <span className="swatch" style={{ background: color }} aria-hidden="true" />
              <b>
                {scopes[id].maker} {scopes[id].name}
                {id === scope && framed.length > 1 ? <small> · scoring</small> : null}
              </b>
              <span>
                {fmt(f.width, 2)}° × {fmt(f.height, 2)}°
              </span>
              <span>{fmt(f.scale, 2)}″/px</span>
              <span className={"fit " + (fit === false ? "warning" : "")}>
                {fit === null
                  ? "Dimensions not available"
                  : fit
                    ? "Catalogued outline fits inside a single frame"
                    : "Outline exceeds the frame: consider rotating, or a mosaic"}
              </span>
            </li>
          ))}
      </ul>
      <div className="frame-controls">
        <div className="rotation">
          <label>
            Position angle <b>{angle}°</b>
          </label>
          <Slider
            aria-label="Field position angle"
            min={0}
            max={180}
            step={1}
            value={[angle]}
            onValueChange={(v) => setAngle(v[0])}
          />
        </div>
        <Choice
          label="Map zoom"
          value={scale}
          onChange={setScale}
          options={[
            ["1", "Wide field"],
            ["2", "Zoom ×2"],
            ["4", "Zoom ×4"],
          ]}
        />
        <button
          className="icon-btn"
          aria-label="Reset framing"
          onClick={() => {
            setAngle(0);
            setScale("1");
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <p className="caption">
        Coloured rectangles: each telescope&apos;s native sensor frame. Yellow: the ellipse of the
        catalogued dimensions, not the exact edge of the nebulosity. North is up and east is left;
        PA runs from north towards east. The rotation is geometric, not a command to the telescope.
        On an alt-az mount the field rotates; crops and mosaics are not simulated.
      </p>
      <p className="caption">
        DSS2/STScI via CDS HiPS2FITS: survey photographs, not a prediction of the detail, colour or
        noise your telescope will achieve.{" "}
        <a href={url} target="_blank" rel="noreferrer">
          Open survey ↗
        </a>
      </p>
    </div>
  );
}
