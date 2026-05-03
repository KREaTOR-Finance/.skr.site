import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getDomainKey, NameRecordHeader } from "@onsol/tldparser";
import {
  ANS_CREATE_DISCRIMINATOR_HEX,
  ANS_PROGRAM_ID,
  ANS_UPDATE_DISCRIMINATOR_HEX,
  DEFAULT_RECORD_SPACE,
  SKR_MINT,
  SKR_UNLOCK_AMOUNT_RAW,
  SKR_TREASURY,
} from "./sharedSpec";
import type { PublishPayload, WalletSession } from "./types";

const ANS_PROGRAM = new PublicKey(ANS_PROGRAM_ID);
const ANS_CREATE_DISCRIMINATOR = Buffer.from(ANS_CREATE_DISCRIMINATOR_HEX, "hex");
const ANS_UPDATE_DISCRIMINATOR = Buffer.from(ANS_UPDATE_DISCRIMINATOR_HEX, "hex");
const PURCHASE_TEMPLATE_DISCRIMINATOR = Buffer.from("d36cb785719a1440", "hex");
const RECORD_PUBLISH_DISCRIMINATOR = Buffer.from("c2261e78db6bdd7b", "hex");
const TEMPLATE_ENTITLEMENT_DISCRIMINATOR = Buffer.from("e0c994ff2b5ab407", "hex");
const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";
const DEFAULT_RPC_FALLBACKS = [DEFAULT_RPC_URL];
const TOKEN_ACCOUNT_AMOUNT_OFFSET = 64;

const SKR_PROGRAM_ERROR_BY_CODE: Record<number, string> = {
  6000: "Invalid SKR mint account",
  6001: "Invalid treasury account",
  6002: "Domain is too long",
  6003: "Template id is too long",
  6004: "Content URI is too long",
  6005: "This template does not require a purchase",
  6006: "Template access is missing or invalid",
  6007: "This template has not been purchased for this wallet",
};

function writeU64LE(buffer: Buffer, offset: number, value: number): void {
  const low = value >>> 0;
  const high = Math.floor(value / 0x100000000) >>> 0;
  buffer.writeUInt32LE(low, offset);
  buffer.writeUInt32LE(high, offset + 4);
}

function writeBorshString(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const out = Buffer.alloc(4 + bytes.length);
  out.writeUInt32LE(bytes.length, 0);
  bytes.copy(out, 4);
  return out;
}

function readProgramId(): PublicKey {
  const value = process.env.NEXT_PUBLIC_SKR_PROGRAM_ID?.trim();
  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SKR_PROGRAM_ID");
  }
  try {
    return new PublicKey(value);
  } catch {
    throw new Error("Invalid NEXT_PUBLIC_SKR_PROGRAM_ID");
  }
}

function readPublicKeyEnv(name: string, fallback: string): PublicKey {
  const value = process.env[name]?.trim() || fallback;
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`Invalid ${name}`);
  }
}

function readSkrMint(): PublicKey {
  return readPublicKeyEnv("NEXT_PUBLIC_SKR_MINT", SKR_MINT);
}

function readSkrTreasury(): PublicKey {
  return readPublicKeyEnv("NEXT_PUBLIC_SKR_TREASURY", SKR_TREASURY);
}

function normalizeRpcUrlList(rpcInput?: string | string[]): string[] {
  const direct = Array.isArray(rpcInput)
    ? rpcInput
    : rpcInput
      ? rpcInput.split(",")
      : [];
  const envList = (process.env.NEXT_PUBLIC_SOLANA_RPC_URLS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const merged = [...direct, ...envList, ...DEFAULT_RPC_FALLBACKS]
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((v) => {
      try {
        const parsed = new URL(v);
        if (parsed.protocol === "https:") return true;
        return parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
      } catch {
        return false;
      }
    });
  return Array.from(new Set(merged));
}

function isRetriableRpcError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error).toLowerCase();
  return [
    "429",
    "503",
    "504",
    "timeout",
    "network",
    "fetch failed",
    "socket",
    "blockhash not found",
    "node is behind",
    "connection",
    "temporarily unavailable",
  ].some((needle) => msg.includes(needle));
}

async function withRpcFailover<T>(
  rpcInput: string | string[] | undefined,
  operation: (connection: Connection, rpcUrl: string) => Promise<T>,
): Promise<T> {
  const urls = normalizeRpcUrlList(rpcInput);
  let lastError: unknown;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const connection = new Connection(url, "confirmed");
      return await operation(connection, url);
    } catch (error) {
      lastError = error;
      if (i === urls.length - 1 || !isRetriableRpcError(error)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("All RPC providers failed");
}

function parseProgramErrorCode(message: string): number | null {
  const hex = message.match(/custom program error:\s*(0x[0-9a-f]+)/i)?.[1];
  if (hex) return Number.parseInt(hex, 16);

  const dec = message.match(/custom program error:\s*([0-9]+)/i)?.[1];
  if (dec) return Number.parseInt(dec, 10);

  const anchorNum = message.match(/Error Number:\s*([0-9]+)/i)?.[1];
  if (anchorNum) return Number.parseInt(anchorNum, 10);

  return null;
}

export function toUserFacingChainError(error: unknown): string {
  const message = String((error as { message?: string })?.message ?? error ?? "Unknown wallet error");
  const lower = message.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("rejected the request") || lower.includes("denied")) {
    return "Wallet approval was cancelled";
  }
  if (lower.includes("insufficient funds for fee")) {
    return "Not enough SOL for network fees";
  }
  if (lower.includes("tokenaccountnotfounderror") || lower.includes("could not find account")) {
    return "We could not find SKR in this wallet";
  }
  if (lower.includes("blockhash not found")) {
    return "Network confirmation expired. Please try again";
  }

  const programCode = parseProgramErrorCode(message);
  if (programCode !== null && SKR_PROGRAM_ERROR_BY_CODE[programCode]) {
    return SKR_PROGRAM_ERROR_BY_CODE[programCode];
  }

  const firstLine = message.split("\n")[0]?.trim();
  return firstLine ? `We could not finish that approval: ${firstLine}` : "We could not finish that approval";
}

export function deriveTemplateEntitlementPda(wallet: PublicKey, templateId: string, programId = readProgramId()): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("entitlement"), wallet.toBuffer(), Buffer.from(templateId, "utf8")],
    programId,
  );
  return pda;
}

export function derivePublisherPda(wallet: PublicKey, programId = readProgramId()): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("publisher"), wallet.toBuffer()], programId);
  return pda;
}

export function deriveReceiptPda(wallet: PublicKey, contentHashHex: string, programId = readProgramId()): PublicKey {
  const hashBytes = Buffer.from(contentHashHex, "hex");
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("receipt"), wallet.toBuffer(), hashBytes], programId);
  return pda;
}

function encodeRecordPublishData(payload: PublishPayload): Buffer {
  const domain = writeBorshString(payload.domain);
  const templateId = writeBorshString(payload.templateId);
  const uri = writeBorshString(payload.contentUri);
  const hash = Buffer.from(payload.contentHash, "hex");
  if (hash.length !== 32) throw new Error("contentHash must be 32-byte hex");

  const out = Buffer.alloc(
    RECORD_PUBLISH_DISCRIMINATOR.length + domain.length + templateId.length + 32 + uri.length,
  );
  let off = 0;
  RECORD_PUBLISH_DISCRIMINATOR.copy(out, off); off += RECORD_PUBLISH_DISCRIMINATOR.length;
  domain.copy(out, off); off += domain.length;
  templateId.copy(out, off); off += templateId.length;
  hash.copy(out, off); off += 32;
  uri.copy(out, off);
  return out;
}

function encodePurchaseTemplateData(templateId: string): Buffer {
  const template = writeBorshString(templateId);
  const out = Buffer.alloc(PURCHASE_TEMPLATE_DISCRIMINATOR.length + template.length);
  PURCHASE_TEMPLATE_DISCRIMINATOR.copy(out, 0);
  template.copy(out, PURCHASE_TEMPLATE_DISCRIMINATOR.length);
  return out;
}

export function encodeAnsCreateData(hashedName: Buffer, space: number): Buffer {
  if (hashedName.length !== 32) throw new Error("ANS create requires 32-byte hashed name");
  if (space <= 0) throw new Error("record space must be positive");

  const out = Buffer.alloc(8 + 4 + 32 + 4 + 1 + 8);
  let off = 0;
  ANS_CREATE_DISCRIMINATOR.copy(out, off); off += 8;
  out.writeUInt32LE(32, off); off += 4;
  hashedName.copy(out, off); off += 32;
  out.writeUInt32LE(space, off); off += 4;
  out.writeUInt8(1, off); off += 1;
  writeU64LE(out, off, 0);
  return out;
}

export function encodeAnsUpdateData(hashedName: Buffer, value: Buffer): Buffer {
  if (hashedName.length !== 32) throw new Error("ANS update requires 32-byte hashed name");

  const out = Buffer.alloc(8 + 4 + 32 + 4 + 4 + value.length);
  let off = 0;
  ANS_UPDATE_DISCRIMINATOR.copy(out, off); off += 8;
  out.writeUInt32LE(32, off); off += 4;
  hashedName.copy(out, off); off += 32;
  out.writeUInt32LE(0, off); off += 4;
  out.writeUInt32LE(value.length, off); off += 4;
  value.copy(out, off);
  return out;
}

export function encodeRecordValue(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const out = Buffer.alloc(bytes.length + 1);
  bytes.copy(out, 0);
  out[out.length - 1] = 0;
  return out;
}

export function buildRecordEntries(payload: PublishPayload): Array<{ record: string; value: string }> {
  const metadata = payload.metadata ?? {};
  const entries: Array<{ record: string; value: string }> = [];

  const urlValue = metadata.url || payload.contentUri;
  entries.push({ record: "url", value: urlValue });
  entries.push({ record: "template", value: payload.templateId });

  if (metadata.arweave) entries.push({ record: "ARWV", value: metadata.arweave });
  if (metadata.ipfs) entries.push({ record: "IPFS", value: metadata.ipfs });
  if (metadata.pic) entries.push({ record: "pic", value: metadata.pic });

  return entries;
}

async function resolveParentOwner(connection: Connection, parent: PublicKey, owner: PublicKey): Promise<PublicKey> {
  const parentRecord = await NameRecordHeader.fromAccountAddress(connection, parent);
  if (!parentRecord?.owner) {
    throw new Error("Unable to resolve parent domain owner for ANS record create");
  }

  if (!parentRecord.owner.equals(owner)) {
    throw new Error("Wrapped or delegated domains are not supported in v1 record writer");
  }

  return parentRecord.owner;
}

export async function createAnsRecordWriteInstructions(params: {
  connection: Connection;
  owner: PublicKey;
  payload: PublishPayload;
  defaultRecordSpace?: number;
}): Promise<TransactionInstruction[]> {
  const { connection, owner, payload } = params;
  const defaultRecordSpace = params.defaultRecordSpace ?? DEFAULT_RECORD_SPACE;
  const instructions: TransactionInstruction[] = [];
  const entries = buildRecordEntries(payload);

  for (const entry of entries) {
    const keyResult = await getDomainKey(`${entry.record}.${payload.domain}`, true);
    const nameAccount = keyResult.pubkey;
    const parentName = keyResult.parent;
    const hashedName = Buffer.from(keyResult.hashed);
    const value = encodeRecordValue(entry.value);
    const space = Math.max(defaultRecordSpace, value.length + 64);

    const accountInfo = await connection.getAccountInfo(nameAccount, "confirmed");
    if (!accountInfo) {
      const parentOwner = await resolveParentOwner(connection, parentName, owner);
      instructions.push(new TransactionInstruction({
        programId: ANS_PROGRAM,
        keys: [
          { pubkey: owner, isSigner: true, isWritable: true },
          { pubkey: owner, isSigner: true, isWritable: false },
          { pubkey: nameAccount, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: parentName, isSigner: false, isWritable: false },
          { pubkey: parentOwner, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: encodeAnsCreateData(hashedName, space),
      }));
    }

    instructions.push(new TransactionInstruction({
      programId: ANS_PROGRAM,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: nameAccount, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: parentName, isSigner: false, isWritable: false },
      ],
      data: encodeAnsUpdateData(hashedName, value),
    }));
  }

  return instructions;
}

export function createRecordPublishIx(wallet: PublicKey, payload: PublishPayload, programId = readProgramId()): TransactionInstruction {
  const treasuryOwner = readSkrTreasury();
  const publisherPda = derivePublisherPda(wallet, programId);
  const receiptPda = deriveReceiptPda(wallet, payload.contentHash, programId);
  const keys = [
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: publisherPda, isSigner: false, isWritable: true },
    { pubkey: receiptPda, isSigner: false, isWritable: true },
    ...(payload.isPremium
      ? [{ pubkey: deriveTemplateEntitlementPda(wallet, payload.templateId, programId), isSigner: false, isWritable: false }]
      : []),
    { pubkey: treasuryOwner, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data: encodeRecordPublishData(payload),
  });
}

export function createPurchaseTemplateIx(wallet: PublicKey, templateId: string, programId = readProgramId()): TransactionInstruction {
  const mint = readSkrMint();
  const treasuryOwner = readSkrTreasury();
  const payerAta = getAssociatedTokenAddressSync(mint, wallet, false);
  const treasuryAta = getAssociatedTokenAddressSync(mint, treasuryOwner, true);
  const entitlementPda = deriveTemplateEntitlementPda(wallet, templateId, programId);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: entitlementPda, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: payerAta, isSigner: false, isWritable: true },
      { pubkey: treasuryAta, isSigner: false, isWritable: true },
      { pubkey: treasuryOwner, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodePurchaseTemplateData(templateId),
  });
}

interface WalletSigner {
  publicKey: PublicKey;
  signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction>;
}

export async function signAndSendPublishTx(params: {
  rpcUrl?: string;
  rpcUrls?: string[];
  wallet: WalletSigner;
  payload: PublishPayload;
}) {
  return withRpcFailover(params.rpcUrls ?? params.rpcUrl, async (connection) => {
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const publishIx = createRecordPublishIx(params.wallet.publicKey, params.payload);
    const recordIxs = await createAnsRecordWriteInstructions({
      connection,
      owner: params.wallet.publicKey,
      payload: params.payload,
    });

    const message = new TransactionMessage({
      payerKey: params.wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
        publishIx,
        ...recordIxs,
      ],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    const signed = await params.wallet.signTransaction(tx);
    const sig = await connection.sendTransaction(signed, { maxRetries: 3 });
    await connection.confirmTransaction(sig, "confirmed");
    return sig;
  });
}

export async function signAndSendPurchaseTx(params: {
  rpcUrl?: string;
  rpcUrls?: string[];
  wallet: WalletSigner;
  templateId: string;
}) {
  return withRpcFailover(params.rpcUrls ?? params.rpcUrl, async (connection) => {
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const purchaseIx = createPurchaseTemplateIx(params.wallet.publicKey, params.templateId);

    const message = new TransactionMessage({
      payerKey: params.wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        purchaseIx,
      ],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    const signed = await params.wallet.signTransaction(tx);
    const sig = await connection.sendTransaction(signed, { maxRetries: 3 });
    await connection.confirmTransaction(sig, "confirmed");
    return sig;
  });
}

export function isUnlockedByChain(wallet: WalletSession | null): boolean {
  return !!wallet?.unlocked;
}

export interface TemplateEntitlementState {
  templateId: string;
  purchased: boolean;
  purchasedAt: number;
  initialized: boolean;
}

export interface TemplatePurchasePreflight {
  purchasedOnChain: boolean;
  tokenAccountAddress: string;
  tokenAccountExists: boolean;
  rawBalance: string;
  uiBalance: number;
  requiredRaw: string;
  enoughBalance: boolean;
}

function readBorshString(data: Buffer, offset: number): { value: string; next: number } {
  const len = data.readUInt32LE(offset);
  const start = offset + 4;
  const end = start + len;
  return {
    value: data.slice(start, end).toString("utf8"),
    next: end,
  };
}

function parseTemplateEntitlementAccount(data: Buffer): TemplateEntitlementState {
  if (!data.subarray(0, 8).equals(TEMPLATE_ENTITLEMENT_DISCRIMINATOR)) {
    throw new Error("Template access account was not recognized");
  }
  let off = 8; // discriminator
  off += 32; // wallet
  const template = readBorshString(data, off);
  off = template.next;
  const purchased = data.readUInt8(off) === 1; off += 1;
  const purchasedAt = Number(data.readBigInt64LE(off)); off += 8;
  off += 1; // bump
  const initialized = data.readUInt8(off) === 1;
  return {
    templateId: template.value,
    purchased,
    purchasedAt,
    initialized,
  };
}

export async function fetchTemplateEntitlementState(params: {
  rpcUrl?: string;
  rpcUrls?: string[];
  wallet: PublicKey;
  templateId: string;
  programId?: PublicKey;
}): Promise<TemplateEntitlementState> {
  const programId = params.programId ?? readProgramId();
  return withRpcFailover(params.rpcUrls ?? params.rpcUrl, async (connection) => {
    const entitlementPda = deriveTemplateEntitlementPda(params.wallet, params.templateId, programId);
    const info = await connection.getAccountInfo(entitlementPda, "confirmed");
    if (!info?.data) {
      return {
        templateId: params.templateId,
        purchased: false,
        purchasedAt: 0,
        initialized: false,
      };
    }
    return parseTemplateEntitlementAccount(Buffer.from(info.data));
  });
}

export async function preflightTemplatePurchase(params: {
  rpcUrl?: string;
  rpcUrls?: string[];
  wallet: PublicKey;
  templateId: string;
}): Promise<TemplatePurchasePreflight> {
  const mint = readSkrMint();
  const requiredRaw = BigInt(SKR_UNLOCK_AMOUNT_RAW);

  return withRpcFailover(params.rpcUrls ?? params.rpcUrl, async (connection) => {
    const entitlementState = await fetchTemplateEntitlementState({
      rpcUrls: [connection.rpcEndpoint],
      wallet: params.wallet,
      templateId: params.templateId,
    });

    const tokenAccount = getAssociatedTokenAddressSync(mint, params.wallet, false);
    const ataInfo = await connection.getAccountInfo(tokenAccount, "confirmed");
    if (!ataInfo?.data) {
      return {
        purchasedOnChain: entitlementState.purchased,
        tokenAccountAddress: tokenAccount.toBase58(),
        tokenAccountExists: false,
        rawBalance: "0",
        uiBalance: 0,
        requiredRaw: requiredRaw.toString(),
        enoughBalance: entitlementState.purchased,
      };
    }

    let rawBalance = BigInt(0);
    if (ataInfo.data.length >= TOKEN_ACCOUNT_AMOUNT_OFFSET + 8) {
      rawBalance = Buffer.from(ataInfo.data).readBigUInt64LE(TOKEN_ACCOUNT_AMOUNT_OFFSET);
    }

    return {
      purchasedOnChain: entitlementState.purchased,
      tokenAccountAddress: tokenAccount.toBase58(),
      tokenAccountExists: true,
      rawBalance: rawBalance.toString(),
      uiBalance: Number(rawBalance) / 1_000_000,
      requiredRaw: requiredRaw.toString(),
      enoughBalance: entitlementState.purchased || rawBalance >= requiredRaw,
    };
  });
}
