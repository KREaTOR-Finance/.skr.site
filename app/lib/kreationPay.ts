import { SKR_MINT, SKR_TREASURY, KREATION_GENERATE_SKR_RAW } from "./sharedSpec";
import { kreationPaymentMemo } from "./kreation";

type TokenBalance = {
  mint?: string;
  owner?: string;
  uiTokenAmount?: { amount?: string };
};

type ParsedIx = {
  program?: string;
  programId?: string;
  parsed?: unknown;
  data?: string;
};

export type ParsedPaymentTx = {
  meta?: {
    err?: unknown;
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
    innerInstructions?: Array<{ instructions?: ParsedIx[] }>;
    logMessages?: string[];
  } | null;
  transaction: {
    message: {
      accountKeys: Array<{ pubkey: string } | string>;
      instructions?: ParsedIx[];
    };
  };
};

function ownerAmount(balances: TokenBalance[] | undefined, owner: string, mint: string): bigint {
  return (balances ?? [])
    .filter((row) => row.mint === mint && row.owner === owner)
    .reduce((sum, row) => sum + BigInt(row.uiTokenAmount?.amount ?? "0"), 0n);
}

function payerKey(tx: ParsedPaymentTx): string {
  const first = tx.transaction.message.accountKeys[0];
  return typeof first === "string" ? first : first.pubkey;
}

function collectInstructions(tx: ParsedPaymentTx): ParsedIx[] {
  const outer = tx.transaction.message.instructions ?? [];
  const inner = (tx.meta?.innerInstructions ?? []).flatMap((group) => group.instructions ?? []);
  return [...outer, ...inner];
}

function memoText(tx: ParsedPaymentTx): string {
  const parts: string[] = [];
  for (const ix of collectInstructions(tx)) {
    if (typeof ix.parsed === "string") parts.push(ix.parsed);
    if (ix.parsed && typeof ix.parsed === "object") {
      const parsed = ix.parsed as { type?: string; info?: { memo?: string } };
      if (parsed.info?.memo) parts.push(parsed.info.memo);
    }
    if (ix.program === "spl-memo" && typeof ix.data === "string") parts.push(ix.data);
  }
  for (const line of tx.meta?.logMessages ?? []) {
    if (line.toLowerCase().includes("skr-kreation:")) parts.push(line);
  }
  return parts.join("\n");
}

export function evaluateKreationPayment(tx: ParsedPaymentTx, params: {
  wallet: string;
  prompt: string;
  mint?: string;
  treasury?: string;
  requiredRaw?: bigint;
}): { ok: true } | { ok: false; error: string } {
  if (tx.meta?.err) return { ok: false, error: "Payment transaction failed" };
  if (payerKey(tx) !== params.wallet) return { ok: false, error: "Payment wallet does not match" };

  const mint = params.mint ?? SKR_MINT;
  const treasury = params.treasury ?? SKR_TREASURY;
  const required = params.requiredRaw ?? BigInt(KREATION_GENERATE_SKR_RAW);
  const received = ownerAmount(tx.meta?.postTokenBalances, treasury, mint) - ownerAmount(tx.meta?.preTokenBalances, treasury, mint);
  const spent = ownerAmount(tx.meta?.preTokenBalances, params.wallet, mint) - ownerAmount(tx.meta?.postTokenBalances, params.wallet, mint);

  if (received < required) return { ok: false, error: "Payment is not 25 SKR to treasury" };
  if (spent < required) return { ok: false, error: "Payment did not spend 25 SKR from this wallet" };

  const expectedMemo = kreationPaymentMemo(params.prompt);
  if (!memoText(tx).includes(expectedMemo)) {
    return { ok: false, error: "Payment is not for this prompt. Generate again to pay 25 SKR." };
  }
  return { ok: true };
}
