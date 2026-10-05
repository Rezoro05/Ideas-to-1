import { describe, it, expect } from "vitest";
import { normalizeDeg, shouldMirror, MIRROR_HYSTERESIS_DEG as H } from "../../src/lib/attitude";

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
