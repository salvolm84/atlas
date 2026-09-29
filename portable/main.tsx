import React from "react";
import { createRoot } from "react-dom/client";
import Atlas from "../app/atlas";
import Morphology from "../app/morfologia/page";
import { MODENA, siteDate } from "../lib/sky";
import { ErrorBoundary } from "../components/error-boundary";
import "../app/globals.css";

const morphology = document.body.dataset.page === "morphology";
const home = (
  <a href="./index.html" style={{ display: "block", padding: "16px 24px", color: "#78e5ff" }}>
    ← Atlante Deep Sky · Modena
  </a>
);

// Opened from `file://`, a thrown render error would otherwise leave a blank
// page with no console the reader would think to open.
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary
    area="L’atlante"
    fallback={(error) => (
      <div
        style={{
          padding: "32px 24px",
          color: "#d8e7f7",
          fontFamily: "system-ui,sans-serif",
          lineHeight: 1.7,
        }}
      >
        {home}
        <h1 style={{ fontSize: "19px" }}>L’atlante non è riuscito ad avviarsi</h1>
        <p style={{ color: "#a8b9cb", fontSize: "14px" }}>
          Ricarica la pagina. Se l’errore persiste, l’archivio potrebbe essere stato estratto solo
          parzialmente: estrai di nuovo l’intera cartella e riapri <code>index.html</code>.
        </p>
        <p style={{ color: "#ebc184", fontSize: "13px" }}>
          {error.message || "Errore sconosciuto"}
        </p>
      </div>
    )}
  >
    {morphology ? (
      <>
        {home}
        <Morphology />
      </>
    ) : (
      <Atlas initialDate={siteDate(new Date(), MODENA)} localMode />
    )}
  </ErrorBoundary>,
);
