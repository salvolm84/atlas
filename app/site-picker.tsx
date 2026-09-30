"use client";
import { useMemo, useRef, useState } from "react";
import { LoaderCircle, MapPin, Navigation, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Choice } from "./choice";
import { fmt, MODENA, siteKey, type Site } from "@/lib/sky";
import { lookupZone, searchPlaces, type Place } from "@/lib/geocode";

/** Coordinates as the header shows them: 44.65° N · 10.93° E. */
export function coordinateLabel(site: Site) {
  return (
    `${fmt(Math.abs(site.latitude), 2)}° ${site.latitude >= 0 ? "N" : "S"} · ` +
    `${fmt(Math.abs(site.longitude), 2)}° ${site.longitude >= 0 ? "E" : "W"}`
  );
}

/**
 * Every IANA zone the runtime knows, so the picker needs no timezone database.
 * supportedValuesOf is ES2022; older engines fall back to their own zone.
 */
function timeZones(current: string): string[] {
  let all: string[] = [];
  try {
    all = Intl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    all = [];
  }
  if (!all.length) all = [current, "UTC"];
  return all.includes(current) ? all : [current, ...all];
}

/** The device's own zone, the best guess for coordinates you are standing at. */
function deviceTimeZone(fallback: string) {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export type Draft = { latitude: string; longitude: string; height: string; timeZone: string };

const toDraft = (s: Site): Draft => ({
  latitude: String(s.latitude),
  longitude: String(s.longitude),
  height: String(s.height),
  timeZone: s.timeZone,
});

/**
 * Parses a draft, returning either a Site or the reason it is not one.
 * Load-bearing: astronomy-engine throws on a non-finite latitude, and the night
 * is computed during Atlas's own render, so an unvalidated typo would take the
 * whole page down rather than showing a bad number.
 */
export function parseDraft(d: Draft, name: string, id: string): { site?: Site; error?: string } {
  // Number("") is 0, so a blank coordinate would silently mean the equator or
  // the prime meridian. Blank elevation does legitimately mean sea level.
  const latitude = d.latitude.trim() === "" ? NaN : Number(d.latitude);
  const longitude = d.longitude.trim() === "" ? NaN : Number(d.longitude);
  const height = d.height.trim() === "" ? 0 : Number(d.height);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
    return { error: "Latitude must be a number between −90 and 90." };
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    return { error: "Longitude must be a number between −180 and 180." };
  if (!Number.isFinite(height) || height < -500 || height > 9000)
    return { error: "Elevation must be a number between −500 and 9000 metres." };
  if (!d.timeZone) return { error: "Choose a time zone." };
  return { site: { id, name, latitude, longitude, height, timeZone: d.timeZone } };
}

export function SitePicker({ site, onChange }: { site: Site; onChange: (s: Site) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(site));
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  // "search" while Nominatim answers; a place while its time zone is looked up.
  const [busy, setBusy] = useState<"search" | Place | null>(null);
  const pending = useRef<AbortController | null>(null);
  const zones = useMemo(() => timeZones(site.timeZone), [site.timeZone]);

  // Re-seed the form from the active site whenever the popover opens, so a
  // half-finished edit is never mistaken for the location in use.
  function setOpenState(next: boolean) {
    if (next) {
      setDraft(toDraft(site));
      setError("");
    }
    setOpen(next);
  }

  function commit(next: Site) {
    // Guard identity: the night and seasonality memos sweep 248 objects, so an
    // equal-valued site must not look like a new one.
    if (siteKey(next) !== siteKey(site) || next.name !== site.name) onChange(next);
    setOpen(false);
  }

  function apply() {
    const { site: parsed, error: why } = parseDraft(draft, "Custom location", "custom");
    if (!parsed) return setError(why ?? "Check the values.");
    commit(parsed);
  }

  // One request at a time: a new search or pick cancels whatever is in flight.
  function begin() {
    pending.current?.abort();
    pending.current = new AbortController();
    return pending.current.signal;
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    const signal = begin();
    setError("");
    setResults(null);
    setBusy("search");
    try {
      const found = await searchPlaces(text, signal);
      setResults(found);
      if (!found.length)
        setError("No place matches. Try adding the town or country, or enter coordinates.");
    } catch {
      if (!signal.aborted)
        setError(
          "Place search is unavailable right now (offline?). Enter the coordinates instead.",
        );
    } finally {
      if (!signal.aborted) setBusy(null);
    }
  }

  async function pick(place: Place) {
    const signal = begin();
    setError("");
    setBusy(place);
    let zone: { timeZone: string | null; height: number | null } = {
      timeZone: null,
      height: null,
    };
    try {
      zone = await lookupZone(place.latitude, place.longitude, signal);
    } catch {
      if (signal.aborted) return;
    }
    setBusy(null);
    const next: Site = {
      id: "search",
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      height: zone.height ?? 0,
      timeZone: zone.timeZone ?? draft.timeZone,
    };
    setDraft(toDraft(next));
    if (!zone.timeZone) {
      // Coordinates without the right zone would put every time off by hours,
      // so stop here and let the zone be chosen by hand.
      setError(
        `Found ${place.name}, but its time zone could not be looked up. Choose it below, then use these coordinates.`,
      );
      return;
    }
    setResults(null);
    setQuery("");
    commit(next);
  }

  function locate() {
    if (!navigator.geolocation) {
      setError("This browser does not provide location access.");
      return;
    }
    setError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude, altitude } = position.coords;
        // Geolocation reports coordinates but never a time zone, so take the
        // device's own: standing at these coordinates, it is almost always right.
        // Altitude is frequently null and barely affects a geometric horizon.
        const next: Site = {
          id: "current",
          name: "My location",
          latitude: Math.round(latitude * 1e4) / 1e4,
          longitude: Math.round(longitude * 1e4) / 1e4,
          height: altitude == null ? 0 : Math.round(altitude),
          timeZone: deviceTimeZone(site.timeZone),
        };
        setDraft(toDraft(next));
        commit(next);
      },
      (failure) => {
        setLocating(false);
        setError(
          failure.code === failure.PERMISSION_DENIED
            ? "Location permission was denied. Enter the coordinates instead."
            : failure.code === failure.POSITION_UNAVAILABLE
              ? // Opened straight from a file, browsers often refuse this.
                "Your location is unavailable here. Browsers usually block it for pages opened from a file; enter the coordinates instead."
              : failure.code === failure.TIMEOUT
                ? "Locating timed out. Try again, or enter the coordinates."
                : "Could not read your location. Enter the coordinates instead.",
        );
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }

  const isModena = siteKey(site) === siteKey(MODENA);

  return (
    <Popover open={open} onOpenChange={setOpenState}>
      <PopoverTrigger asChild>
        <button className="location" aria-label={`Observing location: ${site.name}. Change it.`}>
          <MapPin size={15} />
          {site.name} <small>{coordinateLabel(site)}</small>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-3">
        <div className="grid gap-3">
          <div>
            <p className="text-sm font-semibold">Observing location</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Times are shown in the site&apos;s time zone. Nothing is saved: the atlas returns to
              Modena when you reload.
            </p>
          </div>

          <form className="grid gap-1 text-xs" onSubmit={search} role="search">
            <label htmlFor="place-search">Find a city or address</label>
            <div className="flex gap-2">
              <Input
                id="place-search"
                type="search"
                autoComplete="off"
                placeholder="e.g. Asiago, or a street address"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="submit"
                className="icon-btn shrink-0"
                aria-label="Search for the place"
                disabled={busy === "search"}
              >
                {busy === "search" ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Search size={16} />
                )}
              </button>
            </div>
          </form>
          {results?.length ? (
            <ul className="place-results" aria-label="Matching places">
              {results.map((p) => (
                <li key={p.detail + p.latitude}>
                  <button onClick={() => pick(p)} disabled={busy !== null}>
                    <strong>
                      {p.name}
                      {busy === p ? <LoaderCircle size={13} className="spin" /> : null}
                    </strong>
                    <span>{p.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[11px] leading-4 text-slate-400">
            Search by Nominatim, © OpenStreetMap contributors. Time zone and elevation from
            Open-Meteo.
          </p>

          <button className="date-button" onClick={locate} disabled={locating}>
            {locating ? <LoaderCircle size={16} className="spin" /> : <Navigation size={16} />}
            {locating ? "Locating…" : "Use my current location"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs">
              Latitude
              <Input
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                aria-label="Latitude in degrees"
                value={draft.latitude}
                onChange={(e) => setDraft({ ...draft, latitude: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs">
              Longitude
              <Input
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                aria-label="Longitude in degrees"
                value={draft.longitude}
                onChange={(e) => setDraft({ ...draft, longitude: e.target.value })}
              />
            </label>
          </div>

          <label className="grid gap-1 text-xs">
            Elevation (m)
            <Input
              type="number"
              step="1"
              min="-500"
              max="9000"
              aria-label="Elevation in metres"
              value={draft.height}
              onChange={(e) => setDraft({ ...draft, height: e.target.value })}
            />
          </label>

          <label className="grid gap-1 text-xs">
            Time zone
            <Choice
              label="Time zone"
              value={draft.timeZone}
              onChange={(v) => setDraft({ ...draft, timeZone: v })}
              options={zones.map((z) => [z, z])}
            />
          </label>

          {error ? (
            <p className="notice warning" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <button className="date-button" onClick={apply}>
              Use these coordinates
            </button>
            <button
              className="icon-btn"
              aria-label="Reset to Modena"
              title="Reset to Modena"
              disabled={isModena}
              onClick={() => commit(MODENA)}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
