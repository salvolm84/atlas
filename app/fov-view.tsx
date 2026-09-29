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
