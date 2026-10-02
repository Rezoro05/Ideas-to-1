/** Wires the pure parts to the page. Every feature lights up on its own; if one fails, the rest of the page still works. */
import { IDEAS } from "../content/ideas";
import { FORMSPREE_ENDPOINT, PUBLIC_BOARD } from "../content/site";
import { FLIGHT_CONFIGS, motionProfileFor } from "../lib/motion";
import { planeLabel, planeTag } from "../lib/views";
import { v } from "../lib/vec";
import { claudeStore, memoryStore, supabaseStore, toHex, type ClaudeDb, type ClaudeUser, type IdeaStore } from "../boundaries/ideaStore";
import { browserKeyStore } from "../boundaries/keyStore";
import { formspreeInbox } from "../boundaries/inbox";
import { createRouter, urlModeOf } from "./router";
import { startSky, type Sky } from "./sky";
import { startBoard, openPlaneHandler } from "./board";
import { startComposer } from "./composer";
import { startPathPanel } from "./path-panel";
import { byId, prefersReducedMotion, randomBytes } from "./dom";

type ClaudeRuntime = { use(name: string): Promise<unknown> };

function safeStorage(): Storage | null { try { return window.localStorage; } catch { return null; } }

async function sha256Hex(text: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));
}

/** In the claude.ai preview the artifact's own db is the board; on the live site it's Supabase. */
async function chooseStore(): Promise<IdeaStore> {
  const live = () => supabaseStore({ url: PUBLIC_BOARD.url, key: PUBLIC_BOARD.key, fetch: window.fetch.bind(window), keys: browserKeyStore(safeStorage()), randomBytes, sha256Hex });
  const claude = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!claude || typeof claude.use !== "function") return PUBLIC_BOARD.url ? live() : memoryStore();
  try {
    const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
    return db ? claudeStore(db as ClaudeDb, user as ClaudeUser | null) : live();
  } catch { return live(); }
}

export function startSite(): void {
  const router = createRouter(urlModeOf(document));
  const reducedMotion = prefersReducedMotion();
  const profile = motionProfileFor({ prefersReducedMotion: reducedMotion, viewportWidth: innerWidth });

  let sky: Sky | null = null;
  let openPlane: (slug: string, origin: { x: number; y: number }) => void = (slug, o) => router.openIdea(slug, o);
  if (profile === "none") {
    byId("fallback").hidden = false;
  } else {
    sky = startSky({
      field: byId("field"),
      config: FLIGHT_CONFIGS[profile],
      visitSeed: new Uint32Array(randomBytes(4).buffer)[0]!,
      ideas: IDEAS.map((idea, i) => ({ slug: idea.slug, spec: { tag: planeTag(idea, i), label: planeLabel(idea, i), href: router.href(idea.slug) } })),
      isVisible: router.skyVisible,
      onOpen: (slug, origin) => openPlane(slug, origin),
    });
  }

  const board = startBoard({ sky, store: chooseStore() });
  openPlane = openPlaneHandler(board, router.openIdea);
  startComposer({ board, sky, reducedMotion, inbox: formspreeInbox(FORMSPREE_ENDPOINT, window.fetch.bind(window)) });
  startPathPanel((target, r) => {
    if (target === "craft" || target === "home" || target === "about") router.go(target);
    else router.openIdea(target, v(r.left, r.top));
  });
  board.sync();
  router.start();
}
