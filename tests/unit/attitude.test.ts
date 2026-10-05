import { describe, it, expect } from "vitest";
import { normalizeDeg, shouldMirror, stepRoll, rollDeg, ROLL_SECONDS, MIRROR_HYSTERESIS_DEG as H } from "../../src/lib/attitude";

describe("normalizeDeg", () => {
  it("maps any angle into (-180, 180]", () => {
    expect(normalizeDeg(0)).toBe(0);
    expect(normalizeDeg(190)).toBe(-170);
    expect(normalizeDeg(-190)).toBe(170);
    expect(normalizeDeg(540)).toBe(180);
  });
});

describe("shouldMirror", () => {
  it("flying right is never mirrored, flying left always is", () => {
    for (const was of [true, false]) {
      expect(shouldMirror(was, 0)).toBe(false);
      expect(shouldMirror(was, 180)).toBe(true);
      expect(shouldMirror(was, -179)).toBe(true);
    }
  });
  it("near vertical it keeps its last state (no flicker)", () => {
    for (const heading of [90, -90, 90 + H - 1, 90 - H + 1, -90 - H + 1]) {
      expect(shouldMirror(false, heading)).toBe(false);
      expect(shouldMirror(true, heading)).toBe(true);
    }
  });
  it("flips only once past the band", () => {
    expect(shouldMirror(false, 90 + H + 1)).toBe(true);
    expect(shouldMirror(true, 90 - H - 1)).toBe(false);
    expect(shouldMirror(false, -(90 + H + 1))).toBe(true);
  });
  it("a heading wobbling around vertical flips at most once", () => {
    let mirrored = false, flips = 0;
    for (let i = 0; i < 200; i++) {
      const next = shouldMirror(mirrored, 90 + Math.sin(i) * (H - 1));
      if (next !== mirrored) flips++;
      mirrored = next;
    }
    expect(flips).toBe(0);
  });
});

describe("roll", () => {
  it("reaches mirrored in ROLL_SECONDS and back again, without overshooting", () => {
    let p = 0, t = 0;
    while (p < 1) { p = stepRoll(p, true, 1 / 60); t += 1 / 60; }
    expect(t).toBeCloseTo(ROLL_SECONDS, 1);
    expect(stepRoll(1, true, 1)).toBe(1);
    expect(stepRoll(0.2, false, 1)).toBe(0);
  });
  it("reverses mid-roll from where it is", () => {
    const mid = stepRoll(0, true, ROLL_SECONDS / 2);
    expect(stepRoll(mid, false, 0.1)).toBeLessThan(mid);
  });
  it("ignores a negative dt", () => expect(stepRoll(0.4, true, -1)).toBe(0.4));
  it("eases from 0 to 180 degrees, symmetric about the middle", () => {
    expect(rollDeg(0)).toBe(0);
    expect(rollDeg(0.5)).toBe(90);
    expect(rollDeg(1)).toBe(180);
    expect(rollDeg(0.25) + rollDeg(0.75)).toBeCloseTo(180);
    expect(rollDeg(0.1)).toBeLessThan(18); // slow start
  });
});
