import { SKR_PROFILE_API, stampsLiveScript } from "./stamps";
import { formatPayAmount, solanaPayQrSvg, solanaPayTransferUrl } from "./solanaPay";
export type SiteBlockType =
  | "identity"
  | "about"
  | "richtext"
  | "links"
  | "skr"
  | "stamps"
  | "shop"
  | "image"
  | "gallery"
  | "embed"
  | "cta"
  | "contact"
  | "posts"
  | "socials"
  | "faq";

export type SiteLink = { label: string; url: string };
export type GalleryItem = { url: string; alt: string };
export type FaqItem = { question: string; answer: string };

export type IdentityBlock = {
  id: string;
  type: "identity";
  name: string;
  tagline: string;
  photoUrl: string;
  tint: string;
};

export type AboutBlock = { id: string; type: "about"; text: string };
export type RichTextBlock = { id: string; type: "richtext"; text: string };
export type LinksBlock = { id: string; type: "links"; items: SiteLink[] };
export type SkrBlock = { id: string; type: "skr"; enabled: boolean };
export type ImageBlock = { id: string; type: "image"; url: string; alt: string };
export type GalleryBlock = { id: string; type: "gallery"; items: GalleryItem[] };
export type EmbedBlock = { id: string; type: "embed"; url: string };
export type CtaBlock = { id: string; type: "cta"; label: string; url: string };
export type ContactBlock = { id: string; type: "contact"; email: string; buttonLabel: string };
export type PostsBlock = { id: string; type: "posts"; heading: string };
export type SocialsBlock = { id: string; type: "socials"; items: SiteLink[] };
export type FaqBlock = { id: string; type: "faq"; items: FaqItem[] };
export type StampsBlock = { id: string; type: "stamps"; enabled: boolean };
export type ShopItem = {
  title: string;
  price: number;
  currency: "SKR" | "SOL";
  image: string;
  description: string;
  delivery: string;
};
export type ShopBlock = { id: string; type: "shop"; items: ShopItem[] };

export type SiteBlock =
  | IdentityBlock
  | AboutBlock
  | RichTextBlock
  | LinksBlock
  | SkrBlock
  | ImageBlock
  | GalleryBlock
  | EmbedBlock
  | CtaBlock
  | ContactBlock
  | PostsBlock
  | SocialsBlock
  | FaqBlock
  | StampsBlock
  | ShopBlock;

export type PageStarter = "card" | "profile" | "links" | "project" | "shop" | "event" | "prompt";

export const BLOCK_PAGE_TEMPLATE_ID = "studio";
export const MAX_LINKS = 5;
export const MAX_GALLERY = 8;
export const MAX_FAQ = 8;
export const MAX_SHOP_ITEMS = 8;
export const STUDIO_DRAFT_KEY = "skr:studio-blocks:v1";
export const STUDIO_SITE_DRAFT_KEY = "skr:studio-site:v2";

export const TINTS = [
  { id: "teal", value: "#00C9A7", label: "Teal" },
  { id: "violet", value: "#8B7CFF", label: "Violet" },
  { id: "gold", value: "#D4AF37", label: "Gold" },
] as const;

export type SwipeTypography = "sans" | "display" | "editorial";
export type SwipeDensity = "comfortable" | "compact";
export type SwipeBackground = "glass" | "mesh" | "nebula" | "flat";
export type SwipeStampStyle = "grid" | "stack";
export type SwipeShopStyle = "rows" | "featured";

export type SiteTheme = {
  typography: SwipeTypography;
  density: SwipeDensity;
  background: SwipeBackground;
  stampStyle: SwipeStampStyle;
  shopStyle: SwipeShopStyle;
};

const ADDABLE: SiteBlockType[] = [
  "richtext", "links", "skr", "stamps", "shop", "image", "gallery", "embed", "cta", "contact", "posts", "socials", "faq",
];

export const EMBED_HOSTS = [
  "youtube.com", "www.youtube.com", "youtu.be", "www.youtu.be",
  "x.com", "www.x.com", "twitter.com", "www.twitter.com",
  "open.spotify.com", "player.spotify.com",
];

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `b-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

export function createBlock(type: SiteBlockType): SiteBlock {
  switch (type) {
    case "identity":
      return { id: newId(), type, name: "", tagline: "Seeker ID", photoUrl: "", tint: "#00C9A7" };
    case "about":
      return { id: newId(), type, text: "" };
    case "richtext":
      return { id: newId(), type, text: "" };
    case "links":
      return { id: newId(), type, items: [] };
    case "skr":
      return { id: newId(), type, enabled: true };
    case "stamps":
      return { id: newId(), type, enabled: true };
    case "shop":
      return { id: newId(), type, items: [] };
    case "image":
      return { id: newId(), type, url: "", alt: "" };
    case "gallery":
      return { id: newId(), type, items: [] };
    case "embed":
      return { id: newId(), type, url: "" };
    case "cta":
      return { id: newId(), type, label: "", url: "" };
    case "contact":
      return { id: newId(), type, email: "", buttonLabel: "Email me" };
    case "posts":
      return { id: newId(), type, heading: "Latest posts" };
    case "socials":
      return { id: newId(), type, items: [] };
    case "faq":
      return { id: newId(), type, items: [] };
  }
}

function withName(blocks: SiteBlock[], name: string): SiteBlock[] {
  return blocks.map((block) => (
    block.type === "identity" ? { ...block, name: name.replace(/\.skr$/i, "") } : block
  ));
}

export function defaultCardBlocks(name = ""): SiteBlock[] {
  return withName([
    createBlock("identity"),
    createBlock("stamps"),
    createBlock("skr"),
    createBlock("shop"),
    createBlock("links"),
    createBlock("about"),
  ], name);
}

export function starterBlocks(starter: PageStarter, name = ""): SiteBlock[] {
  const labeled = (types: SiteBlockType[]) => withName(types.map(createBlock), name);
  switch (starter) {
    case "links":
      return labeled(["identity", "links", "socials", "cta"]);
    case "profile":
      return labeled(["identity", "about", "skr", "links", "socials"]);
    case "project":
      return labeled(["identity", "about", "image", "cta", "links"]);
    case "shop":
      return labeled(["identity", "shop", "about", "cta", "links"]);
    case "event":
      return labeled(["identity", "about", "cta", "links", "image"]);
    case "prompt":
    case "card":
    default:
      return defaultCardBlocks(name);
  }
}

export function identityBlock(blocks: SiteBlock[]): IdentityBlock {
  const found = blocks.find((block): block is IdentityBlock => block.type === "identity");
  return found ?? (createBlock("identity") as IdentityBlock);
}

export function siteDomain(blocks: SiteBlock[]): string {
  const label = identityBlock(blocks).name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  return label ? `${label}.skr` : "";
}

export function publicSiteUrl(blocks: SiteBlock[]): string {
  const domain = siteDomain(blocks);
  return domain ? `https://${domain.replace(/\.skr$/, "")}.skr.site` : "";
}

function occupiesSlot(type: SiteBlockType): SiteBlockType {
  return type === "about" ? "richtext" : type;
}

export function addableTypes(blocks: SiteBlock[]): SiteBlockType[] {
  const present = new Set(blocks.map((block) => occupiesSlot(block.type)));
  return ADDABLE.filter((type) => !present.has(occupiesSlot(type)));
}

export function addBlock(blocks: SiteBlock[], type: SiteBlockType): SiteBlock[] {
  if (type === "identity") return blocks;
  const slot = occupiesSlot(type);
  if (blocks.some((block) => occupiesSlot(block.type) === slot)) return blocks;
  return [...blocks, createBlock(type)];
}

export function removeBlock(blocks: SiteBlock[], id: string): SiteBlock[] {
  return blocks.filter((block) => !(block.id === id && block.type !== "identity"));
}

export function moveBlock(blocks: SiteBlock[], id: string, direction: -1 | 1): SiteBlock[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index < 0) return blocks;
  const target = index + direction;
  if (target < 0 || target >= blocks.length) return blocks;
  if (blocks[index].type === "identity" || blocks[target].type === "identity") return blocks;
  const next = [...blocks];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function updateBlock(blocks: SiteBlock[], nextBlock: SiteBlock): SiteBlock[] {
  return blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block));
}

export function sanitizeHref(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
  } catch {
    return "";
  }
  return "";
}

export function sanitizeLink(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("mailto:")) {
    const email = raw.slice("mailto:".length).split("?")[0];
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? raw : "";
  }
  if (raw === "/" || (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("..") && !raw.includes("\\"))) {
    return /^\/(?:[a-z0-9][a-z0-9\-_\/]*)?\/?$/i.test(raw) ? raw : "";
  }
  return sanitizeHref(raw);
}

export function sanitizeEmail(value: string): string {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function isAllowedEmbed(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return EMBED_HOSTS.includes(host);
  } catch {
    return false;
  }
}

export function embedSrc(url: string): string {
  const safe = sanitizeHref(url);
  if (!safe || !isAllowedEmbed(safe)) return "";
  const parsed = new URL(safe);
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = parsed.pathname.replace("/", "");
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : "";
  }
  if (host === "youtube.com") {
    const id = parsed.searchParams.get("v") ?? parsed.pathname.split("/").filter(Boolean).pop();
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : "";
  }
  if (host === "open.spotify.com") {
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`;
  }
  if (host === "player.spotify.com") return safe;
  if (host === "x.com" || host === "twitter.com") return safe;
  return "";
}

export function normalizeLinks(items: SiteLink[], limit = MAX_LINKS): SiteLink[] {
  return items
    .map((item) => ({ label: item.label.trim(), url: item.url.trim() }))
    .filter((item) => item.label || item.url)
    .slice(0, limit);
}

export function validateBlocks(blocks: SiteBlock[], options: { requireIdentity?: boolean } = {}): string[] {
  const errors: string[] = [];
  const requireIdentity = options.requireIdentity ?? true;
  const hasIdentity = blocks.some((block) => block.type === "identity");
  if (requireIdentity || hasIdentity) {
    const identity = identityBlock(blocks);
    const label = identity.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (requireIdentity && !label) errors.push("Add your .skr name in the Passport block");
    if (identity.photoUrl && !sanitizeHref(identity.photoUrl)) errors.push("Photo URL must start with http or https");
    if (identity.tagline.length > 140) errors.push("Tagline should be under 140 characters");
  }

  for (const block of blocks) {
    if (block.type === "links" || block.type === "socials") {
      if (block.items.length > MAX_LINKS) errors.push(`${block.type === "links" ? "Links" : "Socials"} can have up to ${MAX_LINKS} items`);
      for (const item of block.items) {
        if ((item.label || item.url) && !sanitizeLink(item.url)) {
          errors.push(`“${item.label || item.url}” needs a valid http(s), mailto, or /page link`);
        }
      }
    }
    if (block.type === "image" && block.url && !sanitizeHref(block.url)) {
      errors.push("Image URL must start with http or https");
    }
    if (block.type === "gallery") {
      if (block.items.length > MAX_GALLERY) errors.push(`Galleries can have up to ${MAX_GALLERY} images`);
      for (const item of block.items) {
        if (item.url && !sanitizeHref(item.url)) errors.push("Gallery images must use http or https URLs");
      }
    }
    if (block.type === "embed" && block.url && (!sanitizeHref(block.url) || !isAllowedEmbed(block.url))) {
      errors.push("Embeds can be YouTube, X, or Spotify links");
    }
    if (block.type === "cta" && (block.label || block.url) && (!block.label.trim() || !sanitizeLink(block.url))) {
      errors.push("The call to action needs a label and a valid link");
    }
    if (block.type === "contact" && (block.email || block.buttonLabel) && !sanitizeEmail(block.email)) {
      errors.push("The contact block needs a valid email");
    }
    if (block.type === "faq" && block.items.length > MAX_FAQ) {
      errors.push(`FAQ can have up to ${MAX_FAQ} questions`);
    }
    if (block.type === "shop") {
      if (block.items.length > MAX_SHOP_ITEMS) errors.push(`Shop can have up to ${MAX_SHOP_ITEMS} items`);
      for (const item of block.items) {
        if (!item.title.trim() && !item.price) continue;
        if (!item.title.trim()) errors.push("Each shop item needs a title");
        if (!Number.isFinite(item.price) || item.price <= 0) errors.push(`“${item.title || "Item"}” needs a price above zero`);
        if (item.currency !== "SKR" && item.currency !== "SOL") errors.push("Shop prices must be in SKR or SOL");
        if (item.image && !sanitizeHref(item.image)) errors.push("Shop images must use http or https URLs");
      }
    }
  }
  return errors;
}

export function applyPromptToBlocks(blocks: SiteBlock[], prompt: string, context: { name?: string } = {}): SiteBlock[] {
  const text = prompt.trim();
  if (!text) return blocks;

  let next = blocks.map((block) => ({ ...block })) as SiteBlock[];
  if (!next.some((block) => block.type === "identity")) next = [createBlock("identity"), ...next];

  const nameMatch = text.match(/\b([a-z0-9-]{1,64})\.skr\b/i);
  if (nameMatch || context.name) {
    const name = (nameMatch?.[1] ?? context.name ?? "").replace(/\.skr$/i, "");
    next = withName(next, name);
  }

  const urls = Array.from(text.matchAll(/https?:\/\/[^\s)]+/gi)).map((match) => sanitizeHref(match[0])).filter(Boolean);
  const imageUrls = urls.filter((url) => /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url) || /[?&](format|img)=/i.test(url));
  const socialUrls = urls.filter((url) => /(?:twitter|x|instagram|github|youtube|discord|warpcast|lens)\./i.test(url));
  const otherUrls = urls.filter((url) => !imageUrls.includes(url) && !socialUrls.includes(url));

  const quoted = text.match(/[“"]([^”"]{3,140})[”"]/);
  const wantsTagline = /tagline|headline|subtitle|title/i.test(text);
  const wantsAbout = /about|bio|story|describe|rewrite/i.test(text);
  const compact = text.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();

  next = next.map((block) => {
    if (block.type === "identity") {
      const tagline = quoted?.[1] ?? (wantsTagline || compact.length <= 80 ? compact : block.tagline);
      return { ...block, tagline: (tagline || block.tagline).slice(0, 140) };
    }
    return block;
  });

  if (wantsAbout || compact.length > 80) {
    if (!next.some((block) => block.type === "about" || block.type === "richtext")) next = addBlock(next, "about");
    next = next.map((block) => (
      block.type === "about" || block.type === "richtext" ? { ...block, text: compact.slice(0, 600) } : block
    ));
  }

  if (otherUrls.length) {
    if (!next.some((block) => block.type === "links")) next = addBlock(next, "links");
    next = next.map((block) => {
      if (block.type !== "links") return block;
      const existing = new Set(block.items.map((item) => item.url));
      const added = otherUrls
        .filter((url) => !existing.has(url))
        .map((url) => ({ label: linkLabel(url), url }));
      return { ...block, items: normalizeLinks([...block.items, ...added]) };
    });
  }

  if (socialUrls.length) {
    if (!next.some((block) => block.type === "socials")) next = addBlock(next, "socials");
    next = next.map((block) => {
      if (block.type !== "socials") return block;
      const existing = new Set(block.items.map((item) => item.url));
      const added = socialUrls
        .filter((url) => !existing.has(url))
        .map((url) => ({ label: linkLabel(url), url }));
      return { ...block, items: normalizeLinks([...block.items, ...added]) };
    });
  }

  if (imageUrls[0]) {
    if (!next.some((block) => block.type === "image")) next = addBlock(next, "image");
    next = next.map((block) => (block.type === "image" ? { ...block, url: imageUrls[0], alt: block.alt || "Image" } : block));
  }

  const ctaMatch = text.match(/(?:cta|button|call to action)\s*[:\-]\s*([^,\n]+)/i);
  if (ctaMatch || /call to action|add a button/i.test(text)) {
    if (!next.some((block) => block.type === "cta")) next = addBlock(next, "cta");
    const ctaUrl = otherUrls[0] ?? socialUrls[0] ?? "";
    next = next.map((block) => (
      block.type === "cta"
        ? { ...block, label: (ctaMatch?.[1] ?? block.label ?? "Visit").trim().slice(0, 40), url: block.url || ctaUrl }
        : block
    ));
  }

  const tint = TINTS.find((item) => compact.toLowerCase().includes(item.id) || compact.toLowerCase().includes(item.label.toLowerCase()));
  if (tint) {
    next = next.map((block) => (block.type === "identity" ? { ...block, tint: tint.value } : block));
  }

  return next;
}

function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("x.com") || host.includes("twitter")) return "X";
    if (host.includes("github")) return "GitHub";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("youtube")) return "YouTube";
    if (host.includes("discord")) return "Discord";
    return host.split(".")[0]?.replace(/^\w/, (char) => char.toUpperCase()) || "Link";
  } catch {
    return "Link";
  }
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function sanitizeCssColor(value: string): string {
  return /^#[0-9a-f]{3,8}$/i.test(value.trim()) ? value.trim() : "#00C9A7";
}

export type RenderOptions = {
  wallet?: string;
  profileUrl?: string;
  isSeeker?: boolean;
  passport?: boolean;
  resolveHref?: (href: string) => string;
  postLinks?: SiteLink[];
};

function hrefFor(url: string, options: RenderOptions = {}): string {
  const safe = sanitizeLink(url);
  if (!safe) return "";
  if (options.resolveHref && safe.startsWith("/")) return options.resolveHref(safe);
  return safe;
}

export function renderBlocksInnerHtml(blocks: SiteBlock[], options: RenderOptions = {}): string {
  const identity = identityBlock(blocks);
  const domain = siteDomain(blocks) || "your.skr";
  const tagline = escapeHtml(identity.tagline || "Seeker ID");
  const name = escapeHtml(identity.name.trim() || "your");
  const photo = sanitizeHref(identity.photoUrl);
  const wallet = options.wallet ?? "";
  const profileApi = options.profileUrl ?? SKR_PROFILE_API;
  const badge = options.isSeeker ? `<span class="badge">Seeker-verified</span>` : "";

  const photoTag = photo
    ? `<div class="avatar-wrap"><img class="photo" src="${escapeHtml(photo)}" alt="" />${badge}</div>`
    : `<div class="avatar-wrap"><div class="knot" aria-hidden="true"></div>${badge}</div>`;

  return blocks.map((block) => {
    switch (block.type) {
      case "identity": {
        const bound = options.passport
          ? `<p class="bound">One Seeker, one name. This .skr is bound to the wallet.</p>`
          : "";
        return `<header class="identity${options.passport ? " passport" : ""}">${photoTag}<p class="kicker">${escapeHtml(domain)}</p><h1>${name}<span class="dot">.skr</span></h1><p class="tagline">${tagline}</p>${bound}</header>`;
      }
      case "about":
        return block.text.trim() ? `<section class="about"><h2>About</h2><p>${escapeHtml(block.text)}</p></section>` : "";
      case "richtext":
        return block.text.trim() ? `<section class="about richtext">${formatRichText(block.text)}</section>` : "";
      case "links": {
        const items = normalizeLinks(block.items).map((item) => ({ ...item, url: hrefFor(item.url, options) })).filter((item) => item.url);
        if (!items.length) return "";
        return `<nav class="links">${items.map((item) => `<a class="btn" href="${escapeHtml(item.url)}">${escapeHtml(item.label || item.url)}</a>`).join("")}</nav>`;
      }
      case "skr":
        if (!block.enabled || !wallet) return "";
        return `<section class="skr" hidden data-skr-live="${escapeHtml(wallet)}" data-skr-api="${escapeHtml(profileApi)}">
          <p class="skr-label">Live SKR position</p>
          <p class="skr-total"><strong data-skr-field="total"></strong><span>SKR</span></p>
          <div class="skr-grid">
            <div><b>Liquid</b><span data-skr-field="liquid"></span></div>
            <div><b>Staked</b><span data-skr-field="staked"></span></div>
            <div><b>Yield</b><span data-skr-field="yieldEarned"></span></div>
            <div><b>Unstaking</b><span data-skr-field="unstaking"></span></div>
            <div><b>Guardian</b><span data-skr-field="guardian"></span></div>
          </div>
        </section>`;
      case "stamps":
        if (!block.enabled || !wallet) return "";
        return `<section class="stamps" hidden data-stamps-live="${escapeHtml(wallet)}" data-stamps-api="${escapeHtml(profileApi)}">
          <h2>Stamps</h2>
          <div class="stamp-grid" data-stamps-grid></div>
        </section>`;
      case "shop":
        return renderShopBlock(block, options);
      case "image":
        return sanitizeHref(block.url)
          ? `<figure class="shot"><img src="${escapeHtml(sanitizeHref(block.url))}" alt="${escapeHtml(block.alt)}" /></figure>`
          : "";
      case "gallery": {
        const items = block.items.filter((item) => sanitizeHref(item.url)).slice(0, MAX_GALLERY);
        if (!items.length) return "";
        return `<section class="gallery">${items.map((item) => `<img src="${escapeHtml(sanitizeHref(item.url))}" alt="${escapeHtml(item.alt)}" />`).join("")}</section>`;
      }
      case "embed": {
        const src = embedSrc(block.url);
        if (!src) return "";
        if (/x\.com|twitter\.com/i.test(src)) {
          return `<p class="embed-link"><a href="${escapeHtml(src)}">View on X</a></p>`;
        }
        return `<div class="embed"><iframe src="${escapeHtml(src)}" title="Embedded media" loading="lazy" allow="encrypted-media; fullscreen; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"></iframe></div>`;
      }
      case "cta": {
        const href = hrefFor(block.url, options);
        return block.label.trim() && href
          ? `<p class="cta"><a class="btn primary" href="${escapeHtml(href)}">${escapeHtml(block.label)}</a></p>`
          : "";
      }
      case "contact": {
        const email = sanitizeEmail(block.email);
        if (!email) return "";
        const label = escapeHtml(block.buttonLabel.trim() || "Email me");
        return `<p class="cta contact"><a class="btn primary" href="mailto:${escapeHtml(email)}">${label}</a></p>`;
      }
      case "posts": {
        const items = (options.postLinks ?? []).filter((item) => item.url);
        if (!items.length) return "";
        return `<section class="posts"><h2>${escapeHtml(block.heading || "Latest posts")}</h2><ul>${items.map((item) => `<li><a href="${escapeHtml(hrefFor(item.url, options) || item.url)}">${escapeHtml(item.label)}</a></li>`).join("")}</ul></section>`;
      }
      case "socials": {
        const items = normalizeLinks(block.items).map((item) => ({ ...item, url: hrefFor(item.url, options) })).filter((item) => item.url);
        if (!items.length) return "";
        return `<nav class="socials">${items.map((item) => `<a href="${escapeHtml(item.url)}">${escapeHtml(item.label || item.url)}</a>`).join(" · ")}</nav>`;
      }
      case "faq": {
        const items = block.items.filter((item) => item.question.trim() && item.answer.trim()).slice(0, MAX_FAQ);
        if (!items.length) return "";
        return `<section class="faq"><h2>FAQ</h2>${items.map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join("")}</section>`;
      }
    }
  }).join("\n");
}


function renderShopBlock(block: ShopBlock, options: RenderOptions): string {
  const items = block.items
    .filter((item) => item.title.trim() && Number.isFinite(item.price) && item.price > 0 && (item.currency === "SKR" || item.currency === "SOL"))
    .slice(0, MAX_SHOP_ITEMS);
  if (!items.length) return "";
  const wallet = options.wallet ?? "";
  const cards = items.map((item) => {
    const title = escapeHtml(item.title.trim());
    const desc = item.description.trim() ? `<p>${escapeHtml(item.description.trim())}</p>` : "";
    const image = sanitizeHref(item.image);
    const img = image ? `<img src="${escapeHtml(image)}" alt="" />` : "";
    const amount = formatPayAmount(item.price);
    const price = `${escapeHtml(amount)} ${item.currency}`;
    const href = wallet ? solanaPayTransferUrl({
      recipient: wallet,
      amount: item.price,
      currency: item.currency,
      label: item.title.trim(),
      message: item.description.trim() || item.title.trim(),
      memo: item.title.trim().slice(0, 32),
    }) : "";
    const qr = href ? solanaPayQrSvg(href) : "";
    const pay = href
      ? `<div class="shop-pay"><span class="price">${price}</span><a href="${escapeHtml(href)}">Pay with Solana Pay</a>${qr ? `<div class="shop-pay-qr qr">${qr}</div>` : ""}</div>`
      : `<div class="shop-pay"><span class="price">${price}</span></div>`;
    const deliveryRaw = item.delivery.trim();
    const deliveryHref = sanitizeHref(deliveryRaw) || (deliveryRaw.startsWith("/") ? sanitizeLink(deliveryRaw) : "");
    const delivery = deliveryRaw
      ? (deliveryHref ? `<p class="shop-note">Delivery: <a href="${escapeHtml(deliveryHref)}">${escapeHtml(deliveryRaw)}</a></p>` : `<p class="shop-note">Delivery: ${escapeHtml(deliveryRaw)}</p>`)
      : "";
    return `<article class="shop-item">${img}<div class="body"><h3>${title}</h3>${desc}${pay}${delivery}</div></article>`;
  }).join("");
  const note = wallet
    ? `<p class="shop-note">Payment goes straight to this wallet. No platform cut.</p>`
    : `<p class="shop-note">The owner has not connected a wallet for checkout yet.</p>`;
  return `<section class="shop"><h2>Shop</h2>${cards}${note}</section>`;
}

function formatRichText(text: string): string {
  const escaped = escapeHtml(text.trim());
  const withBreaks = escaped.split(/\n{2,}/).map((para) => `<p>${para.replaceAll("\n", "<br />")}</p>`).join("");
  return withBreaks.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function skrLiveScript(wallet?: string): string {
  if (!wallet) return "";
  return `<script>
(function(){
  var root=document.querySelector("[data-skr-live]");
  if(!root) return;
  var wallet=root.getAttribute("data-skr-live");
  var api=root.getAttribute("data-skr-api")||"${SKR_PROFILE_API}";
  function hide(){ root.setAttribute("hidden","hidden"); root.classList.remove("is-ready"); }
  function show(){ root.removeAttribute("hidden"); root.classList.add("is-ready"); }
  if(!wallet){ hide(); return; }
  function fmt(n){ if(!isFinite(n)) return null; if(n===0) return "0"; return n>=1000?n.toLocaleString("en-US",{maximumFractionDigits:1}):n.toLocaleString("en-US",{maximumFractionDigits:2}); }
  function short(v){ return !v||v==="None"? "None" : (v.length<10?v:v.slice(0,4)+"…"+v.slice(-4)); }
  fetch(api+"?wallet="+encodeURIComponent(wallet),{cache:"no-store"}).then(function(r){
    if(!r.ok) throw new Error("profile");
    return r.json();
  }).then(function(d){
    if(!d||typeof d.total!=="number") throw new Error("profile");
    var map={total:fmt(d.total),liquid:fmt(d.liquid),staked:fmt(d.staked),yieldEarned:fmt(d.yieldEarned),unstaking:fmt(d.unstaking),guardian:short(d.guardian)};
    if(!map.total) throw new Error("profile");
    Object.keys(map).forEach(function(k){ var el=root.querySelector('[data-skr-field="'+k+'"]'); if(el&&map[k]!=null) el.textContent=map[k]; });
    show();
  }).catch(hide);
})();
</script>`;
}

export function sitePageCss(tint: string, theme?: SiteTheme): string {
  const color = sanitizeCssColor(tint);
  const typography = theme?.typography ?? "sans";
  const density = theme?.density ?? "comfortable";
  const background = theme?.background ?? "glass";
  const font = typography === "editorial"
    ? 'Georgia, "Times New Roman", serif'
    : typography === "display"
      ? 'Syne, "Space Grotesk", Inter, system-ui, sans-serif'
      : "Inter, system-ui, sans-serif";
  const pad = density === "compact" ? "4px 16px 18px" : "8px 22px 24px";
  const bgLayer = background === "mesh"
    ? "repeating-linear-gradient(135deg,rgba(190,190,190,.06) 0 1px,transparent 1px 18px),"
    : background === "nebula"
      ? "radial-gradient(circle at 80% 20%,color-mix(in srgb,var(--teal) 22%,transparent),transparent 36%),radial-gradient(circle at 10% 90%,rgba(139,124,255,.18),transparent 30%),"
      : background === "flat"
        ? ""
        : "radial-gradient(circle at 50% -10%,rgba(232,232,232,.12),transparent 34%),";
  const extra: string[] = [];
  if (theme?.stampStyle === "stack") extra.push(".stamp-grid { grid-template-columns:1fr; }");
  if (theme?.shopStyle === "featured") extra.push(".shop-item:first-of-type { grid-column:1/-1; }");
  if (theme?.typography === "editorial") extra.push("h1,.page-title { font-style:italic; letter-spacing:-.04em; }");
  return `:root { --bg:#0A0A0A; --teal:${color}; --chrome:#BEBEBE; --text:#F0F0F0; --muted:#888; --font:${font}; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; color:var(--text); font-family:${font};
      background:${bgLayer}radial-gradient(circle at 18% 80%,color-mix(in srgb,var(--teal) 28%,transparent),transparent 32%),var(--bg);
      display:flex; flex-direction:column; align-items:center; padding:0 16px 40px; }
    .page { width:min(720px,94vw); margin:0 auto 24px; background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
      border:1px solid rgba(190,190,190,.2); border-radius:0 0 28px 28px; padding:${pad};
      box-shadow:0 22px 80px rgba(0,0,0,.42),0 0 40px color-mix(in srgb,var(--teal) 18%,transparent); }
    .page.solo { border-radius:28px; margin-top:28px; padding:28px 22px 24px; }
    .site-nav { width:min(720px,94vw); margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:10px;
      padding:14px 4px 10px; border-bottom:1px solid rgba(190,190,190,.16); }
    .brand { font-weight:800; color:var(--text); text-decoration:none; letter-spacing:-.03em; font-size:1.05rem; }
    .brand .dot { background:linear-gradient(90deg,var(--teal),#e8e8e8,var(--teal)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .nav-links { display:flex; flex-wrap:wrap; gap:12px; font-size:.82rem; font-weight:650; }
    .nav-links a { color:var(--muted); text-decoration:none; }
    .nav-links a[aria-current="page"] { color:var(--teal); }
    .nav-toggle { display:none; }
    .nav-more { display:none; color:var(--teal); font-weight:700; font-size:.82rem; cursor:pointer; }
    nav.collapse .nav-more { display:inline; }
    nav.collapse .nav-links { display:none; }
    nav.collapse:has(#nav-toggle:checked) .nav-links { display:flex; flex-direction:column; position:absolute; right:16px; top:52px; background:rgba(10,10,10,.94); border:1px solid rgba(190,190,190,.2); border-radius:14px; padding:12px 16px; z-index:4; }
    h1 { margin:6px 0 8px; font-size:clamp(2rem,6vw,3rem); letter-spacing:-.03em; }
    .dot { background:linear-gradient(90deg,var(--teal),#e8e8e8,var(--teal)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .kicker { color:var(--teal); letter-spacing:.16em; text-transform:uppercase; font-size:.72rem; font-weight:800; margin:0; }
    .tagline,.about p { color:var(--muted); margin:0 0 14px; }
    .identity { text-align:center; }
    .avatar-wrap { position:relative; width:104px; height:104px; margin:8px auto 12px; }
    .photo { width:104px; height:104px; border-radius:50%; object-fit:cover; border:2px solid color-mix(in srgb,var(--teal) 60%,#000); box-shadow:0 0 28px color-mix(in srgb,var(--teal) 30%,transparent); }
    .knot { width:104px; height:104px; border-radius:50%; background:radial-gradient(circle at 35% 30%,#e8e8e8,transparent 42%),radial-gradient(circle at 70% 70%,var(--teal),transparent 46%),#111; }
    .badge { position:absolute; left:50%; bottom:-8px; transform:translateX(-50%); background:linear-gradient(135deg,var(--teal),#8ed4c0); color:#04110e; font-size:.62rem; font-weight:800; letter-spacing:.14em; padding:4px 8px; border-radius:999px; }
    .links { display:flex; flex-direction:column; gap:8px; margin:18px 0; }
    .btn { display:block; text-align:center; color:#04110e; background:rgba(255,255,255,.03); color:var(--text); border:1px solid rgba(190,190,190,.2); text-decoration:none; font-weight:700; border-radius:14px; padding:12px 14px; }
    .btn.primary { color:#04110e; background:linear-gradient(135deg,var(--teal),#8ed4c0); border:0; margin:16px 0 0; box-shadow:0 0 28px color-mix(in srgb,var(--teal) 35%,transparent); }
    .skr { margin:16px 0; padding:14px; border:1px solid rgba(190,190,190,.2); border-radius:16px; }
    .skr-label { margin:0 0 6px; color:var(--chrome); font-size:.68rem; letter-spacing:.12em; text-transform:uppercase; font-weight:700; }
    .skr-total { margin:0 0 10px; font-size:2rem; font-weight:800; }
    .skr-total span { font-size:.9rem; color:var(--muted); margin-left:6px; font-weight:600; }
    .skr-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 16px; font-size:.9rem; }
    .skr-grid b { color:var(--muted); font-weight:600; display:block; }
    .shot img { width:100%; border-radius:16px; display:block; }
    .gallery { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:16px 0; }
    .gallery img { width:100%; height:140px; object-fit:cover; border-radius:14px; }
    .embed { margin:16px 0; aspect-ratio:16/9; }
    .embed iframe { width:100%; height:100%; border:0; border-radius:16px; }
    .posts ul { padding:0; list-style:none; display:grid; gap:8px; }
    .posts a { color:var(--teal); text-decoration:none; font-weight:700; }
    .faq details { border-top:1px solid rgba(190,190,190,.16); padding:10px 0; }
    .faq summary { cursor:pointer; font-weight:700; }
    .socials { margin-top:18px; text-align:center; }
    .socials a { color:var(--teal); text-decoration:none; }
    h2 { font-size:.95rem; letter-spacing:.08em; text-transform:uppercase; color:var(--chrome); }
    .page-title { margin:18px 0 8px; font-size:clamp(1.8rem,7vw,2.6rem); letter-spacing:-.04em; }
    .bound { margin:0 0 8px; color:var(--teal); font-size:.78rem; font-weight:700; letter-spacing:.02em; }
    .badge { white-space:nowrap; }
    .skr[hidden], .stamps[hidden] { display:none; }
    .stamps { margin:16px 0; }
    .stamp-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .stamp { border:1px solid rgba(190,190,190,.2); border-radius:14px; padding:10px; background:rgba(255,255,255,.04); }
    .stamp i { display:grid; place-items:center; width:22px; height:22px; border-radius:7px; background:rgba(0,201,167,.16); color:var(--teal); font-style:normal; font-size:.7rem; font-weight:800; margin-bottom:6px; }
    .stamp b { display:block; font-size:.82rem; }
    .stamp span { display:block; color:var(--muted); font-size:.68rem; margin-top:2px; }
    .shop { margin:16px 0; display:grid; gap:10px; }
    .shop-item { border:1px solid rgba(190,190,190,.2); border-radius:18px; overflow:hidden; background:rgba(255,255,255,.04); }
    .shop-item img { width:100%; height:120px; object-fit:cover; display:block; }
    .shop-item .body { padding:12px 14px 14px; }
    .shop-item h3 { margin:0 0 4px; font-size:1.05rem; }
    .shop-item p { margin:0 0 10px; color:var(--muted); font-size:.82rem; }
    .shop-pay { display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .shop-pay .price { font-weight:800; }
    .shop-pay a { color:#04110e; background:linear-gradient(135deg,var(--teal),#8ed4c0); text-decoration:none; font-weight:800; border-radius:999px; padding:8px 12px; }
    .shop-pay .qr { width:88px; height:88px; background:#F0F0F0; border-radius:10px; padding:4px; flex:0 0 88px; }
    .shop-pay .qr svg { width:100%; height:100%; display:block; }
    .shop-note { color:var(--muted); font-size:.72rem; margin:8px 0 0; }
    ${extra.join("\n    ")}`;
}

export function renderBlocksHtml(
  blocks: SiteBlock[],
  options: RenderOptions = {},
): string {
  const identity = identityBlock(blocks);
  const domain = siteDomain(blocks) || "your.skr";
  const tint = sanitizeCssColor(identity.tint);
  const body = renderBlocksInnerHtml(blocks, options);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(domain)}</title>
  <style>
    ${sitePageCss(tint)}
    body { padding:28px 16px; }
  </style>
</head>
<body>
  <main class="page solo">
    ${body}
  </main>
  ${skrLiveScript(options.wallet)}
  ${options.wallet ? stampsLiveScript() : ""}
</body>
</html>`;
}

export type StudioDraft = {
  starter: PageStarter;
  blocks: SiteBlock[];
};

export function readDraft(storageKey: string): StudioDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioDraft;
    if (!parsed || !Array.isArray(parsed.blocks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDraft(storageKey: string, draft: StudioDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(draft));
}

export function draftStorageKey(wallet?: string): string {
  return wallet ? `${STUDIO_DRAFT_KEY}:${wallet}` : `${STUDIO_DRAFT_KEY}:guest`;
}

export const BLOCK_META: Record<SiteBlockType, { title: string; hint: string }> = {
  identity: { title: "Passport", hint: "Bound .skr identity. One Seeker, one name." },
  stamps: { title: "Stamps", hint: "Auto-verified from on-chain activity" },
  shop: { title: "Shop", hint: "Items paid to this wallet, no platform cut" },
  about: { title: "Rich text", hint: "A short bio" },
  richtext: { title: "Rich text", hint: "A longer page section" },
  links: { title: "Links", hint: `Up to ${MAX_LINKS} buttons` },
  skr: { title: "SKR position", hint: "Live on-chain totals" },
  image: { title: "Image", hint: "A photo or graphic" },
  gallery: { title: "Gallery", hint: `Up to ${MAX_GALLERY} images` },
  embed: { title: "Embed", hint: "YouTube, X, or Spotify" },
  cta: { title: "Call to action", hint: "One main button" },
  contact: { title: "Contact form", hint: "A mailto button" },
  posts: { title: "Blog posts", hint: "A list of posts" },
  socials: { title: "Socials", hint: "X and other profiles" },
  faq: { title: "FAQ", hint: "Questions and answers" },
};
