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
  ["Tutto", 0, 360],
  ["Nord", 315, 90],
  ["Est", 45, 90],
  ["Sud", 135, 90],
  ["Ovest", 225, 90],
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
    <section className="horizon-filter" aria-label="Filtro di visibilità cardinale">
      <svg
        viewBox="0 0 220 220"
        className="horizon-dial"
        aria-label="Settore di orizzonte: trascina i due estremi, oppure usa i cursori"
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
          visibili
        </text>
      </svg>
      <div className="horizon-settings">
        <p className="eyebrow">Il tuo orizzonte · Modena</p>
        <h3>
          {full
            ? "Tutte le direzioni"
            : `${cardinal(sector.start)} ${sector.start}° → ${cardinal(sector.start + sector.span)} ${bearing(sector.start + sector.span)}°`}
        </h3>
        <p className="caption">
          Seleziona il settore libero in senso orario, anche attraverso nord. Il filtro richiede
          almeno 30 minuti al buio, sopra la soglia di altezza e dentro il settore.
        </p>
        <div className="horizon-sliders">
          <div>
            <label>
              Inizio · {cardinal(sector.start)} {sector.start}°
            </label>
            <Slider
              aria-label="Azimut iniziale"
              min={0}
              max={355}
              step={5}
              value={[sector.start]}
              onValueChange={(v) => emit({ ...sector, start: v[0] })}
            />
          </div>
          <div>
            <label>Ampiezza · {sector.span}°</label>
            <Slider
              aria-label="Ampiezza del settore"
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
          Nord geografico 0° · Est 90° · Sud 180° · Ovest 270°. Ore, punteggi e mesi migliori si
          aggiornano con il settore.
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
          <p className="eyebrow">Dove guardare</p>
          <h3>Direzione durante la notte</h3>
        </div>
        <span className="tag">N · E · S · O</span>
      </div>
      <p>
        {r.hours > 0
          ? `Al massimo della finestra utile: ${cardinal(r.peakAz)} · azimut ${fmt(r.peakAz, 0)}°, altezza ${fmt(r.peak, 0)}° alle ${clock(r.peakTime, site)}.`
          : "Nessuna finestra utile con i filtri selezionati."}
      </p>
      <p className="caption">
        La direzione cambia con l’orario. Azimut misurato dal nord geografico in senso orario; non è
        l’orientamento del sensore o il nord celeste della fotografia.
      </p>
      {samples.length ? (
        <div className="direction-table">
          <table>
            <thead>
              <tr>
                <th>Ora locale</th>
                <th>Direzione</th>
                <th>Azimut</th>
                <th>Altezza</th>
                <th>Ripresa</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((p) => (
                <tr key={p.ms} className={p.usable ? "direction-usable" : ""}>
                  <td>{clock(p.ms, site)}</td>
                  <td>{cardinal(p.az)}</td>
                  <td>{fmt(p.az, 0)}°</td>
                  <td>{fmt(p.alt, 0)}°</td>
                  <td>{p.usable ? "Nel settore, sopra soglia" : "Fuori settore / sotto soglia"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="caption">Oggetto sotto l’orizzonte durante il buio astronomico.</p>
      )}
    </section>
  );
}
