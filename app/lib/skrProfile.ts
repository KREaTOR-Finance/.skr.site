import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SKR_MINT } from "./sharedSpec";

const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";
const TOKEN_ACCOUNT_AMOUNT_OFFSET = 64;
const SKR_DIVISOR = 1_000_000;
const SHARE_PRECISION = 1_000_000_000n;
const PROFILE_TTL_MS = 12_000;
const COOLDOWN_SECONDS = 48 * 3600;

export const SKR_STAKING_PROGRAM_ID = "SKRskrmtL83pcL4YqLWt6iPefDqwXQWHSw9S9vz94BZ";
export const SKR_STAKE_CONFIG = "4HQy82s9CHTv1GsYKnANHMiHfhcqesYkK6sB3RDSYyqw";
export const SKR_DEFAULT_GUARDIAN = "DPJ58trLsF9yPrBa2pk6UaRkvqW8hWUYjawe788WBuqr";
export const SGT_MINT_AUTHORITY = "GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4";

const USER_STAKE_SHARES_OFFSET = 105;
const USER_STAKE_COST_BASIS_OFFSET = 121;
const USER_STAKE_UNSTAKING_OFFSET = 153;
const USER_STAKE_UNSTAKE_TIMESTAMP_OFFSET = 161;
const STAKE_CONFIG_SHARE_PRICE_OFFSET = 137;

export interface SkrProfile {
  wallet: string;
  liquid: number;
  staked: number;
  yieldEarned: number;
  unstaking: number;
  total: number;
  guardian: string | null;
  cooldownEndsAt: number | null;
  isSeeker: boolean;
  updatedAt: number;
  unavailable?: boolean;
}

const cache = new Map<string, { expires: number; value: SkrProfile }>();

function splitRpc(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function rpcUrls(): string[] {
  return Array.from(new Set([
    ...splitRpc(process.env.SOLANA_RPC_URLS),
    ...splitRpc(process.env.NEXT_PUBLIC_SOLANA_RPC_URLS),
    DEFAULT_RPC_URL,
  ]));
}

async function withRpc<T>(operation: (connection: Connection) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const url of rpcUrls()) {
    try {
      return await operation(new Connection(url, "confirmed"));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Solana lookup unavailable");
}

function readU128LE(data: Buffer, offset: number): bigint {
  const lo = data.readBigUInt64LE(offset);
  const hi = data.readBigUInt64LE(offset + 8);
  return lo + (hi << 64n);
}

function uiAmount(raw: bigint | number): number {
  const n = typeof raw === "bigint" ? Number(raw) : raw;
  return n / SKR_DIVISOR;
}

function deriveUserStakePda(user: PublicKey, guardian: PublicKey, config: PublicKey, program: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_stake"), config.toBuffer(), user.toBuffer(), guardian.toBuffer()],
    program,
  );
  return pda;
}

async function readLiquid(connection: Connection, wallet: PublicKey, mint: PublicKey): Promise<number> {
  for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
    const ata = getAssociatedTokenAddressSync(mint, wallet, false, programId);
    const info = await connection.getAccountInfo(ata, "confirmed");
    if (!info || info.data.length < TOKEN_ACCOUNT_AMOUNT_OFFSET + 8) continue;
    return uiAmount(Buffer.from(info.data).readBigUInt64LE(TOKEN_ACCOUNT_AMOUNT_OFFSET));
  }
  return 0;
}

async function readStake(
  connection: Connection,
  wallet: PublicKey,
): Promise<{ staked: number; yieldEarned: number; unstaking: number; guardian: string | null; cooldownEndsAt: number | null }> {
  const program = new PublicKey(SKR_STAKING_PROGRAM_ID);
  const config = new PublicKey(SKR_STAKE_CONFIG);
  const guardian = new PublicKey(SKR_DEFAULT_GUARDIAN);
  const pda = deriveUserStakePda(wallet, guardian, config, program);
  const [stakeInfo, configInfo] = await connection.getMultipleAccountsInfo([pda, config], "confirmed");
  if (!stakeInfo || stakeInfo.data.length < USER_STAKE_UNSTAKE_TIMESTAMP_OFFSET + 8 || !configInfo) {
    return { staked: 0, yieldEarned: 0, unstaking: 0, guardian: null, cooldownEndsAt: null };
  }

  const data = Buffer.from(stakeInfo.data);
  const shares = readU128LE(data, USER_STAKE_SHARES_OFFSET);
  const costBasis = readU128LE(data, USER_STAKE_COST_BASIS_OFFSET);
  const unstakingRaw = data.readBigUInt64LE(USER_STAKE_UNSTAKING_OFFSET);
  const unstakeTs = data.readBigInt64LE(USER_STAKE_UNSTAKE_TIMESTAMP_OFFSET);
  const sharePrice = readU128LE(Buffer.from(configInfo.data), STAKE_CONFIG_SHARE_PRICE_OFFSET);

  const deposited = shares === 0n ? 0n : (shares * costBasis) / SHARE_PRECISION;
  const current = shares === 0n ? 0n : (shares * sharePrice) / SHARE_PRECISION;
  const yieldRaw = current > deposited ? current - deposited : 0n;
  const unstaking = uiAmount(unstakingRaw);
  const cooldownEndsAt = unstakingRaw > 0n && unstakeTs > 0n
    ? Number(unstakeTs) + COOLDOWN_SECONDS
    : null;

  return {
    staked: uiAmount(current),
    yieldEarned: uiAmount(yieldRaw),
    unstaking,
    guardian: shares > 0n || unstakingRaw > 0n ? SKR_DEFAULT_GUARDIAN : null,
    cooldownEndsAt,
  };
}

async function readIsSeeker(connection: Connection, wallet: PublicKey): Promise<boolean> {
  try {
    const accounts = await connection.getParsedTokenAccountsByOwner(wallet, { programId: TOKEN_2022_PROGRAM_ID });
    const mints = accounts.value
      .filter((item) => Number(item.account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0) > 0)
      .map((item) => item.account.data.parsed?.info?.mint)
      .filter((mint): mint is string => Boolean(mint))
      .slice(0, 24);
    if (!mints.length) return false;
    const infos = await connection.getMultipleAccountsInfo(mints.map((m) => new PublicKey(m)), "confirmed");
    const authority = new PublicKey(SGT_MINT_AUTHORITY);
    return infos.some((info) => {
      if (!info || info.data.length < 36) return false;
      try {
        return new PublicKey(info.data.subarray(4, 36)).equals(authority);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export async function loadSkrProfile(walletAddress: string): Promise<SkrProfile> {
  const cached = cache.get(walletAddress);
  if (cached && cached.expires > Date.now()) return cached.value;

  const wallet = new PublicKey(walletAddress);
  const mint = new PublicKey(process.env.NEXT_PUBLIC_SKR_MINT?.trim() || SKR_MINT);

  const value = await withRpc(async (connection) => {
    const [liquid, stake, isSeeker] = await Promise.all([
      readLiquid(connection, wallet, mint),
      readStake(connection, wallet),
      readIsSeeker(connection, wallet),
    ]);
    const total = liquid + stake.staked + stake.unstaking;
    return {
      wallet: wallet.toBase58(),
      liquid,
      staked: stake.staked,
      yieldEarned: stake.yieldEarned,
      unstaking: stake.unstaking,
      total,
      guardian: stake.guardian,
      cooldownEndsAt: stake.cooldownEndsAt,
      isSeeker,
      updatedAt: Date.now(),
    } satisfies SkrProfile;
  });

  cache.set(walletAddress, { expires: Date.now() + PROFILE_TTL_MS, value });
  return value;
}

export function skrStatRows(profile: Pick<SkrProfile, "liquid" | "staked" | "yieldEarned" | "unstaking" | "guardian" | "cooldownEndsAt">): { label: string; value: string }[] {
  const unstaking = formatSkr(profile.unstaking);
  const cooldown = profile.cooldownEndsAt && profile.unstaking > 0 ? " (cooldown)" : "";
  return [
    { label: "Liquid", value: formatSkr(profile.liquid) },
    { label: "Staked", value: formatSkr(profile.staked) },
    { label: "Yield", value: formatSkr(profile.yieldEarned) },
    { label: "Unstaking", value: `${unstaking}${cooldown}` },
    { label: "Guardian", value: profile.guardian ? shortenWallet(profile.guardian) : "None" },
  ];
}

export function formatSkr(amount: number): string {
  if (!Number.isFinite(amount)) return "0";
  if (amount === 0) return "0";
  if (amount >= 1000) return amount.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function shortenWallet(wallet: string): string {
  if (wallet.length < 10) return wallet;
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}
