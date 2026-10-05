/** The hero sky: renders the pure flight simulation, and turns pointer and keyboard input into held/paused planes. */
import { createWorld, step, type Bounds, type Held, type World } from "../lib/sim";
import { classifyGesture, movedFarEnough, type PointerMark } from "../lib/gesture";
import type { FlightConfig } from "../lib/motion";
import { PLANE_SVG } from "../lib/plane-svg";
import { rollDeg, shouldMirror, stepRoll } from "../lib/attitude";
import { labelSide, type LabelSide } from "../lib/labels";
import { headingDeg, len, v, type Vec } from "../lib/vec";

export type PlaneSpec = { tag: string; label: string; href: string };
/** The sky runs on its own; nothing outside needs to steer it. */
export type Sky = { bounds(): Bounds };

/** Planes keep their last heading when they slow below this speed, so they don't spin in place. */
const MIN_SPEED_FOR_HEADING = 6;
/** Space between a plane and its label; matches the CSS offset. */
const LABEL_GAP_PX = 4;
/** Depth for the 3D roll: small enough that the near wing visibly swings toward the viewer. */
const ROLL_PERSPECTIVE_PX = 160;

export function startSky(opts: {
  field: HTMLElement;
  config: FlightConfig;
  visitSeed: number;
  ideas: readonly { slug: string; spec: PlaneSpec }[];
  isVisible: () => boolean;
  onOpen: (slug: string, origin: Vec) => void;
}): Sky {
  const { field, config } = opts;
  const bounds = (): Bounds => ({ width: field.clientWidth, height: field.clientHeight });
  let world: World = createWorld(opts.ideas.map((i) => i.slug), opts.visitSeed, bounds(), config);
  const els = new Map<string, HTMLAnchorElement>(), angles = new Map<string, number>(), mirrored = new Map<string, boolean>(), rolls = new Map<string, number>(), sides = new Map<string, LabelSide>(), labelWidths = new Map<string, number>();
  const pausedSlugs = new Set<string>(); // keyboard focus only; hover just recolors
  let held: Held | null = null, press: (PointerMark & { slug: string }) | null = null, suppressClick = false;

  function makePlane(slug: string, spec: PlaneSpec): HTMLAnchorElement {
    const a = document.createElement("a");
    a.className = "plane";
    a.href = spec.href;
    a.dataset.slug = slug;
    a.style.setProperty("--s", config.planeSize + "px");
    a.setAttribute("aria-label", spec.label);
    a.innerHTML = `<span class="body">${PLANE_SVG}</span><span class="tag"></span>`;
    a.querySelector(".tag")!.textContent = spec.tag;
    a.addEventListener("focus", () => pausedSlugs.add(slug));
    a.addEventListener("blur", () => pausedSlugs.delete(slug));
    field.appendChild(a);
    els.set(slug, a);
    return a;
  }
  for (const { slug, spec } of opts.ideas) { makePlane(slug, spec); angles.set(slug, 0); }

  const local = (e: PointerEvent): Vec => { const r = field.getBoundingClientRect(); return v(e.clientX - r.left, e.clientY - r.top); };
  field.addEventListener("pointerdown", (e) => {
    const a = (e.target as Element).closest<HTMLElement>(".plane");
    if (!a) return;
    e.preventDefault();
    press = { slug: a.dataset.slug!, point: v(e.clientX, e.clientY), at: performance.now() };
    a.setPointerCapture(e.pointerId);
  });
  field.addEventListener("pointermove", (e) => {
    if (!press) return;
    if (!held && movedFarEnough(press.point, v(e.clientX, e.clientY))) {
      held = { slug: press.slug, pointer: local(e) };
      els.get(press.slug)?.classList.add("held");
    }
    if (held) held = { ...held, pointer: local(e) };
  });
  const endPress = (e: PointerEvent) => {
    if (!press) return;
    const gesture = classifyGesture(press, { point: v(e.clientX, e.clientY), at: performance.now() });
    const slug = press.slug;
    if (held) els.get(held.slug)?.classList.remove("held");
    held = null; press = null;
    suppressClick = true; // the click that follows a press is handled here, not by the click listener
    if (gesture === "open" && e.type === "pointerup") opts.onOpen(slug, v(e.clientX, e.clientY));
    if (e.pointerType !== "mouse") pausedSlugs.delete(slug);
  };
  field.addEventListener("pointerup", endPress);
  field.addEventListener("pointercancel", endPress);
  field.addEventListener("click", (e) => { // keyboard Enter, or a click without pointer events
    const a = (e.target as Element).closest<HTMLElement>(".plane");
    if (!a) return;
    e.preventDefault();
    if (suppressClick) { suppressClick = false; return; }
    const r = a.getBoundingClientRect();
    opts.onOpen(a.dataset.slug!, v(r.left + r.width / 2, r.top));
  });

  let last = performance.now();
  function frame(now: number) {
    const dt = (now - last) / 1000;
    last = now;
    if (opts.isVisible()) {
      world = step(world, { dt, bounds: bounds(), held, pausedSlugs }, config);
      for (const p of world.planes) {
        const el = els.get(p.slug);
        if (!el) continue;
        if (len(p.velocity) > MIN_SPEED_FOR_HEADING) angles.set(p.slug, headingDeg(p.velocity));
        const angle = angles.get(p.slug) ?? 0;
        const flip = shouldMirror(mirrored.get(p.slug) ?? false, angle);
        const roll = stepRoll(rolls.get(p.slug) ?? (flip ? 1 : 0), flip, dt);
        mirrored.set(p.slug, flip);
        rolls.set(p.slug, roll);
        el.dataset.mirrored = String(flip);
        el.dataset.rolling = String(roll !== (flip ? 1 : 0));
        const fieldWidth = field.clientWidth;
        if (!labelWidths.has(p.slug)) labelWidths.set(p.slug, (el.querySelector(".tag") as HTMLElement).offsetWidth);
        const side = labelSide(sides.get(p.slug) ?? "right", { x: p.position.x, fieldWidth, labelWidth: labelWidths.get(p.slug)!, planeHalf: config.planeSize / 2, gap: LABEL_GAP_PX });
        if (side !== sides.get(p.slug)) { sides.set(p.slug, side); el.classList.toggle("tag-left", side === "left"); }
        el.style.transform = `translate3d(${p.position.x}px, ${p.position.y}px, 0)`;
        (el.firstElementChild as HTMLElement).style.transform = `perspective(${ROLL_PERSPECTIVE_PX}px) rotate(${angle}deg) rotateX(${rollDeg(roll)}deg)`;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { bounds };
}
