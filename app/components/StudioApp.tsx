"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from "@solana-mobile/wallet-standard-mobile";
import { signAndSendAnsPublishTx, toUserFacingChainError } from "@/app/lib/chain";
import { formatSkr, type SkrProfile } from "@/app/lib/skrProfile";
import { SKR_UNLOCK_AMOUNT_UI } from "@/app/lib/sharedSpec";
import { htmlUnlockReady, type ShopItem } from "@/app/lib/solanaPay";
import { uploadSiteOrHtml } from "@/app/lib/uploadSite";
import {
  BLOCK_META,
  MAX_FAQ,
  MAX_GALLERY,
  MAX_LINKS,
  MAX_SHOP_ITEMS,
  TINTS,
  addBlock,
  addableTypes,
  applyPromptToBlocks,
  identityBlock,
  moveBlock,
  removeBlock,
  updateBlock,
  type FaqItem,
  type GalleryItem,
  type SiteBlock,
  type SiteLink,
} from "@/app/lib/siteBlocks";
import {
  PAGE_STARTERS,
  addPage,
  createDefaultSite,
  demoCreatorSite,
  homePage,
  movePage,
  readSiteDraft,
  removePage,
  renamePage,
  renderPageHtml,
  renderSiteBundle,
  setPageInNav,
  setSiteName,
  siteDomainName,
  sitePublicUrl,
  updatePage,
  updatePageBlocks,
  updatePageSlug,
  validateSite,
  writeSiteDraft,
  customHtmlPublishError,
  sitePublishTemplateId,
  type SitePage,
  type StudioSite,
} from "@/app/lib/sitePages";
import { connectWallet, walletAddressShort, type BrowserWalletAdapter } from "@/app/lib/wallet";

type StudioScreen = "start" | "editor" | "publish" | "receipt";
type EditorTab = "edit" | "preview";

const MAINNET_RPC_URLS = (process.env.NEXT_PUBLIC_SOLANA_RPC_URLS ?? "https://api.mainnet-beta.solana.com")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const SOLANA_CHAIN = process.env.NEXT_PUBLIC_SOLANA_CHAIN === "devnet" ? "solana:devnet" : "solana:mainnet";

export default function StudioApp() {
  const [screen, setScreen] = useState<StudioScreen>("start");
  const [tab, setTab] = useState<EditorTab>("edit");
  const [site, setSite] = useState<StudioSite>(() => createDefaultSite());
  const [activePageId, setActivePageId] = useState<string>(() => createDefaultSite().pages[0].id);
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  const [addingPage, setAddingPage] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [wallet, setWallet] = useState<BrowserWalletAdapter | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [receiptSignature, setReceiptSignature] = useState<string>("");
  const [profile, setProfile] = useState<SkrProfile | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const activePage = site.pages.find((page) => page.id === activePageId) ?? homePage(site);
  const domain = useMemo(() => siteDomainName(site), [site]);
  const errors = useMemo(() => {
    const next = validateSite(site);
    const htmlError = customHtmlPublishError(site, profile);
    return htmlError ? [...next, htmlError] : next;
  }, [site, profile]);
  const blocks = activePage?.blocks ?? [];
  const canAdd = addableTypes(blocks);
  const previewHtml = useMemo(
    () => (activePage ? renderPageHtml(site, activePage, { wallet: wallet?.publicKey.toBase58(), isSeeker: profile?.isSeeker }) : ""),
    [site, activePage, wallet, profile],
  );

  useEffect(() => {
    registerMwa({
      appIdentity: { name: ".skr Studio", uri: "https://skr.site", icon: "/icon.jpg" },
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
    const domainParam = params.get("domain")?.replace(/\.skr$/i, "") ?? "";
    if (params.get("demo") === "1") {
      const demo = demoCreatorSite();
      setSite(demo);
      setActivePageId(demo.pages[0].id);
      setDraftHydrated(true);
      setScreen("editor");
      return;
    }
    const saved = readSiteDraft(wallet?.publicKey.toBase58()) ?? readSiteDraft();
    if (saved?.pages?.length) {
      const next = domainParam ? setSiteName(saved, domainParam) : saved;
      setSite(next);
      setActivePageId(homePage(next).id);
    } else if (domainParam) {
      const next = createDefaultSite(domainParam);
      setSite(next);
      setActivePageId(next.pages[0].id);
    }
    setDraftHydrated(true);
  }, [wallet, draftHydrated]);

  useEffect(() => {
    if (!draftHydrated) return;
    writeSiteDraft(site, wallet?.publicKey.toBase58());
  }, [site, wallet, draftHydrated]);

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

  function patchBlocks(nextBlocks: SiteBlock[]) {
    if (!activePage) return;
    setSite(updatePageBlocks(site, activePage.id, nextBlocks));
  }

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

  function beginStudio() {
    const name = siteNameOrDraft();
    const keepDraft = draftHydrated && site.pages.length > 0 && (homePage(site).blocks.length > 0);
    let next = keepDraft ? site : createDefaultSite(name, "card");
    if (prompt.trim()) {
      const home = homePage(next);
      next = updatePageBlocks(next, home.id, applyPromptToBlocks(home.blocks, prompt, { name }));
    }
    setSite(next);
    setActivePageId(homePage(next).id);
    setTab("edit");
    setScreen("editor");
  }

  function siteNameOrDraft(): string {
    return identityBlock(homePage(site)?.blocks ?? []).name;
  }

  function handleAddPage(starterId: string) {
    const next = addPage(site, { starterId });
    const added = next.pages[next.pages.length - 1];
    setSite(next);
    setActivePageId(added.id);
    setAddingPage(false);
    setOpenBlockId(added.blocks[0]?.id ?? null);
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
      const files = renderSiteBundle(site, {
        wallet: wallet.publicKey.toBase58(),
        isSeeker: profile?.isSeeker,
      });
      const pageDomain = siteDomainName(site);
      const templateId = sitePublishTemplateId(site);
      const uploaded = await uploadSiteOrHtml(files, pageDomain, { templateId });
      const signature = await signAndSendAnsPublishTx({
        rpcUrls: MAINNET_RPC_URLS,
        wallet,
        payload: {
          domain: pageDomain,
          templateId,
          contentUri: uploaded.contentUri,
          contentHash: uploaded.contentHash,
          isPremium: false,
          metadata: {
            source: "skr-studio-site-v2",
            template: templateId,
            url: uploaded.publicUrl,
            ...uploaded.metadataRecords,
            ...(siteIdentityPhoto(site) ? { pic: siteIdentityPhoto(site) } : {}),
          },
        },
      });
      setReceiptSignature(signature);
      setReceiptUrl(sitePublicUrl(site) || uploaded.publicUrl);
      setToast("Your .skr site is live");
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
          <p className="lead">Your .skr is a public Seeker ID — and a real website. Start from the card that’s already yours, then add pages.</p>

          <article className="starter-card selected">
            <span className="chip">Home</span>
            <strong>Start from your Seeker ID card</strong>
            <span>Theme the live card, then add About, Projects, Blog, or any page you need.</span>
          </article>

          <label className="field start-prompt">
            Optional: describe a change
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="A short Seeker profile with my X link and a teal tint." />
          </label>

          <p className="fine-print">Publishing signs with Seed Vault on your Seeker. Drafts are saved on this device and work without a wallet. The base site stays free.</p>
          <div className="studio-bar start-bar">
            <button className="btn btn-primary" type="button" onClick={() => void handleConnect().then((ok) => { if (ok) beginStudio(); })} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Continue with Seed Vault"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => beginStudio()}>
              Preview without connecting
            </button>
          </div>
        </section>
      )}

      {screen === "editor" && activePage && (
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
                    const home = homePage(site);
                    const identity = identityBlock(home.blocks);
                    setSite(updatePageBlocks(site, home.id, updateBlock(home.blocks, { ...identity, tint: tint.value })));
                  }}
                />
              ))}
            </span>
          </header>

          <div className="studio-tabs" role="tablist">
            <button type="button" className={tab === "edit" ? "on" : ""} onClick={() => setTab("edit")}>Edit</button>
            <button type="button" className={tab === "preview" ? "on" : ""} onClick={() => setTab("preview")}>Preview site</button>
          </div>

          <div className="editor-scroll">
          {tab === "edit" && (
            <>
              <h3 className="block-heading">Pages</h3>
              <div className="page-strip">
                {site.pages.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    className={`page-chip${page.id === activePage.id ? " on" : ""}`}
                    onClick={() => { setActivePageId(page.id); setAddingPage(false); setOpenBlockId(null); }}
                  >
                    <strong>{page.title}</strong>
                    <small>{page.slug ? `/${page.slug}` : "/"}</small>
                  </button>
                ))}
                <button type="button" className="page-add" onClick={() => setAddingPage((open) => !open)}>+</button>
              </div>

              {addingPage && (
                <div className="add-page-panel">
                  {PAGE_STARTERS.map((item) => (
                    <button key={item.id} type="button" className="btn btn-ghost btn-sm" onClick={() => handleAddPage(item.id)}>
                      {item.title}
                    </button>
                  ))}
                </div>
              )}

              <PageSettings
                page={activePage}
                htmlUnlocked={htmlUnlockReady(profile)}
                onRename={(title) => setSite(renamePage(site, activePage.id, title))}
                onSlug={(slug) => setSite(updatePageSlug(site, activePage.id, slug))}
                onNav={(inNav) => setSite(setPageInNav(site, activePage.id, inNav))}
                onDescription={(description) => setSite(updatePage(site, { ...activePage, description }))}
                onShareImage={(shareImage) => setSite(updatePage(site, { ...activePage, shareImage }))}
                onCustomHtml={(customHtml) => setSite(updatePage(site, { ...activePage, customHtml }))}
                onMove={(direction) => setSite(movePage(site, activePage.id, direction))}
                onRemove={() => {
                  const next = removePage(site, activePage.id);
                  setSite(next);
                  setActivePageId(homePage(next).id);
                }}
              />

              {activePage.kind === "home" && <MiniPreview blocks={blocks} profile={profile} domain={domain} />}
              {activePage.customHtml === undefined && (
              <>

              <h3 className="block-heading">Blocks on {activePage.title}</h3>
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
                        <button type="button" className="btn btn-ghost btn-sm" disabled={index <= (blocks[0]?.type === "identity" ? 1 : 0)} onClick={() => patchBlocks(moveBlock(blocks, block.id, -1))}>Up</button>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={index >= blocks.length - 1} onClick={() => patchBlocks(moveBlock(blocks, block.id, 1))}>Down</button>
                      </div>
                    )}
                    {openBlockId === block.id && (
                      <div className="block-body">
                        <BlockFields block={block} onChange={(next) => patchBlocks(updateBlock(blocks, next))} />
                        {block.type !== "identity" && (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => patchBlocks(removeBlock(blocks, block.id))}>Remove block</button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
              {canAdd.length > 0 && (
                <div className="add-block-row">
                  {canAdd.map((type) => (
                    <button key={type} type="button" className="btn btn-ghost btn-sm" onClick={() => patchBlocks(addBlock(blocks, type))}>
                      + {BLOCK_META[type].title}
                    </button>
                  ))}
                </div>
              )}
              <label className="field prompt-line">
                Describe a change
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Make the tagline shorter and add https://x.com/you" />
              </label>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  if (!prompt.trim() || !activePage) return;
                  patchBlocks(applyPromptToBlocks(blocks, prompt, { name: siteNameOrDraft() }));
                  setToast("Updated this page from the prompt");
                }}
                disabled={!prompt.trim()}
              >
                Update blocks from prompt
              </button>
              </>
              )}
            </>
          )}

          {tab === "preview" && (
            <iframe className="site-preview-frame" title="Site preview" sandbox="allow-scripts" srcDoc={previewHtml} />
          )}
          </div>

          <div className="studio-bar">
            <button className="btn btn-ghost" type="button" onClick={() => setTab(tab === "preview" ? "edit" : "preview")}>
              {tab === "preview" ? "Edit" : "Preview"}
            </button>
            <button className="btn btn-primary" type="button" onClick={() => setScreen("publish")}>
              Publish to {domain ? `${domain.replace(/\.skr$/, "")}.skr.site` : "your.skr.site"}
            </button>
          </div>
        </section>
      )}

      {screen === "publish" && (
        <section className="panel card-glow publish-card">
          <span className="chip">Free site</span>
          <h2>Publish {domain || "your.skr"}</h2>
          <p>Seed Vault will ask you to approve an AllDomains record update. This path does not use the custom SKR program. Your site is a bundle of pages, and the url record will point at the site root.</p>
          <div className="wallet-box">
            <span>Pages: {site.pages.map((page) => page.slug ? `/${page.slug}` : "/").join(", ")}</span>
            <span>Storage: Arweave path manifest (IPFS directory fallback)</span>
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
          <p className="fine-print">The base site and block pages stay free. Custom HTML is a 1000 SKR path and publishes with the same hosted name.skr.site bundle.</p>
        </section>
      )}

      {screen === "receipt" && (
        <section className="panel card-glow publish-card">
          <span className="chip">Live</span>
          <h2>Your site is live</h2>
          <p>Anyone can open your .skr site from this link, including inner pages like /about.</p>
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
            {receiptUrl ? <a className="btn btn-primary" href={receiptUrl} target="_blank" rel="noreferrer">Open site</a> : null}
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => setScreen("editor")}>Back to editor</button>
        </section>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function siteIdentityPhoto(site: StudioSite): string {
  return identityBlock(homePage(site).blocks).photoUrl;
}

function blockSummary(block: SiteBlock, profile: SkrProfile | null): string {
  switch (block.type) {
    case "identity":
      return block.name ? `${block.name}.skr` : BLOCK_META.identity.hint;
    case "about":
    case "richtext":
      return block.text.trim() ? block.text.trim().slice(0, 48) : "Tap to add text";
    case "links":
      return `${block.items.filter((item) => item.label || item.url).length} of ${MAX_LINKS}`;
    case "skr":
      return block.enabled ? (profile ? `${formatSkr(profile.total)} SKR · on` : "Live on-chain · on") : "Hidden";
    case "stamps":
      return block.enabled ? "Auto from this wallet · on" : "Hidden";
    case "shop":
      return `${block.items.filter((item) => item.title.trim()).length} of ${MAX_SHOP_ITEMS}`;
    case "image":
      return block.url ? "Image added" : BLOCK_META.image.hint;
    case "gallery":
      return `${block.items.filter((item) => item.url).length} of ${MAX_GALLERY}`;
    case "embed":
      return block.url || BLOCK_META.embed.hint;
    case "cta":
      return block.label || BLOCK_META.cta.hint;
    case "contact":
      return block.email || "mailto fallback";
    case "posts":
      return block.heading || BLOCK_META.posts.hint;
    case "socials":
      return `${block.items.filter((item) => item.label || item.url).length} of ${MAX_LINKS}`;
    case "faq":
      return `${block.items.filter((item) => item.question).length} of ${MAX_FAQ}`;
  }
}

function MiniPreview({ blocks, profile, domain }: { blocks: SiteBlock[]; profile: SkrProfile | null; domain: string }) {
  const identity = identityBlock(blocks);
  const about = blocks.find((block) => block.type === "about" || block.type === "richtext");
  const skr = blocks.find((block) => block.type === "skr");
  return (
    <article className="mini-preview panel card-glow" style={{ borderColor: identity.tint }}>
      {identity.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="seeker-id-avatar" src={identity.photoUrl} alt="" />
      ) : (
        <div className="seeker-id-knot" aria-hidden="true" />
      )}
      <span className="chip">{domain || "your.skr"}</span>
      <h2>{identity.name || "your"}.skr</h2>
      <p>{identity.tagline || "Seeker ID"}</p>
      <p className="bound-note">One Seeker, one name</p>
      {skr?.type === "skr" && skr.enabled && profile && (
        <div className="seeker-id-total">
          <strong>{formatSkr(profile.total)}</strong>
          <span>SKR</span>
        </div>
      )}
      {about && "text" in about && about.text.trim() ? <p>{about.text}</p> : null}
    </article>
  );
}

function PageSettings({
  page, htmlUnlocked, onRename, onSlug, onNav, onDescription, onShareImage, onCustomHtml, onMove, onRemove,
}: {
  page: SitePage;
  htmlUnlocked: boolean;
  onRename: (title: string) => void;
  onSlug: (slug: string) => void;
  onNav: (inNav: boolean) => void;
  onDescription: (description: string) => void;
  onShareImage: (url: string) => void;
  onCustomHtml: (html: string) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="page-settings">
      <label className="field compact">
        Page title
        <input value={page.title} onChange={(event) => onRename(event.target.value)} />
      </label>
      <label className="field compact">
        Path
        <input value={page.kind === "home" ? "/" : `/${page.slug}`} onChange={(event) => onSlug(event.target.value)} disabled={page.kind === "home"} />
      </label>
      <label className="field compact">
        SEO description
        <input value={page.description} onChange={(event) => onDescription(event.target.value)} placeholder="Optional" />
      </label>
      <label className="field compact">
        Share image URL
        <input value={page.shareImage} onChange={(event) => onShareImage(event.target.value)} placeholder="https://" />
      </label>
      {page.customHtml !== undefined && page.kind !== "home" && (
        <label className="field html-editor">
          Custom HTML ({SKR_UNLOCK_AMOUNT_UI} SKR path)
          <textarea
            value={page.customHtml}
            onChange={(event) => onCustomHtml(event.target.value)}
            rows={12}
            placeholder="<!doctype html>…"
          />
          <span className="html-locked">
            {htmlUnlocked
              ? "This page publishes as your raw HTML in the same hosted name.skr.site bundle. Home still ships with the passport."
              : `Hold at least ${SKR_UNLOCK_AMOUNT_UI} SKR to publish custom HTML. You can still draft it here. The on-chain HTML unlock program is not on mainnet yet, so this checks that this wallet holds ${SKR_UNLOCK_AMOUNT_UI} SKR.`}
          </span>
        </label>
      )}
      {page.kind !== "home" && (
        <div className="row">
          <label className="skr-toggle">
            <input type="checkbox" checked={page.inNav} onChange={(event) => onNav(event.target.checked)} />
            Show in nav
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMove(-1)}>Up</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMove(1)}>Down</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove}>Remove page</button>
        </div>
      )}
    </div>
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
              placeholder="https:// or /about"
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

function GalleryEditor({ items, onChange }: { items: GalleryItem[]; onChange: (items: GalleryItem[]) => void }) {
  const rows = items.length < MAX_GALLERY ? [...items, { url: "", alt: "" }] : items;
  return (
    <div className="stack">
      {rows.slice(0, MAX_GALLERY).map((item, index) => (
        <div className="row" key={`g-${index}`}>
          <label className="field compact">
            Image URL
            <input
              value={item.url}
              placeholder="https://"
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...(next[index] ?? { url: "", alt: "" }), url: event.target.value };
                onChange(next.filter((entry) => entry.url || entry.alt));
              }}
            />
          </label>
          <label className="field compact">
            Alt
            <input
              value={item.alt}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...(next[index] ?? { url: "", alt: "" }), alt: event.target.value };
                onChange(next.filter((entry) => entry.url || entry.alt));
              }}
            />
          </label>
        </div>
      ))}
    </div>
  );
}

function FaqEditor({ items, onChange }: { items: FaqItem[]; onChange: (items: FaqItem[]) => void }) {
  const rows = items.length < MAX_FAQ ? [...items, { question: "", answer: "" }] : items;
  return (
    <div className="stack">
      {rows.slice(0, MAX_FAQ).map((item, index) => (
        <div className="stack" key={`f-${index}`}>
          <label className="field">
            Question
            <input
              value={item.question}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...(next[index] ?? { question: "", answer: "" }), question: event.target.value };
                onChange(next.filter((entry) => entry.question || entry.answer));
              }}
            />
          </label>
          <label className="field">
            Answer
            <textarea
              value={item.answer}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...(next[index] ?? { question: "", answer: "" }), answer: event.target.value };
                onChange(next.filter((entry) => entry.question || entry.answer));
              }}
            />
          </label>
        </div>
      ))}
    </div>
  );
}


function ShopEditor({ items, onChange }: { items: ShopItem[]; onChange: (items: ShopItem[]) => void }) {
  const rows = items.length < MAX_SHOP_ITEMS
    ? [...items, { title: "", price: 0, currency: "SKR" as const, image: "", description: "", delivery: "" }]
    : items;
  return (
    <div className="shop-editor">
      {rows.slice(0, MAX_SHOP_ITEMS).map((item, index) => (
        <div className="shop-item-edit" key={`shop-${index}`}>
          <label className="field">
            Title
            <input
              value={item.title}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...(next[index] ?? { title: "", price: 0, currency: "SKR", image: "", description: "", delivery: "" }), title: event.target.value };
                onChange(next.filter((entry) => entry.title.trim() || entry.price > 0 || entry.description.trim() || entry.image || entry.delivery));
              }}
            />
          </label>
          <div className="row">
            <label className="field compact">
              Price
              <input
                type="number"
                min={0}
                step="any"
                value={item.price || ""}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = { ...(next[index] ?? { title: "", price: 0, currency: "SKR", image: "", description: "", delivery: "" }), price: Number(event.target.value) };
                  onChange(next.filter((entry) => entry.title.trim() || entry.price > 0 || entry.description.trim() || entry.image || entry.delivery));
                }}
              />
            </label>
            <label className="field compact">
              Currency
              <select
                value={item.currency}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = { ...(next[index] ?? { title: "", price: 0, currency: "SKR", image: "", description: "", delivery: "" }), currency: event.target.value === "SOL" ? "SOL" : "SKR" };
                  onChange(next);
                }}
              >
                <option value="SKR">SKR</option>
                <option value="SOL">SOL</option>
              </select>
            </label>
          </div>
          <label className="field">
            Image URL
            <input
              value={item.image}
              placeholder="https://"
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...(next[index] ?? { title: "", price: 0, currency: "SKR", image: "", description: "", delivery: "" }), image: event.target.value };
                onChange(next.filter((entry) => entry.title.trim() || entry.price > 0 || entry.description.trim() || entry.image || entry.delivery));
              }}
            />
          </label>
          <label className="field">
            Description
            <textarea
              value={item.description}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...(next[index] ?? { title: "", price: 0, currency: "SKR", image: "", description: "", delivery: "" }), description: event.target.value };
                onChange(next.filter((entry) => entry.title.trim() || entry.price > 0 || entry.description.trim() || entry.image || entry.delivery));
              }}
            />
          </label>
          <label className="field">
            Delivery link or note
            <input
              value={item.delivery}
              placeholder="https:// or a short note"
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...(next[index] ?? { title: "", price: 0, currency: "SKR", image: "", description: "", delivery: "" }), delivery: event.target.value };
                onChange(next.filter((entry) => entry.title.trim() || entry.price > 0 || entry.description.trim() || entry.image || entry.delivery));
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
          <p className="html-locked">This .skr is bound to the wallet. One Seeker, one name. It can’t be sold or transferred.</p>
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
    case "richtext":
      return (
        <label className="field">
          Text
          <textarea value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} />
        </label>
      );
    case "links":
    case "socials":
      return <LinkEditor items={block.items} onChange={(items) => onChange({ ...block, items })} />;
    case "skr":
      return (
        <label className="skr-toggle">
          <input type="checkbox" checked={block.enabled} onChange={(event) => onChange({ ...block, enabled: event.target.checked })} />
          Show live SKR totals on the public page
        </label>
      );
    case "stamps":
      return (
        <label className="skr-toggle">
          <input type="checkbox" checked={block.enabled} onChange={(event) => onChange({ ...block, enabled: event.target.checked })} />
          Show auto-stamps from this wallet’s public on-chain activity
        </label>
      );
    case "shop":
      return <ShopEditor items={block.items} onChange={(items) => onChange({ ...block, items })} />;
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
    case "gallery":
      return <GalleryEditor items={block.items} onChange={(items) => onChange({ ...block, items })} />;
    case "embed":
      return (
        <label className="field">
          YouTube, X, or Spotify URL
          <input value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} placeholder="https://" />
        </label>
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
            <input value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} placeholder="https:// or /contact" />
          </label>
        </>
      );
    case "contact":
      return (
        <>
          <label className="field">
            Email
            <input value={block.email} onChange={(event) => onChange({ ...block, email: event.target.value })} placeholder="you@email.com" />
          </label>
          <label className="field">
            Button label
            <input value={block.buttonLabel} onChange={(event) => onChange({ ...block, buttonLabel: event.target.value })} />
          </label>
        </>
      );
    case "posts":
      return (
        <label className="field">
          Heading
          <input value={block.heading} onChange={(event) => onChange({ ...block, heading: event.target.value })} />
        </label>
      );
    case "faq":
      return <FaqEditor items={block.items} onChange={(items) => onChange({ ...block, items })} />;
  }
}
