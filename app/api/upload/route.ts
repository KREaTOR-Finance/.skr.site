import Arweave from "arweave";
import { NextRequest, NextResponse } from "next/server";
import type { JWKInterface } from "arweave/node/lib/wallet";
import { mapUploadError, resolveStorageProviderFromEnv, type StorageProvider } from "@/app/lib/storage";

export const runtime = "nodejs";

interface UploadBody {
  html: string;
  domain: string;
  templateId: string;
  provider?: StorageProvider;
}

interface UploadResult {
  contentUri: string;
  publicUrl: string;
  provider: StorageProvider;
  metadataRecords: Record<string, string>;
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 60);
}

function parseArweaveJwk(value: string): JWKInterface {
  const parsed = JSON.parse(value) as Partial<JWKInterface>;
  if (!parsed || typeof parsed.kty !== "string" || typeof parsed.e !== "string" || typeof parsed.n !== "string") {
    throw new Error("ARWEAVE_JWK is missing required fields");
  }
  return parsed as JWKInterface;
}

async function uploadToArweave(body: UploadBody): Promise<UploadResult> {
  if (!process.env.ARWEAVE_JWK) {
    throw new Error("ARWEAVE_JWK is not configured");
  }

  let jwk: JWKInterface;
  try {
    jwk = parseArweaveJwk(process.env.ARWEAVE_JWK);
  } catch {
    throw new Error("ARWEAVE_JWK is not valid JSON");
  }

  const arweave = Arweave.init({ host: "arweave.net", port: 443, protocol: "https" });
  const tx = await arweave.createTransaction({ data: body.html }, jwk);
  tx.addTag("Content-Type", "text/html; charset=utf-8");
  tx.addTag("App-Name", "skr-studio");
  tx.addTag("Domain", body.domain);
  tx.addTag("Template", body.templateId);

  await arweave.transactions.sign(tx, jwk);
  const uploadResult = await arweave.transactions.post(tx);
  if (uploadResult.status !== 200 && uploadResult.status !== 202) {
    throw new Error(`Arweave upload failed (${uploadResult.status})`);
  }

  const publicUrl = `https://arweave.net/${tx.id}`;
  return {
    contentUri: `ar://${tx.id}`,
    publicUrl,
    provider: "arweave",
    metadataRecords: {
      arweave: tx.id,
      url: publicUrl,
    },
  };
}

async function uploadToIpfs(body: UploadBody): Promise<UploadResult> {
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
    metadataRecords: {
      ipfs: cid,
      url: publicUrl,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<UploadBody>;
    if (!body.html || !body.domain || !body.templateId) {
      return NextResponse.json({ error: "html, domain, and templateId are required" }, { status: 400 });
    }

    const requestedProvider = body.provider === "arweave" || body.provider === "ipfs" ? body.provider : undefined;
    const provider = requestedProvider ?? resolveStorageProviderFromEnv(process.env);
    const result = provider === "arweave"
      ? await uploadToArweave(body as UploadBody)
      : await uploadToIpfs(body as UploadBody);

    return NextResponse.json(result);
  } catch (error) {
    const mapped = mapUploadError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
