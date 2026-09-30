/**
 * Place search for the location picker: a city or a full address becomes
 * coordinates, a time zone and an elevation.
 *
 * Two keyless services, both sending `access-control-allow-origin: *`, so the
 * portable file:// release can use them too:
 * - Nominatim (OpenStreetMap) turns the text into coordinates. Its usage
 *   policy forbids search-as-you-type, so the picker only searches when asked,
 *   and it wants results credited to OpenStreetMap contributors (ODbL).
 * - Open-Meteo, already the cloud forecast provider, reports the IANA zone and
 *   terrain elevation for those coordinates. As for the forecast, coordinates
 *   are rounded to about a kilometre before they are sent.
 */
const SEARCH = "https://nominatim.openstreetmap.org/search";
const ZONE = "https://api.open-meteo.com/v1/forecast";

export type Place = { name: string; detail: string; latitude: number; longitude: number };

type NominatimAddress = Partial<
  Record<
    | "house_number"
    | "road"
    | "city"
    | "town"
    | "village"
    | "hamlet"
    | "municipality"
    | "county"
    | "state"
    | "country",
    string
  >
>;
type NominatimResult = {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: NominatimAddress;
};

/**
 * A short name for the header ("Sydney, Australia", "Via Emilia Est 1,
 * Modena, Italy") plus the full address for telling results apart.
 */
export function toPlace(r: NominatimResult): Place | null {
  const latitude = Number(r.lat),
    longitude = Number(r.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const a = r.address ?? {};
  const locality =
    a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? a.county ?? a.state;
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const place = r.name || street || undefined;
  const parts = [place !== locality ? place : undefined, locality, a.country].filter(Boolean);
  const name = parts.length ? parts.join(", ") : r.display_name.split(", ").slice(0, 2).join(", ");
  return {
    name,
    detail: r.display_name,
    latitude: Math.round(latitude * 1e4) / 1e4,
    longitude: Math.round(longitude * 1e4) / 1e4,
  };
}

export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  const q = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    "accept-language": "en",
  });
  const response = await fetch(`${SEARCH}?${q}`, { signal });
  if (!response.ok) throw new Error(`search failed (${response.status})`);
  const results: NominatimResult[] = await response.json();
  return results.map(toPlace).filter((p): p is Place => p !== null);
}

/** Validates Open-Meteo's answer: a zone this browser knows, and an elevation. */
export function toZone(
  body: { timezone?: unknown; elevation?: unknown },
  known: (zone: string) => boolean,
): { timeZone: string | null; height: number | null } {
  const timeZone = typeof body.timezone === "string" && known(body.timezone) ? body.timezone : null;
  const height =
    typeof body.elevation === "number" && Number.isFinite(body.elevation)
      ? Math.round(body.elevation)
      : null;
  return { timeZone, height };
}

const knownZone = (zone: string) => {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

export async function lookupZone(latitude: number, longitude: number, signal: AbortSignal) {
  const q = new URLSearchParams({
    latitude: latitude.toFixed(2),
    longitude: longitude.toFixed(2),
    timezone: "auto",
    forecast_days: "1",
  });
  const response = await fetch(`${ZONE}?${q}`, { signal });
  if (!response.ok) throw new Error(`time zone lookup failed (${response.status})`);
  return toZone(await response.json(), knownZone);
}
