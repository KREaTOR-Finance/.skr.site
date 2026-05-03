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
import { TEMPLATE_CHANGE_FEE_SOL, templates, SKR_UNLOCK_AMOUNT_UI, premiumTemplateIds } from "@/app/lib/sharedSpec";
import type { PublishResult, ScreenId, TemplateCustomization } from "@/app/lib/types";
import { buildTemplateHtml, createContentUriAndHash } from "@/app/lib/publish";
import { connectWallet, walletAddressShort, type BrowserWalletAdapter } from "@/app/lib/wallet";
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
  preflightTemplatePurchase,
  signAndSendPublishTx,
  signAndSendPurchaseTx,
  toUserFacingChainError,
} from "@/app/lib/chain";

const baseCustomization: TemplateCustomization = {
  headline: "Thomas",
  subtext: "Builder on Solana · Seeker",
  accentColor: "#00C9A7",
  mark: "SKR",
  links: [
    { label: "X", url: "https://x.com" },
    { label: "Discord", url: "https://discord.com" },
  ],
};

const screenTitle: Record<ScreenId, string> = {
  splash: "Splash",
  art: "Art",
  home: "Home",
  wallet: "Wallet",
  profile: "Profile",
  settings: "Settings",
  social: "Social",
  templates: "Templates",
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

const STORAGE_VERSION = 2;
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
  return ["home", "templates", "wallet", "profile", "settings"].includes(screen);
}

export default function StudioApp() {
  const [screen, setScreen] = useState<ScreenId>("splash");
  const [history, setHistory] = useState<ScreenId[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("personal-bio");
  const [customization, setCustomization] = useState<TemplateCustomization>(baseCustomization);
  const [wallet, setWallet] = useState<BrowserWalletAdapter | null>(null);
  const [walletUnlocked, setWalletUnlocked] = useState(false);
  const [ownedTemplateIds, setOwnedTemplateIds] = useState<string[]>([]);
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, TemplateDraft>>(() => createInitialTemplateDrafts());
  const [chainSyncing, setChainSyncing] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    registerMwa({
      appIdentity: {
        name: ".skr Studio",
        uri: "https://skr.site",
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

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId],
  );

  const selectedTemplateOwned = !selectedTemplate.premium || ownedTemplateIds.includes(selectedTemplate.id);

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

  async function handleConnect(provider: "Phantom" | "Backpack" | "Solflare") {
    try {
      const connected = await connectWallet(provider);
      setWallet(connected);
      setToast(`${provider} connected`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Wallet connect failed");
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
    if (selectedTemplateErrors.length > 0) {
      setToast("Finish the required fields before publishing");
      return;
    }

    setIsPublishing(true);
    try {
      const domain = `${selectedTemplateDraft.headline.toLowerCase().replace(/[^a-z0-9-]/g, "")}.skr`;
      const html = buildTemplateHtml(domain, selectedTemplate.title, selectedTemplateDraft);
      const { contentHash, contentUri, publicUrl, metadataRecords } = await createContentUriAndHash(html, {
        domain,
        templateId: selectedTemplate.id,
      });

      const signature = await signAndSendPublishTx({
        rpcUrls: MAINNET_RPC_URLS,
        wallet,
        payload: {
          domain,
          templateId: selectedTemplate.id,
          contentHash,
          contentUri,
          isPremium: selectedTemplate.premium,
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
    const template = templates.find((t) => t.id === templateId);
    if (!template || !template.premium) {
      setToast("This template is free");
      return;
    }
    if (!wallet) {
      setToast("Connect wallet to purchase template");
      return;
    }
    if (ownedTemplateIds.includes(templateId)) {
      setToast("Template already purchased");
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
      setToast(`${template.title} unlocked for ${SKR_UNLOCK_AMOUNT_UI} SKR. Confirmation: ${signature.slice(0, 8)}...`);
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
      locked={Boolean(selectedTemplate.premium && !selectedTemplateOwned)}
      errors={selectedTemplateErrors}
      isPurchasing={isPurchasing}
      onPurchase={() => handlePurchase(selectedTemplate.id)}
      onDraftChange={updateTemplateDraft}
      onContinue={() => goto("publish")}
    />
  );

  function renderTemplatePanel(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return null;
    const draft = templateDrafts[templateId] ?? defaultDraftFor(templateId);
    const errors = validateDraft(draft);
    const locked = Boolean(template.premium && !ownedTemplateIds.includes(template.id));
    return (
      <TemplateRoutePanel
        template={template}
        draft={draft}
        locked={locked}
        errors={errors}
        isPurchasing={isPurchasing}
        onPurchase={() => handlePurchase(template.id)}
        onDraftChange={updateTemplateDraft}
        onContinue={() => {
          setSelectedTemplateId(template.id);
          goto("publish");
        }}
      />
    );
  }

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

      {screen === "splash" && (
        <section className="center-stack welcome-splash">
          <div className="welcome-logo-wrap">
            <Image src="/brand/skr-logo.jpg" alt=".skr Studio chrome raven logo" width={190} height={190} className="hero-logo brand-logo" priority />
          </div>
          <span className="welcome-kicker">Seeker identity studio</span>
          <h2><span className="shimmer-text">.skr</span> Studio</h2>
          <p>Your Solana identity, beautifully packaged for Seeker.</p>
          <div className="welcome-actions">
            <button className="btn btn-primary" onClick={() => nav("home")}>Start building</button>
            <a className="btn btn-ghost" href="/reverse">Find a .skr</a>
          </div>
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
            <button className="btn btn-primary" onClick={() => nav("home")}>Start building</button>
          </article>
        </section>
      )}

      {screen === "home" && (
        <section className="grid two">
          <article className="panel card-glow">
            <h2>{selectedTemplateDraft.headline}<span className="shimmer-text">.skr</span></h2>
            <p>{selectedTemplateDraft.subtext}</p>
            <div className="chip-row">
              <span className="chip">Solana</span>
              <span className="chip">Seeker ready</span>
              <span className="chip">Wallet approved</span>
            </div>
            <button className="btn btn-primary" onClick={() => nav("templates")}>Choose Template</button>
          </article>
          <article className="panel">
            <Image src="/seeker/image (1).jpg" alt="Hero" width={420} height={560} className="cover" />
          </article>
        </section>
      )}

      {screen === "templates" && (
        <section className="template-grid">
          {templates.map((template) => (
            <button
              key={template.id}
              className={`template-card ${selectedTemplateId === template.id ? "selected" : ""}`}
              onClick={() => {
                setSelectedTemplateId(template.id);
                goto(template.screen);
              }}
            >
              <Image src={template.image} alt={template.title} width={320} height={240} className="cover" />
              <div className="template-meta">
                <strong><span className="template-mark">{template.mark}</span> {template.title}</strong>
                <span>{template.description}</span>
                {template.premium ? (
                  ownedTemplateIds.includes(template.id) ? (
                    <small>Premium · Owned</small>
                  ) : (
                    <small>Premium · {SKR_UNLOCK_AMOUNT_UI} SKR one-time</small>
                  )
                ) : (
                  <small>Free</small>
                )}
              </div>
            </button>
          ))}
        </section>
      )}

      {screen === "socialhub" && renderTemplatePanel("social-hub")}
      {screen === "shopstore" && renderTemplatePanel("shop")}
      {screen === "creatorportfolio" && renderTemplatePanel("portfolio")}
      {screen === "calendarevents" && renderTemplatePanel("calendar")}
      {screen === "healthfitness" && renderTemplatePanel("health")}
      {screen === "daogovernance" && renderTemplatePanel("organization")}
      {screen === "linkbio" && renderTemplatePanel("link-in-bio")}
      {screen === "social" && renderTemplatePanel("social-hub")}

      {screen === "editor" && editorPanel}

      {screen === "wallet" && (
        <section className="grid two">
          <article className="panel card-glow">
            <h2>Wallet Connect</h2>
            <p>Connect your Solana wallet to buy templates and publish your .skr page.</p>
            <div className="stack">
              <button className="btn btn-primary" onClick={() => handleConnect("Phantom")}>Connect Phantom</button>
              <button className="btn btn-ghost" onClick={() => handleConnect("Backpack")}>Connect Backpack</button>
              <button className="btn btn-ghost" onClick={() => handleConnect("Solflare")}>Connect Solflare</button>
            </div>
            {wallet && (
              <div className="wallet-box">
                <strong>{wallet.name}</strong>
                <span>{walletAddressShort(wallet.publicKey.toBase58())}</span>
                <small>{walletUnlocked ? "Premium templates ready" : "Premium templates locked"}</small>
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
          <p>Choose a template, personalize it, and publish a public page for your .skr name.</p>
          <ul className="bullets">
            <li>Domain: {selectedTemplateDraft.headline.toLowerCase()}.skr</li>
            <li>Template: {selectedTemplate.title}</li>
            <li>Premium access: {walletUnlocked ? "ready" : "locked"}</li>
          </ul>
          <button className="btn btn-primary" onClick={() => nav("templates")}>Change Template</button>
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
            {selectedTemplate.premium
              ? selectedTemplateOwned
                ? `This update is ready. You will approve a small ${TEMPLATE_CHANGE_FEE_SOL} SOL update fee plus network fees.`
                : `Buy this template first for ${SKR_UNLOCK_AMOUNT_UI} SKR.`
              : "This free template is ready to publish."}
          </p>
          <div className="wallet-box">
            <span>Template: {selectedTemplate.title}</span>
            <span>Wallet: {wallet ? walletAddressShort(wallet.publicKey.toBase58()) : "Not connected"}</span>
            <span>Premium status: {selectedTemplateOwned ? "Unlocked" : "Locked"}</span>
          </div>
          {selectedTemplateErrors.length > 0 && (
            <div className="panel locked-panel">
              <strong>Before publishing</strong>
              <ul className="bullets">
                {selectedTemplateErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}
          <button className="btn btn-primary" onClick={handlePublish} disabled={isPublishing || selectedTemplateErrors.length > 0 || (selectedTemplate.premium && !selectedTemplateOwned)}>
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
            <button className="btn btn-ghost" onClick={() => nav("templates")}>Choose Another Template</button>
          </div>
        </section>
      )}

      {isCoreScreen(screen) && (
        <nav className="bottom-nav">
          <button className={screen === "home" ? "active" : ""} onClick={() => nav("home")}>Home</button>
          <button className={screen === "templates" ? "active" : ""} onClick={() => nav("templates")}>Templates</button>
          <button className={screen === "wallet" ? "active" : ""} onClick={() => nav("wallet")}>Wallet</button>
          <button className={screen === "profile" ? "active" : ""} onClick={() => nav("profile")}>Profile</button>
          <button className={screen === "settings" ? "active" : ""} onClick={() => nav("settings")}>Settings</button>
        </nav>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function TemplateRoutePanel({
  template,
  draft,
  locked,
  errors,
  isPurchasing,
  onPurchase,
  onDraftChange,
  onContinue,
}: {
  template: (typeof templates)[number];
  draft: TemplateDraft;
  locked: boolean;
  errors: string[];
  isPurchasing: boolean;
  onPurchase: () => Promise<void> | void;
  onDraftChange: (draft: TemplateDraft) => void;
  onContinue: () => void;
}) {
  const display = draftSummary(draft);
  return (
    <section className="mock-shell">
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

      <DraftLiveModules draft={draft} />

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

      {locked ? (
        <article className="panel card-glow">
          <h3>Unlock This Template</h3>
          <p>Buy this premium template once to customize and publish it from your wallet.</p>
          <button className="btn btn-primary" onClick={onPurchase} disabled={isPurchasing}>
            {isPurchasing ? "Purchasing..." : `Purchase Template (${SKR_UNLOCK_AMOUNT_UI} SKR)`}
          </button>
        </article>
      ) : (
        <>
          <StyleControls draft={draft} onDraftChange={onDraftChange} />
          <TemplateDraftEditor draft={draft} onDraftChange={onDraftChange} />
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
        </>
      )}
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
      <div className="row">
        <label className="field compact">
          Accent
          <input type="color" value={draft.themeAccent} onChange={(e) => onDraftChange(updateStyle(draft, { themeAccent: e.target.value }))} />
        </label>
        <label className="field compact">
          Profile mark
          <input value={draft.profileMark} onChange={(e) => onDraftChange(updateStyle(draft, { profileMark: e.target.value }))} />
        </label>
        <label className="field compact">
          Font
          <select value={draft.fontStyle} onChange={(e) => onDraftChange(updateStyle(draft, { fontStyle: e.target.value as TemplateDraft["fontStyle"] }))}>
            <option>Default</option>
            <option>Bold</option>
            <option>Italic</option>
          </select>
        </label>
      </div>
    </article>
  );
}

function TemplateDraftEditor({ draft, onDraftChange }: { draft: TemplateDraft; onDraftChange: (draft: TemplateDraft) => void }) {
  return (
    <article className="panel card-glow">
      <h3>Customize</h3>
      <CommonFields draft={draft} onDraftChange={onDraftChange} />
      {renderDraftFields(draft, onDraftChange)}
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

function renderDraftFields(draft: TemplateDraft, onDraftChange: (draft: TemplateDraft) => void) {
  switch (draft.templateId) {
    case "personal-bio":
      return <>
        <label className="field">About you<textarea value={draft.bio} onChange={(e) => onDraftChange({ ...draft, bio: e.target.value })} /></label>
        <EditableLinks title="Links" items={draft.links} onChange={(links) => onDraftChange({ ...draft, links })} />
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
