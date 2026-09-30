"use client";
import { useEffect, useMemo, useState } from "react";
import { createSolver, type Solver } from "@/lib/solver";
import type { DetailResult, NightParams, RankRow, SolverObject } from "@/lib/solver-types";

/** One solver for the life of the page, torn down with it. */
export function useSolver(objects: SolverObject[]): Solver {
  const solver = useMemo(() => createSolver(objects), [objects]);
  useEffect(() => () => solver.dispose(), [solver]);
  return solver;
}

/**
 * Results are tagged with the params object they were computed for, so a slow
 * answer for a sector the reader has already dragged past is discarded rather
 * than shown. While a request is outstanding the last answer is kept, flagged
 * `pending`: blanking it collapsed the page for a frame, which on a phone
 * threw the scroll position somewhere else entirely. `rows` is null only
 * before the first answer.
 */
export function useRanked(
  solver: Solver,
  params: NightParams,
): { rows: RankRow[] | null; pending: boolean } {
  const [result, setResult] = useState<{ for: NightParams; rows: RankRow[] } | null>(null);
  useEffect(() => {
    let alive = true;
    solver.rank(params).then(
      (rows) => {
        if (alive) setResult({ for: params, rows });
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [solver, params]);
  return { rows: result?.rows ?? null, pending: result?.for !== params };
}

export function useDetail(
  solver: Solver,
  params: NightParams,
  objectId: string | undefined,
  year: number,
  outlookDays: string[],
): DetailResult | null {
  const [result, setResult] = useState<{
    for: NightParams;
    id: string;
    value: DetailResult;
  } | null>(null);
  useEffect(() => {
    if (!objectId) return;
    let alive = true;
    solver.detail(objectId, params, year, outlookDays).then(
      (value) => {
        if (alive) setResult({ for: params, id: objectId, value });
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [solver, params, objectId, year, outlookDays]);
  // Same rule as the ranking: keep the last answer for this object while a new
  // night or sector is computed, so the panel keeps its height. A different
  // object starts from nothing, which is correct: its numbers are unknown.
  return result && result.id === objectId ? result.value : null;
}
