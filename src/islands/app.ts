/** Wires the pure parts to the page. Every feature lights up on its own; if one fails, the rest of the page still works. */
import { IDEAS } from "../content/ideas";
import { FLIGHT_CONFIGS, motionProfileFor } from "../lib/motion";
import { planeLabel, planeTag } from "../lib/views";
import { v } from "../lib/vec";
import { createRouter, urlModeOf } from "./router";
import { startSky } from "./sky";
import { startPathPanel } from "./path-panel";
import { startRoleRotor } from "./rotor";
import { ROLE_INTERVAL_MS } from "../content/home";
import { byId, prefersReducedMotion, randomBytes } from "./dom";

export function startSite(): void {
  const router = createRouter(urlModeOf(document));
  const reducedMotion = prefersReducedMotion();
  const profile = motionProfileFor({ prefersReducedMotion: reducedMotion, viewportWidth: innerWidth });

  if (profile === "none") {
    byId("fallback").hidden = false;
  } else {
    startSky({
      field: byId("field"),
      config: FLIGHT_CONFIGS[profile],
      visitSeed: new Uint32Array(randomBytes(4).buffer)[0]!,
      ideas: IDEAS.map((idea, i) => ({ slug: idea.slug, spec: { tag: planeTag(idea, i), label: planeLabel(idea, i), href: router.href(idea.slug) } })),
      isVisible: router.skyVisible,
      onOpen: (slug, origin) => router.openIdea(slug, origin),
    });
  }

  startRoleRotor({ root: document.getElementById("role-rotor"), intervalMs: ROLE_INTERVAL_MS, reducedMotion });
  startPathPanel((target, r) => {
    if (target === "craft" || target === "home" || target === "about") router.go(target);
    else router.openIdea(target, v(r.left, r.top));
  });
  router.start();
}
