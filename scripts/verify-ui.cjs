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
const picker = load("../app/site-picker.tsx", {
  react: { useMemo: () => [], useState: (v) => [typeof v === "function" ? v() : v, () => {}] },
  "lucide-react": stub,
  "@/components/ui/input": stub,
  "@/components/ui/popover": stub,
  "./choice": stub,
  "@/lib/sky": sky,
});

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

console.log(
  JSON.stringify(
    { passed: true, checks: ["site draft parsing and bounds", "horizon dial keyboard and ARIA"] },
    null,
    2,
  ),
);
