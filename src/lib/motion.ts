/** Pure: how much motion this visitor gets, and the flight settings for it. */
export type MotionProfile = "none" | "lite" | "full";
export type Capabilities = { prefersReducedMotion: boolean; viewportWidth: number };

export type FlightConfig = {
  cruise: number;
  maxSpeed: number;
  wanderStrength: number;
  shieldRadius: number;
  boundsMargin: number;
  throwDamping: number;
  planeSize: number;
  /** Below 1, side-by-side planes keep farther apart than stacked ones, so their labels (to the side) don't collide. */
  separationXScale: number;
};

export const FLIGHT_CONFIGS: Record<Exclude<MotionProfile, "none">, FlightConfig> = {
  full: { cruise: 42, maxSpeed: 1400, wanderStrength: 1.6, shieldRadius: 110, boundsMargin: 60, throwDamping: 1.4, planeSize: 54, separationXScale: 1 },
  lite: { cruise: 26, maxSpeed: 1000, wanderStrength: 1.2, shieldRadius: 80, boundsMargin: 36, throwDamping: 1.8, planeSize: 42, separationXScale: 0.55 },
};

export const PHONE_BREAKPOINT = 640;

export function motionProfileFor(caps: Capabilities): MotionProfile {
  if (caps.prefersReducedMotion) return "none";
  return caps.viewportWidth < PHONE_BREAKPOINT ? "lite" : "full";
}
