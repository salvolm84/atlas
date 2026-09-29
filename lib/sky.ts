import * as A from "astronomy-engine";
import raw from "../public/data/catalog.json";

export type DSO = {
  id: string;
  key: string;
  name: string;
  aliases: string[];
  ra: number;
  dec: number;
  type: string;
  kind: string;
  group: string;
  morphology: string;
  major: number | null;
  minor: number | null;
  pa: number;
  mag: number | null;
  band: string | null;
  distance: number | null;
  distanceSource: string;
  distanceUrl: string;
  messier: number | null;
  caldwell: number | null;
};
export const objects = raw as DSO[];

/**
 * An observing location. `timeZone` is an IANA name; every wall-clock time the
 * planner shows is rendered in it, so it has to travel with the coordinates
 * rather than being assumed. Elevation is in metres.
 */
export type Site = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  height: number;
  timeZone: string;
};

/** The original hardcoded location, kept as the default. */
export const MODENA: Site = {
  id: "modena",
  name: "Modena, Italy",
  latitude: 44.6471,
  longitude: 10.9252,
  height: 34,
  timeZone: "Europe/Rome",
};

/**
 * Identity of a site for caching. Derived from the values that change the sky,
 * not from `id`, so a renamed or hand-entered site cannot collide with a preset.
 */
export const siteKey = (s: Site) => `${s.latitude},${s.longitude},${s.height},${s.timeZone}`;

const observers = new Map<string, A.Observer>();
export function observerFor(site: Site): A.Observer {
  const key = siteKey(site);
  let found = observers.get(key);
  if (!found) {
    found = new A.Observer(site.latitude, site.longitude, site.height);
    observers.set(key, found);
  }
  return found;
}

/** Highest altitude a declination can reach, at transit, from this latitude. */
export const transitAltitude = (dec: number, site: Site) => 90 - Math.abs(site.latitude - dec);

/** True when a declination never clears this site's horizon. */
export const neverRises = (dec: number, site: Site) => transitAltitude(dec, site) <= 0;
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const DEG = Math.PI / 180;
export const scopes = {
  s30: {
    name: "Seestar S30 Pro",
    aperture: 30,
    focal: 160,
    pixel: 2.9,
    width: 2160,
    height: 3840,
    sensor: "Sony IMX585",
    source: "https://www.seestar.com/products/seestar-s30-pro",
  },
  s50: {
    name: "Seestar S50 Pro",
    aperture: 50,
    focal: 260,
    pixel: 2.9,
    width: 2160,
    height: 3840,
    sensor: "OmniVision OS08B10",
    source: "https://www.seestar.com/products/seestar-s50-pro-smart-telescope",
  },
};
export type ScopeId = keyof typeof scopes;
export function fov(id: ScopeId) {
  const s = scopes[id],
    w = (s.width * s.pixel) / 1000,
    h = (s.height * s.pixel) / 1000;
  return {
    width: (2 * Math.atan(w / (2 * s.focal))) / DEG,
    height: (2 * Math.atan(h / (2 * s.focal))) / DEG,
    scale: (206.265 * s.pixel) / s.focal,
  };
}
export function fmt(n: number | null, digits = 1) {
  return n === null
    ? "Not available"
    : n.toLocaleString("en-GB", { maximumFractionDigits: digits });
}
export function distanceText(n: number | null) {
  return n === null
    ? "Not available"
    : n >= 1e6
      ? fmt(n / 1e6, 2) + " million ly"
      : fmt(n, 0) + " ly";
}

/** Calendar date at the site, as YYYY-MM-DD. */
export function siteDate(d: Date, site: Site) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: site.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
export function clock(ms: number, site: Site) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: site.timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);
}

/**
 * The instant at which the site's wall clock reads `day` at `hour`. Solved by
 * iteration rather than an offset table, so daylight saving is handled by Intl.
 */
export function localTime(day: string, hour: number, site: Site): Date {
  const [y, m, d] = day.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d, hour);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: site.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(guess);
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    const displayed = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    guess += target - displayed;
  }
  return new Date(guess);
}
/** `count` consecutive dates starting at `day`, as YYYY-MM-DD. */
export function daysFrom(day: string, count: number): string[] {
  const out: string[] = [];
  let cursor = day;
  for (let i = 0; i < count; i++) {
    out.push(cursor);
    cursor = nextDate(cursor);
  }
  return out;
}
export function nextDate(day: string) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function bodyPosition(body: A.Body, time: Date, observer: A.Observer) {
  const eq = A.Equator(body, time, observer, true, true);
  return { ra: eq.ra, dec: eq.dec, alt: A.Horizon(time, observer, eq.ra, eq.dec).altitude };
}
export function separation(ra: number, dec: number, ra2: number, dec2: number) {
  return (
    Math.acos(
      Math.min(
        1,
        Math.max(
          -1,
          Math.sin(dec * DEG) * Math.sin(dec2 * DEG) +
            Math.cos(dec * DEG) * Math.cos(dec2 * DEG) * Math.cos((ra - ra2) * 15 * DEG),
        ),
      ),
    ) / DEG
  );
}
const SAMPLE_MS = 15 * 60000;
/** Bisection steps per edge: 15 min / 2^6 puts a boundary inside ~14 seconds. */
const REFINE_STEPS = 6;

/**
 * Whether a target is usable at an arbitrary instant. Identical in form to the
 * test applied to the 15-minute samples, so a refined boundary can never
 * disagree with the sample it was refined from.
 */
function usableAt(
  ms: number,
  eq: { ra: number; dec: number },
  observer: A.Observer,
  minAlt: number,
  sector: Sector,
) {
  const time = new Date(ms);
  const sun = A.Equator(A.Body.Sun, time, observer, true, true);
  if (A.Horizon(time, observer, sun.ra, sun.dec).altitude >= -18) return false;
  const h = A.Horizon(time, observer, eq.ra, eq.dec);
  return h.altitude >= minAlt && inSector(h.azimuth, sector);
}

/**
 * The instant usability changes, bisected between a time where the target is
 * not usable and one where it is. Returns the usable side, so a start edge is
 * the first usable instant and an end edge the last.
 */
function refineEdge(notUsable: number, isUsable: number, test: (ms: number) => boolean) {
  let bad = notUsable,
    good = isUsable;
  for (let i = 0; i < REFINE_STEPS; i++) {
    const mid = (bad + good) / 2;
    if (test(mid)) good = mid;
    else bad = mid;
  }
  return good;
}

export type Sample = { ms: number; sun: number; moon: number; moonRA: number; moonDec: number };
export type Night = {
  day: string;
  site: Site;
  samples: Sample[];
  dark: Sample[];
  moonLight: number;
  rotation: A.RotationMatrix;
};
const nightCache = new Map<string, Night>();
export function makeNight(day: string, site: Site): Night {
  // Keyed on the site as well as the day: the same date at a different place is
  // a different sky, and returning a cached one would be silently wrong.
  const key = siteKey(site) + "|" + day;
  const cached = nightCache.get(key);
  if (cached) return cached;
  const observer = observerFor(site);
  const start = localTime(day, 12, site).getTime(),
    end = localTime(nextDate(day), 12, site).getTime();
  const samples: Sample[] = [];
  for (let ms = start; ms < end; ms += 15 * 60000) {
    const d = new Date(ms),
      sun = bodyPosition(A.Body.Sun, d, observer),
      moon = bodyPosition(A.Body.Moon, d, observer);
    samples.push({ ms, sun: sun.alt, moon: moon.alt, moonRA: moon.ra, moonDec: moon.dec });
  }
  const midnight = localTime(nextDate(day), 0, site);
  const n = {
    day,
    site,
    samples,
    dark: samples.filter((s) => s.sun < -18),
    moonLight: A.Illumination(A.Body.Moon, midnight).phase_fraction,
    rotation: A.Rotation_EQJ_EQD(midnight),
  };
  // 16 outlook nights + 12 seasonality months + the selected night exceeds 32,
  // which used to evict entries that were about to be read again.
  if (nightCache.size > 128) nightCache.delete(nightCache.keys().next().value!);
  nightCache.set(key, n);
  return n;
}
export type Sector = { start: number; span: number };
export const bearing = (az: number) => ((az % 360) + 360) % 360;
export const cardinal = (az: number) =>
  ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(bearing(az) / 45) % 8];
export const inSector = (az: number, s: Sector) =>
  s.span >= 360 || bearing(az - s.start) <= s.span + 1e-9;

/**
 * Move a sector's start to `az`, holding its end still. The span is recomputed
 * through `bearing`, so a sector that crosses north stays correct. Clamped to a
 * 5° minimum, matching the dial's snap, so a handle cannot collapse the sector.
 */
export const sectorWithStart = (s: Sector, az: number): Sector => {
  const start = bearing(az);
  return { start, span: Math.max(5, bearing(s.start + s.span - start)) };
};

/** Move a sector's end to `az`, holding its start still. */
export const sectorWithEnd = (s: Sector, az: number): Sector => ({
  ...s,
  span: Math.max(5, bearing(bearing(az) - s.start)),
});
export type TargetNight = {
  o: DSO;
  hours: number;
  peak: number;
  peakTime: number;
  peakAz: number;
  moonSeparation: number | null;
  moonAbove: number;
  score: number;
  windows: { start: number; end: number }[];
  curve: { ms: number; alt: number; az: number; usable: boolean; sun: number; moon: number }[];
};
export function targetNight(
  o: DSO,
  n: Night,
  minAlt: number = 30,
  scope: ScopeId = "s50",
  sector: Sector = { start: 0, span: 360 },
): TargetNight {
  // The night carries its own site, so the caller cannot pair a sky with the
  // wrong observer.
  const observer = observerFor(n.site);
  const eq = A.EquatorFromVector(
    A.RotateVector(
      n.rotation,
      A.VectorFromSphere(new A.Spherical(o.dec, o.ra, 1), new Date(n.samples[0].ms)),
    ),
  );
  const curve = n.samples.map((s) => {
    const h = A.Horizon(new Date(s.ms), observer, eq.ra, eq.dec);
    return {
      ...s,
      alt: h.altitude,
      az: h.azimuth,
      usable: s.sun < -18 && h.altitude >= minAlt && inSector(h.azimuth, sector),
    };
  });
  const dark = curve.filter((s) => s.sun < -18);
  const usable = dark.filter((s) => s.usable);
  const candidates = usable.length ? usable : dark;
  const max = candidates.reduce((a, b) => (b.alt > a.alt ? b : a), candidates[0] ?? curve[0]);
  // Contiguous runs of usable samples first, then each run's two edges are
  // bisected against the neighbouring unusable sample. Reported boundaries are
  // therefore the real crossing times rather than multiples of 15 minutes.
  const runs: { first: number; last: number }[] = [];
  curve.forEach((s, i) => {
    if (!s.usable) return;
    const open = runs.at(-1);
    if (open && open.last === i - 1) open.last = i;
    else runs.push({ first: i, last: i });
  });
  const test = (ms: number) => usableAt(ms, eq, observer, minAlt, sector);
  const windows = runs.map(({ first, last }) => ({
    // A run touching the edge of the sampled night cannot be bisected outwards;
    // the night's own bounds are the honest answer there.
    start: first === 0 ? curve[0].ms : refineEdge(curve[first - 1].ms, curve[first].ms, test),
    end:
      last === curve.length - 1
        ? curve[last].ms + SAMPLE_MS
        : refineEdge(curve[last + 1].ms, curve[last].ms, test),
  }));
  const visibleMoon = usable.filter((s) => s.moon > 0);
  const moonSeparation = visibleMoon.length
    ? Math.min(...visibleMoon.map((s) => separation(eq.ra, eq.dec, s.moonRA, s.moonDec)))
    : null;
  const moonAbove = usable.length ? visibleMoon.length / usable.length : 0;
  // Derived from the refined windows, so the total and the displayed
  // boundaries can never disagree, and both are better than 15-minute steps.
  const hours = windows.reduce((total, w) => total + (w.end - w.start), 0) / 3600000;
  const avgAlt = usable.length
    ? usable.reduce((s, p) => s + Math.sin(p.alt * DEG), 0) / usable.length
    : 0;
  const emission = ["HII", "EN", "SNR", "PN"].includes(o.type);
  const moonPenalty =
    n.moonLight * moonAbove * (emission ? 0.16 : 0.48) * (1 - (moonSeparation ?? 180) / 240);
  const pixels = o.major ? (o.major * 60) / fov(scope).scale : null;
  const sizePenalty = pixels === null ? 0.85 : Math.min(1, Math.max(0.25, pixels / 160));
  const brightness = o.mag === null ? 0.6 : Math.max(0.2, Math.min(1, (16 - o.mag) / 9));
  const score =
    hours < 0.5
      ? 0
      : Math.round(
          100 *
            Math.max(
              0,
              Math.min(
                1,
                (0.5 * Math.min(hours / 6, 1) + 0.35 * avgAlt + 0.15 * brightness) *
                  (1 - moonPenalty) *
                  sizePenalty,
              ),
            ),
        );
  return {
    o,
    hours,
    peak: max.alt,
    peakTime: max.ms,
    peakAz: max.az,
    moonSeparation,
    moonAbove,
    score,
    windows,
    curve,
  };
}
export function seasonal(
  o: DSO,
  year: number,
  site: Site,
  minAlt = 30,
  sector: Sector = { start: 0, span: 360 },
) {
  return MONTHS.map((label, i) => {
    const night = makeNight(year + "-" + String(i + 1).padStart(2, "0") + "-15", site);
    const result = targetNight(o, night, minAlt, "s50", sector);
    return { label, month: i, hours: result.hours, peak: result.peak };
  });
}
export function surfaceBrightness(o: DSO) {
  if (o.mag === null || !o.major || !o.minor || o.group === "other" || o.group === "cluster")
    return null;
  return o.mag + 2.5 * Math.log10(Math.PI * ((o.major * 60) / 2) * ((o.minor * 60) / 2));
}
export function photoAdvice(o: DSO) {
  if (o.group === "galaxy")
    return "Broadband light: use a UV/IR-cut filter. A dual-band filter removes most of the starlight. Look for moonless nights, integrate for a long time, and protect the core while stretching.";
  if (o.type === "RN" || o.type === "DN" || o.messier === 45)
    return "UV/IR-cut and a dark sky. Dust and reflection nebulae suffer badly from the Moon and from light pollution; a dual-band filter is the wrong choice here.";
  if (o.group === "cluster")
    return "UV/IR-cut, an exposure that does not saturate the brightest stars, and a moderate stretch. In globulars, keep the stars separated towards the centre.";
  if (o.group === "other")
    return "Catalogued for completeness: this is not a galaxy or an isolated nebula. Check what the field actually contains before planning it.";
  return "A dual-band H-alpha / O III filter can raise emission contrast under an urban sky. Integrate for several hours; brightness and detail depend on transparency, the Moon and calibration.";
}
export function surveyURL(o: DSO, field: number, size = 700) {
  const q = new URLSearchParams({
    hips: "CDS/P/DSS2/color",
    width: String(size),
    height: String(size),
    fov: field.toFixed(6),
    projection: "TAN",
    coordsys: "icrs",
    ra: String(o.ra),
    dec: String(o.dec),
    format: "jpg",
  });
  return "https://alasky.cds.unistra.fr/hips-image-services/hips2fits?" + q;
}
