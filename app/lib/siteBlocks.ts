export type SiteBlockType = "identity" | "about" | "links" | "skr" | "image" | "cta" | "socials";

export type SiteLink = { label: string; url: string };

export type IdentityBlock = {
  id: string;
  type: "identity";
  name: string;
  tagline: string;
  photoUrl: string;
  tint: string;
};

export type AboutBlock = { id: string; type: "about"; text: string };
export type LinksBlock = { id: string; type: "links"; items: SiteLink[] };
export type SkrBlock = { id: string; type: "skr"; enabled: boolean };
export type ImageBlock = { id: string; type: "image"; url: string; alt: string };
export type CtaBlock = { id: string; type: "cta"; label: string; url: string };
export type SocialsBlock = { id: string; type: "socials"; items: SiteLink[] };

export type SiteBlock =
  | IdentityBlock
  | AboutBlock
  | LinksBlock
  | SkrBlock
  | ImageBlock
  | CtaBlock
  | SocialsBlock;

export type PageStarter = "card" | "profile" | "links" | "project" | "shop" | "event" | "prompt";

export const BLOCK_PAGE_TEMPLATE_ID = "studio";
export const MAX_LINKS = 5;
export const STUDIO_DRAFT_KEY = "skr:studio-blocks:v1";

export const TINTS = [
  { id: "teal", value: "#00C9A7", label: "Teal" },
  { id: "violet", value: "#8B7CFF", label: "Violet" },
  { id: "gold", value: "#D4AF37", label: "Gold" },
] as const;

const ADDABLE: SiteBlockType[] = ["about", "links", "skr", "image", "cta", "socials"];

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
    case "links":
      return { id: newId(), type, items: [] };
    case "skr":
      return { id: newId(), type, enabled: true };
    case "image":
      return { id: newId(), type, url: "", alt: "" };
    case "cta":
      return { id: newId(), type, label: "", url: "" };
    case "socials":
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
    createBlock("skr"),
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
      return labeled(["identity", "about", "image", "cta", "links"]);
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

export function addableTypes(blocks: SiteBlock[]): SiteBlockType[] {
  const present = new Set(blocks.map((block) => block.type));
  return ADDABLE.filter((type) => !present.has(type));
}

export function addBlock(blocks: SiteBlock[], type: SiteBlockType): SiteBlock[] {
  if (type === "identity") return blocks;
  if (blocks.some((block) => block.type === type)) return blocks;
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

export function normalizeLinks(items: SiteLink[], limit = MAX_LINKS): SiteLink[] {
  return items
    .map((item) => ({ label: item.label.trim(), url: item.url.trim() }))
    .filter((item) => item.label || item.url)
    .slice(0, limit);
}

export function validateBlocks(blocks: SiteBlock[]): string[] {
  const errors: string[] = [];
  const identity = identityBlock(blocks);
  const label = identity.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!label) errors.push("Add your .skr name in the Identity block");
  if (identity.photoUrl && !sanitizeHref(identity.photoUrl)) errors.push("Photo URL must start with http or https");
  if (identity.tagline.length > 140) errors.push("Tagline should be under 140 characters");

  for (const block of blocks) {
    if (block.type === "links" || block.type === "socials") {
      if (block.items.length > MAX_LINKS) errors.push(`${block.type === "links" ? "Links" : "Socials"} can have up to ${MAX_LINKS} items`);
      for (const item of block.items) {
        if ((item.label || item.url) && !sanitizeHref(item.url)) {
          errors.push(`“${item.label || item.url}” needs a valid http(s) link`);
        }
      }
    }
    if (block.type === "image" && block.url && !sanitizeHref(block.url)) {
      errors.push("Image URL must start with http or https");
    }
    if (block.type === "cta" && (block.label || block.url) && (!block.label.trim() || !sanitizeHref(block.url))) {
      errors.push("The call to action needs a label and a valid link");
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
    if (!next.some((block) => block.type === "about")) next = addBlock(next, "about");
    next = next.map((block) => (block.type === "about" ? { ...block, text: compact.slice(0, 600) } : block));
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeCssColor(value: string): string {
  return /^#[0-9a-f]{3,8}$/i.test(value.trim()) ? value.trim() : "#00C9A7";
}

export function renderBlocksHtml(
  blocks: SiteBlock[],
  options: { wallet?: string; profileUrl?: string } = {},
): string {
  const identity = identityBlock(blocks);
  const domain = siteDomain(blocks) || "your.skr";
  const tint = sanitizeCssColor(identity.tint);
  const tagline = escapeHtml(identity.tagline || "Seeker ID");
  const name = escapeHtml(identity.name.trim() || "your");
  const photo = sanitizeHref(identity.photoUrl);
  const wallet = options.wallet ?? "";
  const profileApi = options.profileUrl ?? "https://skr.site/api/skr-profile";

  const photoTag = photo
    ? `<img class="photo" src="${escapeHtml(photo)}" alt="" />`
    : `<div class="knot" aria-hidden="true"></div>`;

  const body = blocks.map((block) => {
    switch (block.type) {
      case "identity":
        return `<header class="identity">${photoTag}<p class="kicker">${domain}</p><h1>${name}<span class="dot">.skr</span></h1><p class="tagline">${tagline}</p></header>`;
      case "about":
        return block.text.trim() ? `<section class="about"><h2>About</h2><p>${escapeHtml(block.text)}</p></section>` : "";
      case "links": {
        const items = normalizeLinks(block.items).filter((item) => sanitizeHref(item.url));
        if (!items.length) return "";
        return `<nav class="links">${items.map((item) => `<a class="btn" href="${escapeHtml(sanitizeHref(item.url))}">${escapeHtml(item.label || item.url)}</a>`).join("")}</nav>`;
      }
      case "skr":
        if (!block.enabled) return "";
        return `<section class="skr" data-skr-live="${escapeHtml(wallet)}" data-skr-api="${escapeHtml(profileApi)}">
          <p class="skr-total"><strong data-skr-field="total">—</strong><span>SKR</span></p>
          <div class="skr-grid">
            <div><b>Liquid</b><span data-skr-field="liquid">—</span></div>
            <div><b>Staked</b><span data-skr-field="staked">—</span></div>
            <div><b>Yield</b><span data-skr-field="yieldEarned">—</span></div>
            <div><b>Unstaking</b><span data-skr-field="unstaking">—</span></div>
            <div><b>Guardian</b><span data-skr-field="guardian">—</span></div>
          </div>
        </section>`;
      case "image":
        return sanitizeHref(block.url)
          ? `<figure class="shot"><img src="${escapeHtml(sanitizeHref(block.url))}" alt="${escapeHtml(block.alt)}" /></figure>`
          : "";
      case "cta":
        return block.label.trim() && sanitizeHref(block.url)
          ? `<p class="cta"><a class="btn primary" href="${escapeHtml(sanitizeHref(block.url))}">${escapeHtml(block.label)}</a></p>`
          : "";
      case "socials": {
        const items = normalizeLinks(block.items).filter((item) => sanitizeHref(item.url));
        if (!items.length) return "";
        return `<nav class="socials">${items.map((item) => `<a href="${escapeHtml(sanitizeHref(item.url))}">${escapeHtml(item.label || item.url)}</a>`).join(" · ")}</nav>`;
      }
    }
  }).join("\n");

  const liveScript = wallet
    ? `<script>
(function(){
  var root=document.querySelector("[data-skr-live]");
  if(!root) return;
  var wallet=root.getAttribute("data-skr-live");
  var api=root.getAttribute("data-skr-api")||"https://skr.site/api/skr-profile";
  function fmt(n){ if(!isFinite(n)||n===0) return "0"; return n>=1000?n.toLocaleString("en-US",{maximumFractionDigits:1}):n.toLocaleString("en-US",{maximumFractionDigits:2}); }
  function short(v){ return !v||v==="None"? "None" : (v.length<10?v:v.slice(0,4)+"…"+v.slice(-4)); }
  fetch(api+"?wallet="+encodeURIComponent(wallet),{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){
    var map={total:fmt(d.total),liquid:fmt(d.liquid),staked:fmt(d.staked),yieldEarned:fmt(d.yieldEarned),unstaking:fmt(d.unstaking),guardian:short(d.guardian)};
    Object.keys(map).forEach(function(k){ var el=root.querySelector('[data-skr-field="'+k+'"]'); if(el) el.textContent=map[k]; });
  }).catch(function(){});
})();
</script>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(domain)}</title>
  <style>
    :root { --bg:#0A0A0A; --teal:${tint}; --chrome:#BEBEBE; --text:#F0F0F0; --muted:#888; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; color:var(--text); font-family:Inter,system-ui,sans-serif;
      background:radial-gradient(circle at 50% -10%,rgba(232,232,232,.12),transparent 34%),
                 radial-gradient(circle at 18% 80%,color-mix(in srgb,var(--teal) 28%,transparent),transparent 32%),var(--bg);
      display:grid; place-items:center; padding:28px 16px; }
    .page { width:min(720px,94vw); background:rgba(255,255,255,.04); border:1px solid rgba(190,190,190,.2);
      border-radius:28px; padding:28px; box-shadow:0 22px 80px rgba(0,0,0,.42),0 0 40px color-mix(in srgb,var(--teal) 22%,transparent); }
    h1 { margin:6px 0 8px; font-size:clamp(2rem,6vw,3rem); letter-spacing:-.03em; }
    .dot { background:linear-gradient(90deg,var(--teal),#e8e8e8,var(--teal)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .kicker { color:var(--teal); letter-spacing:.16em; text-transform:uppercase; font-size:.72rem; font-weight:800; margin:0; }
    .tagline,.about p { color:var(--muted); margin:0 0 14px; }
    .photo { width:88px; height:88px; border-radius:50%; object-fit:cover; border:2px solid color-mix(in srgb,var(--teal) 60%,#000); }
    .knot { width:88px; height:88px; border-radius:50%; background:radial-gradient(circle at 35% 30%,#e8e8e8,transparent 42%),radial-gradient(circle at 70% 70%,var(--teal),transparent 46%),#111; }
    .links { display:flex; flex-direction:column; gap:8px; margin:18px 0; }
    .btn { display:block; text-align:center; color:#000; background:linear-gradient(135deg,var(--teal),#8ed4c0); text-decoration:none; font-weight:700; border-radius:14px; padding:12px 14px; }
    .btn.primary { margin:16px 0 0; }
    .skr { margin:16px 0; padding:14px; border:1px solid rgba(190,190,190,.2); border-radius:16px; }
    .skr-total { margin:0 0 10px; font-size:2rem; font-weight:800; }
    .skr-total span { font-size:.9rem; color:var(--muted); margin-left:6px; font-weight:600; }
    .skr-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 16px; font-size:.9rem; }
    .skr-grid b { color:var(--muted); font-weight:600; display:block; }
    .shot img { width:100%; border-radius:16px; display:block; }
    .socials { margin-top:18px; text-align:center; }
    .socials a { color:var(--teal); text-decoration:none; }
    h2 { font-size:.95rem; letter-spacing:.08em; text-transform:uppercase; color:var(--chrome); }
  </style>
</head>
<body>
  <main class="page">
    ${body}
  </main>
  ${liveScript}
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
  identity: { title: "Identity", hint: "Photo, name, tagline" },
  about: { title: "About", hint: "A short bio" },
  links: { title: "Links", hint: `Up to ${MAX_LINKS} buttons` },
  skr: { title: "SKR position", hint: "Live on-chain totals" },
  image: { title: "Image", hint: "A photo or graphic" },
  cta: { title: "Call to action", hint: "One main button" },
  socials: { title: "Socials", hint: "X and other profiles" },
};
