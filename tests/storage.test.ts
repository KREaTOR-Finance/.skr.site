import { describe, expect, it } from "vitest";
import { mapUploadError, resolveStorageProviderFromEnv } from "../app/lib/storage";

describe("storage provider resolution", () => {
  it("uses explicit STORAGE_PROVIDER when valid", () => {
    expect(resolveStorageProviderFromEnv({ STORAGE_PROVIDER: "arweave" })).toBe("arweave");
    expect(resolveStorageProviderFromEnv({ STORAGE_PROVIDER: "ipfs" })).toBe("ipfs");
  });

  it("falls back to arweave when JWK exists", () => {
    expect(resolveStorageProviderFromEnv({ ARWEAVE_JWK: "{\"kty\":\"RSA\"}" })).toBe("arweave");
  });

  it("defaults to ipfs", () => {
    expect(resolveStorageProviderFromEnv({})).toBe("ipfs");
  });
});

describe("upload error mapping", () => {
  it("maps missing required input to 400", () => {
    expect(mapUploadError(new Error("html, domain, and templateId are required"))).toEqual({
      status: 400,
      message: "html, domain, and templateId are required",
    });
  });

  it("maps configuration failures to 500", () => {
    expect(mapUploadError(new Error("ARWEAVE_JWK is not configured"))).toEqual({
      status: 500,
      message: "ARWEAVE_JWK is not configured",
    });
  });

  it("maps provider failures to 502", () => {
    expect(mapUploadError(new Error("IPFS upload failed: 403"))).toEqual({
      status: 502,
      message: "IPFS upload failed: 403",
    });
  });
});
