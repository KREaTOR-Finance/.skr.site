import { createContentUriAndHash } from "./publish";
import { BLOCK_PAGE_TEMPLATE_ID } from "./siteBlocks";

export const BUNDLE_UPLOAD_RETRY_MESSAGE =
  "Couldn't upload your site pages. Check your connection and retry publish.";

export type SiteUploadFile = {
  path: string;
  content: string;
  contentType: string;
};

export type UploadedSite = {
  contentUri: string;
  publicUrl: string;
  contentHash: string;
  metadataRecords: Record<string, string>;
};

export function isMultiPageBundle(files: { path: string }[]): boolean {
  return files.filter((file) => file.path.endsWith(".html")).length > 1;
}

export async function uploadSiteOrHtml(
  files: SiteUploadFile[],
  domain: string,
  deps: {
    fetch?: typeof fetch;
    uploadHtml?: typeof createContentUriAndHash;
    templateId?: string;
  } = {},
): Promise<UploadedSite> {
  const request = deps.fetch ?? fetch;
  const templateId = deps.templateId ?? BLOCK_PAGE_TEMPLATE_ID;
  const response = await request("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      domain,
      templateId,
      files: files.map((file) => ({ path: file.path, content: file.content, contentType: file.contentType })),
    }),
  });
  if (response.ok) {
    const parsed = await response.json() as {
      contentUri?: string;
      publicUrl?: string;
      contentHash?: string;
      metadataRecords?: Record<string, string>;
    };
    if (parsed.contentUri && parsed.publicUrl && parsed.metadataRecords) {
      return {
        contentUri: parsed.contentUri,
        publicUrl: parsed.publicUrl.endsWith("/") ? parsed.publicUrl : `${parsed.publicUrl}/`,
        contentHash: parsed.contentHash ?? "",
        metadataRecords: parsed.metadataRecords,
      };
    }
  }
  const home = files.find((file) => file.path === "index.html");
  if (isMultiPageBundle(files) || !home) {
    throw new Error(BUNDLE_UPLOAD_RETRY_MESSAGE);
  }
  const uploadHtml = deps.uploadHtml ?? createContentUriAndHash;
  return uploadHtml(home.content, { domain, templateId });
}
