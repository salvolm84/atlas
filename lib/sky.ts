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
  if (nightCache.size > 32) nightCache.delete(nightCache.keys().next().value!);
  nightCache.set(key, n);
  return n;
}
export type Sector = { start: number; span: number };
export const bearing = (az: number) => ((az % 360) + 360) % 360;
export const cardinal = (az: number) =>
  ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(bearing(az) / 45) % 8];
export const inSector = (az: number, s: Sector) =>
  s.span >= 360 || bearing(az - s.start) <= s.span + 1e-9;
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
  const windows: { start: number; end: number }[] = [];
  for (const s of usable) {
    const last = windows.at(-1);
    if (last && s.ms - last.end <= 1000) last.end = s.ms + 15 * 60000;
    else windows.push({ start: s.ms, end: s.ms + 15 * 60000 });
  }
  const visibleMoon = usable.filter((s) => s.moon > 0);
  const moonSeparation = visibleMoon.length
    ? Math.min(...visibleMoon.map((s) => separation(eq.ra, eq.dec, s.moonRA, s.moonDec)))
    : null;
  const moonAbove = usable.length ? visibleMoon.length / usable.length : 0;
  const hours = usable.length * 0.25;
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
