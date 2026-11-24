import { describe, expect, it } from "vitest";
import { deriveStamps, stampsLiveScript } from "../app/lib/stamps";

const base = { isSeeker: false, liquid: 0, staked: 0, yieldEarned: 0, total: 0 };

describe("auto stamps", () => {
  it("derives Seeker, holdings, stake, and yield stamps from public profile data", () => {
    expect(deriveStamps(base)).toEqual([]);
    expect(deriveStamps({ ...base, isSeeker: true }).map((stamp) => stamp.id)).toEqual(["seeker"]);
    expect(deriveStamps({ ...base, liquid: 12, total: 12 }).map((stamp) => stamp.id)).toEqual(["holds-skr"]);
    const staked = deriveStamps({ ...base, isSeeker: true, liquid: 0, staked: 11741.8, yieldEarned: 1741.8, total: 11741.8 });
    expect(staked.map((stamp) => stamp.id)).toEqual(["seeker", "holds-skr", "staked-100", "yield"]);
    expect(staked.find((stamp) => stamp.id === "staked-100")?.title).toBe("Staked 100+ SKR");
  });

  it("hides the stamps block when the live fetch fails and never uses dashes", () => {
    const script = stampsLiveScript();
    expect(script).toContain("data-stamps-live");
    expect(script).toContain("/api/skr-profile");
    expect(script).toMatch(/hide\(\)|setAttribute\("hidden"/);
    expect(script).not.toContain("—");
  });
});
