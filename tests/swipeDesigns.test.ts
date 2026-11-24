import { describe, expect, it } from "vitest";
import { identityBlock } from "../app/lib/siteBlocks";
import { addPage, createDefaultSite, demoCreatorSite, homePage, renderPageHtml } from "../app/lib/sitePages";
import {
  BLEND_UNLOCK_KEEPS,
  SWIPE_DECK_SIZE,
  applyDesignToSite,
  applySectionOrder,
  applyTagline,
  blendKeptDesigns,
  canBlend,
  clashKeys,
  cycleSwap,
  fieldValue,
  generateSwipeDeck,
  sameSectionOrder,
  type SwipeDesign,
} from "../app/lib/swipeDesigns";

function design(id: string, overrides: Partial<SwipeDesign> = {}): SwipeDesign {
  return {
    id,
    name: id,
    themeId: id,
    orderId: "passport-first",
    orderLabel: "Passport first",
    tint: "#00C9A7",
    typography: "display",
    density: "comfortable",
    background: "glass",
    stampStyle: "grid",
    shopStyle: "rows",
    sectionOrder: ["identity", "stamps", "skr", "shop", "links", "about"],
    ...overrides,
  };
}

describe("generateSwipeDeck", () => {
  it("builds a fixed deck of 12 unique theme × order designs", () => {
    const deck = generateSwipeDeck();
    expect(deck).toHaveLength(SWIPE_DECK_SIZE);
    expect(new Set(deck.map((item) => item.id)).size).toBe(SWIPE_DECK_SIZE);
    expect(new Set(deck.map((item) => item.themeId)).size).toBe(4);
    expect(new Set(deck.map((item) => item.orderId)).size).toBe(3);
    expect(deck.every((item) => item.sectionOrder[0] === "identity")).toBe(true);
  });
});

describe("blend and clash", () => {
  const teal = design("teal", { tint: "#00C9A7", typography: "display", sectionOrder: ["identity", "stamps", "shop"] });
  const violet = design("violet", { tint: "#8B7CFF", typography: "editorial", background: "flat", sectionOrder: ["identity", "shop", "stamps"] });
  const gold = design("gold", { tint: "#D4AF37", typography: "sans", density: "compact", background: "mesh", sectionOrder: ["identity", "stamps", "links"] });

  it("unlocks blend after three keeps", () => {
    expect(BLEND_UNLOCK_KEEPS).toBe(3);
    expect(canBlend([teal, violet])).toBe(false);
    expect(canBlend([teal, violet, gold])).toBe(true);
  });

  it("lets the most recently kept design win clashes", () => {
    const blend = blendKeptDesigns([teal, violet, gold]);
    expect(blend.tint).toBe(gold.tint);
    expect(blend.typography).toBe("sans");
    expect(blend.density).toBe("compact");
    expect(blend.background).toBe("mesh");
    expect(sameSectionOrder(blend.sectionOrder, gold.sectionOrder)).toBe(true);
    expect(blend.name).toBe("Your blend");
  });

  it("tap-to-swap overrides a clashing field without changing the others", () => {
    const blend = blendKeptDesigns([teal, violet, gold], { tint: "violet", typography: "teal" });
    expect(blend.tint).toBe("#8B7CFF");
    expect(blend.typography).toBe("display");
    expect(blend.background).toBe("mesh");
    expect(sameSectionOrder(blend.sectionOrder, gold.sectionOrder)).toBe(true);
  });

  it("lists only the fields that actually clash", () => {
    const keys = clashKeys([teal, violet, gold]);
    expect(keys).toEqual(expect.arrayContaining(["tint", "typography", "sectionOrder", "background"]));
    expect(clashKeys([teal, design("teal-2", { sectionOrder: teal.sectionOrder })])).toEqual([]);
  });

  it("cycles tap-to-swap through unique values for a field", () => {
    const kept = [teal, violet, gold];
    const first = cycleSwap(kept, "tint");
    const second = cycleSwap(kept, "tint", first);
    const third = cycleSwap(kept, "tint", second);
    const values = [first, second, third].map((id) => fieldValue(kept.find((item) => item.id === id)!, "tint"));
    expect(new Set(values).size).toBe(3);
    expect(cycleSwap(kept, "tint", third)).toBe(first);
  });

  it("throws when blending an empty keep list", () => {
    expect(() => blendKeptDesigns([])).toThrow(/at least one/i);
  });
});

describe("applyDesignToSite", () => {
  it("styles Home only and lets inner pages inherit color and type", () => {
    let site = demoCreatorSite();
    if (site.pages.length < 2) site = addPage(site, { starterId: "about" });
    const shopPage = site.pages.find((page) => page.kind !== "home")!;
    const innerBefore = shopPage.blocks.map((block) => block.id);
    const design = generateSwipeDeck().find((item) => item.themeId === "violet-editorial" && item.orderId === "shop-first")!;
    const next = applyDesignToSite(site, design);
    const home = homePage(next);
    const identity = identityBlock(home.blocks);
    expect(identity.tint).toBe("#8B7CFF");
    expect(home.blocks[0].type).toBe("identity");
    expect(home.blocks.map((block) => block.type).slice(0, 4)).toEqual(["identity", "shop", "stamps", "links"]);
    expect(next.theme).toEqual({
      typography: "editorial",
      density: "comfortable",
      background: "flat",
      stampStyle: "stack",
      shopStyle: "featured",
    });
    const innerAfter = next.pages.find((page) => page.id === shopPage.id)!;
    expect(innerAfter.blocks.map((block) => block.id)).toEqual(innerBefore);
    const homeHtml = renderPageHtml(next, home);
    const innerHtml = renderPageHtml(next, innerAfter);
    expect(homeHtml).toContain("#8B7CFF");
    expect(innerHtml).toContain("#8B7CFF");
    expect(homeHtml).toContain("Georgia");
    expect(innerHtml).toContain("Georgia");
    expect(homeHtml).toContain("font-style:italic");
    expect(innerHtml).toContain("font-style:italic");
  });

  it("keeps leftover Home blocks and can tweak tagline or order later", () => {
    const site = createDefaultSite("creator");
    const design = generateSwipeDeck()[0];
    const styled = applyDesignToSite(site, design);
    const reordered = applySectionOrder(styled, ["identity", "shop", "stamps", "skr", "links", "about"]);
    const tagged = applyTagline(reordered, "A Seeker passport that earns.");
    expect(homePage(tagged).blocks.map((block) => block.type)).toEqual(["identity", "shop", "stamps", "skr", "links", "about"]);
    expect(identityBlock(homePage(tagged).blocks).tagline).toBe("A Seeker passport that earns.");
  });
});
