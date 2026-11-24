import type { SiteFile } from "./sitePages";

export type ArweavePathManifest = {
  manifest: "arweave/paths";
  version: "0.2.0";
  index: { path: "index.html" };
  paths: Record<string, { id: string }>;
};

export function buildArweavePathManifest(files: Array<{ path: string; txId: string }>): ArweavePathManifest {
  const paths: Record<string, { id: string }> = {};
  for (const file of files) {
    const path = file.path.replace(/^\/+/, "");
    if (!path || path.includes("..")) continue;
    paths[path] = { id: file.txId };
  }
  if (!paths["index.html"]) {
    throw new Error("A site manifest must include index.html");
  }
  return {
    manifest: "arweave/paths",
    version: "0.2.0",
    index: { path: "index.html" },
    paths,
  };
}

export function manifestRootUrl(txId: string): string {
  return `https://arweave.net/${txId}/`;
}

export function bundleContentType(file: SiteFile): string {
  return file.contentType || "application/octet-stream";
}
