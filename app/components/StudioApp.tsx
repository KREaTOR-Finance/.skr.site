"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
  fetchUnlockAccountState,
  preflightUnlockPurchase,
  signAndSendAtomicPublishTx,
  signAndSendUnlockTx,
  toUserFacingChainError,
} from "@/app/lib/chain";

const baseCustomization: TemplateCustomization = {
  headline: "Thomas",
  subtext: "Builder on Solana · Seeker",
  accentColor: "#00C9A7",
  emoji: "⚡",
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

type TemplateMockStat = { label: string; value: string };
type TemplateMockModule = { title: string; desc: string; state: string };
type TemplateMock = {
  title: string;
  subtitle: string;
  badge: string;
  image: string;
  stats: TemplateMockStat[];
  modules: TemplateMockModule[];
  cta: string;
};

const templateMocks: Partial<Record<ScreenId, TemplateMock>> = {
  socialhub: {
    title: "Social Hub",
    subtitle: "All channels, creator links, and collab CTA in one stacked profile.",
    badge: "Network Reach 24.8k",
    image: "/seeker/23e396f4-d235-44aa-88d2-76a447661e92.jpg",
    stats: [
      { label: "Links", value: "12 live" },
      { label: "Clicks", value: "2,486" },
      { label: "CTR", value: "18.4%" },
    ],
    modules: [
      { title: "Platform sections", desc: "Grouped links by social, creator, web3, and collab.", state: "Ready" },
      { title: "Featured CTA card", desc: "Prominent collaboration call-to-action block.", state: "Ready" },
      { title: "Live activity strip", desc: "Views, clicks, and links with mini trend bars.", state: "Ready" },
    ],
    cta: "Publish social hub",
  },
  shopstore: {
    title: "Shop / Store",
    subtitle: "Creator commerce layout with products, featured drop, and cart flow.",
    badge: "30d Volume ◎ 24.0",
    image: "/seeker/65d15055-54ce-4448-ae0c-81df21169c7b.jpg",
    stats: [
      { label: "Products", value: "6 listed" },
      { label: "Sales", value: "47" },
      { label: "Growth", value: "+18%" },
    ],
    modules: [
      { title: "Featured drop", desc: "Hero NFT card with timer, price, and mint progress.", state: "Ready" },
      { title: "Category filters", desc: "All, NFT, digital, and merch category tabs.", state: "Ready" },
      { title: "Cart and checkout", desc: "Floating cart button, line items, and checkout CTA.", state: "Ready" },
    ],
    cta: "Publish storefront",
  },
  creatorportfolio: {
    title: "Creator Portfolio",
    subtitle: "Project-first page with skills, media references, and hire CTA.",
    badge: "Featured Works 9",
    image: "/seeker/c1f20297-bc8f-432e-9109-52a156b33052.jpg",
    stats: [
      { label: "Projects", value: "9" },
      { label: "Mentions", value: "3 press" },
      { label: "Skill tags", value: "8" },
    ],
    modules: [
      { title: "Hero spotlight", desc: "Featured project card with tags and outbound action.", state: "Ready" },
      { title: "Masonry gallery", desc: "Multi-size project cards for visual storytelling.", state: "Ready" },
      { title: "Work with me", desc: "Hiring and collaboration action panel.", state: "Ready" },
    ],
    cta: "Publish portfolio",
  },
  calendarevents: {
    title: "Calendar & Events",
    subtitle: "Livestream countdown, event cards, and session booking modules.",
    badge: "Upcoming 4 events",
    image: "/seeker/7bacfb70-390e-4020-8f6e-14b4476ab332.jpg",
    stats: [
      { label: "Events", value: "4 active" },
      { label: "RSVP", value: "198" },
      { label: "Bookings", value: "6 slots" },
    ],
    modules: [
      { title: "Countdown hero", desc: "Live timer for the next stream event.", state: "Ready" },
      { title: "Event cards", desc: "Workshop, livestream, meetup, and AMA cards.", state: "Ready" },
      { title: "Booking flow", desc: "Selectable slots and paid/free session booking.", state: "Ready" },
    ],
    cta: "Publish events page",
  },
  healthfitness: {
    title: "Health & Fitness",
    subtitle: "Progress rings, workouts, nutrition tracking, and coach booking.",
    badge: "Streak 47 days",
    image: "/seeker/ae73a8c4-be73-4d6b-9d2c-c0c8853663d5.jpg",
    stats: [
      { label: "Workout plans", value: "3" },
      { label: "Calories", value: "2,340" },
      { label: "Coaches", value: "3" },
    ],
    modules: [
      { title: "Daily rings", desc: "Move, exercise, and stand progress indicators.", state: "Ready" },
      { title: "Weekly analytics", desc: "Steps and calories trend visual blocks.", state: "Ready" },
      { title: "Coach booking", desc: "Trainer cards and session booking sheet.", state: "Ready" },
    ],
    cta: "Publish fitness page",
  },
  daogovernance: {
    title: "DAO Governance",
    subtitle: "Treasury dashboards, proposals, votes, and delegation controls.",
    badge: "Treasury 24,847 SOL",
    image: "/seeker/cee457f5-fd04-4acd-bd4f-953053dcfaaf.jpg",
    stats: [
      { label: "Proposals", value: "5 active" },
      { label: "Voters", value: "340" },
      { label: "Quorum", value: "87%" },
    ],
    modules: [
      { title: "Treasury board", desc: "Fund allocation cards and progress bars.", state: "Ready" },
      { title: "Vote workflows", desc: "Proposal filters, vote sheet, and status chips.", state: "Ready" },
      { title: "Delegation controls", desc: "Delegate modal and council member listing.", state: "Ready" },
    ],
    cta: "Publish governance hub",
  },
  linkbio: {
    title: "Link-in-Bio+",
    subtitle: "Link stack, analytics, supporter feed, and SOL tip jar.",
    badge: "Page Views 8,247",
    image: "/seeker/f45801fe-0371-44bb-9403-37968e647454.jpg",
    stats: [
      { label: "Links", value: "6 active" },
      { label: "Tips", value: "47.2 SOL" },
      { label: "Supporters", value: "128" },
    ],
    modules: [
      { title: "Interactive stack", desc: "High-contrast links with click counters.", state: "Ready" },
      { title: "Media embeds", desc: "Video/audio/NFT preview blocks.", state: "Ready" },
      { title: "Tip flow", desc: "Amount selector and wallet confirmation sheet.", state: "Ready" },
    ],
    cta: "Publish link-in-bio",
  },
};

type EditableTemplateContent = {
  heroTitle: string;
  heroSubtitle: string;
  stats: TemplateMockStat[];
  modules: TemplateMockModule[];
  cta: string;
};

function createInitialTemplateInputs(): Record<string, EditableTemplateContent> {
  const initial: Record<string, EditableTemplateContent> = {};
  for (const template of templates) {
    const mock = templateMocks[template.screen];
    if (!mock) continue;
    initial[template.id] = {
      heroTitle: mock.title,
      heroSubtitle: mock.subtitle,
      stats: mock.stats.map((s) => ({ ...s })),
      modules: mock.modules.map((m) => ({ ...m })),
      cta: mock.cta,
    };
  }
  return initial;
}

const STORAGE_VERSION = 1;
const TEMPLATE_INPUTS_KEY = `skr:template-inputs:v${STORAGE_VERSION}`;
const PURCHASES_KEY = `skr:purchases:v${STORAGE_VERSION}`;
const MAINNET_RPC_URLS = (process.env.NEXT_PUBLIC_SOLANA_RPC_URLS ?? "https://api.mainnet-beta.solana.com")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

type StoredTemplateInputs = Record<string, Record<string, EditableTemplateContent>>;
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
  const [templateInputs, setTemplateInputs] = useState<Record<string, EditableTemplateContent>>(() => createInitialTemplateInputs());
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
      chains: ["solana:mainnet"],
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

  const selectedTemplateInput = useMemo(
    () => templateInputs[selectedTemplate.id],
    [templateInputs, selectedTemplate.id],
  );

  useEffect(() => {
    if (!wallet) return;
    const walletKey = wallet.publicKey.toBase58();
    const allInputs = readJsonSafe<StoredTemplateInputs>(TEMPLATE_INPUTS_KEY, {});
    const allPurchases = readJsonSafe<StoredPurchases>(PURCHASES_KEY, {});
    if (allInputs[walletKey]) {
      setTemplateInputs((prev) => ({ ...prev, ...allInputs[walletKey] }));
    }
    if (allPurchases[walletKey]) {
      setOwnedTemplateIds(allPurchases[walletKey]);
    }

    let cancelled = false;
    (async () => {
      setChainSyncing(true);
      try {
        const chainState = await fetchUnlockAccountState({
          rpcUrls: MAINNET_RPC_URLS,
          wallet: wallet.publicKey,
        });
        if (cancelled) return;
        setWalletUnlocked(chainState.unlocked);
        if (chainState.unlocked) {
          setOwnedTemplateIds((prev) => Array.from(new Set([...prev, ...premiumTemplateIds])));
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
    current[walletKey] = templateInputs;
    window.localStorage.setItem(TEMPLATE_INPUTS_KEY, JSON.stringify(current));
  }, [wallet, templateInputs]);

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

    setIsPublishing(true);
    try {
      const domain = `${customization.headline.toLowerCase().replace(/\s+/g, "")}.skr`;
      const extraSections = buildTemplateSections(selectedTemplateInput);
      const html = buildTemplateHtml(domain, selectedTemplate.title, customization, extraSections);
      const { contentHash, contentUri, publicUrl, metadataRecords } = await createContentUriAndHash(html, {
        domain,
        templateId: selectedTemplate.id,
      });

      const signature = await signAndSendAtomicPublishTx({
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
      if (selectedTemplate.premium) {
        setWalletUnlocked(true);
        setOwnedTemplateIds((prev) => Array.from(new Set([...prev, ...premiumTemplateIds])));
      }
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
      const preflight = await preflightUnlockPurchase({
        rpcUrls: MAINNET_RPC_URLS,
        wallet: wallet.publicKey,
      });
      if (!preflight.unlockedOnChain) {
        if (!preflight.tokenAccountExists) {
          setToast("SKR token account not found. Create/receive SKR first, then retry.");
          return;
        }
        if (!preflight.enoughBalance) {
          setToast(`Insufficient SKR. Need ${SKR_UNLOCK_AMOUNT_UI}, have ${preflight.uiBalance.toFixed(2)}.`);
          return;
        }
      }

      const signature = await signAndSendUnlockTx({
        rpcUrls: MAINNET_RPC_URLS,
        wallet,
        templateId,
      });

      try {
        const chainState = await fetchUnlockAccountState({
          rpcUrls: MAINNET_RPC_URLS,
          wallet: wallet.publicKey,
        });
        setWalletUnlocked(chainState.unlocked);
        if (chainState.unlocked) {
          setOwnedTemplateIds((ids) => Array.from(new Set([...ids, ...premiumTemplateIds])));
        }
      } catch {
        // Tx already confirmed. Keep UX unlocked and let background sync reconcile state.
        setWalletUnlocked(true);
        setOwnedTemplateIds((ids) => Array.from(new Set([...ids, ...premiumTemplateIds])));
      }
      setToast(`Premium unlocked via ${template.title} purchase (${SKR_UNLOCK_AMOUNT_UI} SKR). Tx: ${signature.slice(0, 8)}...`);
    } catch (error) {
      setToast(toUserFacingChainError(error));
    } finally {
      setIsPurchasing(false);
    }
  }

  function updateTemplateInput(
    templateId: string,
    updater: (current: EditableTemplateContent) => EditableTemplateContent,
  ) {
    setTemplateInputs((prev) => {
      const base = prev[templateId] ?? createInitialTemplateInputs()[templateId];
      if (!base) return prev;
      return { ...prev, [templateId]: updater(base) };
    });
  }

  const editorPanel = (
    <section className="panel card-glow">
      <h2>{selectedTemplate.title} Editor</h2>
      <p>{selectedTemplate.description}</p>

      {selectedTemplate.premium && !selectedTemplateOwned ? (
        <div className="panel locked-panel">
          <h3>Template Locked</h3>
          <p>Purchase this premium template to unlock custom fields and publishing.</p>
          <button className="btn btn-primary" onClick={() => handlePurchase(selectedTemplate.id)} disabled={isPurchasing}>
            {isPurchasing ? "Purchasing..." : `Purchase Template (${SKR_UNLOCK_AMOUNT_UI} SKR)`}
          </button>
        </div>
      ) : (
        <>
          <label className="field">
            Headline
            <input
              value={customization.headline}
              onChange={(e) => setCustomization((c) => ({ ...c, headline: e.target.value }))}
            />
          </label>
          <label className="field">
            Subtext
            <textarea
              value={customization.subtext}
              onChange={(e) => setCustomization((c) => ({ ...c, subtext: e.target.value }))}
            />
          </label>
          <div className="row">
            <label className="field compact">
              Accent
              <input
                type="color"
                value={customization.accentColor}
                onChange={(e) => setCustomization((c) => ({ ...c, accentColor: e.target.value }))}
              />
            </label>
            <label className="field compact">
              Emoji
              <input
                value={customization.emoji}
                onChange={(e) => setCustomization((c) => ({ ...c, emoji: e.target.value }))}
              />
            </label>
          </div>

          {selectedTemplateInput && (
            <div className="editor-group">
              <h3>Template Content</h3>
              <label className="field">
                Hero Title
                <input
                  value={selectedTemplateInput.heroTitle}
                  onChange={(e) =>
                    updateTemplateInput(selectedTemplate.id, (curr) => ({ ...curr, heroTitle: e.target.value }))
                  }
                />
              </label>
              <label className="field">
                Hero Subtitle
                <textarea
                  value={selectedTemplateInput.heroSubtitle}
                  onChange={(e) =>
                    updateTemplateInput(selectedTemplate.id, (curr) => ({ ...curr, heroSubtitle: e.target.value }))
                  }
                />
              </label>
              <div className="editor-grid">
                {selectedTemplateInput.stats.map((stat, idx) => (
                  <div key={idx} className="panel editor-card">
                    <label className="field">
                      Stat Label
                      <input
                        value={stat.label}
                        onChange={(e) =>
                          updateTemplateInput(selectedTemplate.id, (curr) => ({
                            ...curr,
                            stats: curr.stats.map((s, i) => (i === idx ? { ...s, label: e.target.value } : s)),
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      Stat Value
                      <input
                        value={stat.value}
                        onChange={(e) =>
                          updateTemplateInput(selectedTemplate.id, (curr) => ({
                            ...curr,
                            stats: curr.stats.map((s, i) => (i === idx ? { ...s, value: e.target.value } : s)),
                          }))
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
              <div className="editor-grid">
                {selectedTemplateInput.modules.map((module, idx) => (
                  <div key={idx} className="panel editor-card">
                    <label className="field">
                      Module Title
                      <input
                        value={module.title}
                        onChange={(e) =>
                          updateTemplateInput(selectedTemplate.id, (curr) => ({
                            ...curr,
                            modules: curr.modules.map((m, i) => (i === idx ? { ...m, title: e.target.value } : m)),
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      Description
                      <textarea
                        value={module.desc}
                        onChange={(e) =>
                          updateTemplateInput(selectedTemplate.id, (curr) => ({
                            ...curr,
                            modules: curr.modules.map((m, i) => (i === idx ? { ...m, desc: e.target.value } : m)),
                          }))
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
              <label className="field">
                Publish CTA Label
                <input
                  value={selectedTemplateInput.cta}
                  onChange={(e) =>
                    updateTemplateInput(selectedTemplate.id, (curr) => ({ ...curr, cta: e.target.value }))
                  }
                />
              </label>
            </div>
          )}

          <button className="btn btn-primary" onClick={() => goto("publish")}>Continue to Publish</button>
        </>
      )}
    </section>
  );

  return (
    <main className="studio-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={back} disabled={history.length === 0}>Back</button>
        <h1>{screenTitle[screen]}</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => goto("settings")}>Settings</button>
      </div>

      {screen === "splash" && (
        <section className="center-stack">
          <Image src="/brand/skr-logo.jpg" alt=".skr Studio chrome raven logo" width={170} height={170} className="hero-logo brand-logo" priority />
          <h2><span className="shimmer-text">.skr</span> Studio</h2>
          <p>Seeker-native pages. On-chain publish. Premium templates unlocked by SKR.</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => goto("art")}>Launch Studio</button>
            <button className="btn btn-ghost" onClick={() => nav("home")}>Skip Intro</button>
          </div>
        </section>
      )}

      {screen === "art" && (
        <section className="grid two">
          <article className="panel">
            <Image src="/seeker/image.jpg" alt="Art mood" width={420} height={520} className="cover" />
          </article>
          <article className="panel card-glow">
            <h2>Studio Direction</h2>
            <p>Chrome + teal-cyan visual language, motion-forward cards, and mobile-first layout optimized for Seeker users.</p>
            <button className="btn btn-primary" onClick={() => nav("home")}>Enter Dashboard</button>
          </article>
        </section>
      )}

      {screen === "home" && (
        <section className="grid two">
          <article className="panel card-glow">
            <h2>{customization.headline}<span className="shimmer-text">.skr</span></h2>
            <p>{customization.subtext}</p>
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
                <strong>{template.emoji} {template.title}</strong>
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

      {screen === "socialhub" && <TemplateMockScreen screenId="socialhub" templateInputs={templateInputs} ownedTemplateIds={ownedTemplateIds} isPurchasing={isPurchasing} onPurchase={handlePurchase} onEdit={() => goto("editor")} onPublish={() => goto("publish")} onAction={(m) => setToast(m)} />}
      {screen === "shopstore" && <TemplateMockScreen screenId="shopstore" templateInputs={templateInputs} ownedTemplateIds={ownedTemplateIds} isPurchasing={isPurchasing} onPurchase={handlePurchase} onEdit={() => goto("editor")} onPublish={() => goto("publish")} onAction={(m) => setToast(m)} />}
      {screen === "creatorportfolio" && <TemplateMockScreen screenId="creatorportfolio" templateInputs={templateInputs} ownedTemplateIds={ownedTemplateIds} isPurchasing={isPurchasing} onPurchase={handlePurchase} onEdit={() => goto("editor")} onPublish={() => goto("publish")} onAction={(m) => setToast(m)} />}
      {screen === "calendarevents" && <TemplateMockScreen screenId="calendarevents" templateInputs={templateInputs} ownedTemplateIds={ownedTemplateIds} isPurchasing={isPurchasing} onPurchase={handlePurchase} onEdit={() => goto("editor")} onPublish={() => goto("publish")} onAction={(m) => setToast(m)} />}
      {screen === "healthfitness" && <TemplateMockScreen screenId="healthfitness" templateInputs={templateInputs} ownedTemplateIds={ownedTemplateIds} isPurchasing={isPurchasing} onPurchase={handlePurchase} onEdit={() => goto("editor")} onPublish={() => goto("publish")} onAction={(m) => setToast(m)} />}
      {screen === "daogovernance" && <TemplateMockScreen screenId="daogovernance" templateInputs={templateInputs} ownedTemplateIds={ownedTemplateIds} isPurchasing={isPurchasing} onPurchase={handlePurchase} onEdit={() => goto("editor")} onPublish={() => goto("publish")} onAction={(m) => setToast(m)} />}
      {screen === "linkbio" && <TemplateMockScreen screenId="linkbio" templateInputs={templateInputs} ownedTemplateIds={ownedTemplateIds} isPurchasing={isPurchasing} onPurchase={handlePurchase} onEdit={() => goto("editor")} onPublish={() => goto("publish")} onAction={(m) => setToast(m)} />}
      {screen === "social" && <TemplateMockScreen screenId="socialhub" templateInputs={templateInputs} ownedTemplateIds={ownedTemplateIds} isPurchasing={isPurchasing} onPurchase={handlePurchase} onEdit={() => goto("editor")} onPublish={() => goto("publish")} onAction={(m) => setToast(m)} />}

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
            <li>Domain: {customization.headline.toLowerCase()}.skr</li>
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
          <button className="btn btn-primary" onClick={handlePublish} disabled={isPublishing || (selectedTemplate.premium && !selectedTemplateOwned)}>
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
          <h2>Publish Receipt</h2>
          <p>Your latest publish details will appear here after your wallet confirms the update.</p>
          {publishResult ? (
            <div className="stack mono">
              <span>Signature: {publishResult.signature}</span>
              <span>Hash: {publishResult.contentHash}</span>
              <a href={publishResult.publicUrl ?? publishResult.contentUri} target="_blank" rel="noreferrer" className="link-inline">Open uploaded content</a>
            </div>
          ) : (
            <p>No publish receipt yet.</p>
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

function buildTemplateSections(input?: EditableTemplateContent): string[] {
  if (!input) return [];
  const esc = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const stats = input.stats
    .filter((s) => s.label.trim() || s.value.trim())
    .map((s) => `<li><strong>${esc(s.label || "Metric")}:</strong> ${esc(s.value || "-")}</li>`)
    .join("");
  const modules = input.modules
    .filter((m) => m.title.trim() || m.desc.trim())
    .map((m) => `<li><strong>${esc(m.title || "Module")}:</strong> ${esc(m.desc || "-")}</li>`)
    .join("");

  return [
    `<section><h2>${esc(input.heroTitle)}</h2><p>${esc(input.heroSubtitle)}</p></section>`,
    `<section><h3>Stats</h3><ul>${stats}</ul></section>`,
    `<section><h3>Page sections</h3><ul>${modules}</ul></section>`,
    `<section><p><strong>CTA:</strong> ${esc(input.cta)}</p></section>`,
  ];
}

function TemplateMockScreen({
  screenId,
  templateInputs,
  ownedTemplateIds,
  isPurchasing,
  onPurchase,
  onEdit,
  onPublish,
  onAction,
}: {
  screenId: ScreenId;
  templateInputs: Record<string, EditableTemplateContent>;
  ownedTemplateIds: string[];
  isPurchasing: boolean;
  onPurchase: (templateId: string) => Promise<void> | void;
  onEdit: () => void;
  onPublish: () => void;
  onAction: (message: string) => void;
}) {
  const template = templates.find((t) => t.screen === screenId);
  const mock = template ? templateMocks[screenId] : undefined;
  if (!mock) return null;
  const locked = Boolean(template?.premium && !ownedTemplateIds.includes(template.id));
  const edit = template ? templateInputs[template.id] : undefined;

  const display = edit
    ? {
        ...mock,
        title: edit.heroTitle || mock.title,
        subtitle: edit.heroSubtitle || mock.subtitle,
        stats: edit.stats.length ? edit.stats : mock.stats,
        modules: edit.modules.length ? edit.modules : mock.modules,
        cta: edit.cta || mock.cta,
      }
    : mock;

  return (
    <section className="mock-shell">
      <article className="panel card-glow mock-hero">
        <Image src={display.image} alt={display.title} width={480} height={300} className="cover mock-cover" />
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
        <h3>What This Page Includes</h3>
        <div className="mock-module-list">
          {display.modules.map((m) => (
            <button key={m.title} className="mock-module" onClick={() => onAction(`${m.title} preview opened`)}>
              <div>
                <strong>{m.title}</strong>
                <p>{m.desc}</p>
              </div>
              <span className="chip">{m.state}</span>
            </button>
          ))}
        </div>
      </article>

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

      <article className="panel card-glow">
        <h3>{locked ? "Unlock This Template" : "Ready To Launch"}</h3>
        <p>
          {locked
            ? `Buy this premium template (${SKR_UNLOCK_AMOUNT_UI} SKR) to unlock editing and publishing.`
            : "This template is ready to edit, preview, and publish."}
        </p>
        <div className="row">
              {locked && template ? (
            <button className="btn btn-primary" onClick={() => onPurchase(template.id)} disabled={isPurchasing}>
              {isPurchasing ? "Purchasing..." : "Purchase Template"}
            </button>
          ) : (
            <>
              <button className="btn btn-primary" onClick={onEdit}>Open Editor</button>
              <button className="btn btn-ghost" onClick={onPublish}>{display.cta}</button>
            </>
          )}
        </div>
      </article>
    </section>
  );
}
