import SkyWorker from "./sky-worker?worker&inline";
import { detail as detailSync, rank as rankSync } from "./solver-core";
import type {
  DetailResult,
  NightParams,
  RankRow,
  SolverObject,
  SolverRequest,
  SolverResponse,
} from "./solver-types";

/**
 * Runs the night sweep in a worker when one is available, and on the main
 * thread when it is not.
 *
 * The fallback is not defensive padding: the portable release is opened from a
 * file, where a worker may be refused, and the same code path then has to keep
 * working. Both routes call the same functions in solver-core, so the answer
 * cannot depend on which one ran.
 */
export type Solver = {
  rank(params: NightParams): Promise<RankRow[]>;
  detail(
    objectId: string,
    params: NightParams,
    year: number,
    outlookDays: string[],
  ): Promise<DetailResult>;
  /** False once the worker has been ruled out. Exposed for reporting only. */
  readonly offThread: boolean;
  dispose(): void;
};

type Pending = {
  resolve: (value: SolverResponse) => void;
  reject: (reason: Error) => void;
};

export function createSolver(objects: SolverObject[]): Solver {
  let worker: Worker | null = null;
  let broken = false;
  let nextId = 1;
  const pending = new Map<number, Pending>();

  function fail(reason: Error) {
    broken = true;
    worker?.terminate();
    worker = null;
    // Reject in flight so every caller retries on the main thread rather than
    // waiting on a worker that will never answer.
    for (const p of pending.values()) p.reject(reason);
    pending.clear();
  }

  function ensureWorker(): Worker | null {
    if (broken) return null;
    if (worker) return worker;
    try {
      worker = new SkyWorker();
    } catch {
      broken = true;
      return null;
    }
    worker.onmessage = (event: MessageEvent<SolverResponse>) => {
      const waiting = pending.get(event.data.id);
      if (!waiting) return; // a superseded request; its result is not wanted
      pending.delete(event.data.id);
      waiting.resolve(event.data);
    };
    // A worker that fails to load its script reports here, not by throwing
    // above, which is why construction alone is not proof it works.
    worker.onerror = () => fail(new Error("worker failed to start"));
    worker.onmessageerror = () => fail(new Error("worker message could not be decoded"));
    send({ id: nextId++, kind: "objects", objects }).catch(() => {});
    return worker;
  }

  function send(request: SolverRequest): Promise<SolverResponse> {
    const active = request.kind === "objects" ? worker : ensureWorker();
    if (!active) return Promise.reject(new Error("no worker"));
    return new Promise((resolve, reject) => {
      pending.set(request.id, { resolve, reject });
      active.postMessage(request);
    });
  }

  return {
    get offThread() {
      return !broken;
    },
    async rank(params) {
      if (!broken) {
        try {
          const response = await send({ id: nextId++, kind: "rank", params });
          if (response.ok && response.kind === "rank") return response.rows;
        } catch {
          // fall through to the main thread
        }
      }
      return rankSync(objects, params);
    },
    async detail(objectId, params, year, outlookDays) {
      if (!broken) {
        try {
          const response = await send({
            id: nextId++,
            kind: "detail",
            params,
            objectId,
            year,
            outlookDays,
          });
          if (response.ok && response.kind === "detail") return response.result;
        } catch {
          // fall through to the main thread
        }
      }
      const object = objects.find((o) => o.id === objectId);
      if (!object) throw new Error(`unknown object ${objectId}`);
      return detailSync(object, params, year, outlookDays);
    },
    dispose() {
      worker?.terminate();
      worker = null;
      pending.clear();
    },
  };
}
