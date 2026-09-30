/**
 * Version and build date, fixed when the bundle is built. Outside a Vite build
 * (the Node regression scripts load modules directly) the constants do not
 * exist, so they fall back to "dev" rather than throwing.
 */
export const appVersion = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

// Formatted in UTC so the server render and the browser always agree.
export const builtOn =
  typeof __BUILD_TIME__ === "string"
    ? new Date(__BUILD_TIME__).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "an unknown date";
