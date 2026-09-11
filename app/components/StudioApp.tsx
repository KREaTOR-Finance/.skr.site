"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from "@solana-mobile/wallet-standard-mobile";
import { TEMPLATE_CHANGE_FEE_SOL, templates, SKR_UNLOCK_AMOUNT_UI, premiumTemplateIds, STUDIO_TEMPLATE_ID, HTML_TEMPLATE_ID, STUDIO_TINTS, isHtmlEntitlementId } from "@/app/lib/sharedSpec";
import type { PublishResult, ScreenId, TemplateCustomization } from "@/app/lib/types";
import { buildTemplateHtml, createContentUriAndHash } from "@/app/lib/publish";
import { connectWallet, walletAddressShort, type BrowserWalletAdapter, type WalletProviderName } from "@/app/lib/wallet";
import {
  createInitialTemplateDrafts,
  defaultDraftFor,
  draftSummary,
  validateDraft,
  type CalendarDraft,
  type CoachItem,
  type DaoDraft,
  type EventItem,
  type HealthDraft,
  type LinkBioDraft,
  type LinkItem,
  type MetricItem,
  type ProductItem,
  type ProposalItem,
  type SessionItem,
  type ShopStoreDraft,
  type SupporterItem,
  type TemplateDraft,
  type WorkoutItem,
} from "@/app/lib/templateDrafts";
import {
  fetchTemplateEntitlementState,
  fetchSkrProgramLive,
  preflightTemplatePurchase,
  signAndSendPublishTx,
  signAndSendPurchaseTx,
  toUserFacingChainError,
} from "@/app/lib/chain";

const baseCustomization: TemplateCustomization = {
  headline: "",
  subtext: "Seeker ID",
  accentColor: "#00C9A7",
  mark: "SKR",
  links: [],
};

const screenTitle: Record<ScreenId, string> = {
  splash: "Splash",
  art: "Art",
  home: "Home",
  wallet: "Wallet",
  profile: "Profile",
  settings: "Settings",
  social: "Social",
  templates: "Studio",
  editor: "Editor",
  preview: "Preview",
  socialhub: "Social Hub",
  shopstore: "Shop",
  creatorportfolio: "Portfolio",
  calendarevents: "Calendar",
  healthfitness: "Health",
  daogovernance: "DAO",
  linkbio: "Link Bio",
  publish: "Publish",
};

const STORAGE_VERSION = 3;
const TEMPLATE_INPUTS_KEY = `skr:template-drafts:v${STORAGE_VERSION}`;
const PURCHASES_KEY = `skr:purchases:v${STORAGE_VERSION}`;
const MAINNET_RPC_URLS = (process.env.NEXT_PUBLIC_SOLANA_RPC_URLS ?? "https://api.mainnet-beta.solana.com")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
const SOLANA_CHAIN = process.env.NEXT_PUBLIC_SOLANA_CHAIN === "devnet" ? "solana:devnet" : "solana:mainnet";

type StoredTemplateInputs = Record<string, Record<string, TemplateDraft>>;
type StoredPurchases = Record<string, string[]>;

function readJsonSafe<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function isCoreScreen(screen: ScreenId): boolean {
  return ["templates", "wallet", "editor"].includes(screen);
}

export default function StudioApp() {
  const [screen, setScreen] = useState<ScreenId>("splash");
  const [history, setHistory] = useState<ScreenId[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(STUDIO_TEMPLATE_ID);
  const [customization, setCustomization] = useState<TemplateCustomization>(baseCustomization);
  const [wallet, setWallet] = useState<BrowserWalletAdapter | null>(null);
  const [walletUnlocked, setWalletUnlocked] = useState(false);
  const [programLive, setProgramLive] = useState(false);
  const [ownedTemplateIds, setOwnedTemplateIds] = useState<string[]>([]);
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, TemplateDraft>>(() => createInitialTemplateDrafts());
  const [chainSyncing, setChainSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [splashIntroDone, setSplashIntroDone] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    registerMwa({
      appIdentity: {
        name: ".skr Studio",
        uri: "https://skr.site",
        icon: "/icon.jpg",
      },
      authorizationCache: createDefaultAuthorizationCache(),
      chains: [SOLANA_CHAIN],
      chainSelector: createDefaultChainSelector(),
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const t = window.setTimeout(() => setSplashIntroDone(true), 15_000);
    return () => window.clearTimeout(t);
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId],
  );

  const selectedTemplateOwned = true;
  const htmlOwned = !programLive || ownedTemplateIds.some(isHtmlEntitlementId);

  const selectedTemplateDraft = useMemo(
    () => templateDrafts[selectedTemplate.id] ?? defaultDraftFor(selectedTemplate.id),
    [templateDrafts, selectedTemplate.id],
  );

  const selectedTemplateErrors = useMemo(
    () => validateDraft(selectedTemplateDraft),
    [selectedTemplateDraft],
  );

  useEffect(() => {
    if (!wallet) return;
    const walletKey = wallet.publicKey.toBase58();
    const allInputs = readJsonSafe<StoredTemplateInputs>(TEMPLATE_INPUTS_KEY, {});
    const allPurchases = readJsonSafe<StoredPurchases>(PURCHASES_KEY, {});
    if (allInputs[walletKey]) {
      setTemplateDrafts((prev) => ({ ...prev, ...allInputs[walletKey] }));
    }
    if (allPurchases[walletKey]) {
      setOwnedTemplateIds(allPurchases[walletKey]);
    }

    let cancelled = false;
    (async () => {
      setChainSyncing(true);
      try {
        const live = await fetchSkrProgramLive({ rpcUrls: MAINNET_RPC_URLS });
        if (cancelled) return;
        setProgramLive(live);
        if (!live) {
          setWalletUnlocked(true);
          return;
        }
        const premiumStates = await Promise.all(
          premiumTemplateIds.map(async (templateId) => ({
            templateId,
            state: await fetchTemplateEntitlementState({
              rpcUrls: MAINNET_RPC_URLS,
              wallet: wallet.publicKey,
              templateId,
            }),
          })),
        );
        if (cancelled) return;
        const purchased = premiumStates.filter((item) => item.state.purchased).map((item) => item.templateId);
        setWalletUnlocked(purchased.length > 0);
        if (purchased.length > 0) {
          setOwnedTemplateIds((prev) => Array.from(new Set([...prev, ...purchased])));
        }
      } catch {
        if (!cancelled) setToast("We could not check your template access");
      } finally {
        if (!cancelled) setChainSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("domain");
    if (!raw) return;
    const label = raw.replace(/\.skr$/i, "").toLowerCase();
    if (!/^[a-z0-9-]{1,64}$/.test(label)) return;
    setSelectedTemplateId(STUDIO_TEMPLATE_ID);
    setTemplateDrafts((prev) => {
      const current = (prev[STUDIO_TEMPLATE_ID] ?? defaultDraftFor(STUDIO_TEMPLATE_ID)) as Extract<TemplateDraft, { templateId: "studio" | "bring-your-own" | "personal-bio" }>;
      return { ...prev, [STUDIO_TEMPLATE_ID]: { ...current, templateId: "studio", headline: label } };
    });
  }, []);

  useEffect(() => {
    if (!wallet) return;
    const walletKey = wallet.publicKey.toBase58();
    const current = readJsonSafe<StoredPurchases>(PURCHASES_KEY, {});
    current[walletKey] = ownedTemplateIds;
    window.localStorage.setItem(PURCHASES_KEY, JSON.stringify(current));
  }, [wallet, ownedTemplateIds]);

  useEffect(() => {
    if (!wallet) return;
    const walletKey = wallet.publicKey.toBase58();
    const current = readJsonSafe<StoredTemplateInputs>(TEMPLATE_INPUTS_KEY, {});
    current[walletKey] = templateDrafts;
    window.localStorage.setItem(TEMPLATE_INPUTS_KEY, JSON.stringify(current));
  }, [wallet, templateDrafts]);

  function goto(next: ScreenId) {
    setHistory((h) => [...h, screen]);
    setScreen(next);
  }

  function nav(next: ScreenId) {
    setHistory([]);
    setScreen(next);
  }

  function back() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const next = h[h.length - 1];
      setScreen(next);
      return h.slice(0, -1);
    });
  }

  async function handleConnect(provider: WalletProviderName, next?: ScreenId) {
    setIsConnecting(true);
    try {
      const connected = await connectWallet(provider);
      setWallet(connected);
      setToast(`${connected.name} connected`);
      if (next) nav(next);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Wallet connect failed");
    } finally {
      setIsConnecting(false);
    }
  }

  async function handlePublish() {
    if (!wallet) {
      setToast("Connect a wallet first");
      return;
    }
    if (selectedTemplate.premium && !selectedTemplateOwned) {
      setToast("Purchase this template before publishing");
      return;
    }
    const usingHtml = Boolean((selectedTemplateDraft as { customHtml?: string }).customHtml?.trim());
    if (usingHtml && !htmlOwned) {
      setToast("Unlock custom HTML before publishing it");
      return;
    }
    if (selectedTemplateErrors.length > 0) {
      setToast("Finish the required fields before publishing");
      return;
    }

    setIsPublishing(true);
    try {
      const publishTemplateId = usingHtml ? HTML_TEMPLATE_ID : STUDIO_TEMPLATE_ID;
      const domain = `${selectedTemplateDraft.headline.toLowerCase().replace(/[^a-z0-9-]/g, "")}.skr`;
      const html = buildTemplateHtml(domain, selectedTemplate.title, selectedTemplateDraft);
      const { contentHash, contentUri, publicUrl, metadataRecords } = await createContentUriAndHash(html, {
        domain,
        templateId: publishTemplateId,
      });

      const signature = await signAndSendPublishTx({
        rpcUrls: MAINNET_RPC_URLS,
        wallet,
        payload: {
          domain,
          templateId: publishTemplateId,
          contentHash,
          contentUri,
          isPremium: usingHtml,
          metadata: {
            source: "skr-studio-v2",
            template: selectedTemplate.id,
            url: publicUrl,
            ...metadataRecords,
          },
        },
      });

      setPublishResult({ signature, contentHash, contentUri, publicUrl });
      setToast("Your .skr page is live");
      goto("preview");
    } catch (error) {
      setToast(toUserFacingChainError(error));
    } finally {
      setIsPublishing(false);
    }
  }

  async function handlePurchase(templateId: string) {
    if (!isHtmlEntitlementId(templateId)) {
      setToast("Card theme is free");
      return;
    }
    if (!wallet) {
      setToast(`Connect wallet to unlock custom HTML`);
      return;
    }
    if (ownedTemplateIds.includes(templateId)) {
      setToast("Custom HTML already unlocked");
      return;
    }
    if (isPurchasing) return;

    setIsPurchasing(true);
    try {
      const preflight = await preflightTemplatePurchase({
        rpcUrls: MAINNET_RPC_URLS,
        wallet: wallet.publicKey,
        templateId,
      });
      if (!preflight.purchasedOnChain) {
        if (!preflight.tokenAccountExists) {
          setToast("We could not find SKR in this wallet. Add SKR, then try again.");
          return;
        }
        if (!preflight.enoughBalance) {
          setToast(`Not enough SKR. Need ${SKR_UNLOCK_AMOUNT_UI}, have ${preflight.uiBalance.toFixed(2)}.`);
          return;
        }
      }

      const signature = await signAndSendPurchaseTx({
        rpcUrls: MAINNET_RPC_URLS,
        wallet,
        templateId,
      });

      try {
        const chainState = await fetchTemplateEntitlementState({
          rpcUrls: MAINNET_RPC_URLS,
          wallet: wallet.publicKey,
          templateId,
        });
        setWalletUnlocked(chainState.purchased);
        if (chainState.purchased) {
          setOwnedTemplateIds((ids) => Array.from(new Set([...ids, templateId])));
        }
      } catch {
        // Tx already confirmed. Keep UX unlocked and let background sync reconcile state.
        setWalletUnlocked(true);
        setOwnedTemplateIds((ids) => Array.from(new Set([...ids, templateId])));
      }
      setToast(`Custom HTML unlocked for ${SKR_UNLOCK_AMOUNT_UI} SKR. Confirmation: ${signature.slice(0, 8)}...`);
    } catch (error) {
      setToast(toUserFacingChainError(error));
    } finally {
      setIsPurchasing(false);
    }
  }

  function updateTemplateDraft(nextDraft: TemplateDraft) {
    setTemplateDrafts((prev) => ({ ...prev, [nextDraft.templateId]: nextDraft }));
  }

  const editorPanel = (
    <TemplateRoutePanel
      template={selectedTemplate}
      draft={selectedTemplateDraft}
      locked={false}
      htmlLocked={!htmlOwned}
      errors={selectedTemplateErrors}
      isPurchasing={isPurchasing}
      onPurchase={() => handlePurchase(HTML_TEMPLATE_ID)}
      onDraftChange={updateTemplateDraft}
      onContinue={() => goto("publish")}
    />
  );

  return (
    <main className="studio-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      {screen !== "splash" && (
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={back} disabled={history.length === 0}>Back</button>
          <h1>{screenTitle[screen]}</h1>
          <button className="btn btn-ghost btn-sm" onClick={() => goto("settings")}>Settings</button>
        </div>
      )}

      {screen === "splash" && !splashIntroDone && (
        <section className="open-bounce" onClick={() => setSplashIntroDone(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSplashIntroDone(true); }}>
          <div className="open-bounce-glow" />
          <Image src="/brand/skr-logo.jpg" alt=".skr" width={220} height={220} className="hero-logo brand-logo open-bounce-logo" priority />
        </section>
      )}

      {screen === "splash" && splashIntroDone && (
        <section className={`center-stack welcome-splash${isConnecting ? " is-connecting" : ""}`}>
          <div className="welcome-logo-wrap">
            <Image src="/brand/skr-logo.jpg" alt=".skr Studio chrome raven logo" width={190} height={190} className="hero-logo brand-logo" priority />
          </div>
          {!isConnecting && (
            <>
              <span className="welcome-kicker">Seeker ID</span>
              <h2><span className="shimmer-text">.skr</span> Studio</h2>
              <p>
                A .skr name gets a free Seeker ID card at name.skr.site — SKR totals, wallet, and a public page.
                Studio can theme that card. Custom HTML is optional.
              </p>
              <p>You can skip wallet connect to Find .skr users.</p>
              <div className="welcome-actions">
                <button className="btn btn-primary" onClick={() => handleConnect("Seed Vault", "editor")} disabled={isConnecting}>
                  Continue with Seed Vault
                </button>
                <a className="btn btn-ghost" href="https://skr.site/reverse">Find .skr users</a>
              </div>
            </>
          )}
        </section>
      )}

      {screen === "art" && (
        <section className="grid two">
          <article className="panel">
            <Image src="/seeker/image.jpg" alt="Art mood" width={420} height={520} className="cover" />
          </article>
          <article className="panel card-glow">
            <h2>Built for Seeker</h2>
            <p>Black glass, teal glow, chrome details, and mobile-first pages that feel at home on your device.</p>
            <button className="btn btn-primary" onClick={() => nav("home")}>Open Studio</button>
          </article>
        </section>
      )}

      {screen === "home" && (
        <section className="grid two">
          <article className="panel card-glow">
            <h2>{selectedTemplateDraft.headline.trim() || "your"}<span className="shimmer-text">.skr</span></h2>
            <p>{selectedTemplateDraft.subtext.trim() || "Seeker ID"}</p>
            <div className="chip-row">
              <span className="chip">Solana</span>
              <span className="chip">Seeker</span>
            </div>
            <button className="btn btn-primary" onClick={() => nav("editor")}>Open Studio</button>
          </article>
          <article className="panel">
            <Image src="/seeker/image (1).jpg" alt="Hero" width={420} height={560} className="cover" />
          </article>
        </section>
      )}

      {screen === "templates" && (
        <section className="grid two">
          <article className="panel card-glow">
            <span className="chip">Free card</span>
            <h2>Studio</h2>
            <p>Theme the Seeker ID card for free. Custom HTML is the only paid option ({SKR_UNLOCK_AMOUNT_UI} SKR once). Viewing any name.skr.site stays free.</p>
            {!programLive ? (
              <p>HTML payments live after the program is deployed to mainnet. You can still draft the card.</p>
            ) : null}
            <button className="btn btn-primary" onClick={() => nav("editor")}>Customize</button>
          </article>
          <article className="panel">
            <Image src="/seeker/image (1).jpg" alt="Studio" width={420} height={560} className="cover" />
          </article>
        </section>
      )}

      {screen === "editor" && editorPanel}

      {screen === "wallet" && (
        <section className="grid two">
          <article className="panel card-glow">
            <h2>Wallet Connect</h2>
            <p>Check in with Seed Vault through Solana Mobile Wallet Adapter. Android Chrome on Seeker.</p>
            {!isConnecting && (
              <div className="stack">
                <button className="btn btn-primary" onClick={() => handleConnect("Seed Vault")} disabled={isConnecting}>
                  Connect Seed Vault
                </button>
              </div>
            )}
            {wallet && (
              <div className="wallet-box">
                <strong>{wallet.name}</strong>
                <span>{walletAddressShort(wallet.publicKey.toBase58())}</span>
                <small>{!programLive ? "HTML payments live after program deploy" : htmlOwned ? "Custom HTML unlocked" : "Card theme free · HTML locked"}</small>
                <small>{chainSyncing ? "Checking your access..." : "Access checked"}</small>
              </div>
            )}
          </article>
          <article className="panel">
            <Image src="/brand/skr-logo.jpg" alt=".skr Studio wallet mark" width={420} height={560} className="cover brand-cover" />
          </article>
        </section>
      )}

      {screen === "profile" && (
        <section className="panel card-glow">
          <h2>Creator Profile</h2>
          <p>Theme your Seeker ID card, then publish it for your .skr name.</p>
          <ul className="bullets">
            <li>Domain: {selectedTemplateDraft.headline.toLowerCase()}.skr</li>
            <li>Card theme: free</li>
            <li>Custom HTML: {htmlOwned ? "unlocked" : "locked"}</li>
          </ul>
          <button className="btn btn-primary" onClick={() => nav("editor")}>Open Studio</button>
        </section>
      )}

      {screen === "settings" && (
        <section className="panel card-glow">
          <h2>Settings</h2>
          <p>Adjust the look of your Studio and manage your connected wallet.</p>
          <label className="field">
            Accent color
            <input
              type="color"
              value={customization.accentColor}
              onChange={(e) => setCustomization((c) => ({ ...c, accentColor: e.target.value }))}
            />
          </label>
          <button className="btn btn-ghost" onClick={() => nav("wallet")}>Wallet Settings</button>
        </section>
      )}

      {screen === "publish" && (
        <section className="panel card-glow">
          <div className="brand-kicker">
            <Image src="/brand/skr-logo.jpg" alt=".skr Studio" width={42} height={42} />
            <span>Ready for your .skr</span>
          </div>
          <h2>Publish Your Page</h2>
          <p>
            {(selectedTemplateDraft as { customHtml?: string }).customHtml?.trim()
              ? htmlOwned
                ? `Custom HTML is ready. You will approve a small ${TEMPLATE_CHANGE_FEE_SOL} SOL update fee plus network fees.`
                : `Unlock custom HTML first (${SKR_UNLOCK_AMOUNT_UI} SKR).`
              : "Your Seeker ID card theme is free to publish."}
          </p>
          <div className="wallet-box">
            <span>Page: Seeker ID card</span>
            <span>Wallet: {wallet ? walletAddressShort(wallet.publicKey.toBase58()) : "Not connected"}</span>
            <span>Custom HTML: {htmlOwned ? "Unlocked" : "Locked"}</span>
          </div>
          {selectedTemplateErrors.length > 0 && (
            <div className="panel locked-panel">
              <strong>Before publishing</strong>
              <ul className="bullets">
                {selectedTemplateErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}
          <button className="btn btn-primary" onClick={handlePublish} disabled={isPublishing || selectedTemplateErrors.length > 0 || (Boolean((selectedTemplateDraft as { customHtml?: string }).customHtml?.trim()) && !htmlOwned)}>
            {isPublishing ? "Publishing..." : "Review in Wallet"}
          </button>
          <button className="btn btn-ghost" onClick={() => goto("editor")}>Back to Editor</button>
        </section>
      )}

      {screen === "preview" && (
        <section className="panel card-glow">
          <div className="brand-kicker">
            <Image src="/brand/skr-logo.jpg" alt=".skr Studio" width={42} height={42} />
            <span>Published from .skr Studio</span>
          </div>
          <h2>Your page is ready</h2>
          <p>Your saved page details will appear here after your wallet approves the update.</p>
          {publishResult ? (
            <div className="stack mono">
              <span>Confirmation: {publishResult.signature}</span>
              <span>Page proof: {publishResult.contentHash}</span>
              <a href={publishResult.publicUrl ?? publishResult.contentUri} target="_blank" rel="noreferrer" className="link-inline">Open public page</a>
            </div>
          ) : (
            <p>Your published page will appear here after wallet approval.</p>
          )}
          <div className="row">
            <button className="btn btn-primary" onClick={() => nav("home")}>Go Home</button>
            <button className="btn btn-ghost" onClick={() => nav("editor")}>Back to Studio</button>
          </div>
        </section>
      )}

      {isCoreScreen(screen) && (
        <nav className="bottom-nav">
          <button className={screen === "templates" || screen === "editor" ? "active" : ""} onClick={() => nav("editor")}>Studio</button>
          <button className={screen === "wallet" ? "active" : ""} onClick={() => nav("wallet")}>Wallet</button>
          <a href="https://skr.site/reverse">Find</a>
        </nav>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function StudioCardPreview({ draft }: { draft: TemplateDraft }) {
  const photo = "photoUrl" in draft ? draft.photoUrl : "";
  const links = "links" in draft ? draft.links.filter((item) => item.label.trim()) : [];
  const html = "customHtml" in draft ? draft.customHtml?.trim() : "";
  return (
    <article className="panel card-glow seeker-id-card" style={{ borderColor: draft.themeAccent }}>
      <span className="chip">Preview</span>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="seeker-id-avatar" src={photo} alt="" />
      ) : (
        <div className="seeker-id-knot" aria-hidden="true" />
      )}
      <h2>{draft.headline || "your"}.skr</h2>
      <p>{draft.subtext || ("bio" in draft ? draft.bio : "") || "Seeker ID"}</p>
      {links.length ? (
        <div className="chip-row">
          {links.slice(0, 5).map((item) => (
            <span className="chip" key={`${item.label}-${item.url}`}>{item.label}</span>
          ))}
        </div>
      ) : null}
      {html ? <small className="seeker-id-updated">Custom HTML will replace this card</small> : <small className="seeker-id-updated">Live card theme</small>}
    </article>
  );
}

function TemplateRoutePanel({
  template,
  draft,
  locked,
  htmlLocked,
  errors,
  isPurchasing,
  onPurchase,
  onDraftChange,
  onContinue,
}: {
  template: (typeof templates)[number];
  draft: TemplateDraft;
  locked: boolean;
  htmlLocked: boolean;
  errors: string[];
  isPurchasing: boolean;
  onPurchase: () => Promise<void> | void;
  onDraftChange: (draft: TemplateDraft) => void;
  onContinue: () => void;
}) {
  const display = draftSummary(draft);
  const isCardStudio = draft.templateId === "studio" || draft.templateId === "bring-your-own" || draft.templateId === "personal-bio";
  void locked;
  return (
    <section className="mock-shell">
      {isCardStudio ? (
        <StudioCardPreview draft={draft} />
      ) : (
        <>
          <article className="panel card-glow mock-hero">
            <Image src={template.image} alt={template.title} width={480} height={300} className="cover mock-cover" />
            <div className="mock-overlay" />
            <div className="mock-content">
              <div className="chip">{display.badge}</div>
              <h2>{display.title}</h2>
              <p>{display.subtitle}</p>
            </div>
          </article>
          <div className="mock-stats">
            {display.stats.map((s, idx) => (
              <article key={s.label} className="panel">
                <div className="mock-stat-value">{s.value}</div>
                <div className="mock-stat-label">{s.label || `Stat ${idx + 1}`}</div>
              </article>
            ))}
          </div>
        </>
      )}

      {!isCardStudio ? (
        <article className="panel">
          <h3>What This Page Shows</h3>
          <div className="mock-module-list">
            {display.modules.map((m) => (
              <div key={m.title} className="mock-module">
                <div>
                  <strong>{m.title}</strong>
                  <p>{m.desc}</p>
                </div>
                <span className="chip">Included</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <DraftLiveModules draft={draft} />

      {!isCardStudio ? (
        <article className="panel">
          <h3>Activity Snapshot</h3>
          <div className="mock-bars">
            {[74, 88, 61, 93, 79, 68, 96].map((v, idx) => (
              <div key={idx} className="mock-bar-wrap">
                <div className="mock-bar" style={{ height: `${v}%` }} />
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <StyleControls draft={draft} onDraftChange={onDraftChange} />
      <TemplateDraftEditor draft={draft} htmlLocked={htmlLocked} onDraftChange={onDraftChange} onPurchase={onPurchase} isPurchasing={isPurchasing} />
      {errors.length > 0 && (
        <article className="panel locked-panel">
          <h3>Finish These Fields</h3>
          <ul className="bullets">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </article>
      )}
      <div className="row">
        <button className="btn btn-primary" onClick={onContinue} disabled={errors.length > 0}>{display.cta}</button>
      </div>
    </section>
  );
}

function DraftLiveModules({ draft }: { draft: TemplateDraft }) {
  switch (draft.templateId) {
    case "shop":
      return <ShopPreview draft={draft} />;
    case "calendar":
      return <CalendarPreview draft={draft} />;
    case "health":
      return <HealthPreview draft={draft} />;
    case "organization":
      return <DaoPreview draft={draft} />;
    case "link-in-bio":
      return <LinkBioPreview draft={draft} />;
    default:
      return null;
  }
}

function ShopPreview({ draft }: { draft: ShopStoreDraft }) {
  const [filter, setFilter] = useState("all");
  const [cart, setCart] = useState<ProductItem[]>([]);
  const products = draft.products.filter((item) => filter === "all" || item.category === filter);
  return (
    <article className="panel">
      <h3>Store Preview</h3>
      <p>Featured drop: {draft.featuredDrop.name} - {draft.featuredDrop.price}</p>
      <div className="chip-row">
        {["all", "nft", "digital", "merch"].map((cat) => (
          <button key={cat} className={`chip ${filter === cat ? "active" : ""}`} onClick={() => setFilter(cat)}>{cat}</button>
        ))}
      </div>
      <div className="mock-module-list">
        {products.map((product) => (
          <button key={`${product.name}-${product.price}`} className="mock-module" onClick={() => setCart((items) => [...items, product])}>
            <div><strong>{product.name}</strong><p>{product.price} - {product.category}</p></div>
            <span className="chip">Add</span>
          </button>
        ))}
      </div>
      <p>Cart: {cart.length} item{cart.length === 1 ? "" : "s"}</p>
    </article>
  );
}

function CalendarPreview({ draft }: { draft: CalendarDraft }) {
  const [slot, setSlot] = useState(draft.bookingSlots[0] ?? "");
  return (
    <article className="panel">
      <h3>{draft.livestreamTitle}</h3>
      <p>Starts in {draft.livestreamStartsIn}</p>
      <div className="mock-module-list">
        {draft.events.map((event) => (
          <div key={`${event.title}-${event.time}`} className="mock-module">
            <div><strong>{event.title}</strong><p>{event.time}</p></div>
            <span className="chip">{event.cta}</span>
          </div>
        ))}
      </div>
      <div className="chip-row">
        {draft.bookingSlots.map((item) => (
          <button key={item} className={`chip ${slot === item ? "active" : ""}`} onClick={() => setSlot(item)}>{item}</button>
        ))}
      </div>
    </article>
  );
}

function HealthPreview({ draft }: { draft: HealthDraft }) {
  const [running, setRunning] = useState(false);
  return (
    <article className="panel">
      <h3>Fitness Preview</h3>
      <div className="mock-stats">
        {draft.metrics.map((metric) => (
          <article key={metric.label} className="panel">
            <div className="mock-stat-value">{metric.value}</div>
            <div className="mock-stat-label">{metric.label}</div>
          </article>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => setRunning((v) => !v)}>{running ? "Pause timer" : "Start timer"}</button>
    </article>
  );
}

function DaoPreview({ draft }: { draft: DaoDraft }) {
  const [filter, setFilter] = useState("all");
  const proposals = draft.proposals.filter((item) => filter === "all" || item.category === filter);
  return (
    <article className="panel">
      <h3>Governance Preview</h3>
      <p>Treasury: {draft.treasury}</p>
      <div className="chip-row">
        {["all", "funding", "protocol", "election"].map((cat) => (
          <button key={cat} className={`chip ${filter === cat ? "active" : ""}`} onClick={() => setFilter(cat)}>{cat}</button>
        ))}
      </div>
      <div className="mock-module-list">
        {proposals.map((proposal) => (
          <div key={proposal.title} className="mock-module">
            <div><strong>{proposal.title}</strong><p>{proposal.category}</p></div>
            <span className="chip">{proposal.status}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function LinkBioPreview({ draft }: { draft: LinkBioDraft }) {
  const [range, setRange] = useState("7d");
  return (
    <article className="panel">
      <h3>Link Page Preview</h3>
      <div className="mock-module-list">
        {draft.links.map((link) => (
          <div key={`${link.label}-${link.url}`} className="mock-module">
            <div><strong>{link.label}</strong><p>{link.url}</p></div>
            <span className="chip">Open</span>
          </div>
        ))}
      </div>
      <div className="chip-row">
        {["7d", "30d", "all"].map((item) => (
          <button key={item} className={`chip ${range === item ? "active" : ""}`} onClick={() => setRange(item)}>{item}</button>
        ))}
      </div>
      <p>Showing {range.toUpperCase()} activity</p>
    </article>
  );
}

function StyleControls({ draft, onDraftChange }: { draft: TemplateDraft; onDraftChange: (draft: TemplateDraft) => void }) {
  return (
    <article className="panel">
      <h3>Style</h3>
      <div className="chip-row">
        {STUDIO_TINTS.map((tint) => (
          <button
            key={tint.id}
            type="button"
            className={`chip ${draft.themeAccent.toLowerCase() === tint.value.toLowerCase() ? "active" : ""}`}
            onClick={() => onDraftChange(updateStyle(draft, { themeAccent: tint.value }))}
          >
            {tint.label}
          </button>
        ))}
      </div>
      <div className="row">
        <label className="field compact">
          Profile mark
          <input value={draft.profileMark} onChange={(e) => onDraftChange(updateStyle(draft, { profileMark: e.target.value }))} />
        </label>
      </div>
    </article>
  );
}

function TemplateDraftEditor({
  draft,
  htmlLocked,
  onDraftChange,
  onPurchase,
  isPurchasing,
}: {
  draft: TemplateDraft;
  htmlLocked: boolean;
  onDraftChange: (draft: TemplateDraft) => void;
  onPurchase: () => Promise<void> | void;
  isPurchasing: boolean;
}) {
  return (
    <article className="panel card-glow">
      <h3>Customize</h3>
      <CommonFields draft={draft} onDraftChange={onDraftChange} />
      {renderDraftFields(draft, onDraftChange, { htmlLocked, onPurchase, isPurchasing })}
    </article>
  );
}

function KreationBuilder({
  draft,
  onDraftChange,
}: {
  draft: Extract<TemplateDraft, { templateId: "studio" | "bring-your-own" | "personal-bio" }>;
  onDraftChange: (draft: TemplateDraft) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/kreation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.headline,
          pitch: draft.subtext || draft.bio,
          photoUrl: draft.photoUrl ?? "",
          tint: draft.themeAccent,
          links: draft.links,
          prompt,
        }),
      });
      const data = (await res.json()) as { html?: string; error?: string };
      if (!res.ok || !data.html) throw new Error(data.error || "Generate failed");
      onDraftChange({ ...draft, customHtml: data.html });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="panel">
      <h3>Build from prompt</h3>
      <p>Your name, tagline, tint, photo, and links plus a custom site prompt. Generates a unique page. Preview here. Publish still uses the HTML unlock.</p>
      <label className="field">
        Site build prompt
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the page: layout, tone, sections, what should feel unique." />
      </label>
      <button className="btn btn-primary" type="button" onClick={generate} disabled={busy || !prompt.trim()}>
        {busy ? "Building..." : "Generate site"}
      </button>
      {error ? <p>{error}</p> : null}
      {draft.customHtml?.trim() ? (
        <iframe className="kreation-preview" title="Site preview" sandbox="" srcDoc={draft.customHtml} />
      ) : null}
    </article>
  );
}

function CommonFields({ draft, onDraftChange }: { draft: TemplateDraft; onDraftChange: (draft: TemplateDraft) => void }) {
  return (
    <>
      <label className="field">
        Page title
        <input value={draft.headline} onChange={(e) => onDraftChange({ ...draft, headline: e.target.value })} />
      </label>
      <label className="field">
        Short intro
        <textarea value={draft.subtext} onChange={(e) => onDraftChange({ ...draft, subtext: e.target.value })} />
      </label>
    </>
  );
}

function renderDraftFields(
  draft: TemplateDraft,
  onDraftChange: (draft: TemplateDraft) => void,
  html?: { htmlLocked: boolean; onPurchase: () => Promise<void> | void; isPurchasing: boolean },
) {
  switch (draft.templateId) {
    case "personal-bio":
    case "studio":
    case "bring-your-own":
      return <>
        <label className="field">Tagline<textarea value={draft.bio} onChange={(e) => onDraftChange({ ...draft, bio: e.target.value })} /></label>
        <label className="field">Photo URL<input value={draft.photoUrl ?? ""} onChange={(e) => onDraftChange({ ...draft, photoUrl: e.target.value })} /></label>
        <EditableLinks title="Links (up to 5)" items={draft.links.slice(0, 5)} onChange={(links) => onDraftChange({ ...draft, links: links.slice(0, 5) })} />
        <KreationBuilder draft={draft} onDraftChange={onDraftChange} />
        <label className="field">
          Custom HTML
          <textarea
            value={draft.customHtml ?? ""}
            disabled={html?.htmlLocked}
            onChange={(e) => onDraftChange({ ...draft, customHtml: e.target.value })}
            placeholder={html?.htmlLocked ? "Unlock to replace the card with your own HTML." : "Optional. Replaces the card body."}
          />
        </label>
        {html?.htmlLocked ? (
          <button className="btn btn-primary" type="button" onClick={html.onPurchase} disabled={html.isPurchasing}>
            {html.isPurchasing ? "Purchasing..." : `Unlock custom HTML (${SKR_UNLOCK_AMOUNT_UI} SKR)`}
          </button>
        ) : null}
      </>;
    case "social-hub":
      return <>
        <label className="field">Featured callout<input value={draft.featuredCta} onChange={(e) => onDraftChange({ ...draft, featuredCta: e.target.value })} /></label>
        <EditableLinks title="Social links" items={draft.socialLinks} onChange={(socialLinks) => onDraftChange({ ...draft, socialLinks })} />
        <EditableLinks title="Web3 links" items={draft.web3Links} onChange={(web3Links) => onDraftChange({ ...draft, web3Links })} />
        <EditableLinks title="Creator links" items={draft.creatorLinks} onChange={(creatorLinks) => onDraftChange({ ...draft, creatorLinks })} />
        <EditableMetrics title="Stats" items={draft.stats} onChange={(stats) => onDraftChange({ ...draft, stats })} />
      </>;
    case "shop":
      return <>
        <EditableProductCard title="Featured drop" item={draft.featuredDrop} onChange={(featuredDrop) => onDraftChange({ ...draft, featuredDrop })} />
        <label className="field">Drop timer<input value={draft.dropEndsIn} onChange={(e) => onDraftChange({ ...draft, dropEndsIn: e.target.value })} /></label>
        <EditableProducts items={draft.products} onChange={(products) => onDraftChange({ ...draft, products })} />
        <EditableMetrics title="Stats" items={draft.stats} onChange={(stats) => onDraftChange({ ...draft, stats })} />
      </>;
    case "calendar":
      return <>
        <label className="field">Livestream title<input value={draft.livestreamTitle} onChange={(e) => onDraftChange({ ...draft, livestreamTitle: e.target.value })} /></label>
        <label className="field">Livestream timer<input value={draft.livestreamStartsIn} onChange={(e) => onDraftChange({ ...draft, livestreamStartsIn: e.target.value })} /></label>
        <EditableEvents items={draft.events} onChange={(events) => onDraftChange({ ...draft, events })} />
        <EditableStringList title="Booking slots" items={draft.bookingSlots} onChange={(bookingSlots) => onDraftChange({ ...draft, bookingSlots })} />
        <EditableSessions items={draft.sessions} onChange={(sessions) => onDraftChange({ ...draft, sessions })} />
      </>;
    case "health":
      return <>
        <EditableWorkouts items={draft.workouts} onChange={(workouts) => onDraftChange({ ...draft, workouts })} />
        <EditableMetrics title="Metrics" items={draft.metrics} onChange={(metrics) => onDraftChange({ ...draft, metrics })} />
        <EditableCoaches items={draft.coaches} onChange={(coaches) => onDraftChange({ ...draft, coaches })} />
      </>;
    case "portfolio":
      return <>
        <label className="field">Contact button<input value={draft.contactCta} onChange={(e) => onDraftChange({ ...draft, contactCta: e.target.value })} /></label>
        <EditableLinks title="Projects" items={draft.projects} onChange={(projects) => onDraftChange({ ...draft, projects })} />
        <EditableLinks title="Press" items={draft.press} onChange={(press) => onDraftChange({ ...draft, press })} />
      </>;
    case "organization":
      return <>
        <label className="field">Treasury<input value={draft.treasury} onChange={(e) => onDraftChange({ ...draft, treasury: e.target.value })} /></label>
        <EditableProposals items={draft.proposals} onChange={(proposals) => onDraftChange({ ...draft, proposals })} />
        <EditableLinks title="Delegates" items={draft.delegates} onChange={(delegates) => onDraftChange({ ...draft, delegates })} />
      </>;
    case "link-in-bio":
      return <>
        <EditableLinks title="Links" items={draft.links} onChange={(links) => onDraftChange({ ...draft, links })} />
        <EditableStringList title="Tip amounts" items={draft.tipAmounts} onChange={(tipAmounts) => onDraftChange({ ...draft, tipAmounts })} />
        <EditableSupporters items={draft.supporters} onChange={(supporters) => onDraftChange({ ...draft, supporters })} />
        <EditableMetrics title="Analytics" items={draft.analytics} onChange={(analytics) => onDraftChange({ ...draft, analytics })} />
      </>;
  }
}

function EditableLinks({ title, items, onChange }: { title: string; items: LinkItem[]; onChange: (items: LinkItem[]) => void }) {
  return <EditableSection title={title} onAdd={() => onChange([...items, { label: "", url: "" }])}>
    {items.map((item, i) => (
      <RowEditor key={i} index={i} count={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onDelete={() => onChange(removeItem(items, i))}>
        <input value={item.label} placeholder="Label" onChange={(e) => onChange(updateItem(items, i, { ...item, label: e.target.value }))} />
        <input value={item.url} placeholder="Link or description" onChange={(e) => onChange(updateItem(items, i, { ...item, url: e.target.value }))} />
      </RowEditor>
    ))}
  </EditableSection>;
}

function EditableMetrics({ title, items, onChange }: { title: string; items: MetricItem[]; onChange: (items: MetricItem[]) => void }) {
  return <EditableSection title={title} onAdd={() => onChange([...items, { label: "", value: "" }])}>
    {items.map((item, i) => (
      <RowEditor key={i} index={i} count={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onDelete={() => onChange(removeItem(items, i))}>
        <input value={item.label} placeholder="Label" onChange={(e) => onChange(updateItem(items, i, { ...item, label: e.target.value }))} />
        <input value={item.value} placeholder="Value" onChange={(e) => onChange(updateItem(items, i, { ...item, value: e.target.value }))} />
      </RowEditor>
    ))}
  </EditableSection>;
}

function EditableProductCard({ title, item, onChange }: { title: string; item: ProductItem; onChange: (item: ProductItem) => void }) {
  return <EditableSection title={title}>
    <RowEditor index={0} count={1}>
      <input value={item.name} placeholder="Name" onChange={(e) => onChange({ ...item, name: e.target.value })} />
      <input value={item.price} placeholder="Price" onChange={(e) => onChange({ ...item, price: e.target.value })} />
      <input value={item.category} placeholder="Category" onChange={(e) => onChange({ ...item, category: e.target.value.toLowerCase() })} />
    </RowEditor>
  </EditableSection>;
}

function EditableProducts({ items, onChange }: { items: ProductItem[]; onChange: (items: ProductItem[]) => void }) {
  return <EditableSection title="Products" onAdd={() => onChange([...items, { name: "", price: "", category: "nft" }])}>
    {items.map((item, i) => (
      <RowEditor key={i} index={i} count={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onDelete={() => onChange(removeItem(items, i))}>
        <input value={item.name} placeholder="Name" onChange={(e) => onChange(updateItem(items, i, { ...item, name: e.target.value }))} />
        <input value={item.price} placeholder="Price" onChange={(e) => onChange(updateItem(items, i, { ...item, price: e.target.value }))} />
        <input value={item.category} placeholder="Category" onChange={(e) => onChange(updateItem(items, i, { ...item, category: e.target.value.toLowerCase() }))} />
      </RowEditor>
    ))}
  </EditableSection>;
}

function EditableEvents({ items, onChange }: { items: EventItem[]; onChange: (items: EventItem[]) => void }) {
  return <EditableSection title="Events" onAdd={() => onChange([...items, { title: "", time: "", cta: "RSVP" }])}>
    {items.map((item, i) => (
      <RowEditor key={i} index={i} count={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onDelete={() => onChange(removeItem(items, i))}>
        <input value={item.title} placeholder="Event title" onChange={(e) => onChange(updateItem(items, i, { ...item, title: e.target.value }))} />
        <input value={item.time} placeholder="Time" onChange={(e) => onChange(updateItem(items, i, { ...item, time: e.target.value }))} />
        <input value={item.cta} placeholder="Action" onChange={(e) => onChange(updateItem(items, i, { ...item, cta: e.target.value }))} />
      </RowEditor>
    ))}
  </EditableSection>;
}

function EditableStringList({ title, items, onChange }: { title: string; items: string[]; onChange: (items: string[]) => void }) {
  return <EditableSection title={title} onAdd={() => onChange([...items, ""])}>
    {items.map((item, i) => (
      <RowEditor key={i} index={i} count={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onDelete={() => onChange(removeItem(items, i))}>
        <input value={item} placeholder={title} onChange={(e) => onChange(updateItem(items, i, e.target.value))} />
      </RowEditor>
    ))}
  </EditableSection>;
}

function EditableSessions({ items, onChange }: { items: SessionItem[]; onChange: (items: SessionItem[]) => void }) {
  return <EditableSection title="Sessions" onAdd={() => onChange([...items, { name: "", price: "", duration: "" }])}>
    {items.map((item, i) => (
      <RowEditor key={i} index={i} count={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onDelete={() => onChange(removeItem(items, i))}>
        <input value={item.name} placeholder="Name" onChange={(e) => onChange(updateItem(items, i, { ...item, name: e.target.value }))} />
        <input value={item.price} placeholder="Price" onChange={(e) => onChange(updateItem(items, i, { ...item, price: e.target.value }))} />
        <input value={item.duration} placeholder="Duration" onChange={(e) => onChange(updateItem(items, i, { ...item, duration: e.target.value }))} />
      </RowEditor>
    ))}
  </EditableSection>;
}

function EditableWorkouts({ items, onChange }: { items: WorkoutItem[]; onChange: (items: WorkoutItem[]) => void }) {
  return <EditableSection title="Workouts" onAdd={() => onChange([...items, { name: "", duration: "", level: "" }])}>
    {items.map((item, i) => (
      <RowEditor key={i} index={i} count={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onDelete={() => onChange(removeItem(items, i))}>
        <input value={item.name} placeholder="Workout" onChange={(e) => onChange(updateItem(items, i, { ...item, name: e.target.value }))} />
        <input value={item.duration} placeholder="Duration" onChange={(e) => onChange(updateItem(items, i, { ...item, duration: e.target.value }))} />
        <input value={item.level} placeholder="Level" onChange={(e) => onChange(updateItem(items, i, { ...item, level: e.target.value }))} />
      </RowEditor>
    ))}
  </EditableSection>;
}

function EditableCoaches({ items, onChange }: { items: CoachItem[]; onChange: (items: CoachItem[]) => void }) {
  return <EditableSection title="Coaches" onAdd={() => onChange([...items, { name: "", session: "", price: "" }])}>
    {items.map((item, i) => (
      <RowEditor key={i} index={i} count={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onDelete={() => onChange(removeItem(items, i))}>
        <input value={item.name} placeholder="Coach" onChange={(e) => onChange(updateItem(items, i, { ...item, name: e.target.value }))} />
        <input value={item.session} placeholder="Session" onChange={(e) => onChange(updateItem(items, i, { ...item, session: e.target.value }))} />
        <input value={item.price} placeholder="Price" onChange={(e) => onChange(updateItem(items, i, { ...item, price: e.target.value }))} />
      </RowEditor>
    ))}
  </EditableSection>;
}

function EditableProposals({ items, onChange }: { items: ProposalItem[]; onChange: (items: ProposalItem[]) => void }) {
  return <EditableSection title="Proposals" onAdd={() => onChange([...items, { title: "", status: "Active", category: "funding" }])}>
    {items.map((item, i) => (
      <RowEditor key={i} index={i} count={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onDelete={() => onChange(removeItem(items, i))}>
        <input value={item.title} placeholder="Proposal" onChange={(e) => onChange(updateItem(items, i, { ...item, title: e.target.value }))} />
        <input value={item.status} placeholder="Status" onChange={(e) => onChange(updateItem(items, i, { ...item, status: e.target.value }))} />
        <input value={item.category} placeholder="Category" onChange={(e) => onChange(updateItem(items, i, { ...item, category: e.target.value.toLowerCase() }))} />
      </RowEditor>
    ))}
  </EditableSection>;
}

function EditableSupporters({ items, onChange }: { items: SupporterItem[]; onChange: (items: SupporterItem[]) => void }) {
  return <EditableSection title="Supporters" onAdd={() => onChange([...items, { name: "", amount: "" }])}>
    {items.map((item, i) => (
      <RowEditor key={i} index={i} count={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onDelete={() => onChange(removeItem(items, i))}>
        <input value={item.name} placeholder="Name" onChange={(e) => onChange(updateItem(items, i, { ...item, name: e.target.value }))} />
        <input value={item.amount} placeholder="Amount" onChange={(e) => onChange(updateItem(items, i, { ...item, amount: e.target.value }))} />
      </RowEditor>
    ))}
  </EditableSection>;
}

function EditableSection({ title, onAdd, children }: { title: string; onAdd?: () => void; children: ReactNode }) {
  return (
    <div className="editor-group">
      <div className="row">
        <h4>{title}</h4>
        {onAdd && <button className="btn btn-ghost btn-sm" onClick={onAdd}>Add row</button>}
      </div>
      <div className="editor-grid">{children}</div>
    </div>
  );
}

function RowEditor({
  index,
  count,
  onMove,
  onDelete,
  children,
}: {
  index: number;
  count: number;
  onMove?: (nextIndex: number) => void;
  onDelete?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="panel editor-card">
      {children}
      <div className="row">
        {onMove && <button className="btn btn-ghost btn-sm" onClick={() => onMove(index - 1)} disabled={index <= 0}>Up</button>}
        {onMove && <button className="btn btn-ghost btn-sm" onClick={() => onMove(index + 1)} disabled={index >= count - 1}>Down</button>}
        {onDelete && <button className="btn btn-ghost btn-sm" onClick={onDelete}>Delete</button>}
      </div>
    </div>
  );
}

function updateStyle(draft: TemplateDraft, patch: Partial<Pick<TemplateDraft, "themeAccent" | "fontStyle" | "profileMark">>): TemplateDraft {
  return { ...draft, ...patch } as TemplateDraft;
}

function updateItem<T>(items: T[], index: number, value: T): T[] {
  return items.map((item, i) => (i === index ? value : item));
}

function removeItem<T>(items: T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
