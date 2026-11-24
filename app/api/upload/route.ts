import Arweave from "arweave";
import { NextRequest, NextResponse } from "next/server";
import type { JWKInterface } from "arweave/node/lib/wallet";
import { mapUploadError, resolveStorageProviderFromEnv, sha256Hex, type StorageProvider } from "@/app/lib/storage";
import { buildArweavePathManifest, manifestRootUrl } from "@/app/lib/siteManifest";

export const runtime = "nodejs";

interface UploadFile {
  path: string;
  content: string;
  contentType?: string;
}

interface UploadBody {
  html?: string;
  files?: UploadFile[];
  domain: string;
  templateId: string;
  provider?: StorageProvider;
}

interface UploadResult {
  contentUri: string;
  publicUrl: string;
  provider: StorageProvider;
  contentHash: string;
  metadataRecords: Record<string, string>;
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 60);
}

function safeBundlePath(path: string): string | null {
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!clean || clean.includes("..") || !/^[a-z0-9][a-z0-9._\-\/]*$/i.test(clean)) return null;
  return clean;
}

function parseArweaveJwk(value: string): JWKInterface {
  const parsed = JSON.parse(value) as Partial<JWKInterface>;
  if (!parsed || typeof parsed.kty !== "string" || typeof parsed.e !== "string" || typeof parsed.n !== "string") {
    throw new Error("ARWEAVE_JWK is missing required fields");
  }
  return parsed as JWKInterface;
}

function arweaveClient(jwk: JWKInterface) {
  void jwk;
  return Arweave.init({ host: "arweave.net", port: 443, protocol: "https" });
}

async function requireArweaveJwk(): Promise<{ arweave: Arweave; jwk: JWKInterface }> {
  if (!process.env.ARWEAVE_JWK) {
    throw new Error("ARWEAVE_JWK is not configured");
  }
  let jwk: JWKInterface;
  try {
    jwk = parseArweaveJwk(process.env.ARWEAVE_JWK);
  } catch {
    throw new Error("ARWEAVE_JWK is not valid JSON");
  }
  return { arweave: arweaveClient(jwk), jwk };
}

async function postArweaveTx(arweave: Arweave, jwk: JWKInterface, data: string, tags: Record<string, string>): Promise<string> {
  const tx = await arweave.createTransaction({ data }, jwk);
  for (const [name, value] of Object.entries(tags)) tx.addTag(name, value);
  await arweave.transactions.sign(tx, jwk);
  const uploadResult = await arweave.transactions.post(tx);
  if (uploadResult.status !== 200 && uploadResult.status !== 202) {
    throw new Error(`Arweave upload failed (${uploadResult.status})`);
  }
  return tx.id;
}

async function uploadToArweave(body: { html: string; domain: string; templateId: string }): Promise<UploadResult> {
  const { arweave, jwk } = await requireArweaveJwk();
  const txId = await postArweaveTx(arweave, jwk, body.html, {
    "Content-Type": "text/html; charset=utf-8",
    "App-Name": "skr-studio",
    Domain: body.domain,
    Template: body.templateId,
  });
  const publicUrl = `https://arweave.net/${txId}`;
  return {
    contentUri: `ar://${txId}`,
    publicUrl,
    provider: "arweave",
    contentHash: await sha256Hex(body.html),
    metadataRecords: { arweave: txId, url: publicUrl },
  };
}

async function uploadBundleToArweave(body: { domain: string; templateId: string; files: UploadFile[] }): Promise<UploadResult> {
  const { arweave, jwk } = await requireArweaveJwk();
  const uploaded: Array<{ path: string; txId: string }> = [];
  for (const file of body.files) {
    const path = safeBundlePath(file.path);
    if (!path) continue;
    const txId = await postArweaveTx(arweave, jwk, file.content, {
      "Content-Type": file.contentType || "text/html; charset=utf-8",
      "App-Name": "skr-studio",
      Domain: body.domain,
      Template: body.templateId,
      "File-Path": path,
    });
    uploaded.push({ path, txId });
  }
  const manifest = buildArweavePathManifest(uploaded);
  const manifestJson = JSON.stringify(manifest);
  const manifestId = await postArweaveTx(arweave, jwk, manifestJson, {
    "Content-Type": "application/x.arweave-manifest+json",
    "App-Name": "skr-studio",
    Domain: body.domain,
    Template: body.templateId,
  });
  const publicUrl = manifestRootUrl(manifestId);
  return {
    contentUri: `ar://${manifestId}`,
    publicUrl,
    provider: "arweave",
    contentHash: await sha256Hex(manifestJson),
    metadataRecords: { arweave: manifestId, url: publicUrl },
  };
}

async function uploadToIpfs(body: { html: string; domain: string; templateId: string }): Promise<UploadResult> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error("PINATA_JWT is not configured");
  }

  const form = new FormData();
  const filename = `${sanitize(body.domain)}-${sanitize(body.templateId)}.html`;
  form.append("file", new Blob([body.html], { type: "text/html" }), filename);
  form.append("pinataMetadata", JSON.stringify({
    name: filename,
    keyvalues: {
      app: "skr-studio",
      domain: body.domain,
      template: body.templateId,
    },
  }));

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`IPFS upload failed: ${message || response.statusText}`);
  }

  const parsed = (await response.json()) as { IpfsHash?: string };
  if (!parsed.IpfsHash) {
    throw new Error("IPFS uploader returned no hash");
  }

  const cid = parsed.IpfsHash;
  const publicUrl = `https://ipfs.io/ipfs/${cid}`;
  return {
    contentUri: `ipfs://${cid}`,
    publicUrl,
    provider: "ipfs",
    contentHash: await sha256Hex(body.html),
    metadataRecords: { ipfs: cid, url: publicUrl },
  };
}

async function uploadBundleToIpfs(body: { domain: string; templateId: string; files: UploadFile[] }): Promise<UploadResult> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error("PINATA_JWT is not configured");
  }
  const root = sanitize(body.domain) || "site";
  const form = new FormData();
  let fileCount = 0;
  for (const file of body.files) {
    const path = safeBundlePath(file.path);
    if (!path) continue;
    form.append("file", new Blob([file.content], { type: file.contentType || "text/html" }), `${root}/${path}`);
    fileCount += 1;
  }
  if (!fileCount) throw new Error("html, domain, and templateId are required");
  form.append("pinataMetadata", JSON.stringify({
    name: `${root}-site`,
    keyvalues: { app: "skr-studio", domain: body.domain, template: body.templateId },
  }));
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`IPFS upload failed: ${message || response.statusText}`);
  }
  const parsed = (await response.json()) as { IpfsHash?: string };
  if (!parsed.IpfsHash) throw new Error("IPFS uploader returned no hash");
  const cid = parsed.IpfsHash;
  const publicUrl = `https://ipfs.io/ipfs/${cid}/`;
  return {
    contentUri: `ipfs://${cid}`,
    publicUrl,
    provider: "ipfs",
    contentHash: await sha256Hex(body.files.map((file) => `${file.path}:${file.content}`).join("\n")),
    metadataRecords: { ipfs: cid, url: publicUrl },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<UploadBody>;
    if (!body.domain || !body.templateId) {
      return NextResponse.json({ error: "html, domain, and templateId are required" }, { status: 400 });
    }
    const requestedProvider = body.provider === "arweave" || body.provider === "ipfs" ? body.provider : undefined;
    const provider = requestedProvider ?? resolveStorageProviderFromEnv(process.env);
    const files = Array.isArray(body.files) ? body.files : [];
    const result = files.length
      ? provider === "arweave"
        ? await uploadBundleToArweave({ domain: body.domain, templateId: body.templateId, files })
        : await uploadBundleToIpfs({ domain: body.domain, templateId: body.templateId, files })
      : !body.html
        ? null
        : provider === "arweave"
          ? await uploadToArweave({ html: body.html, domain: body.domain, templateId: body.templateId })
          : await uploadToIpfs({ html: body.html, domain: body.domain, templateId: body.templateId });
    if (!result) {
      return NextResponse.json({ error: "html, domain, and templateId are required" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const mapped = mapUploadError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
