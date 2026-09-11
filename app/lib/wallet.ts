import {
  SolanaMobileWalletAdapterRemoteWalletName,
  SolanaMobileWalletAdapterWalletName,
} from "@solana-mobile/wallet-standard-mobile";
import { SolanaSignTransaction } from "@solana/wallet-standard-features";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { getWallets } from "@wallet-standard/app";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";

type WalletFeatureRecord = Record<string, unknown>;

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

interface WalletStandardEventsFeature {
  on: (event: "change", listener: (properties: { accounts?: readonly WalletAccount[] }) => void) => () => void;
}

export interface BrowserWalletAdapter {
  name: string;
  publicKey: PublicKey;
  signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction>;
  disconnect?: () => Promise<void>;
}

export type WalletProviderName = "Seed Vault";

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

function findSeedVaultWallet(): Wallet | undefined {
  const wallets = getWallets().get().filter(isWalletStandardSolanaWallet);
  return wallets.find((wallet) => (
    wallet.name === SolanaMobileWalletAdapterWalletName ||
    wallet.name === SolanaMobileWalletAdapterRemoteWalletName ||
    wallet.name.toLowerCase().includes("mobile wallet adapter")
  ));
}

function firstAccount(wallet: Wallet, extra?: readonly WalletAccount[]): WalletAccount | undefined {
  return extra?.[0] ?? wallet.accounts[0];
}

async function waitForWalletAccount(
  wallet: Wallet,
  extra?: readonly WalletAccount[],
  timeoutMs = 12_000,
): Promise<WalletAccount> {
  const immediate = firstAccount(wallet, extra);
  if (immediate) return immediate;

  const events = getFeature<WalletStandardEventsFeature>(wallet, StandardEvents);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (account?: WalletAccount) => {
      if (settled || !account) return;
      settled = true;
      cleanup();
      resolve(account);
    };
    const onChange = (properties: { accounts?: readonly WalletAccount[] }) => {
      finish(properties.accounts?.[0] ?? firstAccount(wallet));
    };
    const off = events?.on("change", onChange);
    const poll = window.setInterval(() => finish(firstAccount(wallet)), 150);
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Seed Vault did not return an account. Approve in Seed Vault, then tap Connect again."));
    }, timeoutMs);
    function cleanup() {
      window.clearInterval(poll);
      window.clearTimeout(timer);
      off?.();
    }
  });
}

async function connectWalletStandard(wallet: Wallet, nameOverride?: string): Promise<BrowserWalletAdapter> {
  const connectFeature = getFeature<WalletStandardConnectFeature>(wallet, StandardConnect);
  const signFeature = getFeature<WalletStandardSignTransactionFeature>(wallet, SolanaSignTransaction);
  const disconnectFeature = getFeature<WalletStandardDisconnectFeature>(wallet, StandardDisconnect);

  if (!connectFeature) throw new Error(`${wallet.name} does not support connect`);
  if (!signFeature) throw new Error(`${wallet.name} does not support signTransaction`);

  const connected = await connectFeature.connect({ silent: false });
  const account = await waitForWalletAccount(wallet, connected.accounts);
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

let connectInFlight: Promise<BrowserWalletAdapter> | null = null;

export async function connectWallet(_providerName: WalletProviderName = "Seed Vault"): Promise<BrowserWalletAdapter> {
  if (connectInFlight) return connectInFlight;

  connectInFlight = (async () => {
    const seedVaultWallet = findSeedVaultWallet();
    if (!seedVaultWallet) {
      throw new Error("Seed Vault is not available. Open https://skr.site in Chrome on Seeker.");
    }
    return connectWalletStandard(seedVaultWallet, "Seed Vault");
  })().finally(() => {
    connectInFlight = null;
  });

  return connectInFlight;
}

export function walletAddressShort(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
