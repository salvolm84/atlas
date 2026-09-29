/**
 * Vite's inline-worker import. The worker is embedded in the bundle and
 * constructed from a blob URL, which is what keeps the portable release a
 * single self-sufficient HTML file: `new Worker(new URL(...))` emits a separate
 * chunk, and in an IIFE build `import.meta.url` is not available to resolve it.
 */
declare module "*?worker&inline" {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}
