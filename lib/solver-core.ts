import { makeNight, seasonal, targetNight, type DSO, type TargetNight } from "./sky";
import type { DetailResult, NightParams, RankRow, SolverObject } from "./solver-types";

/**
 * The astronomy the solver runs, shared verbatim by the worker and by the
 * synchronous fallback. Keeping one implementation means a browser without a
 * worker cannot quietly compute something different from one with.
 *
 * `targetNight` only reads ra, dec, type, major and mag, so a SolverObject
 * stands in for a DSO here. The cast is narrow and local to this file.
 */
const asDSO = (o: SolverObject) => o as unknown as DSO;

/** The main thread already holds the catalogue entry; sending it back would
 * only duplicate it across the message boundary. */
function withoutObject(t: TargetNight): Omit<TargetNight, "o"> {
  const copy: Partial<TargetNight> = { ...t };
  delete copy.o;
  return copy as Omit<TargetNight, "o">;
}

export function rank(objects: SolverObject[], p: NightParams): RankRow[] {
  const night = makeNight(p.day, p.site);
  return objects.map((o) => {
    const r = targetNight(asDSO(o), night, p.minAlt, p.scope, p.sector);
    return {
      id: o.id,
      hours: r.hours,
      peak: r.peak,
      peakTime: r.peakTime,
      peakAz: r.peakAz,
      score: r.score,
    };
  });
}

export function detail(
  object: SolverObject,
  p: NightParams,
  year: number,
  outlookDays: string[],
): DetailResult {
  const o = asDSO(object);
  const target = withoutObject(
    targetNight(o, makeNight(p.day, p.site), p.minAlt, p.scope, p.sector),
  );
  return {
    target,
    seasons: seasonal(o, year, p.site, p.minAlt, p.sector),
    outlook: outlookDays.map((day) => {
      const r = targetNight(o, makeNight(day, p.site), p.minAlt, p.scope, p.sector);
      return { day, hours: r.hours, windows: r.windows };
    }),
  };
}
