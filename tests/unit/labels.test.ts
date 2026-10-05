import { describe, it, expect } from "vitest";
import { labelSide, LABEL_SIDE_HYSTERESIS as H } from "../../src/lib/labels";

const geo = (x: number) => ({ x, fieldWidth: 390, labelWidth: 120, planeHalf: 21, gap: 4 }); // reach 145

describe("labelSide", () => {
  it("sits right while it fits, moves left near the right edge", () => {
    expect(labelSide("right", geo(100))).toBe("right");
    expect(labelSide("right", geo(390 - 145))).toBe("right");
    expect(labelSide("right", geo(390 - 144))).toBe("left");
  });
  it("comes back right only with room to spare (no flicker at the edge)", () => {
    expect(labelSide("left", geo(390 - 145))).toBe("left");
    expect(labelSide("left", geo(390 - 145 - H))).toBe("right");
  });
  it("a plane wobbling at the edge flips at most once", () => {
    let side: "left" | "right" = "right", flips = 0;
    for (let i = 0; i < 300; i++) {
      const next = labelSide(side, geo(390 - 145 + Math.sin(i / 3) * (H / 2 - 1)));
      if (next !== side) flips++;
      side = next;
    }
    expect(flips).toBeLessThanOrEqual(1);
  });
  it("when neither side fits, it takes the side with more room", () => {
    const narrow = (x: number) => ({ x, fieldWidth: 200, labelWidth: 150, planeHalf: 21, gap: 4 });
    expect(labelSide("right", narrow(60))).toBe("right");
    expect(labelSide("left", narrow(60))).toBe("right");
    expect(labelSide("right", narrow(150))).toBe("left");
  });
});
