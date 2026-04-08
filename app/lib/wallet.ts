import { PublicKey, VersionedTransaction } from "@solana/web3.js";

type AnyRecord = Record<string, unknown>;

interface RawWalletProvider extends AnyRecord {
  publicKey?: { toString?: () => string } | string;
  connect?: () => Promise<unknown>;
  disconnect?: () => Promise<void>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}

export interface BrowserWalletAdapter {
  name: string;
  publicKey: PublicKey;
  signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction>;
  disconnect?: () => Promise<void>;
}

declare global {
  interface Window {
    solana?: AnyRecord;
    backpack?: AnyRecord;
    solflare?: AnyRecord;
  }
}

function toAdapter(name: string, provider: RawWalletProvider): BrowserWalletAdapter {
  if (typeof provider.signTransaction !== "function") {
    throw new Error(`${name} does not support signTransaction`);
  }
  return {
    name,
    publicKey: new PublicKey(String(provider.publicKey?.toString?.() ?? provider.publicKey)),
    signTransaction: (tx) => provider.signTransaction!(tx),
    disconnect: provider.disconnect,
  };
}

async function connectProvider(provider: RawWalletProvider): Promise<void> {
  if (typeof provider.connect === "function") {
    await provider.connect();
  }
}

export async function connectWallet(providerName: "Phantom" | "Backpack" | "Solflare"): Promise<BrowserWalletAdapter> {
  const provider: RawWalletProvider | undefined =
    providerName === "Backpack" ? window.backpack ?? window.solana :
    providerName === "Solflare" ? window.solflare :
    window.solana;

  if (!provider) throw new Error(`${providerName} wallet provider not found`);
  await connectProvider(provider);
  if (!provider.publicKey) throw new Error(`${providerName} failed to expose public key`);
  return toAdapter(providerName, provider);
}

export function walletAddressShort(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
