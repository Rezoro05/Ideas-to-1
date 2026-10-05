import { describe, it, expect } from "vitest";
import { openWithTransition, closeAfterTransition } from "../../src/islands/dom";

/** A fake element plus hand-cranked frame and timer queues. */
function rig() {
  const classes = new Set<string>();
  const el = { hidden: true, classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } };
  const frames: (() => void)[] = [], timers: (() => void)[] = [];
  const frame = (cb: () => void) => frames.push(cb);
  const later = (cb: () => void) => timers.push(cb);
  const runFrames = () => { while (frames.length) frames.shift()!(); };
  const runTimers = () => { while (timers.length) timers.shift()!(); };
  return { el, isOpen: () => classes.has("open"), frame, later, runFrames, runTimers };
}

describe("overlay transitions", () => {
  it("opens, then closes and hides", () => {
    const r = rig();
    openWithTransition(r.el, r.frame); r.runFrames();
    expect(r.el.hidden).toBe(false); expect(r.isOpen()).toBe(true);
    closeAfterTransition(r.el, 700, r.later); r.runTimers();
    expect(r.el.hidden).toBe(true); expect(r.isOpen()).toBe(false);
  });
  it("closed right after opening, it does not get stuck open", () => {
    const r = rig();
    openWithTransition(r.el, r.frame);
    closeAfterTransition(r.el, 700, r.later);
    r.runFrames(); r.runTimers();
    expect(r.isOpen()).toBe(false); expect(r.el.hidden).toBe(true);
  });
  it("reopened before the close finishes, it stays open", () => {
    const r = rig();
    openWithTransition(r.el, r.frame); r.runFrames();
    closeAfterTransition(r.el, 700, r.later);
    openWithTransition(r.el, r.frame); r.runFrames(); r.runTimers();
    expect(r.isOpen()).toBe(true); expect(r.el.hidden).toBe(false);
  });
});
