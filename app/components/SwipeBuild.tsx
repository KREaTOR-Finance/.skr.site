"use client";

import { useMemo, useRef, useState } from "react";
import { TINTS, identityBlock, type SiteBlockType } from "@/app/lib/siteBlocks";
import { homePage, type StudioSite } from "@/app/lib/sitePages";
import { deriveStamps, type Stamp } from "@/app/lib/stamps";
import type { SkrProfile } from "@/app/lib/skrProfile";
import type { ShopItem } from "@/app/lib/solanaPay";
import {
  BLEND_UNLOCK_KEEPS,
  applyDesignToSite,
  applySectionOrder,
  applyTagline,
  applyTint,
  blendKeptDesigns,
  canBlend,
  clashKeys,
  cycleSwap,
  fieldValue,
  generateSwipeDeck,
  homeSectionOrder,
  type ClashKey,
  type SwipeDesign,
} from "@/app/lib/swipeDesigns";

export const DEMO_STAMP_PROFILE: Pick<SkrProfile, "isSeeker" | "liquid" | "staked" | "yieldEarned" | "total"> = {
  isSeeker: true,
  liquid: 11741.8,
  staked: 11741.8,
  yieldEarned: 1741.8,
  total: 11741.8,
};

const SHOP_FALLBACKS = ["/brand/skr-logo.jpg", "/seeker/image.jpg"];
const SWIPE_THRESHOLD = 88;

export type SwipeStep = "deck" | "picks" | "result";

const CLASH_LABEL: Record<ClashKey, string> = {
  tint: "Color",
  typography: "Type",
  density: "Density",
  background: "Background",
  stampStyle: "Stamps",
  shopStyle: "Shop",
  sectionOrder: "Order",
};

export function demoKeepDesigns(deck: SwipeDesign[]): SwipeDesign[] {
  const ids = ["teal-glass__passport-first", "violet-editorial__shop-first", "chrome-mesh__shop-after-stamps"];
  return ids.map((id) => deck.find((item) => item.id === id)).filter((item): item is SwipeDesign => Boolean(item));
}

type Props = {
  site: StudioSite;
  onSiteChange: (site: StudioSite) => void;
  step: SwipeStep;
  onStep: (step: SwipeStep) => void;
  profile: SkrProfile | null;
  useDemoStamps?: boolean;
  peekKeep?: boolean;
  openTweak?: boolean;
  onPublish: () => void;
  onAdvanced: () => void;
};

export default function SwipeBuild({
  site,
  onSiteChange,
  step,
  onStep,
  profile,
  useDemoStamps = false,
  peekKeep = false,
  openTweak = false,
  onPublish,
  onAdvanced,
}: Props) {
  const deck = useMemo(() => generateSwipeDeck(), []);
  const [index, setIndex] = useState(0);
  const [kept, setKept] = useState<SwipeDesign[]>(() => (useDemoStamps && step !== "deck" ? demoKeepDesigns(deck) : []));
  const [swaps, setSwaps] = useState<Partial<Record<ClashKey, string>>>({});
  const [dx, setDx] = useState(peekKeep ? 56 : 0);
  const [leaving, setLeaving] = useState<"keep" | "skip" | null>(null);
  const [tweakOpen, setTweakOpen] = useState(openTweak);
  const drag = useRef<{ x: number; active: boolean } | null>(null);

  const stamps = useMemo<Stamp[]>(() => {
    const source = profile ?? (useDemoStamps ? DEMO_STAMP_PROFILE : null);
    return source ? deriveStamps(source) : [];
  }, [profile, useDemoStamps]);

  const remaining = deck.slice(index);
  const current = remaining[0];
  const blend = kept.length ? blendKeptDesigns(kept, swaps) : null;
  const clashes = clashKeys(kept);

  function settle(direction: "keep" | "skip") {
    if (!current) return;
    const nextKept = direction === "keep" ? [...kept, current] : kept;
    setLeaving(direction);
    setDx(direction === "keep" ? 420 : -420);
    window.setTimeout(() => {
      const nextIndex = index + 1;
      setKept(nextKept);
      setIndex(nextIndex);
      setDx(0);
      setLeaving(null);
      if (nextIndex >= deck.length) onStep("picks");
    }, 220);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!current || leaving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, active: true };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current?.active) return;
    setDx(event.clientX - drag.current.x);
  }

  function onPointerUp() {
    if (!drag.current?.active) return;
    drag.current = null;
    if (dx > SWIPE_THRESHOLD) settle("keep");
    else if (dx < -SWIPE_THRESHOLD) settle("skip");
    else setDx(0);
  }

  function handleBlend() {
    if (!blend || !canBlend(kept)) return;
    onSiteChange(applyDesignToSite(site, blend));
    onStep("result");
  }

  function swapClash(key: ClashKey) {
    const currentId = swaps[key] ?? kept[kept.length - 1]?.id;
    const nextId = cycleSwap(kept, key, currentId);
    setSwaps((prev) => ({ ...prev, [key]: nextId }));
  }

  return (
    <section className={`swipe-build swipe-${step}`}>
      {step === "deck" && (
        <>
          <header className="swipe-top">
            <h1>Swipe to build</h1>
            <span className="swipe-count">{Math.min(index + 1, deck.length)} / {deck.length}</span>
          </header>
          <div className="swipe-stage">
            {remaining.slice(0, 3).reverse().map((design, stackIndex, stack) => {
              const isTop = stackIndex === stack.length - 1;
              const depth = stack.length - 1 - stackIndex;
              const style = isTop
                ? { transform: `translate(${dx}px, ${Math.abs(dx) * 0.04}px) rotate(${dx / 18}deg)` }
                : { transform: `scale(${1 - depth * 0.04}) translateY(${depth * 10}px)` };
              return (
                <div
                  key={design.id}
                  className={`swipe-card${isTop ? " is-top" : ""}`}
                  style={{ ...style, zIndex: 10 - depth, ["--card-tint" as string]: design.tint }}
                  onPointerDown={isTop ? onPointerDown : undefined}
                  onPointerMove={isTop ? onPointerMove : undefined}
                  onPointerUp={isTop ? onPointerUp : undefined}
                  onPointerCancel={isTop ? onPointerUp : undefined}
                >
                  {isTop && dx > 36 && <span className="swipe-badge keep">Keep</span>}
                  {isTop && dx < -36 && <span className="swipe-badge skip">Skip</span>}
                  <DesignPreview site={site} design={design} stamps={stamps} />
                </div>
              );
            })}
            {!current && <p className="swipe-empty">No more looks. Review your picks.</p>}
          </div>
          <p className="swipe-hint">Swipe right to keep · left to skip</p>
          <div className="swipe-actions">
            <button className="swipe-round skip" type="button" aria-label="Skip" onClick={() => settle("skip")} disabled={!current}>
              <XIcon />
            </button>
            <button className="swipe-round keep" type="button" aria-label="Keep" onClick={() => settle("keep")} disabled={!current}>
              <HeartIcon />
            </button>
          </div>
          {canBlend(kept) && (
            <button className="btn btn-primary swipe-review" type="button" onClick={() => onStep("picks")}>
              Review {kept.length} picks
            </button>
          )}
        </>
      )}

      {step === "picks" && (
        <>
          <header className="swipe-top">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => onStep("deck")}>Back</button>
            <h1>Your picks</h1>
            <span className="swipe-count">{kept.length} kept</span>
          </header>
          <div className="picks-list">
            {kept.length === 0 && <p className="swipe-empty">Keep a few looks first. Blend unlocks after {BLEND_UNLOCK_KEEPS}.</p>}
            {kept.map((design, pickIndex) => (
              <article key={design.id} className="pick-card" style={{ ["--card-tint" as string]: design.tint }}>
                <DesignPreview site={site} design={design} stamps={stamps} compact />
                <div className="pick-meta">
                  <strong>{design.name}</strong>
                  <span>{design.orderLabel}{pickIndex === kept.length - 1 ? " · latest" : ""}</span>
                </div>
              </article>
            ))}
          </div>
          {clashes.length > 0 && kept.length >= 2 && (
            <div className="clash-sheet">
              <p>Latest kept wins clashes. Tap a chip to swap.</p>
              <div className="clash-row">
                {clashes.map((key) => {
                  const winnerId = swaps[key] ?? kept[kept.length - 1].id;
                  const winner = kept.find((item) => item.id === winnerId) ?? kept[kept.length - 1];
                  return (
                    <button key={key} type="button" className="clash-chip" onClick={() => swapClash(key)}>
                      <b>{CLASH_LABEL[key]}</b>
                      <span>{key === "tint" || key === "sectionOrder" ? `${winner.name}` : fieldValue(winner, key)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="swipe-bottom">
            {!canBlend(kept) && (
              <p className="swipe-hint">Keep {BLEND_UNLOCK_KEEPS - kept.length} more to blend</p>
            )}
            <button className="btn btn-primary blend-btn" type="button" onClick={handleBlend} disabled={!canBlend(kept)}>
              Blend
            </button>
            {index < deck.length && (
              <button className="btn btn-ghost" type="button" onClick={() => onStep("deck")}>Keep swiping</button>
            )}
          </div>
        </>
      )}

      {step === "result" && (
        <ResultStep
          site={site}
          stamps={stamps}
          tweakOpen={tweakOpen}
          onOpenTweak={() => setTweakOpen(true)}
          onCloseTweak={() => setTweakOpen(false)}
          onSiteChange={onSiteChange}
          onPublish={onPublish}
          onAdvanced={onAdvanced}
          onReswipe={() => onStep("deck")}
        />
      )}
    </section>
  );
}

function ResultStep({
  site,
  stamps,
  tweakOpen,
  onOpenTweak,
  onCloseTweak,
  onSiteChange,
  onPublish,
  onAdvanced,
  onReswipe,
}: {
  site: StudioSite;
  stamps: Stamp[];
  tweakOpen: boolean;
  onOpenTweak: () => void;
  onCloseTweak: () => void;
  onSiteChange: (site: StudioSite) => void;
  onPublish: () => void;
  onAdvanced: () => void;
  onReswipe: () => void;
}) {
  const design = siteDesignFromSite(site);
  return (
    <>
      <header className="swipe-top">
        <button className="btn btn-ghost btn-sm" type="button" onClick={onReswipe}>Swipe more</button>
        <h1>Your site</h1>
        <span className="swipe-count">Blend</span>
      </header>
      <p className="swipe-hint result-hint">Tap a section to tweak</p>
      <div className="result-stage" style={{ ["--card-tint" as string]: design.tint }}>
        <DesignPreview site={site} design={design} stamps={stamps} interactive onSelect={onOpenTweak} />
      </div>
      <div className="swipe-bottom result-bar">
        <button className="btn btn-primary" type="button" onClick={onPublish}>Publish</button>
        <button className="btn btn-ghost" type="button" onClick={onAdvanced}>Custom HTML editor</button>
      </div>
      {tweakOpen && (
        <TweakSheet
          site={site}
          onSiteChange={onSiteChange}
          onClose={onCloseTweak}
        />
      )}
    </>
  );
}

function TweakSheet({
  site,
  onSiteChange,
  onClose,
}: {
  site: StudioSite;
  onSiteChange: (site: StudioSite) => void;
  onClose: () => void;
}) {
  const identity = identityBlock(homePage(site).blocks);
  const order = homeSectionOrder(site);
  function move(type: SiteBlockType, dir: -1 | 1) {
    const next = [...order];
    const index = next.indexOf(type);
    const target = index + dir;
    if (index <= 0 || target <= 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onSiteChange(applySectionOrder(site, next));
  }
  return (
    <div className="tweak-sheet" role="dialog" aria-label="Tweak this section">
      <div className="tweak-handle" />
      <div className="tweak-head">
        <strong>Tweak</strong>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Done</button>
      </div>
      <label className="tweak-label">Tint</label>
      <div className="tint-dots tweak-tints">
        {TINTS.map((tint) => (
          <button
            key={tint.id}
            type="button"
            className={identity.tint.toLowerCase() === tint.value.toLowerCase() ? "is-on" : ""}
            style={{ background: tint.value }}
            aria-label={tint.label}
            onClick={() => onSiteChange(applyTint(site, tint.value))}
          />
        ))}
      </div>
      <label className="tweak-label" htmlFor="tweak-tagline">Tagline</label>
      <input
        id="tweak-tagline"
        className="tweak-input"
        value={identity.tagline}
        maxLength={140}
        onChange={(event) => onSiteChange(applyTagline(site, event.target.value))}
        placeholder="A Seeker passport that earns."
      />
      <label className="tweak-label">Section order</label>
      <ul className="tweak-order">
        {order.map((type) => (
          <li key={type}>
            <span>{type === "identity" ? "Passport" : type === "skr" ? "Live SKR" : type[0].toUpperCase() + type.slice(1)}</span>
            {type !== "identity" && (
              <span className="tweak-move">
                <button type="button" aria-label={`Move ${type} up`} onClick={() => move(type, -1)}>↑</button>
                <button type="button" aria-label={`Move ${type} down`} onClick={() => move(type, 1)}>↓</button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function siteDesignFromSite(site: StudioSite): SwipeDesign {
  const identity = identityBlock(homePage(site).blocks);
  const theme = site.theme;
  return {
    id: "result",
    name: "Your blend",
    themeId: "blend",
    orderId: "blend",
    orderLabel: "Blended",
    tint: identity.tint || "#00C9A7",
    typography: theme?.typography ?? "display",
    density: theme?.density ?? "comfortable",
    background: theme?.background ?? "glass",
    stampStyle: theme?.stampStyle ?? "grid",
    shopStyle: theme?.shopStyle ?? "rows",
    sectionOrder: homeSectionOrder(site),
  };
}

function DesignPreview({
  site,
  design,
  stamps,
  compact = false,
  interactive = false,
  onSelect,
}: {
  site: StudioSite;
  design: SwipeDesign;
  stamps: Stamp[];
  compact?: boolean;
  interactive?: boolean;
  onSelect?: () => void;
}) {
  const home = homePage(site);
  const identity = identityBlock(home.blocks);
  const name = (identity.name || "your").replace(/\.skr$/i, "") || "your";
  const shop = home.blocks.find((block) => block.type === "shop");
  const items: ShopItem[] = shop && shop.type === "shop" ? shop.items : [];
  const photo = identity.photoUrl || "/brand/skr-logo.jpg";
  const sections = (design.sectionOrder.length ? design.sectionOrder : home.blocks.map((block) => block.type))
    .filter((type, index, list) => list.indexOf(type) === index && type !== "identity" && (type === "stamps" || type === "shop" || (!compact && (type === "skr" || type === "links" || type === "about"))));

  return (
    <div
      className={`design-preview typo-${design.typography} dens-${design.density} bg-${design.background} stamps-${design.stampStyle} shop-${design.shopStyle}${compact ? " is-compact" : ""}`}
      style={{ ["--card-tint" as string]: design.tint }}
    >
      <button
        type="button"
        className="preview-identity"
        onClick={interactive ? onSelect : undefined}
        disabled={!interactive}
      >
        <div className="preview-avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" />
          <span className="preview-badge">Seeker-verified</span>
        </div>
        <h2>{name}<span>.skr</span></h2>
        <p className="preview-tagline">{identity.tagline || "A Seeker passport that earns."}</p>
        <p className="preview-bound">One Seeker, one name</p>
      </button>
      {sections.map((type) => {
        if (type === "stamps" && stamps.length) {
          return (
            <button key="stamps" type="button" className="preview-stamps" onClick={interactive ? onSelect : undefined} disabled={!interactive}>
              <span className="preview-kicker">Stamps</span>
              <div className="preview-stamp-grid">
                {stamps.map((stamp) => (
                  <div key={stamp.id} className="preview-stamp">
                    <i>{stamp.title.charAt(0)}</i>
                    <b>{stamp.title}</b>
                    <span>{stamp.detail}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        }
        if (type === "shop" && items.length) {
          return (
            <button key="shop" type="button" className="preview-shop" onClick={interactive ? onSelect : undefined} disabled={!interactive}>
              <span className="preview-kicker">Shop · pays this wallet</span>
              {items.map((item, itemIndex) => (
                <div key={`${item.title}-${itemIndex}`} className="preview-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image || SHOP_FALLBACKS[itemIndex % SHOP_FALLBACKS.length]} alt="" />
                  <div>
                    <b>{item.title}</b>
                    <span>{item.description || (item.currency === "SOL" ? "Instant drop" : "Digital service")}</span>
                  </div>
                  <strong>{item.price} {item.currency}</strong>
                </div>
              ))}
            </button>
          );
        }
        return null;
      })}
    </div>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path d="M12 20s-7-4.6-9.2-8.4C1 8.6 2.4 5.5 5.6 5.2 7.5 5 9 6.2 12 9c3-2.8 4.5-4 6.4-3.8 3.2.3 4.6 3.4 2.8 6.4C19 15.4 12 20 12 20z" fill="currentColor" />
    </svg>
  );
}
