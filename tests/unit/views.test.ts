import { describe, it, expect } from "vitest";
import { esc, factsHtml, ideaExtraHtml, ideaEyebrow, ideaListHtml, ideaMediaHtml, planeLabel, planeTag, stopPanelHtml } from "../../src/lib/views";
import { IDEAS, PARKED_IDEAS, ideaBySlug } from "../../src/content/ideas";
import { STOPS, stopById } from "../../src/content/stops";

describe("views", () => {
  it("escapes markup", () => expect(esc(`<a href="x">&</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;"));
  it("plane names are numbered from 01", () => {
    expect(planeTag(IDEAS[0]!, 0)).toBe("01 · eConsul");
    expect(planeLabel(IDEAS[1]!, 1)).toBe("02 · ePhoto.AI: open the idea");
  });
  it("undated ideas get a plain eyebrow", () => {
    expect(ideaEyebrow(ideaBySlug("greencard")!)).toBe("Idea");
    expect(ideaEyebrow(ideaBySlug("econsul")!)).toBe("Idea · 2022");
  });
  it("facts: single values and lists", () => {
    expect(factsHtml([["Role", "A & B"], ["Steps", ["one", "two"]]]))
      .toBe('<div><dt>Role</dt><dd>A &amp; B</dd></div><div class="span-all"><dt>Steps</dt><dd><ul><li>one</li><li>two</li></ul></dd></div>');
  });
  it("media carries sizes so the page doesn't jump", () => {
    expect(ideaMediaHtml(ideaBySlug("econsul")!)).toContain('width="1400" height="934"');
    const gc = ideaMediaHtml(ideaBySlug("greencard")!);
    expect(gc).toContain('width="1400" height="802"');
    expect(gc).toContain('<figure class="logo-card"><img src="ideas/greencard-logo.svg"');
    expect(ideaMediaHtml(ideaBySlug("econsul")!)).not.toContain("logo-card");
  });
  it("idea list uses the given hrefs", () => {
    expect(ideaListHtml([IDEAS[2]!], (s) => `#${s}`)).toContain('href="#greencard" data-slug="greencard"');
  });
  it("stop panels show role, awards, links and photo", () => {
    const html = stopPanelHtml(stopById("econsul")!);
    expect(html).toContain("<p class=\"s-awards-h\">Recognition</p>");
    expect(html).toContain('data-target="greencard"');
    expect(html).toContain('width="1400" height="933"');
    expect(stopPanelHtml(stopById("now")!)).not.toContain("Recognition");
  });
});

describe("content integrity", () => {
  it("slugs and stop ids are unique and URL-safe", () => {
    for (const list of [IDEAS.map((i) => i.slug), STOPS.map((s) => s.id)]) {
      expect(new Set(list).size).toBe(list.length);
      for (const s of list) expect(s).toMatch(/^[a-z0-9-]+$/);
    }
  });
  it("every panel link points somewhere real", () => {
    const targets = new Set(["home", "about", "craft", ...IDEAS.map((i) => i.slug)]);
    for (const st of STOPS) {
      for (const [t] of st.links ?? []) expect(targets).toContain(t);
      for (const b of st.branches ?? []) expect(targets).toContain(b.target);
    }
  });
  it("every image has alt text and a size", () => {
    for (const i of IDEAS) for (const m of i.media ?? []) { expect(m.alt.length).toBeGreaterThan(10); expect(m.w * m.h).toBeGreaterThan(0); }
    for (const s of STOPS) if (s.photo) { expect(s.photo.alt.length).toBeGreaterThan(10); expect(s.photo.w * s.photo.h).toBeGreaterThan(0); }
  });
});

describe("stop photo links", () => {
  it("a stop photo with a link is a button that opens it; others are plain images", () => {
    expect(stopPanelHtml(stopById("now")!)).toContain('<button class="panel-link panel-photo" type="button" data-target="ideasky"><img src="ideas/ideasky-sky.jpg"');
    expect(stopPanelHtml(stopById("tbc")!)).not.toContain("panel-photo");
  });
  it("the path shows the years Rez gave", () => {
    expect([stopById("tbc")!.year, stopById("econsul")!.year, stopById("now")!.year]).toEqual(["2021–2022", "2022–2026", "2026–now · New York"]);
  });
});

describe("parked ideas", () => {
  it("Momo is parked: no plane, page or list entry until it has content", () => {
    expect(IDEAS.map((i) => i.slug)).toEqual(["econsul", "ephoto", "greencard", "ideasky"]);
    expect(ideaBySlug("momo")).toBeUndefined();
    expect(PARKED_IDEAS.map((i) => i.slug)).toContain("momo");
  });
  it("no About panel links to a parked idea", () => {
    for (const st of STOPS) for (const [target] of st.links ?? []) expect(PARKED_IDEAS.map((i) => i.slug)).not.toContain(target);
  });
});

describe("ideaExtraHtml", () => {
  it("is empty for an idea with no highlight or notice", () => expect(ideaExtraHtml(ideaBySlug("ephoto")!)).toBe(""));
  it("greencard.ge: highlights the move to the USA and cites why it stopped, word for word", () => {
    const html = ideaExtraHtml(ideaBySlug("greencard")!);
    expect(html).toContain('class="highlight"');
    expect(html).toContain("got me to the USA");
    expect(html).toContain("I am immediately directing USCIS to pause the DV1 program");
    expect(html).toContain('href="https://x.com/Sec_Noem/status/2001873077089767435"');
    expect(html.indexOf("highlight")).toBeLessThan(html.indexOf("notice"));
  });
  it("escapes its text", () => {
    const idea = { ...ideaBySlug("ephoto")!, highlight: "<b>x</b>" };
    expect(ideaExtraHtml(idea)).toContain("&lt;b&gt;");
  });
});
