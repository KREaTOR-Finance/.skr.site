import { describe, expect, it } from "vitest";
import { extractSkrLabelFromHost, normalizeSkrLabel } from "../app/lib/host";
import { normalizeSkrDomain, publicProfileUrl } from "../app/lib/resolver";

describe("wildcard host parsing", () => {
  it("extracts a .skr label from wildcard hostnames", () => {
    expect(extractSkrLabelFromHost("nakamura.skr.site")).toBe("nakamura");
    expect(extractSkrLabelFromHost("NAKAMURA.skr.site:3000")).toBe("nakamura");
  });

  it("leaves root hosts alone", () => {
    expect(extractSkrLabelFromHost("skr.site")).toBeNull();
    expect(extractSkrLabelFromHost("www.skr.site")).toBeNull();
    expect(extractSkrLabelFromHost("localhost:3000")).toBeNull();
  });
});

describe(".skr input normalization", () => {
  it("accepts labels and full .skr names", () => {
    expect(normalizeSkrLabel("thomas")).toBe("thomas");
    expect(normalizeSkrDomain("Thomas.skr")).toEqual({ label: "thomas", domain: "thomas.skr" });
  });

  it("rejects names that cannot be routed safely", () => {
    expect(normalizeSkrLabel("../nope")).toBeNull();
    expect(normalizeSkrDomain("bad name.skr")).toBeNull();
  });

  it("builds the public wildcard URL", () => {
    expect(publicProfileUrl("thomas.skr")).toBe("https://thomas.skr.site");
  });
});
