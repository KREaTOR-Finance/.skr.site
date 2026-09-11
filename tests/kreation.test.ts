import { describe, expect, it } from "vitest";
import { buildKreationHtml } from "../app/lib/kreation";

describe("kreation generator", () => {
  it("builds unique layouts from different prompts", () => {
    const base = { name: "demo", pitch: "Seeker ID", photoUrl: "", tint: "#00C9A7", links: [{ label: "X", url: "https://x.com" }] };
    const a = buildKreationHtml({ ...base, prompt: "dark chrome poster for a builder" });
    const b = buildKreationHtml({ ...base, prompt: "quiet manifesto with long copy" });
    expect(a).toContain("demo.skr");
    expect(a).not.toContain("<script");
    expect(a.includes("data-layout")).toBe(true);
    expect(a).not.toBe(b);
  });

  it("requires prompt content to differ from an empty card", () => {
    const html = buildKreationHtml({
      name: "demo",
      pitch: "hi",
      photoUrl: "",
      tint: "#00C9A7",
      links: [],
      prompt: "neon teal landing with three links",
    });
    expect(html).toContain("neon teal landing with three links");
  });
});
