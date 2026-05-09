import {
  SolanaMobileWalletAdapterRemoteWalletName,
  SolanaMobileWalletAdapterWalletName,
} from "@solana-mobile/wallet-standard-mobile";
import { SolanaSignTransaction } from "@solana/wallet-standard-features";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { getWallets } from "@wallet-standard/app";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect } from "@wallet-standard/features";

type AnyRecord = Record<string, unknown>;
type WalletFeatureRecord = Record<string, unknown>;

interface RawWalletProvider extends AnyRecord {
  publicKey?: { toString?: () => string } | string;
  connect?: () => Promise<unknown>;
  disconnect?: () => Promise<void>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}

interface WalletStandardConnectFeature {
  connect: (input?: { silent?: boolean }) => Promise<{ accounts: readonly WalletAccount[] }>;
}

interface WalletStandardDisconnectFeature {
  disconnect: () => Promise<void>;
}

interface WalletStandardSignTransactionFeature {
  signTransaction: (
    ...inputs: ReadonlyArray<{ account: WalletAccount; chain?: string; transaction: Uint8Array }>
  ) => Promise<readonly { signedTransaction: Uint8Array }[]>;
}

export interface BrowserWalletAdapter {
  name: string;
  publicKey: PublicKey;
  signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction>;
  disconnect?: () => Promise<void>;
}

export type WalletProviderName = "Seed Vault" | "Phantom" | "Backpack" | "Solflare";

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

function getFeature<T>(wallet: Wallet, featureName: string): T | null {
  const feature = (wallet.features as WalletFeatureRecord)[featureName];
  return feature ? (feature as T) : null;
}

function pickSolanaChain(wallet: Wallet, account: WalletAccount): string | undefined {
  const accountChain = account.chains.find((chain) => chain.startsWith("solana:"));
  if (accountChain) return accountChain;
  return wallet.chains.find((chain) => chain.startsWith("solana:"));
}

function isWalletStandardSolanaWallet(wallet: Wallet): boolean {
  return Boolean(
    getFeature<WalletStandardConnectFeature>(wallet, StandardConnect) &&
    getFeature<WalletStandardSignTransactionFeature>(wallet, SolanaSignTransaction),
  );
}

function getWalletStandardSolanaWallets(): Wallet[] {
  return getWallets().get().filter(isWalletStandardSolanaWallet);
}

function findWalletStandardByName(providerName: Exclude<WalletProviderName, "Seed Vault">): Wallet | undefined {
  const lookups: Record<Exclude<WalletProviderName, "Seed Vault">, string[]> = {
    Phantom: ["phantom"],
    Backpack: ["backpack"],
    Solflare: ["solflare"],
  };
  const candidates = lookups[providerName];
  return getWalletStandardSolanaWallets().find((wallet) => {
    const normalized = wallet.name.toLowerCase();
    return candidates.some((candidate) => normalized.includes(candidate));
  });
}

function findSeedVaultWallet(): Wallet | undefined {
  const wallets = getWalletStandardSolanaWallets();
  return wallets.find((wallet) => (
    wallet.name === SolanaMobileWalletAdapterWalletName ||
    wallet.name === SolanaMobileWalletAdapterRemoteWalletName
  ));
}

async function connectWalletStandard(wallet: Wallet, nameOverride?: string): Promise<BrowserWalletAdapter> {
  const connectFeature = getFeature<WalletStandardConnectFeature>(wallet, StandardConnect);
  const signFeature = getFeature<WalletStandardSignTransactionFeature>(wallet, SolanaSignTransaction);
  const disconnectFeature = getFeature<WalletStandardDisconnectFeature>(wallet, StandardDisconnect);

  if (!connectFeature) throw new Error(`${wallet.name} does not support connect`);
  if (!signFeature) throw new Error(`${wallet.name} does not support signTransaction`);

  const connected = await connectFeature.connect();
  const account = connected.accounts[0] ?? wallet.accounts[0];
  if (!account) throw new Error(`${wallet.name} did not return an account`);
  const chain = pickSolanaChain(wallet, account);

  return {
    name: nameOverride ?? wallet.name,
    publicKey: new PublicKey(account.address),
    signTransaction: async (tx) => {
      const result = await signFeature.signTransaction({
        account,
        chain,
        transaction: tx.serialize(),
      });
      const signed = result[0]?.signedTransaction;
      if (!signed) throw new Error(`${wallet.name} did not return a signed transaction`);
      return VersionedTransaction.deserialize(Uint8Array.from(signed));
    },
    disconnect: disconnectFeature ? async () => disconnectFeature.disconnect() : undefined,
  };
}

export async function connectWallet(providerName: WalletProviderName): Promise<BrowserWalletAdapter> {
  if (providerName === "Seed Vault") {
    const seedVaultWallet = findSeedVaultWallet();
    if (!seedVaultWallet) {
      throw new Error("Seed Vault wallet not found. Open this page in a Solana Mobile wallet browser.");
    }
    return connectWalletStandard(seedVaultWallet, "Seed Vault");
  }

  const walletStandardMatch = findWalletStandardByName(providerName);
  if (walletStandardMatch) {
    return connectWalletStandard(walletStandardMatch);
  }

  if (typeof window === "undefined") {
    throw new Error("Wallet connection requires a browser context");
  }

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
