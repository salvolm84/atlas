import { build } from "vite";
import react from "@vitejs/plugin-react";
import { readFile, writeFile, mkdir, cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "release-runtime");
const packages = new Map();
await build({
  root,
  configFile: false,
  publicDir: false,
  plugins: [
    react(),
    {
      name: "retain-bundled-licenses",
      generateBundle() {
        for (const id of this.getModuleIds()) {
          if (!id.includes("node_modules")) continue;
          let dir = path.dirname(id.split("?")[0]);
          while (dir !== path.dirname(dir) && !existsSync(path.join(dir, "package.json")))
            dir = path.dirname(dir);
          if (existsSync(path.join(dir, "package.json"))) packages.set(dir, true);
        }
      },
    },
  ],
  resolve: { alias: { "@": root } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: out,
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.join(root, "portable/main.tsx"),
      name: "DeepSkyAtlas",
      formats: ["iife"],
      fileName: () => "atlas.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
const js = (await readFile(path.join(out, "atlas.js"), "utf8")).replace(
  /<\/script/gi,
  "<\\/script",
);
const cssFiles = (await readdir(out)).filter((f) => f.endsWith(".css"));
const css = (await Promise.all(cssFiles.map((f) => readFile(path.join(out, f), "utf8"))))
  .join("\n")
  .replace(/<\/style/gi, "<\\/style");
for (const [name, page] of [
  ["index.html", "atlas"],
  ["morfologia.html", "morphology"],
]) {
  await writeFile(
    path.join(out, name),
    `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlante Deep Sky · Modena</title><link rel="icon" href="./favicon.svg"><style>${css}</style></head><body data-page="${page}"><div id="root"></div><noscript>Abilita JavaScript per usare l’atlante.</noscript><script>${js}</script></body></html>`,
  );
}
await cp(path.join(root, "public/data"), path.join(out, "data"), { recursive: true });
await cp(path.join(root, "public/favicon.svg"), path.join(out, "favicon.svg"));
await mkdir(path.join(out, "third-party-licenses"), { recursive: true });
const credits = [];
for (const dir of packages.keys()) {
  const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
  const names = (await readdir(dir)).filter((f) => /^(licen[sc]e|copying|notice)(\.|$)/i.test(f));
  credits.push(`${pkg.name}@${pkg.version}: ${pkg.license ?? "see included notices"}`);
  for (const name of names) {
    try {
      await cp(
        path.join(dir, name),
        path.join(out, "third-party-licenses", pkg.name.replaceAll("/", "__") + "-" + name),
        { recursive: true },
      );
    } catch (error) {
      throw new Error(`Cannot preserve license for ${pkg.name}: ${error.message}`);
    }
  }
}
await writeFile(
  path.join(out, "THIRD-PARTY-NOTICES.txt"),
  credits.sort().join("\n") +
    "\n\nCatalogue: Stellarium DSO, GPL-2.0-or-later; see data/NOTICE.txt and data/COPYING-Stellarium.txt.\nCSS: Tailwind CSS, MIT; see third-party-licenses.\n",
);
await cp(
  path.join(root, "node_modules/tailwindcss/LICENSE"),
  path.join(out, "third-party-licenses", "tailwindcss-LICENSE"),
);
await cp(path.join(root, "docs/QUICK-START.txt"), path.join(out, "START-HERE.txt"));
console.log("Ready to run: release-runtime/index.html (open directly in a desktop browser).");
