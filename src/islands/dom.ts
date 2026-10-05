/** Small DOM helpers shared by the islands. */
export const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

/** The parts of an element the overlay transitions touch (so tests can pass a fake). */
export type OverlayEl = { hidden: boolean; classList: { add(c: string): void; remove(c: string): void } };
type Frame = (cb: () => void) => unknown;
type Later = (cb: () => void, ms: number) => unknown;

/** Every open or close bumps the element's generation; a step scheduled by an older call finds it stale and does nothing.
 *  Without this, closing right after opening let the pending "add .open" land after the close, leaving the overlay stuck open. */
const generations = new WeakMap<object, number>();
const bump = (el: object): number => { const g = (generations.get(el) ?? 0) + 1; generations.set(el, g); return g; };
const isCurrent = (el: object, g: number): boolean => generations.get(el) === g;

/** Show an overlay, then add .open on the next frames so its CSS transition runs. */
export function openWithTransition(el: OverlayEl, frame: Frame = requestAnimationFrame): void {
  const g = bump(el);
  el.hidden = false;
  frame(() => frame(() => { if (isCurrent(el, g)) el.classList.add("open"); }));
}

/** Remove .open so the closing transition runs, then hide once it's done, unless the overlay was reopened meanwhile. */
export function closeAfterTransition(el: OverlayEl, ms: number, later: Later = setTimeout): void {
  const g = bump(el);
  el.classList.remove("open");
  later(() => { if (isCurrent(el, g)) el.hidden = true; }, ms);
}

export const prefersReducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function randomBytes(n: number): Uint8Array {
  try { return crypto.getRandomValues(new Uint8Array(n)); }
  catch { return Uint8Array.from({ length: n }, () => Math.floor(Math.random() * 256)); }
}
