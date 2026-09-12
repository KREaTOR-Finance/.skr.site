import { describe, expect, it } from "vitest";
import { buildKreationHtml, extractKreationHtmlFromModel, kreationPaymentMemo } from "../app/lib/kreation";
import { evaluateKreationPayment } from "../app/lib/kreationPay";
import { KREATION_GENERATE_SKR_RAW, KREATION_GENERATE_SKR_UI, SKR_MINT, SKR_TREASURY } from "../app/lib/sharedSpec";

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

describe("kreation Grok payment", () => {
  it("meters generate at 25 SKR", () => {
    expect(KREATION_GENERATE_SKR_UI).toBe(25);
    expect(KREATION_GENERATE_SKR_RAW).toBe(25_000_000);
  });

  it("binds payment memo to the prompt", () => {
    expect(kreationPaymentMemo("gym hello world")).toMatch(/^skr-kreation:[0-9a-f]+$/);
    expect(kreationPaymentMemo("gym hello world")).not.toBe(kreationPaymentMemo("other prompt"));
  });

  it("strips scripts from model HTML", () => {
    const html = extractKreationHtmlFromModel("```html\n<html><body><script>alert(1)</script><h1>Gym</h1></body></html>\n```");
    expect(html).toContain("<h1>Gym</h1>");
    expect(html).not.toMatch(/<script/i);
  });

  it("accepts a 25 SKR treasury transfer with matching memo", () => {
    const wallet = "11111111111111111111111111111111";
    const prompt = "hello world gym";
    const result = evaluateKreationPayment(
      {
        meta: {
          err: null,
          preTokenBalances: [
            { mint: SKR_MINT, owner: wallet, uiTokenAmount: { amount: "50000000" } },
            { mint: SKR_MINT, owner: SKR_TREASURY, uiTokenAmount: { amount: "0" } },
          ],
          postTokenBalances: [
            { mint: SKR_MINT, owner: wallet, uiTokenAmount: { amount: "25000000" } },
            { mint: SKR_MINT, owner: SKR_TREASURY, uiTokenAmount: { amount: "25000000" } },
          ],
          innerInstructions: [],
        },
        transaction: {
          message: {
            accountKeys: [{ pubkey: wallet }],
            instructions: [{ program: "spl-memo", parsed: kreationPaymentMemo(prompt) }],
          },
        },
      },
      { wallet, prompt },
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects a payment for a different prompt", () => {
    const wallet = "11111111111111111111111111111111";
    const result = evaluateKreationPayment(
      {
        meta: {
          err: null,
          preTokenBalances: [
            { mint: SKR_MINT, owner: wallet, uiTokenAmount: { amount: "25000000" } },
            { mint: SKR_MINT, owner: SKR_TREASURY, uiTokenAmount: { amount: "0" } },
          ],
          postTokenBalances: [
            { mint: SKR_MINT, owner: wallet, uiTokenAmount: { amount: "0" } },
            { mint: SKR_MINT, owner: SKR_TREASURY, uiTokenAmount: { amount: "25000000" } },
          ],
        },
        transaction: {
          message: {
            accountKeys: [{ pubkey: wallet }],
            instructions: [{ program: "spl-memo", parsed: kreationPaymentMemo("old prompt") }],
          },
        },
      },
      { wallet, prompt: "new prompt" },
    );
    expect(result.ok).toBe(false);
  });
});
