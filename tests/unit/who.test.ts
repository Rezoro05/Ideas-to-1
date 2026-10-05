import { describe, it, expect } from "vitest";
import { nextIndex, joinWithAnd } from "../../src/lib/rotor";
import { ROLES, STATS } from "../../src/content/home";
import { IDEA_SLUGS } from "../../src/content/ideas";
import { VIEWS } from "../../src/lib/routing";

describe("rotor", () => {
  it("cycles through every phrase and wraps", () => {
    expect([0, 1, 2, 3].map((i) => nextIndex(i, 4))).toEqual([1, 2, 3, 0]);
    expect(nextIndex(0, 0)).toBe(0);
  });
  it("joins a list the way people write it", () => {
    expect(joinWithAnd(["a"])).toBe("a");
    expect(joinWithAnd(["a", "b"])).toBe("a and b");
    expect(joinWithAnd(["a", "b", "c"])).toBe("a, b and c");
  });
});

describe("Who I am content", () => {
  it("the four roles, each with the right article", () => {
    expect(ROLES).toEqual(["a Product Manager", "an AI Deployment Manager", "a Creative Technologist", "an AI Generalist"]);
    for (const r of ROLES) expect(r.startsWith(/^[aeiou]/i.test(r.split(" ")[1]!) ? "an " : "a ")).toBe(true);
  });
  it("six stats, each linking to a page that holds its proof", () => {
    expect(STATS).toHaveLength(6);
    for (const s of STATS) expect([...VIEWS, ...IDEA_SLUGS]).toContain(s.to);
  });
});
