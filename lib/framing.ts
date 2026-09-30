import { fov, DEG, type DSO, type ScopeId } from "./sky";

/**
 * Does the catalogued ellipse fit inside a single native frame at this
 * position angle? Returns null when the catalogue has no dimensions.
 */
export function frameFit(o: DSO, scope: ScopeId, angle: number) {
  if (!o.major || !o.minor) return null;
  const f = fov(scope),
    a = o.major / 60 / 2,
    b = o.minor / 60 / 2,
    t = (o.pa - angle) * DEG;
  return (
    2 * Math.sqrt(a * a * Math.sin(t) ** 2 + b * b * Math.cos(t) ** 2) <= f.width &&
    2 * Math.sqrt(a * a * Math.cos(t) ** 2 + b * b * Math.sin(t) ** 2) <= f.height
  );
}

/**
 * Share of the native frame's area covered by the catalogued ellipse: 0.5 is
 * half the frame, 1.2 an object 20% larger than one frame. Area only, so an
 * elongated object can stay under 1 and still not fit. Null without dimensions.
 */
export function frameFill(o: DSO, scope: ScopeId) {
  if (!o.major || !o.minor) return null;
  const f = fov(scope);
  return (Math.PI * (o.major / 60 / 2) * (o.minor / 60 / 2)) / (f.width * f.height);
}
