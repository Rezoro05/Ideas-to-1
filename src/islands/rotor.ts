/** Who I am: the role line turns over to the next phrase every few seconds. With reduced motion it shows them all at once. */
import { nextIndex } from "../lib/rotor";

export function startRoleRotor(opts: { root: HTMLElement | null; intervalMs: number; reducedMotion: boolean }): void {
  const root = opts.root;
  if (!root) return;
  const roles = [...root.querySelectorAll<HTMLElement>(".rotor-role")];
  if (opts.reducedMotion) {
    root.parentElement!.hidden = true;
    root.closest(".role-line")!.querySelector<HTMLElement>(".roles-all")!.hidden = false;
    return;
  }
  let i = 0, paused = false;
  const pause = () => { paused = true; }, resume = () => { paused = false; };
  root.addEventListener("pointerenter", pause);
  root.addEventListener("pointerleave", resume);
  setInterval(() => {
    if (paused || document.hidden) return;
    roles[i]!.classList.remove("on");
    i = nextIndex(i, roles.length);
    roles[i]!.classList.add("on");
  }, opts.intervalMs);
}
