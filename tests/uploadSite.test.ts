import { describe, expect, it, vi } from "vitest";
import { BUNDLE_UPLOAD_RETRY_MESSAGE, isMultiPageBundle, uploadSiteOrHtml } from "../app/lib/uploadSite";

const home = { path: "index.html", content: "<h1>Home</h1>", contentType: "text/html" };
const about = { path: "about/index.html", content: "<h1>About</h1>", contentType: "text/html" };
const favicon = { path: "favicon.svg", content: "<svg></svg>", contentType: "image/svg+xml" };

describe("site bundle upload", () => {
  it("does not fall back to index.html only when a multi-page bundle upload fails", async () => {
    expect(isMultiPageBundle([home, favicon])).toBe(false);
    expect(isMultiPageBundle([home, about, favicon])).toBe(true);

    const uploadHtml = vi.fn();
    const failing = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}), text: async () => "nope" });

    await expect(uploadSiteOrHtml([home, about, favicon], "creator.skr", { fetch: failing as unknown as typeof fetch, uploadHtml })).rejects.toThrow(BUNDLE_UPLOAD_RETRY_MESSAGE);
    expect(uploadHtml).not.toHaveBeenCalled();

    const uploaded = { contentUri: "ar://single", publicUrl: "https://arweave.net/single", contentHash: "abc", metadataRecords: { url: "https://arweave.net/single" } };
    uploadHtml.mockResolvedValue(uploaded);
    const single = await uploadSiteOrHtml([home, favicon], "creator.skr", { fetch: failing as unknown as typeof fetch, uploadHtml });
    expect(single).toEqual(uploaded);
    expect(uploadHtml).toHaveBeenCalledOnce();
  });
});
