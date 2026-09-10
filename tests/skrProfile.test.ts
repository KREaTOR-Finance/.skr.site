import { describe, expect, it } from "vitest";
import { formatSkr, shortenWallet, skrStatRows } from "../app/lib/skrProfile";

describe("skr profile display", () => {
  it("formats SKR without a USD headline", () => {
    expect(formatSkr(0)).toBe("0");
    expect(formatSkr(12.345)).toBe("12.35");
    expect(formatSkr(1500)).toBe("1,500");
  });

  it("shortens wallets for the card", () => {
    expect(shortenWallet("FdTQs8n8TEZWys7ELs7ciKuo95zo5j373txeAWHwcFa")).toBe("FdTQ…wcFa");
  });

  it("always lists liquid, staked, yield, unstaking, and guardian", () => {
    const rows = skrStatRows({
      liquid: 0,
      staked: 0,
      yieldEarned: 0,
      unstaking: 0,
      guardian: null,
      cooldownEndsAt: null,
    });
    expect(rows.map((row) => row.label)).toEqual(["Liquid", "Staked", "Yield", "Unstaking", "Guardian"]);
    expect(rows.map((row) => row.value)).toEqual(["0", "0", "0", "0", "None"]);
  });
});
