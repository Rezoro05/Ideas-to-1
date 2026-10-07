import { test, expect, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** No real outside calls from tests: every request off the local server is blocked and recorded. */
async function fakeServices(page: Page) {
  const outside: string[] = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => { outside.push(r.request().url()); return r.abort(); });
  return outside;
}
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  return errors;
}

test.describe("pages by URL", () => {
  for (const [path, title, visible] of [
    ["/", "Ideas to life · Revaz Kuparadze", "#view-home"],
    ["/about/", "About · Revaz Kuparadze", "#view-about"],
    ["/craft/", "Craft · Revaz Kuparadze", "#view-craft"],
    ["/econsul/", "eConsul · Revaz Kuparadze", "#sheet"],
    ["/ideasky/", "IDEA SKY · Revaz Kuparadze", "#sheet"],
  ] as const) {
    test(`${path} opens with its own content and no errors`, async ({ page }) => {
      await fakeServices(page);
      const errors = watchErrors(page);
      await page.goto(path);
      await expect(page).toHaveTitle(title);
      await expect(page.locator(visible)).toBeVisible();
      await page.waitForTimeout(500);
      expect(errors).toEqual([]);
    });
  }
  test("unknown URLs get the 404 page, which still works as the site", async ({ page }) => {
    await fakeServices(page);
    const res = await page.goto("/nope/");
    expect(res?.status()).toBe(404);
    await expect(page.locator("#view-home")).toBeVisible();
    await expect(page).toHaveTitle("Page not found · Revaz Kuparadze");
    await expect(page.locator("#sheet")).toBeHidden();
  });
  test("pages read without JavaScript", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/econsul/");
    await expect(page.locator("#sheet-title")).toHaveText("eConsul");
    await expect(page.locator("#sheet-facts")).toContainText("NPS 79");
    await page.goto("/craft/");
    await expect(page.locator("#view-craft h1")).toHaveText("Craft");
    await ctx.close();
  });
});

test("navigation stays in the page and the back button works", async ({ page }) => {
  await fakeServices(page);
  await page.goto("/");
  await page.locator('.nav a[data-route="about"]').click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.locator("#view-about")).toBeVisible();
  await expect(page.locator("#view-home")).toBeHidden();
  await expect(page.locator('.nav a[data-route="about"]')).toHaveAttribute("aria-current", "");
  await page.goBack();
  await expect(page).toHaveURL(/127\.0\.0\.1:4329\/$/);
  await expect(page.locator("#view-home")).toBeVisible();
});

test("old #links go to the real page", async ({ page }) => {
  await fakeServices(page);
  await page.goto("/#craft");
  await expect(page).toHaveURL(/\/craft\/$/);
  await expect(page.locator("#view-craft")).toBeVisible();
});

test("an idea plane opens its page, and Back returns to the sky", async ({ page }) => {
  await fakeServices(page);
  await page.goto("/");
  const plane = page.locator('.plane[data-slug="ephoto"]');
  await expect(plane).toHaveAttribute("aria-label", "02 · ePhoto.AI: open the idea");
  await plane.focus(); // focus pauses it
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ephoto\/$/);
  await expect(page.locator("#sheet-title")).toHaveText("ePhoto.AI");
  await expect(page).toHaveTitle("ePhoto.AI · Revaz Kuparadze");
  await page.locator("#back").click();
  await expect(page).toHaveURL(/127\.0\.0\.1:4329\/$/);
  await expect(page.locator("#sheet")).toBeHidden();
});

test("an idea closed right after opening never sticks open", async ({ page }) => {
  await fakeServices(page);
  await page.goto("/");
  const plane = page.locator('.plane[data-slug="econsul"]');
  for (let i = 0; i < 3; i++) {
    await plane.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape"); // same frame as the open
    await expect(page.locator("#sheet")).toBeHidden();
    await expect(page.locator("#sheet")).not.toHaveClass(/\bopen\b/);
  }
});

test("planes always fly right side up (belly down), whichever way they head", async ({ page }) => {
  test.setTimeout(60_000);
  await fakeServices(page);
  await page.goto("/");
  /* Local "up" (0,-1) through the body's transform has screen y = -d. Upright means it points up, allowing the
     hysteresis band near vertical, where |cos(heading)| <= sin(15deg) ~ 0.26. */
  const worst = await page.evaluate(async () => {
    let min = 1, sawLeft = false, sawRight = false, rolling = 0, frames = 0;
    // Sample at least 3 s, and keep going (up to 35 s) until a plane has been seen heading left (the flipped case).
    const start = performance.now();
    while (performance.now() - start < 3000 || (!sawLeft && performance.now() - start < 35000)) {
      await new Promise(requestAnimationFrame);
      frames++;
      for (const body of document.querySelectorAll<HTMLElement>(".plane .body")) {
        const plane = body.parentElement!;
        if (plane.dataset.rolling === "true") { rolling++; continue; } // mid-roll it is legitimately on its side
        const m = new DOMMatrix(getComputedStyle(body).transform);
        min = Math.min(min, m.d);
        if (m.a < -0.5) sawLeft = true;
        if (m.a > 0.5) sawRight = true;
      }
    }
    return { min, sawLeft, sawRight, rollingShare: rolling / (frames * document.querySelectorAll(".plane").length) };
  });
  expect(worst, JSON.stringify(worst)).toMatchObject({ sawLeft: true }); // the check saw a flipped, left-heading plane
  expect(worst.min).toBeGreaterThan(-0.27);
  expect(worst.rollingShare).toBeLessThan(0.5); // rolls finish; planes are not stuck mid-roll
});

test("a plane thrown off the edge stays in the sky and turns smoothly: no snaps, no teleport", async ({ page }) => {
  await fakeServices(page);
  await page.goto("/");
  await page.waitForTimeout(400);
  const plane = page.locator('.plane[data-slug="ephoto"]');
  await plane.focus();
  const box = (await plane.boundingBox())!;
  const x0 = box.x + box.width / 2, y0 = box.y + box.height / 2;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x0 + i * 120, y0 - i * 10, { steps: 1 }); // well past the right edge
  const watch = page.evaluate(async () => {
    const el = document.querySelector<HTMLElement>('.plane[data-slug="ephoto"]')!;
    const field = document.getElementById("field")!;
    let prev: { x: number; y: number; a: number } | null = null, maxTurn = 0, maxJump = 0, maxOut = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < 2500) {
      await new Promise(requestAnimationFrame);
      const m = new DOMMatrix(el.style.transform);
      const a = +(el.firstElementChild as HTMLElement).style.transform.match(/rotate\(([-\d.e]+)deg\)/)![1]!;
      maxOut = Math.max(maxOut, m.m41 - field.clientWidth, -m.m41, m.m42 - field.clientHeight, -m.m42);
      if (prev) {
        let d = Math.abs(a - prev.a); d = Math.min(d, 360 - d);
        maxTurn = Math.max(maxTurn, d);
        maxJump = Math.max(maxJump, Math.hypot(m.m41 - prev.x, m.m42 - prev.y));
      }
      prev = { x: m.m41, y: m.m42, a };
    }
    return { maxTurn, maxJump, maxOut };
  });
  await page.mouse.up();
  await page.locator("body").click({ position: { x: 3, y: 3 } });
  const r = await watch;
  expect(r.maxOut, JSON.stringify(r)).toBeLessThanOrEqual(0);
  expect(r.maxJump, JSON.stringify(r)).toBeLessThan(40);
  expect(r.maxTurn, JSON.stringify(r)).toBeLessThan(25);
});

test("planes can be dragged and thrown", async ({ page }) => {
  await fakeServices(page);
  await page.goto("/");
  await page.waitForTimeout(400);
  const plane = page.locator('.plane[data-slug="greencard"]');
  await plane.focus(); // pause it so we can grab it reliably
  const box = (await plane.boundingBox())!;
  const x0 = box.x + box.width / 2, y0 = box.y + box.height / 2;
  // drag toward whichever side has room (planes now stay inside the sky, so a plane near an edge can't go further)
  const field = (await page.locator("#field").boundingBox())!;
  const dir = x0 > field.x + field.width / 2 ? -1 : 1;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x0 + dir * i * 25, y0, { steps: 1 });
  await page.mouse.up();
  await expect(page).toHaveURL(/127\.0\.0\.1:4329\/$/); // a drag is not a click
  const after = (await plane.boundingBox())!;
  expect((after.x - box.x) * dir).toBeGreaterThan(150);
});

test("no public idea board: no note, no visitor planes, no outside services; booking is the way in", async ({ page }) => {
  const outside = await fakeServices(page);
  const errors = watchErrors(page);
  await page.goto("/");
  await page.waitForTimeout(1500);
  await expect(page.locator(".plane")).toHaveCount(4); // Momo is parked; IDEA SKY is 04
  await expect(page.locator("#note-form, #compose, #letter, #idea-btn, #notes-list")).toHaveCount(0);
  await expect(page.getByText("Share Your Ideas")).toHaveCount(0);
  await expect(page.locator("#call-title")).toHaveText("Have an Idea?");
  const book = page.locator("#closing-book");
  await expect(book).toHaveAttribute("href", /calendar\.app\.google/);
  await expect(book).toHaveAttribute("target", "_blank");
  expect(outside.filter((u) => /supabase|formspree/.test(u))).toEqual([]);
  expect(errors).toEqual([]);
});

test("the built site carries no idea-board services or code", () => {
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? files(join(dir, d.name)) : [join(dir, d.name)]);
  const text = files("dist").filter((f) => /\.(html|js|css|xml|txt)$/.test(f)).map((f) => readFileSync(f, "utf8")).join("\n");
  for (const gone of ["supabase", "formspree", "Idea Note", "Share Your Ideas", "note-form"]) expect(text, gone).not.toContain(gone);
});

test("Who I am: six numbers that link to their proof, and a role line that turns over", async ({ page }) => {
  await fakeServices(page);
  await page.goto("/");
  await expect(page.locator(".stats .stat")).toHaveCount(6);
  const shown = () => page.locator("#role-rotor .rotor-role.on").textContent();
  const first = await shown();
  expect(first).toBe("a Product Manager");
  await expect.poll(shown, { timeout: 6000 }).not.toBe(first);
  await expect(page.locator(".role-line .sr-only")).toHaveText("I’m a Product Manager, an AI Deployment Manager, a Creative Technologist and an AI Generalist.");
  await page.locator('.stat[data-route="econsul"]').click();
  await expect(page).toHaveURL(/\/econsul\/$/);
  await expect(page.locator("#sheet-title")).toHaveText("eConsul");
});

test("intro: logo mark, then REVAZ and KUPARADZE, then the page; it never blocks clicks", async ({ page }) => {
  await fakeServices(page);
  await page.goto("/");
  const loader = page.locator(".loader");
  await expect(loader.locator(".ld-first, .ld-mark, .ld-last")).toHaveCount(3);
  expect(await loader.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  await expect(loader).toBeHidden({ timeout: 4000 }); // gone after the intro
  // the header and footer logo still render from the same logo image
  for (const sel of [".bar .brand", ".foot .brand"]) expect(await page.locator(sel).evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage)).toContain("data:image/png");
});

test("Craft ad stills are hosted with the site, so they show even where YouTube is blocked", async ({ page }) => {
  const outside = await fakeServices(page);
  await page.goto("/craft/");
  const imgs = page.locator(".ad-media img");
  await expect(imgs).toHaveCount(6);
  for (const img of await imgs.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(800);
  }
  expect(outside.filter((u) => /ytimg|youtube/.test(u))).toEqual([]);
});

test("About: a stop opens its story, again closes it, and its links lead on", async ({ page }) => {
  await fakeServices(page);
  await page.goto("/about/");
  const abk = page.locator('.node-btn[data-stop="abk"]');
  await abk.click();
  await expect(abk).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#stop-inner h3")).toContainText("ABK agency");
  await abk.click();
  await expect(abk).toHaveAttribute("aria-expanded", "false");
  await abk.click();
  await page.locator('#stop-inner .panel-link[data-target="craft"]').click();
  await expect(page).toHaveURL(/\/craft\/$/);
  await page.goto("/about/");
  await page.locator('.b-link[data-target="greencard"]').click();
  await expect(page.locator("#sheet-title")).toHaveText("greencard.ge");
  // the "Now" stop's picture opens IDEA SKY
  await page.goto("/about/");
  await page.locator('.node-btn[data-stop="now"]').click();
  await page.locator("#stop-inner .panel-photo").click();
  await expect(page.locator("#sheet-title")).toHaveText("IDEA SKY");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("shows the plain list instead of the sky, and it still opens ideas", async ({ page }) => {
    await fakeServices(page);
    await page.goto("/");
    await expect(page.locator("#fallback")).toBeVisible();
    await expect(page.locator(".plane")).toHaveCount(0);
    await page.locator('#ideas a[data-slug="econsul"]').click();
    await expect(page).toHaveURL(/\/econsul\/$/);
    await page.locator("#back").click();
    await expect(page.locator("#sheet")).toBeHidden();
    await expect(page.locator(".roles-all")).toBeVisible(); // no turning line: all roles at once
    await expect(page.locator("#role-rotor")).toBeHidden();
    await expect(page.locator(".loader")).toBeHidden(); // no intro with reduced motion
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const path of ["/", "/about/", "/craft/", "/econsul/"]) {
    test(`${path} fits the screen with no sideways scroll`, async ({ page }) => {
      await fakeServices(page);
      await page.goto(path);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(sw).toBeLessThanOrEqual(cw);
    });
  }
  test("plane labels stay on screen", async ({ page }) => {
    test.setTimeout(30_000);
    await fakeServices(page);
    await page.goto("/");
    const worst = await page.evaluate(async () => {
      const field = document.getElementById("field")!.getBoundingClientRect();
      let out = 0;
      const start = performance.now();
      while (performance.now() - start < 6000) {
        await new Promise(requestAnimationFrame);
        for (const t of document.querySelectorAll<HTMLElement>(".plane .tag")) {
          const r = t.getBoundingClientRect();
          out = Math.max(out, field.left - r.left, r.right - field.right);
        }
      }
      return out;
    });
    expect(worst).toBeLessThanOrEqual(1);
  });
  test("menu and footer links are easy to tap (44px tall)", async ({ page }) => {
    await fakeServices(page);
    await page.goto("/");
    for (const sel of [".nav a", ".foot a", ".home-link"]) {
      for (const box of await page.locator(sel).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(box, sel).toBeGreaterThanOrEqual(44);
    }
  });
});

test("SEO basics: canonical, structured data, sitemap", async ({ page, request }) => {
  await page.goto("/econsul/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://revazkuparadze.com/econsul/");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld["@graph"].map((x: { "@type": string }) => x["@type"])).toEqual(["Person", "WebPage", "CreativeWork"]);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("momo");
  for (const p of ["", "about/", "craft/", "econsul/", "ephoto/", "greencard/", "ideasky/"]) expect(sitemap).toContain(`<loc>https://revazkuparadze.com/${p}</loc>`);
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap: https://revazkuparadze.com/sitemap.xml");
  for (const icon of ["/favicon.ico", "/favicon-32.png", "/apple-touch-icon.png"]) expect((await request.get(icon)).status()).toBe(200);
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", "favicon.ico");
  // GitHub Pages hides folders starting with _ (like _astro/) unless .nojekyll is present
  expect((await request.get("/.nojekyll")).status()).toBe(200);
});
