import { nextDate, siteKey, type Site } from "./sky";

/**
 * Cloud cover from Open-Meteo, shown beside the astronomy and never folded
 * into it. Everything else the atlas computes is local, offline and the same
 * for everyone; this is a third-party forecast that expires, so it is kept
 * clearly separate and the 0-100 score ignores it.
 *
 * Open-Meteo needs no API key and sends `access-control-allow-origin: *`, so
 * it also works for the portable release opened from a file. Data is
 * CC-BY-4.0; see public/data/NOTICE.txt.
 */
const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export type CloudHour = { ms: number; cloud: number };
export type CloudForecast =
  | { state: "loading" }
  | { state: "ready"; hours: CloudHour[] }
  | { state: "unavailable"; reason: string };

/**
 * Coordinates are rounded to about a kilometre before leaving the browser.
 * The forecast grid is coarser than that, so nothing is lost, and a precise
 * position from the geolocation button is not handed to a third party.
 */
export function cloudUrl(site: Site, startDay: string, endDay: string) {
  const q = new URLSearchParams({
    latitude: site.latitude.toFixed(2),
    longitude: site.longitude.toFixed(2),
    hourly: "cloud_cover",
    timeformat: "unixtime",
    start_date: startDay,
    end_date: endDay,
  });
  return `${ENDPOINT}?${q}`;
}

/** Nearest hourly sample to `ms`, or null when the night is not covered. */
export function cloudAt(hours: CloudHour[], ms: number): number | null {
  if (!hours.length) return null;
  let best: CloudHour | null = null;
  let bestGap = Infinity;
  for (const h of hours) {
    const gap = Math.abs(h.ms - ms);
    if (gap < bestGap) {
      bestGap = gap;
      best = h;
    }
  }
  // Beyond half an hour there is no sample for this time, so report nothing
  // rather than stretching a neighbouring hour across a gap.
  return best && bestGap <= 30 * 60000 ? best.cloud : null;
}

/**
 * Slug for the same bands, safe to use as a CSS class. Kept separate from
 * describeCloud, whose prose contains spaces and would silently become two
 * class names.
 */
export function cloudBandClass(percent: number | null) {
  if (percent === null) return "unknown";
  if (percent < 12) return "clear";
  if (percent < 30) return "mostly-clear";
  if (percent < 60) return "partly-cloudy";
  if (percent < 85) return "mostly-cloudy";
  return "overcast";
}

/** Plain-language band for a cloud percentage. */
export function describeCloud(percent: number) {
  if (percent < 12) return "clear";
  if (percent < 30) return "mostly clear";
  if (percent < 60) return "partly cloudy";
  if (percent < 85) return "mostly cloudy";
  return "overcast";
}

/**
 * Mean cloud cover across the target's useful windows. Weighted by nothing
 * clever: each 15-minute sample inside a window counts once.
 */
export function cloudOverWindows(
  hours: CloudHour[],
  windows: { start: number; end: number }[],
): { mean: number; covered: number; total: number } {
  let sum = 0,
    covered = 0,
    total = 0;
  for (const w of windows) {
    for (let ms = w.start; ms < w.end; ms += 15 * 60000) {
      total++;
      const cloud = cloudAt(hours, ms);
      if (cloud !== null) {
        sum += cloud;
        covered++;
      }
    }
  }
  return { mean: covered ? sum / covered : NaN, covered, total };
}

type Payload = {
  error?: boolean;
  reason?: string;
  hourly?: { time?: number[]; cloud_cover?: (number | null)[] };
};

/** Turns a response body into hours, or explains why it cannot. */
export function readCloudPayload(body: Payload): CloudForecast {
  if (body.error) {
    // The API states the window it covers; passing that on is more useful
    // than "request failed".
    const window = body.reason?.match(/from\s+([\d-]+)\s+to\s+([\d-]+)/);
    return {
      state: "unavailable",
      reason: window
        ? `Forecasts are only available between ${window[1]} and ${window[2]}.`
        : "This date is outside the forecast range.",
    };
  }
  const time = body.hourly?.time ?? [];
  const cover = body.hourly?.cloud_cover ?? [];
  const hours: CloudHour[] = [];
  for (let i = 0; i < time.length; i++) {
    const cloud = cover[i];
    // unixtime is in seconds.
    if (typeof time[i] === "number" && typeof cloud === "number")
      hours.push({ ms: time[i] * 1000, cloud });
  }
  return hours.length
    ? { state: "ready", hours }
    : { state: "unavailable", reason: "No cloud data was returned for this night." };
}

const cache = new Map<string, CloudForecast>();

export async function fetchCloudRange(
  site: Site,
  startDay: string,
  endDay: string,
  signal?: AbortSignal,
): Promise<CloudForecast> {
  const key = `${siteKey(site)}|${startDay}|${endDay}`;
  const cached = cache.get(key);
  if (cached) return cached;
  let result: CloudForecast;
  try {
    const response = await fetch(cloudUrl(site, startDay, endDay), { signal });
    result = readCloudPayload(await response.json());
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    // Offline, blocked by the browser for a file:// page, or the service is
    // down. None of these should read as the atlas being broken.
    result = {
      state: "unavailable",
      reason: "Could not reach the forecast service. The atlas works without it.",
    };
  }
  if (cache.size > 64) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}

/** The night runs from `day` noon into the next day, so it needs both dates. */
export const fetchClouds = (site: Site, day: string, signal?: AbortSignal) =>
  fetchCloudRange(site, day, nextDate(day), signal);

/** How many nights ahead the outlook offers. Open-Meteo reaches about 16 days. */
export const OUTLOOK_NIGHTS = 14;

export type OutlookNight = {
  day: string;
  /** Useful hours for the target that night, under the current filters. */
  hours: number;
  /** Mean cloud across those useful windows, or null where the forecast has none. */
  cloud: number | null;
  /** True when the night is both usable and forecast clearer than partly cloudy. */
  promising: boolean;
};

/**
 * Ranks the coming nights for one target: usable hours from the astronomy,
 * cloud from the forecast, kept side by side rather than merged into a single
 * number. A night with no forecast still reports its hours, because the
 * astronomy is known even when the weather is not.
 */
export function buildOutlook(
  days: string[],
  usableHours: (day: string) => { hours: number; windows: { start: number; end: number }[] },
  hours: CloudHour[],
): OutlookNight[] {
  return days.map((day) => {
    const { hours: usable, windows } = usableHours(day);
    const summary = hours.length ? cloudOverWindows(hours, windows) : null;
    const cloud = summary && summary.covered > 0 ? summary.mean : null;
    return {
      day,
      hours: usable,
      cloud,
      promising: usable >= 1 && cloud !== null && cloud < 30,
    };
  });
}
