export type StorageProvider = "arweave" | "ipfs";

export interface UploadContentInput {
  html: string;
  domain: string;
  templateId: string;
  provider?: StorageProvider;
}

export interface UploadedContent {
  contentUri: string;
  publicUrl: string;
  contentHash: string;
  provider: StorageProvider;
  metadataRecords: Record<string, string>;
}

export interface UploadApiResponse {
  contentUri: string;
  publicUrl: string;
  provider: StorageProvider;
  metadataRecords: Record<string, string>;
}

export interface UploadErrorShape {
  status: number;
  message: string;
}

export function resolveStorageProviderFromEnv(env: Record<string, string | undefined>): StorageProvider {
  const explicit = (env.STORAGE_PROVIDER ?? "").toLowerCase();
  if (explicit === "arweave" || explicit === "ipfs") return explicit;
  if (env.ARWEAVE_JWK) return "arweave";
  return "ipfs";
}

export function mapUploadError(error: unknown): UploadErrorShape {
  const message = error instanceof Error ? error.message : "Upload failed";
  if (message.includes("required")) return { status: 400, message };
  if (message.includes("not configured") || message.includes("not valid JSON")) return { status: 500, message };
  if (message.includes("failed")) return { status: 502, message };
  return { status: 500, message };
}

export async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function uploadContent(input: UploadContentInput): Promise<UploadedContent> {
  const contentHash = await sha256Hex(input.html);
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Upload failed");
  }

  const parsed = (await response.json()) as Partial<UploadApiResponse>;
  if (!parsed.contentUri || !parsed.publicUrl || !parsed.provider || !parsed.metadataRecords) {
    throw new Error("Uploader returned invalid payload");
  }

  return {
    contentUri: parsed.contentUri,
    publicUrl: parsed.publicUrl,
    contentHash,
    provider: parsed.provider,
    metadataRecords: parsed.metadataRecords,
  };
}
