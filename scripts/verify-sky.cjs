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
assert.equal(s.localTime("2026-03-28", 12).toISOString(), "2026-03-28T11:00:00.000Z");
assert.equal(s.localTime("2026-03-29", 12).toISOString(), "2026-03-29T10:00:00.000Z");
assert.equal(s.localTime("2026-10-25", 12).toISOString(), "2026-10-25T11:00:00.000Z");
const m42 = s.objects.find((o) => o.messier === 42),
  carina = s.objects.find((o) => o.caldwell === 92);
const winter = s.makeNight("2026-01-15"),
  summer = s.makeNight("2026-07-15");
assert(s.targetNight(m42, winter).hours > 4);
assert.equal(s.targetNight(m42, summer).hours, 0);
assert.equal(s.targetNight(carina, winter).score, 0);
assert(winter.dark.length > summer.dark.length);
const seasons = s.seasonal(m42, 2026);
assert(seasons[0].hours > seasons[6].hours);
for (const r of s.objects.map((o) => s.targetNight(o, winter))) {
  assert(Number.isFinite(r.score) && r.score >= 0 && r.score <= 100);
  assert(r.hours >= 0);
  for (const w of r.windows) assert(w.end > w.start);
}
const phase = s.makeNight("2026-01-18").moonLight;
assert(phase < 0.03);
assert.equal(s.cardinal(270), "O");
assert.equal(s.cardinal(359), "N");

// Transit altitude and the never-rises boundary. These were duplicated as the
// literals 44.6471 and -45.3529 in two components whose comparisons disagreed
// at exactly dec -45.3529; both now derive from `observer`.
assert.equal(s.transitAltitude(s.observer.latitude), 90);
assert.equal(s.transitAltitude(-45.3529), 0);
assert(s.neverRises(-45.3529), "dec at exactly 0 degrees transit must count as never rising");
assert(s.neverRises(-60));
assert(!s.neverRises(-45));
assert(!s.neverRises(0));
// Every object the catalogue lists as never rising must also score 0 all night.
for (const o of s.objects.filter((o) => s.neverRises(o.dec))) {
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
