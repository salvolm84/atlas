/**
 * Interaction checks for the parts of the interface whose logic can go wrong
 * silently: the observing-location input path, and the horizon dial's keyboard
 * and assistive-technology exposure. Deliberately free of a DOM library -- the
 * behaviour is pure functions, and the ARIA is checked by server-rendering the
 * real component.
 */
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  assert = require("node:assert/strict"),
  ts = require("typescript");

function load(relative, stubs = {}) {
  const file = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
  }).outputText;
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  const inherited = m.require.bind(m);
  m.require = (id) => (Object.hasOwn(stubs, id) ? stubs[id] : inherited(id));
  m._compile(compiled, file);
  return m.exports;
}

const sky = load("../lib/sky.ts");
// The picker pulls in Radix and lucide for its markup; none of that is needed
// to exercise the parsing, so the UI imports are stubbed out.
const stub = new Proxy({}, { get: () => () => null });
const geocode = load("../lib/geocode.ts");
const picker = load("../app/site-picker.tsx", {
  react: {
    useMemo: () => [],
    useRef: (v) => ({ current: v }),
    useState: (v) => [typeof v === "function" ? v() : v, () => {}],
  },
  "lucide-react": stub,
  "@/components/ui/input": stub,
  "@/components/ui/popover": stub,
  "./choice": stub,
  "@/lib/sky": sky,
  "@/lib/geocode": geocode,
});

// Place search: Nominatim results become a short header name and rounded
// coordinates; a result without usable coordinates is dropped.
{
  const city = geocode.toPlace({
    lat: "-33.8698439",
    lon: "151.2082848",
    name: "Sydney",
    display_name: "Sydney, New South Wales, Australia",
    address: { city: "Sydney", state: "New South Wales", country: "Australia" },
  });
  assert.deepEqual(city, {
    name: "Sydney, Australia",
    detail: "Sydney, New South Wales, Australia",
    latitude: -33.8698,
    longitude: 151.2083,
  });
  const house = geocode.toPlace({
    lat: "44.6433022",
    lon: "10.9339848",
    name: "",
    display_name: "1, Via Emilia Est, Musicisti, Modena, Emilia-Romagna, 41121, Italy",
    address: { house_number: "1", road: "Via Emilia Est", city: "Modena", country: "Italy" },
  });
  assert.equal(house.name, "Via Emilia Est 1, Modena, Italy");
  assert.equal(geocode.toPlace({ lat: "x", lon: "1", display_name: "Nowhere" }), null);
  // The zone must be one the browser can format with, or it is refused.
  const known = (z) => z === "Australia/Sydney";
  assert.deepEqual(geocode.toZone({ timezone: "Australia/Sydney", elevation: 69.4 }, known), {
    timeZone: "Australia/Sydney",
    height: 69,
  });
  assert.deepEqual(geocode.toZone({ timezone: "Mars/Olympus", elevation: "high" }, known), {
    timeZone: null,
    height: null,
  });
}

const { parseDraft } = picker;
const ok = { latitude: "44.6471", longitude: "10.9252", height: "34", timeZone: "Europe/Rome" };
const draft = (over) => ({ ...ok, ...over });

// A valid draft becomes a Site the library can actually use.
const good = parseDraft(ok, "Custom location", "custom");
assert(good.site, good.error);
assert.equal(good.site.latitude, 44.6471);
assert.equal(good.site.timeZone, "Europe/Rome");
// And it must survive the whole pipeline, not merely typecheck.
assert.equal(sky.siteKey(good.site), sky.siteKey(sky.MODENA));
assert(sky.makeNight("2026-01-15", good.site).samples.length > 0);

// Out-of-range and non-numeric coordinates are refused with a reason.
for (const bad of [
  { latitude: "" },
  { latitude: "abc" },
  { latitude: "91" },
  { latitude: "-90.1" },
  { latitude: "NaN" },
  { latitude: "Infinity" },
  { longitude: "181" },
  { longitude: "-180.5" },
  { longitude: "" },
  { height: "20000" },
  { height: "-501" },
  { height: "high" },
  { timeZone: "" },
]) {
  const result = parseDraft(draft(bad), "Custom location", "custom");
  assert(!result.site, `should have been refused: ${JSON.stringify(bad)}`);
  assert(result.error && result.error.length > 10, "a refusal must explain itself");
}

// The extremes are legal: poles, the antimeridian, the Dead Sea, Everest.
for (const edge of [
  { latitude: "90", longitude: "0" },
  { latitude: "-90", longitude: "180" },
  { latitude: "0", longitude: "-180" },
  { height: "-430" },
  { height: "8849" },
  { height: "" }, // blank elevation means sea level, not invalid
]) {
  const result = parseDraft(draft(edge), "Custom location", "custom");
  assert(result.site, `should have been accepted: ${JSON.stringify(edge)} -> ${result.error}`);
  // Whatever comes out must be usable by the astronomy layer without throwing.
  sky.observerFor(result.site);
}
assert.equal(parseDraft(draft({ height: "" }), "x", "y").site.height, 0);

// A latitude that got through would throw inside astronomy-engine, which is
// why the guard above exists. Pin that, so the reason is not forgotten.
const trace = console.trace;
console.trace = () => {}; // astronomy-engine traces before it throws
assert.throws(() => sky.observerFor({ ...sky.MODENA, latitude: NaN }));
console.trace = trace;

// ---------------------------------------------------------------------------
// The horizon dial's keyboard handling. The dial used to be pointer-only.
// ---------------------------------------------------------------------------
const { renderToStaticMarkup } = require("react-dom/server");
const React = require("react");
const dial = load("../app/horizon.tsx", {
  react: React,
  "@/components/ui/slider": { Slider: () => null },
  "@/lib/sky": sky,
});

// Key to degrees. Arrows match the 5 degree snap the pointer uses; Page
// Up/Down jump a compass point; anything else must return 0 so the key keeps
// its default behaviour and the page is not hijacked.
assert.equal(dial.sectorKeyDelta("ArrowRight"), 5);
assert.equal(dial.sectorKeyDelta("ArrowUp"), 5);
assert.equal(dial.sectorKeyDelta("ArrowLeft"), -5);
assert.equal(dial.sectorKeyDelta("ArrowDown"), -5);
assert.equal(dial.sectorKeyDelta("PageUp"), 45);
assert.equal(dial.sectorKeyDelta("PageDown"), -45);
for (const key of ["Enter", " ", "Tab", "Escape", "a", "Home", "End", ""])
  assert.equal(dial.sectorKeyDelta(key), 0, `${key} must not move a handle`);

// A keypress composed with the sector algebra must land where the arrow points.
const pressed = sky.sectorWithStart(
  { start: 315, span: 90 },
  315 + dial.sectorKeyDelta("ArrowRight"),
);
assert.deepEqual(pressed, { start: 320, span: 85 });

// The handles must actually reach assistive technology: focusable, named, and
// reporting a value. Server-rendered from the real component, not asserted by
// eye over the source.
const markup = renderToStaticMarkup(
  React.createElement(dial.HorizonFilter, {
    sector: { start: 315, span: 90 },
    onChange: () => {},
  }),
);
const sliders = markup.match(/role="slider"/g) ?? [];
assert.equal(sliders.length, 2, "the dial exposes two slider handles");
assert.equal((markup.match(/tabindex="0"/g) ?? []).length, 2, "both handles are tabbable");
assert(markup.includes('aria-label="Sector start azimuth"'));
assert(markup.includes('aria-label="Sector end azimuth"'));
assert(markup.includes('aria-valuetext="NW, 315 degrees"'), "start announces its bearing");
assert(markup.includes('aria-valuetext="NE, 45 degrees"'), "end announces its bearing");
assert(markup.includes('aria-valuemin="0"') && markup.includes('aria-valuemax="359"'));
// Decorative geometry must not be announced alongside the handles.
assert((markup.match(/aria-hidden="true"/g) ?? []).length >= 8, "decorative parts are hidden");

// ---------------------------------------------------------------------------
// The cloud forecast. Network shapes are parsed by pure functions so the
// failure paths can be checked without touching the network.
// ---------------------------------------------------------------------------
const weather = load("../lib/weather.ts", { "./sky": sky });

// The URL must not leak a precise position: coordinates are rounded to about
// a kilometre, which is finer than the forecast grid anyway.
const url = new URL(
  weather.cloudUrl(
    { ...sky.MODENA, latitude: 44.64713456, longitude: 10.92521 },
    "2026-01-15",
    "2026-01-16",
  ),
);
assert.equal(url.searchParams.get("latitude"), "44.65");
assert.equal(url.searchParams.get("longitude"), "10.93");
assert.equal(url.searchParams.get("timeformat"), "unixtime");
assert.equal(url.searchParams.get("start_date"), "2026-01-15");
assert.equal(url.searchParams.get("end_date"), "2026-01-16", "the range end is explicit");
// The night wrapper must ask for the following day, since a night crosses midnight.
const nightUrl = new URL(weather.cloudUrl(sky.MODENA, "2026-01-31", sky.nextDate("2026-01-31")));
assert.equal(nightUrl.searchParams.get("end_date"), "2026-02-01");
assert.equal(url.searchParams.get("hourly"), "cloud_cover");
// A southern, negative-coordinate site must round toward the right sign.
const south = new URL(
  weather.cloudUrl(
    { ...sky.MODENA, latitude: -33.8688, longitude: -70.6693 },
    "2026-01-15",
    "2026-01-16",
  ),
);
assert.equal(south.searchParams.get("latitude"), "-33.87");
assert.equal(south.searchParams.get("longitude"), "-70.67");

// The real payload shape, as returned by the service.
const parsed = weather.readCloudPayload({
  hourly: { time: [1790726400, 1790730000, 1790733600], cloud_cover: [0, 45, 90] },
});
assert.equal(parsed.state, "ready");
assert.equal(parsed.hours.length, 3);
assert.equal(parsed.hours[0].ms, 1790726400000, "unixtime is seconds, not milliseconds");

// An out-of-range date: the service names the window it covers, and that is
// more useful to a reader than "request failed".
const far = weather.readCloudPayload({
  error: true,
  reason: "Parameter 'start_date' is out of allowed range from 2026-06-28 to 2026-10-14",
});
assert.equal(far.state, "unavailable");
assert(far.reason.includes("2026-06-28") && far.reason.includes("2026-10-14"), far.reason);

// Degenerate payloads must degrade, never throw.
for (const body of [{}, { hourly: {} }, { hourly: { time: [], cloud_cover: [] } }, { error: true }])
  assert.equal(weather.readCloudPayload(body).state, "unavailable", JSON.stringify(body));
// Nulls in the series are dropped rather than read as zero cloud.
const holes = weather.readCloudPayload({
  hourly: { time: [1790726400, 1790730000], cloud_cover: [null, 50] },
});
assert.equal(holes.hours.length, 1);
assert.equal(holes.hours[0].cloud, 50);

// Nearest-hour lookup, and the refusal to stretch a sample across a gap.
const hours = [
  { ms: 1790726400000, cloud: 10 },
  { ms: 1790730000000, cloud: 80 },
];
assert.equal(weather.cloudAt(hours, 1790726400000), 10);
assert.equal(weather.cloudAt(hours, 1790726400000 + 5 * 60000), 10, "nearest hour wins");
assert.equal(weather.cloudAt(hours, 1790730000000 - 5 * 60000), 80);
assert.equal(weather.cloudAt(hours, 1790726400000 - 3 * 3600000), null, "no sample, no guess");
assert.equal(weather.cloudAt([], 1790726400000), null);

// Bands, at their boundaries.
assert.equal(weather.describeCloud(0), "clear");
assert.equal(weather.describeCloud(11), "clear");
assert.equal(weather.describeCloud(12), "mostly clear");
assert.equal(weather.describeCloud(45), "partly cloudy");
assert.equal(weather.describeCloud(70), "mostly cloudy");
assert.equal(weather.describeCloud(100), "overcast");

// Mean over the useful windows, including a window the forecast only half covers.
const full = weather.cloudOverWindows(hours, [{ start: 1790726400000, end: 1790730000000 }]);
assert.equal(full.covered, full.total, "a covered window reports every sample");
assert(full.mean > 10 && full.mean < 80);
const partial = weather.cloudOverWindows(hours, [
  { start: 1790726400000 - 6 * 3600000, end: 1790726400000 - 5 * 3600000 },
]);
assert.equal(partial.covered, 0, "a window outside the forecast covers nothing");
assert(Number.isNaN(partial.mean));
// No windows at all must not divide by zero.
assert.equal(weather.cloudOverWindows(hours, []).total, 0);

// --- the coming-nights outlook ---------------------------------------------
// Astronomy and forecast stay side by side: a night with no forecast still
// reports its usable hours, because the astronomy is known either way.
const H = 3600000;
const base = 1790726400000;
const clear = [];
const murky = [];
for (let i = 0; i < 6; i++) {
  clear.push({ ms: base + i * H, cloud: 5 });
  murky.push({ ms: base + i * H, cloud: 95 });
}
const window2h = (start) => ({ hours: 2, windows: [{ start, end: start + 2 * H }] });

{
  const days = ["2026-01-15", "2026-01-16", "2026-01-17"];
  const usable = (d) => (d === "2026-01-16" ? { hours: 0, windows: [] } : window2h(base));

  const good = weather.buildOutlook(days, usable, clear);
  assert.equal(good.length, 3);
  assert.equal(good[0].hours, 2);
  assert.equal(good[0].cloud, 5);
  assert.equal(good[0].promising, true, "usable and clear is promising");
  // A night the target is not up cannot be promising however clear it is.
  assert.equal(good[1].hours, 0);
  assert.equal(good[1].cloud, null, "no window means nothing to average over");
  assert.equal(good[1].promising, false);

  // Clear sky, no usable window -> not promising. Usable window, overcast ->
  // not promising. Neither half alone is enough.
  const bad = weather.buildOutlook(days, usable, murky);
  assert.equal(bad[0].hours, 2, "hours are unchanged by the weather");
  assert.equal(bad[0].cloud, 95);
  assert.equal(bad[0].promising, false, "overcast is not promising");

  // With no forecast at all, hours survive and cloud is simply unknown.
  const blind = weather.buildOutlook(days, usable, []);
  assert.equal(blind[0].hours, 2, "astronomy does not depend on the forecast");
  assert.equal(blind[0].cloud, null);
  assert.equal(blind[0].promising, false, "unknown weather is never promising");

  // The promising threshold sits at 30%, matching the "mostly clear" band.
  const at29 = weather.buildOutlook(["d"], () => window2h(base), [{ ms: base, cloud: 29 }]);
  const at30 = weather.buildOutlook(["d"], () => window2h(base), [{ ms: base, cloud: 30 }]);
  assert.equal(at29[0].promising, true);
  assert.equal(at30[0].promising, false);
  // And a night with under an hour usable is not worth setting up for.
  const brief = weather.buildOutlook(
    ["d"],
    () => ({ hours: 0.75, windows: [{ start: base, end: base + 0.75 * H }] }),
    clear,
  );
  assert.equal(brief[0].promising, false, "under an hour is not promising");
}

// Class names must be single tokens: describeCloud's prose has spaces in it
// and would silently become two classes.
for (const p of [null, 0, 11, 12, 45, 70, 100]) {
  const slug = weather.cloudBandClass(p);
  assert(!/\s/.test(slug), `band class "${slug}" must not contain whitespace`);
}
assert.equal(weather.cloudBandClass(null), "unknown");
assert.equal(weather.cloudBandClass(5), "clear");
assert.equal(weather.cloudBandClass(20), "mostly-clear");
assert.equal(weather.cloudBandClass(45), "partly-cloudy");
assert.equal(weather.cloudBandClass(70), "mostly-cloudy");
assert.equal(weather.cloudBandClass(90), "overcast");

// Dates must roll over months and leap days, since the outlook walks forward.
assert.deepEqual(sky.daysFrom("2026-01-30", 3), ["2026-01-30", "2026-01-31", "2026-02-01"]);
assert.deepEqual(sky.daysFrom("2028-02-28", 3), ["2028-02-28", "2028-02-29", "2028-03-01"]);
assert.deepEqual(sky.daysFrom("2026-12-31", 2), ["2026-12-31", "2027-01-01"]);
assert.equal(sky.daysFrom("2026-01-01", weather.OUTLOOK_NIGHTS).length, weather.OUTLOOK_NIGHTS);

console.log(
  JSON.stringify(
    {
      passed: true,
      checks: [
        "site draft parsing and bounds",
        "horizon dial keyboard and ARIA",
        "cloud forecast parsing",
        "coming-nights outlook",
      ],
    },
    null,
    2,
  ),
);
