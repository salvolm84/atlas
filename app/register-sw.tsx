"use client";
import { useEffect } from "react";

/**
 * Registers the service worker for the hosted atlas.
 *
 * Imported only by the root layout, which the portable build does not use, so
 * none of this reaches the file:// release — where it could not work anyway,
 * since service workers require an http(s) origin.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // file: and other non-http schemes cannot host a worker; asking would
    // throw and achieve nothing.
    if (location.protocol !== "https:" && location.protocol !== "http:") return;
    // Registration failing is not worth troubling the reader over: the atlas
    // works perfectly well online without it.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
