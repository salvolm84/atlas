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
assert(Math.abs(s.fov("s30").width - 2.243) < 0.01);
assert(Math.abs(s.fov("s30").height - 3.986) < 0.01);
assert(Math.abs(s.fov("s50").width - 1.38) < 0.01);
assert(Math.abs(s.fov("s50").height - 2.454) < 0.01);
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
assert.equal(s.cardinal(270), "O");
assert.equal(s.cardinal(359), "N");

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

// Framing geometry moved to lib/framing.ts; check it still loads and agrees.
const framing = load("../lib/framing.ts", { "./sky": s });
const m31 = s.objects.find((o) => o.messier === 31);
assert.equal(framing.frameFit({ major: null, minor: null, pa: 0 }, "s50", 0), null);
assert.equal(typeof framing.frameFit(m31, "s50", 0), "boolean");
// M31 is about 190' across, far wider than the S50's 1.38 x 2.45 degree frame.
assert.equal(framing.frameFit(m31, "s50", 0), false);
const north = { start: 315, span: 90 },
  south = { start: 135, span: 90 };
for (const a of [315, 350, 0, 45]) assert(s.inSector(a, north));
for (const a of [46, 180, 314]) assert(!s.inSector(a, north));
assert(s.inSector(180, { start: 180, span: 360 }));
assert.equal(s.targetNight(m42, winter, 30, "s50", north).hours, 0);
const southResult = s.targetNight(m42, winter, 30, "s50", south);
assert(southResult.hours > 0);
assert(southResult.hours <= s.targetNight(m42, winter).hours);
assert(Math.abs(southResult.peakAz - 180) < 10);
for (const sector of [north, south, { start: 270, span: 180 }])
  for (const r of s.objects.map((o) => s.targetNight(o, winter, 30, "s50", sector))) {
    for (const p of r.curve.filter((p) => p.usable))
      assert(s.inSector(p.az, sector) && p.alt >= 30 && p.sun < -18);
    assert.equal(r.hours, r.curve.filter((p) => p.usable).length / 4);
    assert.equal(
      r.hours,
      r.windows.reduce((total, w) => total + (w.end - w.start) / 3600000, 0),
    );
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
  assert.equal(r.hours, r.curve.filter((p) => p.usable).length / 4, r.o.key);
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
      fov30: s.fov("s30"),
      fov50: s.fov("s50"),
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
