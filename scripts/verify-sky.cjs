const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  assert = require("node:assert/strict"),
  ts = require("typescript");
// Transpile and load a project TypeScript module on bare Node, with no bundler.
// `stubs` satisfies relative imports of other .ts files, which plain Node
// cannot resolve, by handing back an already-loaded module.
function load(relative, stubs = {}) {
  const file = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
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
const s = load("../lib/sky.ts");
const MODENA = s.MODENA;
assert.equal(new Set(s.objects.filter((o) => o.messier).map((o) => o.messier)).size, 110);
assert.equal(new Set(s.objects.filter((o) => o.caldwell).map((o) => o.caldwell)).size, 109);
for (const o of s.objects) {
  assert(o.ra >= 0 && o.ra < 360);
  assert(Math.abs(o.dec) <= 90);
  if (o.messier || o.caldwell) assert(o.distance > 0, o.key);
}
assert(Math.abs(s.fov("s30pro").width - 2.243) < 0.01);
assert(Math.abs(s.fov("s30pro").height - 3.986) < 0.01);
assert(Math.abs(s.fov("s50pro").width - 1.38) < 0.01);
assert(Math.abs(s.fov("s50pro").height - 2.454) < 0.01);
// Every other model is checked against the field its maker publishes, so a typo in
// the telescope table fails here rather than silently mis-framing every object.
// Makers round to 0.1° (Vaonis truncates the Vespera 3's 1.465° to 1.4°).
for (const [id, width, height] of [
  ["s50", 0.73, 1.29],
  ["dwarf3", 2.93, 1.65],
  ["vespera2", 2.5, 1.4],
  ["vespera3", 2.6, 1.4],
  ["vesperapro", 1.6, 1.6],
  ["vesperapro2", 1.6, 1.6],
  ["odyssey", 45 / 60, 33.6 / 60],
  ["evscope2", 45.6 / 60, 34.2 / 60],
  ["origin", 1.27, 0.85],
  ["origin2", 1.32, 0.75],
]) {
  const f = s.fov(id);
  assert(Math.abs(f.width - width) < 0.07 && Math.abs(f.height - height) < 0.07, id);
}
assert.equal(s.localTime("2026-03-28", 12, MODENA).toISOString(), "2026-03-28T11:00:00.000Z");
assert.equal(s.localTime("2026-03-29", 12, MODENA).toISOString(), "2026-03-29T10:00:00.000Z");
assert.equal(s.localTime("2026-10-25", 12, MODENA).toISOString(), "2026-10-25T11:00:00.000Z");
const m42 = s.objects.find((o) => o.messier === 42),
  carina = s.objects.find((o) => o.caldwell === 92);
const winter = s.makeNight("2026-01-15", MODENA),
  summer = s.makeNight("2026-07-15", MODENA);
assert(s.targetNight(m42, winter).hours > 4);
assert.equal(s.targetNight(m42, summer).hours, 0);
assert.equal(s.targetNight(carina, winter).score, 0);
assert(winter.dark.length > summer.dark.length);
const seasons = s.seasonal(m42, 2026, MODENA);
assert(seasons[0].hours > seasons[6].hours);
for (const r of s.objects.map((o) => s.targetNight(o, winter))) {
  assert(Number.isFinite(r.score) && r.score >= 0 && r.score <= 100);
  assert(r.hours >= 0);
  for (const w of r.windows) assert(w.end > w.start);
}
const phase = s.makeNight("2026-01-18", MODENA).moonLight;
assert(phase < 0.03);
assert.equal(s.cardinal(270), "W");
assert.equal(s.cardinal(359), "N");
assert.equal(s.cardinal(225), "SW");
assert.equal(s.cardinal(315), "NW");

// Transit altitude and the never-rises boundary, for Modena. These were once
// duplicated as the literals 44.6471 and -45.3529 in two components whose
// comparisons disagreed at exactly dec -45.3529; both now derive from a Site.
assert.equal(s.transitAltitude(MODENA.latitude, MODENA), 90);
assert.equal(s.transitAltitude(-45.3529, MODENA), 0);
assert(
  s.neverRises(-45.3529, MODENA),
  "dec at exactly 0 degrees transit must count as never rising",
);
assert(s.neverRises(-60, MODENA));
assert(!s.neverRises(-45, MODENA));
assert(!s.neverRises(0, MODENA));
// Every object the catalogue lists as never rising must also score 0 all night.
for (const o of s.objects.filter((o) => s.neverRises(o.dec, MODENA))) {
  assert.equal(s.targetNight(o, winter).hours, 0, o.key);
  assert.equal(s.targetNight(o, winter).score, 0, o.key);
}

// Interpolated window boundaries. The night is sampled every 15 minutes, but
// a reported edge should be the real crossing, not a multiple of the cadence.
{
  const r = s.targetNight(m42, winter);
  assert(r.windows.length > 0);
  const SAMPLE = 15 * 60000;
  const sampleTimes = new Set(winter.samples.map((x) => x.ms));
  let interpolated = 0;
  for (const w of r.windows) {
    // An edge must lie strictly between the samples that bracket it, and the
    // night's own start and end are the only legitimate round numbers.
    const atNightStart = w.start === winter.samples[0].ms;
    const atNightEnd = w.end === winter.samples.at(-1).ms + SAMPLE;
    if (!atNightStart && !sampleTimes.has(w.start)) interpolated++;
    if (!atNightEnd && !sampleTimes.has(w.end)) interpolated++;
    // Each edge sits inside the 15-minute step it was refined from.
    for (const edge of [w.start, w.end]) {
      const nearest = winter.samples.reduce(
        (best, x) => (Math.abs(x.ms - edge) < Math.abs(best - edge) ? x.ms : best),
        winter.samples[0].ms,
      );
      assert(Math.abs(nearest - edge) <= SAMPLE, "an edge drifted beyond its sample interval");
    }
  }
  assert(interpolated > 0, "M42's edges are altitude crossings and must be interpolated");

  // The total follows the refined windows, so it is no longer a multiple of
  // a quarter hour, and it must sit within a sample of the old estimate.
  const sampled = r.curve.filter((p) => p.usable).length / 4;
  assert(r.hours !== sampled, "interpolation should move the total off the sample grid");
  assert(Math.abs(r.hours - sampled) <= 0.25 * r.windows.length);

  // Refining must not invent observing time where there was none, nor lose a
  // window entirely.
  assert.equal(s.targetNight(m42, summer).windows.length, 0);
  assert.equal(s.targetNight(m42, summer).hours, 0);
}

// The Wikipedia mapping is generated from the catalogue; a stale one would point
// objects at the wrong article, so every id must exist and nearly all be mapped.
{
  const titles = require("../lib/wikipedia-titles.json");
  const ids = new Set(s.objects.map((o) => o.id));
  for (const [id, title] of Object.entries(titles)) assert(ids.has(id) && title, id);
  assert(Object.keys(titles).length >= 240);
}

// Framing geometry moved to lib/framing.ts; check it still loads and agrees.
const framing = load("../lib/framing.ts", { "./sky": s });
const m31 = s.objects.find((o) => o.messier === 31);
assert.equal(framing.frameFit({ major: null, minor: null, pa: 0 }, "s50pro", 0), null);
assert.equal(typeof framing.frameFit(m31, "s50pro", 0), "boolean");
// M31 is about 190' across, far wider than the S50's 1.38 x 2.45 degree frame.
assert.equal(framing.frameFit(m31, "s50pro", 0), false);
// Fill is ellipse area over frame area: M31 covers about three quarters of the
// S50 Pro frame by area yet still does not fit, being longer than the frame.
assert.equal(framing.frameFill({ major: null, minor: null, pa: 0 }, "s50pro"), null);
assert(Math.abs(framing.frameFill(m31, "s50pro") - 0.752) < 0.005);
// A 1° disc is π/4 square degrees over the frame's 1.38° × 2.454°.
const disc = { major: 60, minor: 60, pa: 0 };
assert(Math.abs(framing.frameFill(disc, "s50pro") - Math.PI / 4 / (1.38 * 2.454)) < 0.002);
const north = { start: 315, span: 90 },
  south = { start: 135, span: 90 };
for (const a of [315, 350, 0, 45]) assert(s.inSector(a, north));
for (const a of [46, 180, 314]) assert(!s.inSector(a, north));
assert(s.inSector(180, { start: 180, span: 360 }));

// Sector algebra, as the dial's drag and arrow keys drive it. The wrap-around
// cases are the ones worth pinning: a sector crossing north must stay correct.
{
  const w = s.sectorWithStart,
    e = s.sectorWithEnd;
  // Moving the start holds the end still.
  assert.deepEqual(w({ start: 90, span: 90 }, 100), { start: 100, span: 80 });
  assert.deepEqual(w({ start: 90, span: 90 }, 80), { start: 80, span: 100 });
  // Moving the end holds the start still.
  assert.deepEqual(e({ start: 90, span: 90 }, 200), { start: 90, span: 110 });
  assert.deepEqual(e({ start: 90, span: 90 }, 100), { start: 90, span: 10 });
  // Crossing north: 315 -> 45 keeps its 90 degrees when either end moves.
  assert.deepEqual(w({ start: 315, span: 90 }, 320), { start: 320, span: 85 });
  assert.deepEqual(w({ start: 315, span: 90 }, 350), { start: 350, span: 55 });
  assert.deepEqual(e({ start: 315, span: 90 }, 30), { start: 315, span: 75 });
  assert.deepEqual(e({ start: 315, span: 90 }, 90), { start: 315, span: 135 });
  // Negative and over-360 azimuths normalise rather than producing nonsense.
  assert.deepEqual(w({ start: 10, span: 90 }, -5), { start: 355, span: 105 });
  assert.deepEqual(w({ start: 10, span: 90 }, 365), { start: 5, span: 95 });
  // A handle can never collapse the sector below the 5 degree minimum.
  for (const az of [90, 91, 89, 95]) {
    assert(e({ start: 90, span: 90 }, az).span >= 5, `end at ${az}`);
    assert(w({ start: 90, span: 90 }, az).span >= 5, `start at ${az}`);
  }
  // Whatever comes out must be a sector inSector agrees with.
  for (const az of [0, 5, 180, 355]) {
    const next = w({ start: 315, span: 90 }, az);
    assert(s.inSector(next.start, next), "the start must lie inside its own sector");
    assert(next.span >= 5 && next.span <= 360);
  }
}
assert.equal(s.targetNight(m42, winter, 30, "s50pro", north).hours, 0);
const southResult = s.targetNight(m42, winter, 30, "s50pro", south);
assert(southResult.hours > 0);
assert(southResult.hours <= s.targetNight(m42, winter).hours);
assert(Math.abs(southResult.peakAz - 180) < 10);
for (const sector of [north, south, { start: 270, span: 180 }])
  for (const r of s.objects.map((o) => s.targetNight(o, winter, 30, "s50pro", sector))) {
    for (const p of r.curve.filter((p) => p.usable))
      assert(s.inSector(p.az, sector) && p.alt >= 30 && p.sun < -18);
    // Boundaries are interpolated, so the sample count only brackets the
    // total: each edge can move by up to one sample interval.
    const sampled = r.curve.filter((p) => p.usable).length / 4;
    assert(
      Math.abs(r.hours - sampled) <= 0.25 * Math.max(1, r.windows.length),
      `${r.o.key}: ${r.hours} vs sampled ${sampled}`,
    );
    assert.equal(r.hours > 0, sampled > 0, r.o.key);
    // The total and the displayed boundaries must always agree exactly.
    assert(
      Math.abs(r.hours - r.windows.reduce((t, w) => t + (w.end - w.start) / 3600000, 0)) < 1e-9,
      r.o.key,
    );
    for (const [i, w] of r.windows.entries()) {
      assert(w.end > w.start, `${r.o.key}: empty window`);
      if (i > 0) assert(r.windows[i - 1].end < w.start, `${r.o.key}: overlapping windows`);
    }
  }
// ---------------------------------------------------------------------------
// A second site, in the other hemisphere and on the other side of the date and
// DST boundaries. Modena-only tests cannot catch a latitude or time-zone
// assumption baked into the library.
// ---------------------------------------------------------------------------
const SYDNEY = {
  id: "sydney",
  name: "Sydney, Australia",
  latitude: -33.8688,
  longitude: 151.2093,
  height: 58,
  timeZone: "Australia/Sydney",
};

// Southern DST runs the opposite way round: AEDT (UTC+11) in January, AEST
// (UTC+10) in July. A hardcoded Europe/Rome offset would fail both.
assert.equal(s.localTime("2026-01-15", 12, SYDNEY).toISOString(), "2026-01-15T01:00:00.000Z");
assert.equal(s.localTime("2026-07-15", 12, SYDNEY).toISOString(), "2026-07-15T02:00:00.000Z");

// transitAltitude/neverRises must follow the site, not a constant.
assert.equal(s.transitAltitude(SYDNEY.latitude, SYDNEY), 90);
assert(s.neverRises(60, SYDNEY), "far northern declinations never rise from Sydney");
assert(!s.neverRises(60, MODENA), "but they do from Modena");
assert(!s.neverRises(-60, SYDNEY), "far southern declinations do rise from Sydney");
assert(s.neverRises(-60, MODENA), "but not from Modena");

// The night must belong to its site, and the cache must not confuse the two.
const sydneyWinter = s.makeNight("2026-01-15", SYDNEY);
assert.equal(sydneyWinter.site.id, "sydney");
assert.equal(winter.site.id, "modena", "the Modena night must not be overwritten in the cache");
assert.notEqual(
  sydneyWinter.dark.length,
  winter.dark.length,
  "January darkness differs between hemispheres",
);
// Same date, same cache, different sky: the key includes the site.
assert.notEqual(s.makeNight("2026-01-15", SYDNEY).samples[0].sun, winter.samples[0].sun);

// Carina scores 0 from Modena because it never rises; from Sydney it is high.
assert.equal(s.targetNight(carina, winter).score, 0);
assert(
  s.targetNight(carina, sydneyWinter).hours > 4,
  "Carina should be well placed on a January night in Sydney",
);
// And the seasons invert: M42 peaks in the southern summer too, but Carina's
// best months must differ between the two sites.
const carinaModena = s.seasonal(carina, 2026, MODENA);
const carinaSydney = s.seasonal(carina, 2026, SYDNEY);
assert.equal(
  carinaModena.reduce((t, m) => t + m.hours, 0),
  0,
  "Carina is never observable from Modena in any month",
);
assert(carinaSydney.reduce((t, m) => t + m.hours, 0) > 0);

// Every object must stay internally consistent at the second site as well.
for (const r of s.objects.map((o) => s.targetNight(o, sydneyWinter))) {
  assert(Number.isFinite(r.score) && r.score >= 0 && r.score <= 100, r.o.key);
  const sampled = r.curve.filter((p) => p.usable).length / 4;
  assert(Math.abs(r.hours - sampled) <= 0.25 * Math.max(1, r.windows.length), r.o.key);
  assert.equal(r.hours > 0, sampled > 0, r.o.key);
}

// A hand-entered site with the same id but different coordinates must not
// collide in the cache, because the key is built from the values.
assert.notEqual(s.siteKey(SYDNEY), s.siteKey({ ...SYDNEY, latitude: -34 }));
assert.equal(s.siteKey(MODENA), s.siteKey({ ...MODENA, id: "renamed", name: "Somewhere else" }));

console.log(
  JSON.stringify(
    {
      passed: true,
      objects: s.objects.length,
      fov30: s.fov("s30pro"),
      fov50: s.fov("s50pro"),
      m42WinterHours: s.targetNight(m42, winter).hours,
      m42SummerHours: s.targetNight(m42, summer).hours,
      winterDarkHours: winter.dark.length / 4,
      summerDarkHours: summer.dark.length / 4,
      newMoonFraction: phase,
    },
    null,
    2,
  ),
);
