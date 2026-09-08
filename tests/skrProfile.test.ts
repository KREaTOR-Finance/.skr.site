import { describe, expect, it } from "vitest";
import { formatSkr, shortenWallet } from "../app/lib/skrProfile";

describe("skr profile display", () => {
  it("formats SKR without a USD headline", () => {
    expect(formatSkr(0)).toBe("0");
    expect(formatSkr(12.345)).toBe("12.35");
    expect(formatSkr(1500)).toBe("1,500");
  });

  it("shortens wallets for the card", () => {
    expect(shortenWallet("FdTQs8n8TEZWys7ELs7ciKuo95zo5j373txeAWHwcFa")).toBe("FdTQ…wcFa");
  });
});
