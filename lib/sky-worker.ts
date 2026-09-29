/// <reference lib="webworker" />
import { detail, rank } from "./solver-core";
import type { SolverObject, SolverRequest, SolverResponse } from "./solver-types";

/**
 * Runs the night sweep off the main thread. It keeps its own catalogue, sent
 * once when the solver starts, and its own night cache, so repeated requests
 * for the same site and date are cheap here rather than on the main thread.
 */
let objects: SolverObject[] = [];

const reply = (message: SolverResponse) => self.postMessage(message);

self.onmessage = (event: MessageEvent<SolverRequest>) => {
  const request = event.data;
  try {
    if (request.kind === "objects") {
      objects = request.objects;
      reply({ id: request.id, ok: true, kind: "objects" });
      return;
    }
    if (request.kind === "rank") {
      reply({ id: request.id, ok: true, kind: "rank", rows: rank(objects, request.params) });
      return;
    }
    const object = objects.find((o) => o.id === request.objectId);
    if (!object) throw new Error(`unknown object ${request.objectId}`);
    reply({
      id: request.id,
      ok: true,
      kind: "detail",
      result: detail(object, request.params, request.year, request.outlookDays),
    });
  } catch (error) {
    // Never leave a caller hanging: a rejected request falls back to the main
    // thread rather than spinning forever.
    reply({ id: request.id, ok: false, error: (error as Error)?.message ?? "solver failed" });
  }
};
