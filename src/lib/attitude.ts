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

/** How long the roll from upright to mirrored (or back) takes. */
export const ROLL_SECONDS = 0.9;

/** Moves roll progress (0 = upright, 1 = mirrored) toward its target at a steady rate; never overshoots. */
export function stepRoll(progress: number, mirrored: boolean, dt: number, seconds = ROLL_SECONDS): number {
  const target = mirrored ? 1 : 0;
  const stepBy = Math.max(0, dt) / seconds;
  return progress < target ? Math.min(target, progress + stepBy) : Math.max(target, progress - stepBy);
}

/** Roll angle around the plane's length for a progress, eased in and out so the roll starts and lands softly. */
export function rollDeg(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return 180 * (p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p));
}

/** How quickly the drawn nose follows the flight direction (seconds to cover ~63% of a turn). */
export const TURN_TIME_CONSTANT = 0.15;

/** Turns the drawn heading toward the flight heading the short way round, easing out, never overshooting.
 *  A bounce off the edge reverses the velocity in one frame; this spreads the turn over a few frames so the plane doesn't snap. */
export function turnToward(currentDeg: number, targetDeg: number, dt: number, timeConstant = TURN_TIME_CONSTANT): number {
  const diff = normalizeDeg(targetDeg - currentDeg);
  const share = 1 - Math.exp(-Math.max(0, dt) / timeConstant);
  return normalizeDeg(currentDeg + diff * share);
}
