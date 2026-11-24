"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from "@solana-mobile/wallet-standard-mobile";
import SiteFooter from "@/app/components/SiteFooter";
import { signAndSendAnsPublishTx, toUserFacingChainError } from "@/app/lib/chain";
import { createContentUriAndHash } from "@/app/lib/publish";
import { formatSkr, type SkrProfile } from "@/app/lib/skrProfile";
import {
  BLOCK_META,
  BLOCK_PAGE_TEMPLATE_ID,
  MAX_LINKS,
  TINTS,
  addBlock,
  addableTypes,
  applyPromptToBlocks,
  defaultCardBlocks,
  draftStorageKey,
  identityBlock,
  moveBlock,
  publicSiteUrl,
  readDraft,
  removeBlock,
  renderBlocksHtml,
  siteDomain,
  starterBlocks,
  updateBlock,
  validateBlocks,
  writeDraft,
  type PageStarter,
  type SiteBlock,
  type SiteLink,
} from "@/app/lib/siteBlocks";
import { connectWallet, walletAddressShort, type BrowserWalletAdapter } from "@/app/lib/wallet";

type StudioScreen = "start" | "editor" | "publish" | "receipt";
type EditorTab = "edit" | "preview";

const MAINNET_RPC_URLS = (process.env.NEXT_PUBLIC_SOLANA_RPC_URLS ?? "https://api.mainnet-beta.solana.com")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const SOLANA_CHAIN = process.env.NEXT_PUBLIC_SOLANA_CHAIN === "devnet" ? "solana:devnet" : "solana:mainnet";

const STARTERS: { id: PageStarter; chip: string; title: string; body: string }[] = [
  { id: "card", chip: "Recommended", title: "Start from your Seeker ID card", body: "Theme the card that’s already live — photo, tagline, links, tint — then add sections." },
  { id: "profile", chip: "Templates", title: "Profile page", body: "Identity, about, SKR totals, links, and socials." },
  { id: "links", chip: "Templates", title: "Links page", body: "A tight page of buttons, socials, and a call to action." },
  { id: "project", chip: "Templates", title: "Project page", body: "About, an image, and a main button for the work you’re showing." },
  { id: "shop", chip: "Templates", title: "Shop teaser", body: "A simple storefront teaser — not a full catalog." },
  { id: "event", chip: "Templates", title: "Event page", body: "A short announcement with a button to join or RSVP." },
  { id: "prompt", chip: "Prompt", title: "Describe the page", body: "Type what you want. Local preview is free. Grok stays an advanced option." },
];

export default function StudioApp() {
  const [screen, setScreen] = useState<StudioScreen>("start");
  const [tab, setTab] = useState<EditorTab>("edit");
  const [starter, setStarter] = useState<PageStarter>("card");
  const [blocks, setBlocks] = useState<SiteBlock[]>(() => defaultCardBlocks());
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [wallet, setWallet] = useState<BrowserWalletAdapter | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [receiptSignature, setReceiptSignature] = useState<string>("");
  const [profile, setProfile] = useState<SkrProfile | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);

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
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (draftHydrated) return;
    const params = new URLSearchParams(window.location.search);
    const domain = params.get("domain")?.replace(/\.skr$/i, "") ?? "";
    const walletKey = wallet?.publicKey.toBase58();
    const saved = readDraft(draftStorageKey(walletKey)) ?? readDraft(draftStorageKey());
    if (saved?.blocks?.length) {
      const named = domain
        ? saved.blocks.map((block) => (block.type === "identity" ? { ...block, name: domain } : block))
        : saved.blocks;
      setBlocks(named);
      setStarter(saved.starter ?? "card");
    } else if (domain) {
      setBlocks(defaultCardBlocks(domain));
    }
    setDraftHydrated(true);
  }, [wallet, draftHydrated]);

  useEffect(() => {
    if (!draftHydrated) return;
    writeDraft(draftStorageKey(wallet?.publicKey.toBase58()), { starter, blocks });
  }, [blocks, starter, wallet, draftHydrated]);

  useEffect(() => {
    if (!wallet) {
      setProfile(null);
      return;
    }
    const address = wallet.publicKey.toBase58();
    let cancelled = false;
    fetch(`/api/skr-profile?wallet=${address}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setProfile(data as SkrProfile);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const domain = useMemo(() => siteDomain(blocks), [blocks]);
  const errors = useMemo(() => validateBlocks(blocks), [blocks]);
  const previewHtml = useMemo(
    () => renderBlocksHtml(blocks, { wallet: wallet?.publicKey.toBase58() }),
    [blocks, wallet],
  );
  const canAdd = addableTypes(blocks);

  async function handleConnect(): Promise<boolean> {
    setIsConnecting(true);
    try {
      const connected = await connectWallet("Seed Vault");
      setWallet(connected);
      setToast("Seed Vault connected");
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Wallet connect failed");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }

  function beginStudio(nextStarter: PageStarter = starter) {
    const name = identityBlock(blocks).name;
    const keepDraft = nextStarter === starter && draftHydrated && blocks.length > 0;
    if (!keepDraft) {
      let nextBlocks = starterBlocks(nextStarter, name);
      if (nextStarter === "prompt" && prompt.trim()) {
        nextBlocks = applyPromptToBlocks(nextBlocks, prompt);
      }
      setBlocks(nextBlocks);
      setOpenBlockId(nextBlocks[0]?.id ?? null);
    } else if (nextStarter === "prompt" && prompt.trim()) {
      setBlocks((current) => applyPromptToBlocks(current, prompt, { name }));
    }
    setStarter(nextStarter);
    setTab("edit");
    setScreen("editor");
  }

  function applyPrompt() {
    if (!prompt.trim()) return;
    setBlocks((current) => applyPromptToBlocks(current, prompt, { name: identityBlock(current).name }));
    setToast("Updated your blocks from the prompt");
  }

  async function handlePublish() {
    if (errors.length) {
      setToast(errors[0]);
      return;
    }
    if (!wallet) {
      setToast("Connect Seed Vault on your Seeker to publish");
      return;
    }
    setIsPublishing(true);
    try {
      const html = renderBlocksHtml(blocks, { wallet: wallet.publicKey.toBase58() });
      const pageDomain = siteDomain(blocks);
      const uploaded = await createContentUriAndHash(html, {
        domain: pageDomain,
        templateId: BLOCK_PAGE_TEMPLATE_ID,
      });
      const signature = await signAndSendAnsPublishTx({
        rpcUrls: MAINNET_RPC_URLS,
        wallet,
        payload: {
          domain: pageDomain,
          templateId: BLOCK_PAGE_TEMPLATE_ID,
          contentUri: uploaded.contentUri,
          contentHash: uploaded.contentHash,
          isPremium: false,
          metadata: {
            source: "skr-studio-blocks-v1",
            template: BLOCK_PAGE_TEMPLATE_ID,
            url: uploaded.publicUrl,
            ...uploaded.metadataRecords,
            ...(identityBlock(blocks).photoUrl ? { pic: identityBlock(blocks).photoUrl } : {}),
          },
        },
      });
      setReceiptSignature(signature);
      setReceiptUrl(publicSiteUrl(blocks) || uploaded.publicUrl);
      setToast("Your .skr page is live");
      setScreen("receipt");
    } catch (error) {
      setToast(toUserFacingChainError(error));
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <main className={`studio-shell${isConnecting ? " mwa-active" : ""}`}>
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      {screen === "start" && (
        <section className="studio-start">
          <div className="welcome-logo-wrap">
            <Image src="/brand/skr-logo.jpg" alt=".skr Studio chrome raven logo" width={160} height={160} className="hero-logo brand-logo" priority />
          </div>
          <span className="welcome-kicker">SKR Studio</span>
          <h1>Build your site at name.skr.site</h1>
          <p className="lead">Your .skr is a public Seeker ID — and your own website. Start from the card that’s already yours.</p>

          <div className="starter-list">
            {STARTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`starter-card${starter === item.id ? " selected" : ""}`}
                onClick={() => setStarter(item.id)}
              >
                <span className="chip">{item.chip}</span>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </button>
            ))}
          </div>

          {starter === "prompt" && (
            <label className="field start-prompt">
              Describe the page
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="A short Seeker profile with my X link and a teal tint." />
            </label>
          )}

          <div className="welcome-actions">
            <button className="btn btn-primary" type="button" onClick={() => void handleConnect().then((ok) => { if (ok) beginStudio(); })} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Continue with Seed Vault"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => beginStudio()}>
              Preview without connecting
            </button>
          </div>
          <p className="fine-print">Publishing signs with Seed Vault on your Seeker. Drafts are saved on this device and work without a wallet.</p>
          <SiteFooter />
        </section>
      )}

      {screen === "editor" && (
        <section className="studio-editor">
          <header className="editor-top">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setScreen("start")}>Back</button>
            <strong>{domain || "your.skr"}</strong>
            <span className="tint-dots">
              {TINTS.map((tint) => (
                <button
                  key={tint.id}
                  type="button"
                  className="tint-dot"
                  style={{ background: tint.value }}
                  aria-label={tint.label}
                  onClick={() => {
                    const identity = identityBlock(blocks);
                    setBlocks(updateBlock(blocks, { ...identity, tint: tint.value }));
                  }}
                />
              ))}
            </span>
          </header>

          <div className="studio-tabs" role="tablist">
            <button type="button" className={tab === "edit" ? "on" : ""} onClick={() => setTab("edit")}>Edit</button>
            <button type="button" className={tab === "preview" ? "on" : ""} onClick={() => setTab("preview")}>Preview site</button>
          </div>

          {tab === "edit" && (
            <>
              <MiniPreview blocks={blocks} profile={profile} />
              <h3 className="block-heading">Blocks</h3>
              <div className="block-list">
                {blocks.map((block, index) => (
                  <article key={block.id} className={`block-item${openBlockId === block.id ? " open" : ""}`}>
                    <button type="button" className="block-item-head" onClick={() => setOpenBlockId(openBlockId === block.id ? null : block.id)}>
                      <span>
                        <strong>{BLOCK_META[block.type].title}</strong>
                        <small>{blockSummary(block, profile)}</small>
                      </span>
                    </button>
                    {block.type !== "identity" && (
                      <div className="block-move">
                        <button type="button" className="btn btn-ghost btn-sm" disabled={index <= 1} onClick={() => setBlocks(moveBlock(blocks, block.id, -1))}>Up</button>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={index >= blocks.length - 1} onClick={() => setBlocks(moveBlock(blocks, block.id, 1))}>Down</button>
                      </div>
                    )}
                    {openBlockId === block.id && (
                      <div className="block-body">
                        <BlockFields block={block} onChange={(next) => setBlocks(updateBlock(blocks, next))} />
                        {block.type !== "identity" && (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBlocks(removeBlock(blocks, block.id))}>Remove block</button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
              {canAdd.length > 0 && (
                <div className="add-block-row">
                  {canAdd.map((type) => (
                    <button key={type} type="button" className="btn btn-ghost btn-sm" onClick={() => setBlocks(addBlock(blocks, type))}>
                      + {BLOCK_META[type].title}
                    </button>
                  ))}
                </div>
              )}
              <label className="field prompt-line">
                Describe a change
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Make the tagline shorter and add https://x.com/you" />
              </label>
              <button className="btn btn-ghost" type="button" onClick={applyPrompt} disabled={!prompt.trim()}>Update blocks from prompt</button>
            </>
          )}

          {tab === "preview" && (
            <iframe className="site-preview-frame" title="Site preview" sandbox="allow-scripts" srcDoc={previewHtml} />
          )}

          <div className="studio-bar">
            <button className="btn btn-ghost" type="button" onClick={() => setTab(tab === "preview" ? "edit" : "preview")}>
              {tab === "preview" ? "Edit" : "Preview"}
            </button>
            <button className="btn btn-primary" type="button" onClick={() => setScreen("publish")}>
              Publish to {domain || "your.skr.site"}
            </button>
          </div>
        </section>
      )}

      {screen === "publish" && (
        <section className="panel card-glow publish-card">
          <span className="chip">Free block page</span>
          <h2>Publish {domain || "your.skr"}</h2>
          <p>Seed Vault will ask you to approve an AllDomains record update. This path does not use the custom SKR program.</p>
          <div className="wallet-box">
            <span>Page: block site at {domain || "your.skr.site"}</span>
            <span>Storage: Arweave or IPFS via the Studio uploader</span>
            <span>SKR unlock: not required</span>
            <span>Network fee: a small amount of SOL</span>
            <span>Wallet: {wallet ? walletAddressShort(wallet.publicKey.toBase58()) : "Not connected"}</span>
          </div>
          {errors.length > 0 && (
            <div className="panel locked-panel">
              <strong>Before publishing</strong>
              <ul className="bullets">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
            </div>
          )}
          {!wallet && (
            <button className="btn btn-primary" type="button" onClick={() => void handleConnect()} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect Seed Vault"}
            </button>
          )}
          <button className="btn btn-primary" type="button" onClick={() => void handlePublish()} disabled={isPublishing || errors.length > 0 || !wallet}>
            {isPublishing ? "Publishing..." : "Review in Seed Vault"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => setScreen("editor")}>Back to editor</button>
          <p className="fine-print">Custom HTML is a separate, paid advanced path and is not used here.</p>
        </section>
      )}

      {screen === "receipt" && (
        <section className="panel card-glow publish-card">
          <span className="chip">Live</span>
          <h2>Your page is live</h2>
          <p>Anyone can open your .skr site from this link.</p>
          <div className="wallet-box">
            <strong>{receiptUrl}</strong>
            {receiptSignature ? <span className="mono">Confirmation: {receiptSignature}</span> : null}
          </div>
          <div className="row">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={async () => {
                if (receiptUrl) await navigator.clipboard.writeText(receiptUrl);
                setToast("Link copied");
              }}
            >
              Copy link
            </button>
            {receiptUrl ? <a className="btn btn-primary" href={receiptUrl} target="_blank" rel="noreferrer">Open page</a> : null}
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => setScreen("editor")}>Back to editor</button>
        </section>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function blockSummary(block: SiteBlock, profile: SkrProfile | null): string {
  switch (block.type) {
    case "identity":
      return block.name ? `${block.name}.skr` : BLOCK_META.identity.hint;
    case "about":
      return block.text.trim() ? block.text.trim().slice(0, 48) : "Tap to add a short bio";
    case "links":
      return `${block.items.filter((item) => item.label || item.url).length} of ${MAX_LINKS}`;
    case "skr":
      return block.enabled
        ? (profile ? `${formatSkr(profile.total)} SKR · on` : "Live on-chain · on")
        : "Hidden";
    case "image":
      return block.url ? "Image added" : BLOCK_META.image.hint;
    case "cta":
      return block.label || BLOCK_META.cta.hint;
    case "socials":
      return `${block.items.filter((item) => item.label || item.url).length} of ${MAX_LINKS}`;
  }
}

function MiniPreview({ blocks, profile }: { blocks: SiteBlock[]; profile: SkrProfile | null }) {
  const identity = identityBlock(blocks);
  const about = blocks.find((block) => block.type === "about");
  const links = blocks.find((block) => block.type === "links");
  const skr = blocks.find((block) => block.type === "skr");
  const domain = siteDomain(blocks) || "your.skr";
  return (
    <article className="mini-preview panel card-glow" style={{ borderColor: identity.tint }}>
      {identity.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="seeker-id-avatar" src={identity.photoUrl} alt="" />
      ) : (
        <div className="seeker-id-knot" aria-hidden="true" />
      )}
      <span className="chip">{domain}</span>
      <h2>{identity.name || "your"}.skr</h2>
      <p>{identity.tagline || "Seeker ID"}</p>
      {skr?.type === "skr" && skr.enabled && (
        <div className="seeker-id-total">
          <strong>{profile ? formatSkr(profile.total) : "—"}</strong>
          <span>SKR</span>
        </div>
      )}
      {about?.type === "about" && about.text.trim() ? <p>{about.text}</p> : null}
      {links?.type === "links" && links.items.some((item) => item.label) && (
        <div className="preview-links">
          {links.items.filter((item) => item.label || item.url).slice(0, 5).map((item) => (
            <span key={`${item.label}-${item.url}`}>{item.label || item.url}</span>
          ))}
        </div>
      )}
    </article>
  );
}

function LinkEditor({ items, onChange }: { items: SiteLink[]; onChange: (items: SiteLink[]) => void }) {
  const rows = items.length < MAX_LINKS ? [...items, { label: "", url: "" }] : items;
  return (
    <div className="stack">
      {rows.slice(0, MAX_LINKS).map((item, index) => (
        <div className="row" key={`link-${index}`}>
          <label className="field compact">
            Label
            <input
              value={item.label}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...(next[index] ?? { label: "", url: "" }), label: event.target.value };
                onChange(next.filter((entry) => entry.label || entry.url));
              }}
            />
          </label>
          <label className="field compact">
            URL
            <input
              value={item.url}
              placeholder="https://"
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...(next[index] ?? { label: "", url: "" }), url: event.target.value };
                onChange(next.filter((entry) => entry.label || entry.url));
              }}
            />
          </label>
        </div>
      ))}
    </div>
  );
}

function BlockFields({ block, onChange }: { block: SiteBlock; onChange: (block: SiteBlock) => void }) {
  switch (block.type) {
    case "identity":
      return (
        <>
          <label className="field">
            .skr name
            <input value={block.name} onChange={(event) => onChange({ ...block, name: event.target.value.replace(/\.skr$/i, "") })} placeholder="yourname" />
          </label>
          <label className="field">
            Tagline
            <input value={block.tagline} onChange={(event) => onChange({ ...block, tagline: event.target.value })} />
          </label>
          <label className="field">
            Photo URL
            <input value={block.photoUrl} onChange={(event) => onChange({ ...block, photoUrl: event.target.value })} placeholder="https://" />
          </label>
        </>
      );
    case "about":
      return (
        <label className="field">
          About
          <textarea value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} />
        </label>
      );
    case "links":
      return <LinkEditor items={block.items} onChange={(items) => onChange({ ...block, items })} />;
    case "skr":
      return (
        <label className="skr-toggle">
          <input type="checkbox" checked={block.enabled} onChange={(event) => onChange({ ...block, enabled: event.target.checked })} />
          Show live SKR totals on the public page
        </label>
      );
    case "image":
      return (
        <>
          <label className="field">
            Image URL
            <input value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} placeholder="https://" />
          </label>
          <label className="field">
            Alt text
            <input value={block.alt} onChange={(event) => onChange({ ...block, alt: event.target.value })} />
          </label>
        </>
      );
    case "cta":
      return (
        <>
          <label className="field">
            Button label
            <input value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value })} />
          </label>
          <label className="field">
            Button link
            <input value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} placeholder="https://" />
          </label>
        </>
      );
    case "socials":
      return <LinkEditor items={block.items} onChange={(items) => onChange({ ...block, items })} />;
  }
}
