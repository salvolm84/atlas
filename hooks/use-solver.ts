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
 * than shown. `null` means a request is outstanding.
 */
export function useRanked(solver: Solver, params: NightParams): RankRow[] | null {
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
  return result?.for === params ? result.rows : null;
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
  return result && result.for === params && result.id === objectId ? result.value : null;
}
