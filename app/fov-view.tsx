"use client";
import { useState, useEffect } from "react";
import { Focus, RotateCcw, Info, LoaderCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { DEG, fmt, fov, scopes, surveyURL, type DSO, type ScopeId } from "@/lib/sky";
import { frameFit } from "@/lib/framing";
import { Choice } from "./choice";
export function FovView({ o, scope }: { o: DSO; scope: ScopeId }) {
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
    // Once the image is in, there is nothing left to time out. Without this the
    // timer still fired 30 s after every successful load, marking the survey
    // failed and re-rendering for nothing.
    if (ok) return;
    const timer = setTimeout(() => setFailed(key), 30000);
    return () => clearTimeout(timer);
  }, [key, ok]);
  const proj = (d: number) => (Math.tan((d / 2) * DEG) / Math.tan((field / 2) * DEG)) * 1000;
  const w = proj(f.width),
    h = proj(f.height),
    fit = frameFit(o, scope, angle);
  return (
    <div className="fov-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Field simulator</p>
          <h3>Your Seestar, on the real sky</h3>
        </div>
        <span className="tag">DSS2 · optical</span>
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
            scopes[scope].name +
            " field: " +
            f.width.toFixed(2) +
            " by " +
            f.height.toFixed(2) +
            " degrees"
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
      <div className={"fit-note " + (fit === false ? "warning" : "")}>
        <span>
          {fit === null
            ? "Dimensions not available"
            : fit
              ? "Catalogued outline fits inside a single frame"
              : "Outline exceeds the frame: consider rotating, or a mosaic"}
        </span>
        <b>{fmt(f.scale, 2)}″/px</b>
      </div>
      <p className="caption">
        Cyan: the native sensor, in portrait orientation. Yellow: the ellipse of the catalogued
        dimensions, not the exact edge of the nebulosity. North is up and east is left; PA runs from
        north towards east. The rotation is geometric, not a command to the telescope. On an alt-az
        mount the field rotates; crops and mosaics are not simulated.
      </p>
      <p className="caption">
        DSS2/STScI via CDS HiPS2FITS: survey photographs, not a prediction of the detail, colour or
        noise a Seestar will achieve.{" "}
        <a href={url} target="_blank" rel="noreferrer">
          Open survey ↗
        </a>
      </p>
    </div>
  );
}
