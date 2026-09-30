import { readFileSync } from "node:fs";

/**
 * Build-time constants for Vite's `define`, shared by the hosted and portable
 * builds so both report the same version. The version is package.json's; the
 * time is when the build ran, in UTC.
 */
export function buildInfo() {
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  return {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  };
}
