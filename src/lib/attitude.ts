/** Keeps a flying plane right side up: a plane heading left is mirrored top-to-bottom, so its belly stays down. Pure. */

/** Degrees past vertical a heading must go before the plane flips, so a plane flying straight up or down doesn't flicker. */
export const MIRROR_HYSTERESIS_DEG = 15;

/** Normalizes a heading to (-180, 180]. 0 is right, ±180 is left, 90 is down (screen y grows down). */
export function normalizeDeg(deg: number): number {
  const d = ((deg % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

/** Whether a plane with this heading should be drawn mirrored, given whether it was mirrored last frame. */
export function shouldMirror(wasMirrored: boolean, headingDeg: number, hysteresisDeg = MIRROR_HYSTERESIS_DEG): boolean {
  const off = Math.abs(normalizeDeg(headingDeg)); // 0 = flying right, 180 = flying left
  if (wasMirrored) return off > 90 - hysteresisDeg;
  return off > 90 + hysteresisDeg;
}
