/**
 * Checks the off-thread solver.
 *
 * The property that matters is that both routes agree: a browser that refuses
 * a worker must compute the same night as one that runs it, or the atlas would
 * quietly disagree with itself depending on where it was opened. So the real
 * worker source and the real client are both loaded here, wired together
 * through a stand-in Worker, and their results compared against calling the
 * shared core directly.
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
const types = load("../lib/solver-types.ts", { "./sky": sky });
const core = load("../lib/solver-core.ts", { "./sky": sky, "./solver-types": types });

const site = sky.MODENA;
const params = {
  day: "2026-01-15",
  site,
  minAlt: 30,
  scope: "s50",
  sector: { start: 0, span: 360 },
};
const solverObjects = sky.objects.map(types.toSolverObject);

// --- the payload is deliberately narrow ------------------------------------
// Only what the astronomy reads crosses the boundary, which is what keeps the
// 144 KB catalogue out of the worker bundle.
assert.deepEqual(Object.keys(solverObjects[0]).sort(), ["dec", "id", "mag", "major", "ra", "type"]);
for (const key of ["name", "kind", "aliases", "distance", "morphology"])
  assert(!(key in solverObjects[0]), `${key} does not need to cross to the worker`);

// --- the core matches targetNight -----------------------------------------
const night = sky.makeNight(params.day, site);
const rows = core.rank(solverObjects, params);
assert.equal(rows.length, sky.objects.length);
for (const row of rows.slice(0, 40)) {
  const object = sky.objects.find((o) => o.id === row.id);
  const expected = sky.targetNight(object, night, params.minAlt, params.scope, params.sector);
  assert.equal(row.score, expected.score, object.key);
  assert.equal(row.hours, expected.hours, object.key);
  assert.equal(row.peakAz, expected.peakAz, object.key);
}

// --- detail carries the night, the year and the coming nights --------------
const m42 = sky.objects.find((o) => o.messier === 42);
const outlookDays = sky.daysFrom(params.day, 14);
const detail = core.detail(types.toSolverObject(m42), params, 2026, outlookDays);
assert(!("o" in detail.target), "the catalogue entry must not be sent back");
assert.equal(detail.seasons.length, 12);
assert.equal(detail.outlook.length, 14);
assert.equal(detail.target.curve.length, night.samples.length);
const direct = sky.targetNight(m42, night, params.minAlt, params.scope, params.sector);
assert.equal(detail.target.hours, direct.hours);
assert.equal(detail.target.score, direct.score);
assert.deepEqual(detail.target.windows, direct.windows);

// --- a stand-in Worker running the real worker source ----------------------
let workerCalls = 0;
function makeFakeWorkerClass({ failOnConstruct = false, failOnStart = false } = {}) {
  return class FakeWorker {
    constructor() {
      if (failOnConstruct) throw new Error("workers are blocked here");
      this.onmessage = null;
      this.onerror = null;
      this.onmessageerror = null;
      // Load the real worker module with `self` pointed at this instance.
      const inbox = {};
      const selfStub = {
        set onmessage(fn) {
          inbox.handler = fn;
        },
        postMessage: (message) => {
          // Asynchronous, like a real worker, so ordering is exercised.
          setTimeout(() => this.onmessage?.({ data: message }), 0);
        },
      };
      // `self` is a global inside a worker, not an import, so it has to be
      // installed as one for the duration of the load. Passing it as a module
      // stub did nothing and the constructor threw, which silently took the
      // fallback path.
      const previousSelf = globalThis.self;
      globalThis.self = selfStub;
      try {
        load("../lib/sky-worker.ts", {
          "./solver-core": core,
          "./solver-types": types,
        });
      } finally {
        globalThis.self = previousSelf;
      }
      this.inbox = inbox;
      if (failOnStart) setTimeout(() => this.onerror?.(new Error("script failed")), 0);
    }
    postMessage(request) {
      workerCalls++;
      if (failOnStart) return;
      this.inbox.handler?.({ data: request });
    }
    terminate() {}
  };
}

// sky-worker.ts assigns to `self`, which is not a module-scoped name in Node,
// so it is injected as a stub above. Confirm the module really does read it.
assert(
  /self\.onmessage/.test(fs.readFileSync(path.resolve(__dirname, "../lib/sky-worker.ts"), "utf8")),
  "the worker is expected to install a self.onmessage handler",
);

(async () => {
  // --- the worker route ---------------------------------------------------
  const clientWith = (WorkerClass) =>
    load("../lib/solver.ts", {
      // __esModule matters: without it esModuleInterop wraps the stub again and
      // the default export stops being a constructor, which silently took the
      // fallback path the first time this test ran.
      "./sky-worker?worker&inline": { __esModule: true, default: WorkerClass },
      "./solver-core": core,
      "./solver-types": types,
    }).createSolver(solverObjects);

  const offThread = clientWith(makeFakeWorkerClass());
  const viaWorker = await offThread.rank(params);
  assert(workerCalls > 0, "the worker route must actually be used");
  assert.deepEqual(viaWorker, rows, "the worker must agree with the core exactly");
  assert.equal(offThread.offThread, true);
  const workerDetail = await offThread.detail(m42.id, params, 2026, outlookDays);
  assert.deepEqual(workerDetail, detail, "detail must survive the round trip unchanged");

  // --- a browser that refuses to construct a worker -----------------------
  const blocked = clientWith(makeFakeWorkerClass({ failOnConstruct: true }));
  const viaFallback = await blocked.rank(params);
  assert.deepEqual(viaFallback, rows, "the fallback must agree with the worker exactly");
  assert.equal(blocked.offThread, false, "a blocked worker must be reported as such");
  assert.deepEqual(
    await blocked.detail(m42.id, params, 2026, outlookDays),
    detail,
    "fallback detail must match too",
  );

  // --- a worker that constructs but whose script never starts -------------
  // This is the file:// case: construction succeeds and the load fails after,
  // so a caller must not be left waiting.
  const stalled = clientWith(makeFakeWorkerClass({ failOnStart: true }));
  const viaStalled = await stalled.rank(params);
  assert.deepEqual(viaStalled, rows, "a worker that fails to start must fall back, not hang");

  // --- an unknown object is an error, not a silent empty result -----------
  await assert.rejects(() => blocked.detail("dso-does-not-exist", params, 2026, outlookDays));

  console.log(
    JSON.stringify(
      {
        passed: true,
        objects: rows.length,
        payloadFields: Object.keys(solverObjects[0]).length,
        checks: "worker and fallback agree; blocked and stalled workers degrade",
      },
      null,
      2,
    ),
  );
})();
