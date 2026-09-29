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
          <h3>L’atlante non è disponibile</h3>
          <p>
            Si è verificato un errore inatteso durante il caricamento della pagina. Riprova; se
            l’errore persiste, ricarica il browser.
          </p>
          <div className="notice warning">
            {error.message || "Errore sconosciuto"}
            {error.digest ? ` (${error.digest})` : ""}
          </div>
          <button onClick={reset}>Riprova</button>
        </div>
      </div>
    </main>
  );
}
