import { describe, expect, it } from "vitest";
import {
  addBlock,
  applyPromptToBlocks,
  defaultCardBlocks,
  moveBlock,
  renderBlocksHtml,
  siteDomain,
  starterBlocks,
  validateBlocks,
} from "../app/lib/siteBlocks";

describe("studio blocks", () => {
  it("starts from a Seeker ID card with identity, SKR, links, and about", () => {
    const blocks = defaultCardBlocks("thomas");
    expect(blocks.map((block) => block.type)).toEqual(["identity", "stamps", "skr", "shop", "links", "about"]);
    expect(siteDomain(blocks)).toBe("thomas.skr");
  });

  it("page starters share identity but change the section mix", () => {
    expect(starterBlocks("links", "ada").map((block) => block.type)).toEqual([
      "identity",
      "links",
      "socials",
      "cta",
    ]);
    expect(starterBlocks("card", "ada")[0]).toMatchObject({ type: "identity", name: "ada" });
  });

  it("keeps identity pinned when reordering", () => {
    const blocks = defaultCardBlocks("you");
    const first = blocks[0];
    expect(moveBlock(blocks, first.id, 1)[0].type).toBe("identity");
  });

  it("applies a local prompt to block fields instead of raw HTML", () => {
    const next = applyPromptToBlocks(defaultCardBlocks("you"), 'Set the tagline to "Builder on Seeker" and add https://x.com/BuilderLabsAI plus https://example.com/shop');
    const identity = next.find((block) => block.type === "identity");
    const socials = next.find((block) => block.type === "socials");
    const links = next.find((block) => block.type === "links");
    expect(identity && identity.type === "identity" && identity.tagline).toBe("Builder on Seeker");
    expect(socials && socials.type === "socials" && socials.items.some((item) => item.url.includes("x.com"))).toBe(true);
    expect(links && links.type === "links" && links.items.some((item) => item.url.includes("example.com"))).toBe(true);
    expect(JSON.stringify(next)).not.toMatch(/customHtml/);
  });

  it("requires a .skr name before publish", () => {
    expect(validateBlocks(defaultCardBlocks(""))[0]).toMatch(/Passport/i);
    expect(validateBlocks(defaultCardBlocks("you"))).toEqual([]);
  });

  it("renders escaped HTML with a live SKR hook and no raw user scripts", () => {
    const blocks = addBlock(defaultCardBlocks("you"), "about").map((block) => (
      block.type === "about" ? { ...block, text: "<script>alert(1)</script>Hello" } : block
    ));
    const html = renderBlocksHtml(blocks, { wallet: "7NQnWRziGPj3XWRwyEZzqqfYhvPZjCHBtJ3g96QQXbDH" });
    expect(html).toContain("you.skr");
    expect(html).toContain("data-skr-live=");
    expect(html).toContain("/api/skr-profile");
    expect(html).toContain("data-stamps-live=");
    expect(html).not.toMatch(/data-skr-field="[^"]*">—/);
    expect(html).toContain('setAttribute("hidden"');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
