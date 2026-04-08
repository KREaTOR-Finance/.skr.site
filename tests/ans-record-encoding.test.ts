import { describe, expect, it } from "vitest";
import { buildRecordEntries, encodeAnsCreateData, encodeAnsUpdateData, encodeRecordValue } from "../app/lib/chain";
import type { PublishPayload } from "../app/lib/types";

describe("ANS record encoding", () => {
  it("encodes create payload with mainnet discriminator and fixed shape", () => {
    const hashedName = Buffer.alloc(32, 0x11);
    const out = encodeAnsCreateData(hashedName, 512);

    expect(out.length).toBe(57);
    expect(out.subarray(0, 8).toString("hex")).toBe("181ec828051c0777");
    expect(out.readUInt32LE(8)).toBe(32);
    expect(out.subarray(12, 44)).toEqual(hashedName);
    expect(out.readUInt32LE(44)).toBe(512);
    expect(out.readUInt8(48)).toBe(1);
    expect(out.readBigUInt64LE(49)).toBe(0n);
  });

  it("encodes update payload with null-terminated record value", () => {
    const hashedName = Buffer.alloc(32, 0x22);
    const value = encodeRecordValue("https://skr.site");
    const out = encodeAnsUpdateData(hashedName, value);

    expect(out.subarray(0, 8).toString("hex")).toBe("dbc858b09e3ffd7f");
    expect(out.readUInt32LE(8)).toBe(32);
    expect(out.subarray(12, 44)).toEqual(hashedName);
    expect(out.readUInt32LE(44)).toBe(0);
    expect(out.readUInt32LE(48)).toBe(value.length);
    expect(out[out.length - 1]).toBe(0);
  });
});

describe("record entry builder", () => {
  it("always writes url + template and includes optional metadata", () => {
    const payload: PublishPayload = {
      domain: "thomas.skr",
      templateId: "social-hub",
      contentUri: "ar://abc",
      contentHash: "a".repeat(64),
      isPremium: true,
      metadata: {
        url: "https://arweave.net/abc",
        arweave: "abc",
        ipfs: "Qm123",
        pic: "https://arweave.net/pic",
      },
    };

    expect(buildRecordEntries(payload)).toEqual([
      { record: "url", value: "https://arweave.net/abc" },
      { record: "template", value: "social-hub" },
      { record: "ARWV", value: "abc" },
      { record: "IPFS", value: "Qm123" },
      { record: "pic", value: "https://arweave.net/pic" },
    ]);
  });
});
