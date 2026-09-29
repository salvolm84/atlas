"use client";
import { Orbit } from "lucide-react";

/**
 * A React error boundary cannot catch a failure that happens while the route is
 * being rendered on the server, so the boundary in `page.tsx` only covers
 * errors raised after hydration. This route-level handler covers the rest.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="atlas-app">
      <div className="object-panel">
        <div className="empty-state">
          <Orbit size={28} />
          <h3>The atlas is unavailable</h3>
          <p>
            Something went wrong while loading the page. Try again; if the error persists, reload
            your browser.
          </p>
          <div className="notice warning">
            {error.message || "Unknown error"}
            {error.digest ? ` (${error.digest})` : ""}
          </div>
          <button onClick={reset}>Try again</button>
        </div>
      </div>
    </main>
  );
}
