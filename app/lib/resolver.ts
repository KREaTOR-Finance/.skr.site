import { Connection, PublicKey } from "@solana/web3.js";
import { getDomainKey, NameRecordHeader, TldParser } from "@onsol/tldparser";
import { normalizeSkrLabel } from "./host";

const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";
const RECORDS_TO_READ = ["url", "Url", "template", "IPFS", "ARWV", "pic", "Pic"] as const;

export type ResolverStatus = "published" | "empty" | "invalid" | "error";

export interface ForwardResolution {
  status: ResolverStatus;
  domain: string;
  label: string;
  owner?: string;
  url?: string;
  template?: string;
  ipfs?: string;
  arweave?: string;
  picture?: string;
  message?: string;
}

export interface ReverseResolution {
  status: "found" | "empty" | "invalid" | "error";
  wallet: string;
  domain?: string;
  profileUrl?: string;
  domains: string[];
  message?: string;
}

function normalizeRpcUrlList(): string[] {
  const configured = (process.env.NEXT_PUBLIC_SOLANA_RPC_URLS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return Array.from(new Set([...configured, DEFAULT_RPC_URL]));
}

async function withRpc<T>(operation: (connection: Connection) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const url of normalizeRpcUrlList()) {
    try {
      return await operation(new Connection(url, "confirmed"));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Solana lookup unavailable");
}

function trimRecordValue(data?: Buffer): string | undefined {
  if (!data?.length) return undefined;
  const end = data.indexOf(0);
  const value = (end >= 0 ? data.subarray(0, end) : data).toString("utf8").trim();
  return value || undefined;
}

export function normalizeSkrDomain(input: string): { label: string; domain: string } | null {
  const label = normalizeSkrLabel(input);
  if (!label) return null;
  return { label, domain: `${label}.skr` };
}

export function publicProfileUrl(domain: string): string {
  return `https://${domain.replace(/\.skr$/, "")}.skr.site`;
}

async function readRecord(connection: Connection, domain: string, record: string): Promise<string | undefined> {
  const { pubkey } = await getDomainKey(`${record}.${domain}`, true);
  const accountInfo = await connection.getAccountInfo(pubkey, "confirmed");
  if (!accountInfo) return undefined;
  const nameRecord = NameRecordHeader.fromAccountInfo(accountInfo);
  return trimRecordValue(nameRecord.data);
}

function preferRecord(records: Record<string, string | undefined>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (records[key]) return records[key];
  }
  return undefined;
}

export async function resolveSkrDomain(input: string): Promise<ForwardResolution> {
  const normalized = normalizeSkrDomain(input);
  if (!normalized) {
    return {
      status: "invalid",
      label: input,
      domain: input,
      message: "That name does not look like a .skr name yet.",
    };
  }

  try {
    return await withRpc(async (connection) => {
      const domainKey = await getDomainKey(normalized.domain);
      const ownerRecord = await NameRecordHeader.fromAccountAddress(connection, domainKey.pubkey);
      if (!ownerRecord?.owner) {
        return {
          status: "empty",
          ...normalized,
          message: "This .skr has not published a page yet.",
        };
      }

      const pairs = await Promise.all(RECORDS_TO_READ.map(async (record) => [record, await readRecord(connection, normalized.domain, record)] as const));
      const records = Object.fromEntries(pairs);
      const url = preferRecord(records, "url", "Url");

      if (!url) {
        return {
          status: "empty",
          ...normalized,
          owner: ownerRecord.owner.toBase58(),
          template: records.template,
          message: "This .skr exists, but its public page is not published yet.",
        };
      }

      return {
        status: "published",
        ...normalized,
        owner: ownerRecord.owner.toBase58(),
        url,
        template: records.template,
        ipfs: records.IPFS,
        arweave: records.ARWV,
        picture: preferRecord(records, "pic", "Pic"),
      };
    });
  } catch {
    return {
      status: "error",
      ...normalized,
      message: "We could not reach the Solana name records. Please try again in a moment.",
    };
  }
}

export async function reverseResolveWallet(input: string): Promise<ReverseResolution> {
  let wallet: PublicKey;
  try {
    wallet = new PublicKey(input.trim());
  } catch {
    return {
      status: "invalid",
      wallet: input,
      domains: [],
      message: "That does not look like a Solana wallet address.",
    };
  }

  try {
    return await withRpc(async (connection) => {
      const parser = new TldParser(connection);
      const allDomains = await parser.getParsedAllUserDomainsFromTld(wallet, "skr").catch(() => []);
      const domains = allDomains.map((entry) => entry.domain).filter((domain) => domain.endsWith(".skr"));

      let primary = domains[0];
      try {
        const mainDomain = await parser.getMainDomain(wallet);
        if (mainDomain?.domain && mainDomain?.tld) {
          const candidate = `${mainDomain.domain}${mainDomain.tld.startsWith(".") ? mainDomain.tld : `.${mainDomain.tld}`}`;
          if (candidate.endsWith(".skr")) primary = candidate;
        }
      } catch {
        // If no primary is set, the owned .skr list is still useful for lookup.
      }

      if (!primary) {
        return {
          status: "empty",
          wallet: wallet.toBase58(),
          domains: [],
          message: "No .skr name was found for this wallet yet.",
        };
      }

      return {
        status: "found",
        wallet: wallet.toBase58(),
        domain: primary,
        profileUrl: publicProfileUrl(primary),
        domains,
      };
    });
  } catch {
    return {
      status: "error",
      wallet: wallet.toBase58(),
      domains: [],
      message: "We could not complete the wallet lookup. Please try again in a moment.",
    };
  }
}
