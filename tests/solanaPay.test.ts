import { describe, expect, it } from "vitest";
import { SKR_MINT, SKR_UNLOCK_AMOUNT_UI, HTML_TEMPLATE_ID } from "../app/lib/sharedSpec";
import { formatPayAmount, htmlUnlockReady, solanaPayQrSvg, solanaPayTransferUrl } from "../app/lib/solanaPay";
import { addPage, createDefaultSite, customHtmlPublishError, renderSiteBundle, sitePublishTemplateId, validateSite } from "../app/lib/sitePages";

const owner = "8U2K3VZuXXV6wGrVEbAXFYfVZFEoRBApYpMjDuzCgPM2";

describe("Solana Pay shop checkout", () => {
  it("builds a transfer request to the owner for SKR or SOL, with a QR", () => {
    const skr = solanaPayTransferUrl({ recipient: owner, amount: 40, currency: "SKR", label: "Studio hour", memo: "Studio hour" });
    expect(skr.startsWith(`solana:${owner}?`)).toBe(true);
    expect(skr).toContain("amount=40");
    expect(skr).toContain(`spl-token=${SKR_MINT}`);
    const sol = solanaPayTransferUrl({ recipient: owner, amount: 2, currency: "SOL", label: "Icon pack" });
    expect(sol).toContain("amount=2");
    expect(sol).not.toContain("spl-token=");
    expect(solanaPayTransferUrl({ recipient: "not-a-key", amount: 1, currency: "SOL" })).toBe("");
    expect(formatPayAmount(0)).toBe("");
    const svg = solanaPayQrSvg(skr);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("path");
  });
});

describe("custom HTML path", () => {
  it("keeps Home as the passport and publishes custom HTML on an inner page only when 1000 SKR is held", () => {
    let site = createDefaultSite("creator");
    site = addPage(site, { starterId: "html", title: "Custom" });
    const htmlPage = site.pages.find((page) => page.title === "Custom")!;
    expect(validateSite(site).join(" ")).toMatch(/needs custom HTML/i);
    site = { ...site, pages: site.pages.map((page) => page.id === htmlPage.id ? { ...page, customHtml: "<!doctype html><title>Custom</title><h1>Hello raw</h1>" } : page) };
    expect(customHtmlPublishError(site, { total: 40 })).toMatch(new RegExp(String(SKR_UNLOCK_AMOUNT_UI)));
    expect(htmlUnlockReady({ total: 40 })).toBe(false);
    expect(htmlUnlockReady({ total: 1000 })).toBe(true);
    expect(customHtmlPublishError(site, { total: 11741 })).toBeNull();
    expect(sitePublishTemplateId(site)).toBe(HTML_TEMPLATE_ID);
    const files = renderSiteBundle(site, { wallet: owner, isSeeker: true });
    const home = files.find((file) => file.path === "index.html")!.content;
    const custom = files.find((file) => file.path === "custom/index.html")!.content;
    expect(home).toContain("One Seeker, one name");
    expect(home).toContain("Seeker-verified");
    expect(custom).toBe("<!doctype html><title>Custom</title><h1>Hello raw</h1>");
    const replacedHome = createDefaultSite("you");
    replacedHome.pages[0].customHtml = "<h1>nope</h1>";
    expect(validateSite(replacedHome).join(" ")).toMatch(/Home/i);
  });
});
