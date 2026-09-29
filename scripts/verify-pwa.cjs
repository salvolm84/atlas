/**
 * Checks the installable-app files: a valid manifest whose icons exist at the
 * sizes it claims, and a service worker whose routing is what it says it is.
 *
 * The routing matters more than it looks. A worker that caches the wrong thing
 * pins a stale application, and one that intercepts the cloud forecast would
 * serve yesterday's weather. Those two cases are asserted directly by running
 * the worker against a stubbed environment.
 */
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p));

// --- manifest ---------------------------------------------------------------
const manifest = JSON.parse(read("public/manifest.webmanifest").toString());
for (const field of ["name", "short_name", "start_url", "scope", "display", "icons"])
  assert(manifest[field], `manifest needs ${field}`);
assert.equal(manifest.display, "standalone");
assert(manifest.short_name.length <= 12, "short_name is what a home screen shows; keep it short");
assert(manifest.theme_color && manifest.background_color, "both colours are needed to install");

/** PNG dimensions straight from the IHDR chunk, so this needs no image library. */
function pngSize(buffer) {
  assert.equal(buffer.readUInt32BE(0), 0x89504e47, "not a PNG");
  assert.equal(buffer.toString("ascii", 12, 16), "IHDR");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

let maskable = 0;
for (const icon of manifest.icons) {
  assert(icon.src.startsWith("/"), `icon ${icon.src} must be root-relative`);
  const file = "public" + icon.src;
  assert(fs.existsSync(path.join(root, file)), `manifest names a missing icon: ${file}`);
  if (icon.type === "image/png") {
    const { width, height } = pngSize(read(file));
    const [w, h] = icon.sizes.split("x").map(Number);
    assert.equal(width, w, `${icon.src} is ${width}px wide but declares ${w}`);
    assert.equal(height, h, `${icon.src} is ${height}px tall but declares ${h}`);
  }
  if (icon.purpose === "maskable") maskable++;
}
// Installability wants both of these, and a maskable icon keeps Android from
// putting a rounded square inside its own rounded square.
const anySizes = manifest.icons.filter((i) => i.type === "image/png").map((i) => i.sizes);
assert(anySizes.includes("192x192"), "a 192px icon is required to install");
assert(anySizes.includes("512x512"), "a 512px icon is required to install");
assert(maskable >= 1, "a maskable icon is needed or the platform crops the artwork");

// Any page the manifest points at must be inside its own scope.
for (const shortcut of manifest.shortcuts ?? [])
  assert(shortcut.url.startsWith(manifest.scope), `${shortcut.url} is outside scope`);
assert(manifest.start_url.startsWith(manifest.scope));

// --- service worker --------------------------------------------------------
const source = read("public/sw.js").toString();
const listeners = {};
const opened = [];
const cacheStub = {
  match: async () => undefined,
  put() {},
  add: async () => {},
};
const sandbox = {
  self: {
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
    location: { origin: "https://atlas.example" },
    clients: { claim: async () => {} },
  },
  caches: {
    open: async (name) => {
      opened.push(name);
      return cacheStub;
    },
    keys: async () => ["atlas-shell-v0", "atlas-assets-v1"],
    delete: async () => true,
  },
  fetch: async () => ({ ok: true, type: "basic", clone() {} }),
  Request: class {
    constructor(url) {
      this.url = url;
    }
  },
  URL,
  console,
};
vm.runInNewContext(source, sandbox, { filename: "sw.js" });

// It must register the three lifecycle handlers, or it does nothing at all.
for (const type of ["install", "activate", "fetch"])
  assert(typeof listeners[type] === "function", `sw.js must handle ${type}`);

// Activating early would delete assets from under a page that is still
// running, so the worker must not call skipWaiting.
// Match a call, not the word: the file explains in a comment why it does not
// call this, and that explanation should not trip the check.
assert(
  !/(^|[^.\w])skipWaiting\s*\(/.test(source),
  "sw.js must not call skipWaiting: it would delete assets from under a running page",
);

/** Dispatch a fetch event and report whether the worker claimed it. */
function route({ url, method = "GET", mode = "no-cors", range = false }) {
  let claimed = null;
  listeners.fetch({
    request: {
      url,
      method,
      mode,
      headers: { has: (h) => (h === "range" ? range : false) },
    },
    respondWith: (promise) => {
      claimed = promise;
      // Swallow rejections from the stubbed environment; only the decision to
      // intercept is under test here.
      Promise.resolve(promise).catch(() => {});
    },
  });
  return claimed !== null;
}

const own = "https://atlas.example";

// The rule that matters most: nothing cross-origin is intercepted. A cached
// forecast would be a wrong forecast, and the survey images are not ours.
assert.equal(
  route({ url: "https://api.open-meteo.com/v1/forecast?latitude=44.65" }),
  false,
  "the cloud forecast must never be served from the cache",
);
assert.equal(
  route({ url: "https://alasky.cds.unistra.fr/hips-image-services/hips2fits?ra=10" }),
  false,
  "DSS2 survey images must pass straight through",
);
assert.equal(
  route({ url: "https://cdn.esahubble.org/archives/images/screen/opo9940b.jpg" }),
  false,
  "third-party photographs must pass straight through",
);

// Non-GET and range requests are left alone.
assert.equal(route({ url: own + "/", method: "POST", mode: "navigate" }), false);
assert.equal(route({ url: own + "/assets/app.abcdef12.js", range: true }), false);

// Navigations and same-origin assets are handled.
assert.equal(route({ url: own + "/", mode: "navigate" }), true, "navigations are cached");
assert.equal(route({ url: own + "/morfologia", mode: "navigate" }), true);
assert.equal(route({ url: own + "/assets/app.abcdef12.js" }), true, "hashed assets are cached");
assert.equal(route({ url: own + "/favicon.svg" }), true);
assert.equal(route({ url: own + "/data/NOTICE.txt" }), true);
// Something with no extension that is not a navigation is not ours to guess at.
assert.equal(route({ url: own + "/api/something" }), false);

// Navigations must go to the shell cache and hashed assets to the asset cache,
// so clearing one cannot strand the other.
opened.length = 0;
route({ url: own + "/", mode: "navigate" });
assert(
  opened.some((n) => n.startsWith("atlas-shell")),
  "navigations belong to the shell cache",
);
opened.length = 0;
route({ url: own + "/assets/app.abcdef12.js" });
assert(
  opened.some((n) => n.startsWith("atlas-assets")),
  "hashed assets belong to the asset cache",
);

// The portable release is opened from a file, where workers cannot run, so it
// must not carry the registration.
const registration = read("app/register-sw.tsx").toString();
assert(/location\.protocol/.test(registration), "registration must check the scheme");
assert(
  /"use client"/.test(registration),
  "registration touches navigator, so it has to be a client component",
);

console.log(
  JSON.stringify(
    { passed: true, icons: manifest.icons.length, checks: "manifest, icons, worker routing" },
    null,
    2,
  ),
);
