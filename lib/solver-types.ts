import type { DSO, ScopeId, Sector, Site, TargetNight } from "./sky";

/**
 * The fields the astronomy actually computes from. Only these cross to the
 * worker, so the 144 KB catalogue stays on the main thread and out of the
 * worker bundle: it tree-shakes away entirely, leaving 56 KB of maths.
 */
export type SolverObject = {
  id: string;
  ra: number;
  dec: number;
  type: string;
  major: number | null;
  mag: number | null;
};

export const toSolverObject = (o: DSO): SolverObject => ({
  id: o.id,
  ra: o.ra,
  dec: o.dec,
  type: o.type,
  major: o.major,
  mag: o.mag,
});

/** Everything a night depends on, and nothing that only affects presentation. */
export type NightParams = {
  day: string;
  site: Site;
  minAlt: number;
  scope: ScopeId;
  sector: Sector;
};

/** One catalogue row's ranking. Deliberately five numbers, not a TargetNight. */
export type RankRow = {
  id: string;
  hours: number;
  peak: number;
  peakTime: number;
  peakAz: number;
  score: number;
};

/** A TargetNight without its DSO, which the main thread already holds. */
export type DetailResult = {
  target: Omit<TargetNight, "o">;
  seasons: { label: string; month: number; hours: number; peak: number }[];
  outlook: { day: string; hours: number; windows: { start: number; end: number }[] }[];
};

export type SolverRequest =
  | { id: number; kind: "objects"; objects: SolverObject[] }
  | { id: number; kind: "rank"; params: NightParams }
  | {
      id: number;
      kind: "detail";
      params: NightParams;
      objectId: string;
      year: number;
      outlookDays: string[];
    };

export type SolverResponse =
  | { id: number; ok: true; kind: "objects" }
  | { id: number; ok: true; kind: "rank"; rows: RankRow[] }
  | { id: number; ok: true; kind: "detail"; result: DetailResult }
  | { id: number; ok: false; error: string };
