import {
  BLOCK_PAGE_TEMPLATE_ID,
  STUDIO_DRAFT_KEY,
  STUDIO_SITE_DRAFT_KEY,
  addBlock,
  createBlock,
  defaultCardBlocks,
  escapeHtml,
  identityBlock,
  publicSiteUrl,
  sanitizeCssColor,
  sanitizeEmail,
  sanitizeHref,
  siteDomain,
  sitePageCss,
  skrLiveScript,
  starterBlocks,
  renderBlocksInnerHtml,
  validateBlocks,
  type PageStarter,
  type SiteBlock,
  type SiteBlockType,
  type SiteLink,
  type StudioDraft,
} from "./siteBlocks";

export type SitePageKind = "home" | "page" | "post";

export type SitePage = {
  id: string;
  title: string;
  slug: string;
  inNav: boolean;
  kind: SitePageKind;
  description: string;
  shareImage: string;
  blocks: SiteBlock[];
};

export type StudioSite = {
  starter: PageStarter;
  pages: SitePage[];
};

export type SiteFile = {
  path: string;
  content: string;
  contentType: string;
};

export const PAGE_STARTERS: { id: string; title: string; kind: SitePageKind; slug?: string; blocks: SiteBlockType[] }[] = [
  { id: "blank", title: "Blank", kind: "page", blocks: [] },
  { id: "about", title: "About", kind: "page", slug: "about", blocks: ["richtext"] },
  { id: "projects", title: "Projects", kind: "page", slug: "projects", blocks: ["richtext", "gallery", "cta"] },
  { id: "blog", title: "Blog", kind: "page", slug: "blog", blocks: ["richtext", "posts"] },
  { id: "gallery", title: "Gallery", kind: "page", slug: "gallery", blocks: ["gallery"] },
  { id: "contact", title: "Contact", kind: "page", slug: "contact", blocks: ["richtext", "contact"] },
  { id: "post", title: "Post", kind: "post", blocks: ["richtext", "image"] },
];

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.skr$/i, "")
    .replace(/\.+/g, "-")
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/*|\/*$/g, "")
    .replace(/^-+|-+$/g, "")
    .replace(/\.\./g, "")
    .slice(0, 64);
}

export function uniqueSlug(pages: SitePage[], desired: string, exceptId?: string): string {
  const base = slugify(desired) || "page";
  const taken = (slug: string) => pages.some((page) => page.id !== exceptId && page.slug === slug);
  if (!taken(base) && base !== "") return base;
  let index = 2;
  while (taken(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export function pageFilePath(slug: string): string {
  return slug ? `${slug.replace(/^\/+|\/+$/g, "")}/index.html` : "index.html";
}

export function publicPageUrl(domain: string, slug: string): string {
  const host = domain.replace(/\.skr$/, "");
  if (!host) return slug ? `/${slug}` : "/";
  return slug ? `https://${host}.skr.site/${slug}` : `https://${host}.skr.site`;
}

export function relativeHref(fromSlug: string, toSlug: string): string {
  if (fromSlug === toSlug) return "./";
  const fromParts = fromSlug ? fromSlug.split("/").filter(Boolean) : [];
  const up = fromParts.length ? "../".repeat(fromParts.length) : "";
  if (!toSlug) return up || "./";
  return `${up}${toSlug}/`;
}

export function resolvePublishedAssetPath(pathname: string): string | null {
  const raw = pathname.trim() || "/";
  if (raw.includes("..") || raw.includes("\\") || raw.startsWith("//")) return null;
  const clean = raw.split("?")[0]?.split("#")[0] ?? "/";
  if (clean === "/" || clean === "") return "index.html";
  const trimmed = clean.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed || !/^[a-z0-9][a-z0-9._\-\/]*$/i.test(trimmed)) return null;
  if (/\.(html|css|js|svg|ico|png|jpe?g|webp|json|txt|xml|webmanifest)$/i.test(trimmed)) return trimmed;
  return `${trimmed}/index.html`;
}

export function joinPublishedUrl(root: string, pathname: string): string | null {
  const asset = resolvePublishedAssetPath(pathname);
  if (!asset) return null;
  try {
    const base = root.endsWith("/") ? root : `${root}/`;
    return new URL(asset, base).toString();
  } catch {
    return null;
  }
}

export function homePage(site: StudioSite): SitePage {
  return site.pages.find((page) => page.kind === "home") ?? site.pages[0];
}

export function siteName(site: StudioSite): string {
  return identityBlock(homePage(site)?.blocks ?? []).name;
}

export function siteIdentity(site: StudioSite) {
  return identityBlock(homePage(site)?.blocks ?? []);
}

export function sitePublicUrl(site: StudioSite): string {
  return publicSiteUrl(homePage(site)?.blocks ?? []);
}

export function siteDomainName(site: StudioSite): string {
  return siteDomain(homePage(site)?.blocks ?? []);
}

export function navPages(site: StudioSite): SitePage[] {
  return site.pages.filter((page) => page.inNav);
}

export function createDefaultSite(name = "", starter: PageStarter = "card"): StudioSite {
  const blocks = starter === "card" || starter === "prompt"
    ? defaultCardBlocks(name)
    : starterBlocks(starter, name);
  return {
    starter,
    pages: [
      {
        id: newId(),
        title: "Home",
        slug: "",
        inNav: true,
        kind: "home",
        description: "",
        shareImage: "",
        blocks,
      },
    ],
  };
}

export function addPage(
  site: StudioSite,
  input: { title?: string; starterId?: string } = {},
): StudioSite {
  const starter = PAGE_STARTERS.find((item) => item.id === input.starterId) ?? PAGE_STARTERS[0];
  const title = (input.title ?? starter.title).trim() || "Page";
  const desired = starter.kind === "post"
    ? `blog/${slugify(title) || "post"}`
    : (starter.slug ?? slugify(title));
  const slug = uniqueSlug(site.pages, desired);
  const page: SitePage = {
    id: newId(),
    title,
    slug,
    inNav: starter.kind !== "post",
    kind: starter.kind,
    description: "",
    shareImage: "",
    blocks: starter.blocks.map((type) => createBlock(type)),
  };
  return { ...site, pages: [...site.pages, page] };
}

export function renamePage(site: StudioSite, id: string, title: string): StudioSite {
  return {
    ...site,
    pages: site.pages.map((page) => {
      if (page.id !== id) return page;
      if (page.kind === "home") return { ...page, title: title.trim() || "Home" };
      const nextTitle = title.trim() || page.title;
      const slug = uniqueSlug(site.pages, page.kind === "post" && !page.slug.startsWith("blog/") ? `blog/${nextTitle}` : nextTitle, page.id);
      // Keep a custom slug if the user already changed it away from a slugify of the old title
      const autoFromOld = slugify(page.title);
      const keepSlug = page.slug && page.slug !== autoFromOld && page.slug !== `blog/${autoFromOld}`;
      return { ...page, title: nextTitle, slug: keepSlug ? page.slug : slug };
    }),
  };
}

export function updatePageSlug(site: StudioSite, id: string, slug: string): StudioSite {
  return {
    ...site,
    pages: site.pages.map((page) => {
      if (page.id !== id || page.kind === "home") return page;
      return { ...page, slug: uniqueSlug(site.pages, slug || page.title, page.id) };
    }),
  };
}

export function setPageInNav(site: StudioSite, id: string, inNav: boolean): StudioSite {
  return {
    ...site,
    pages: site.pages.map((page) => (page.id === id && page.kind !== "home" ? { ...page, inNav } : page)),
  };
}

export function updatePage(site: StudioSite, nextPage: SitePage): StudioSite {
  return { ...site, pages: site.pages.map((page) => (page.id === nextPage.id ? nextPage : page)) };
}

export function updatePageBlocks(site: StudioSite, id: string, blocks: SiteBlock[]): StudioSite {
  return {
    ...site,
    pages: site.pages.map((page) => (page.id === id ? { ...page, blocks } : page)),
  };
}

export function setSiteName(site: StudioSite, name: string): StudioSite {
  const home = homePage(site);
  if (!home) return site;
  const identity = identityBlock(home.blocks);
  return updatePageBlocks(site, home.id, home.blocks.map((block) => (
    block.type === "identity" ? { ...block, name: name.replace(/\.skr$/i, "") } : block
  )).concat(home.blocks.some((block) => block.type === "identity") ? [] : [{ ...identity, name }]));
}

export function removePage(site: StudioSite, id: string): StudioSite {
  return { ...site, pages: site.pages.filter((page) => !(page.id === id && page.kind !== "home")) };
}

export function movePage(site: StudioSite, id: string, direction: -1 | 1): StudioSite {
  const index = site.pages.findIndex((page) => page.id === id);
  if (index < 0) return site;
  const page = site.pages[index];
  if (page.kind === "home") return site;
  const target = index + direction;
  if (target <= 0 || target >= site.pages.length) return site;
  if (site.pages[target].kind === "home") return site;
  const pages = [...site.pages];
  const [item] = pages.splice(index, 1);
  pages.splice(target, 0, item);
  return { ...site, pages };
}

export function validateSite(site: StudioSite): string[] {
  const errors: string[] = [];
  const home = homePage(site);
  if (!home || home.kind !== "home" || home.slug !== "") errors.push("A site needs a pinned Home page");
  errors.push(...validateBlocks(home?.blocks ?? [], { requireIdentity: true }));
  const slugs = new Set<string>();
  for (const page of site.pages) {
    if (page.kind !== "home" && !page.slug) errors.push(`“${page.title}” needs a URL slug`);
    if (slugs.has(page.slug)) errors.push(`Two pages are using the /${page.slug || ""} path`);
    slugs.add(page.slug);
    if (page.kind !== "home") errors.push(...validateBlocks(page.blocks, { requireIdentity: false }));
    if (page.shareImage && !sanitizeHref(page.shareImage)) errors.push(`“${page.title}” share image must be an http(s) URL`);
  }
  return errors;
}

export function postLinks(site: StudioSite): SiteLink[] {
  return site.pages
    .filter((page) => page.kind === "post" || page.slug.startsWith("blog/"))
    .map((page) => ({ label: page.title, url: `/${page.slug}` }));
}

function navMarkup(site: StudioSite, current: SitePage, domain: string): string {
  const links = navPages(site).filter((page) => page.kind !== "home");
  const collapse = links.length > 4;
  const items = links.map((page) => {
    const href = relativeHref(current.slug, page.slug);
    const currentAttr = page.id === current.id ? ` aria-current="page"` : "";
    return `<a href="${escapeHtml(href)}"${currentAttr}>${escapeHtml(page.title)}</a>`;
  }).join("");
  const brandName = escapeHtml((siteName(site) || "your").replace(/\.skr$/i, "") || "your");
  const homeHref = relativeHref(current.slug, "");
  return `<nav class="site-nav${collapse ? " collapse" : ""}">
    <a class="brand" href="${escapeHtml(homeHref)}">${brandName}<span class="dot">.skr</span></a>
    ${collapse ? `<label class="nav-more" for="nav-toggle">Menu</label><input id="nav-toggle" class="nav-toggle" type="checkbox" />` : ""}
    <div class="nav-links">${items}</div>
  </nav>`;
}

export function renderPageHtml(
  site: StudioSite,
  page: SitePage,
  options: { wallet?: string; profileUrl?: string; isSeeker?: boolean } = {},
): string {
  const identity = siteIdentity(site);
  const domain = siteDomainName(site) || "your.skr";
  const hostUrl = sitePublicUrl(site) || "https://your.skr.site";
  const canonical = page.slug ? `${hostUrl.replace(/\/$/, "")}/${page.slug}` : hostUrl;
  const title = page.kind === "home"
    ? domain
    : `${page.title} · ${domain}`;
  const description = page.description.trim()
    || (page.kind === "home" ? identity.tagline : page.title);
  const shareImage = sanitizeHref(page.shareImage) || sanitizeHref(identity.photoUrl);
  const inner = renderBlocksInnerHtml(page.blocks, {
    wallet: options.wallet,
    profileUrl: options.profileUrl,
    isSeeker: options.isSeeker,
    postLinks: postLinks(site),
    resolveHref: (href) => {
      const slug = href.replace(/^\//, "").replace(/\/$/, "");
      return relativeHref(page.slug, slug);
    },
  });
  const heading = page.kind === "home" || page.blocks.some((block) => block.type === "identity")
    ? ""
    : `<h1 class="page-title">${escapeHtml(page.title)}</h1>`;
  const faviconHref = sanitizeHref(identity.photoUrl) || `${relativeHref(page.slug, "")}favicon.svg`;
  const favicon = sanitizeHref(identity.photoUrl)
    ? `<link rel="icon" href="${escapeHtml(faviconHref)}" />`
    : `<link rel="icon" href="${escapeHtml(faviconHref)}" type="image/svg+xml" />`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  ${shareImage ? `<meta property="og:image" content="${escapeHtml(shareImage)}" />` : ""}
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  ${favicon}
  <style>${sitePageCss(identity.tint)}</style>
</head>
<body>
  ${navMarkup(site, page, domain)}
  <main class="page">
    ${heading}
    ${inner}
  </main>
  ${skrLiveScript(options.wallet)}
</body>
</html>`;
}

export function faviconSvg(tint = "#00C9A7"): string {
  const color = sanitizeCssColor(tint);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0A0A0A"/><circle cx="16" cy="16" r="10" fill="none" stroke="${color}" stroke-width="2"/><text x="16" y="21" text-anchor="middle" font-size="12" font-family="Inter,system-ui,sans-serif" fill="#F0F0F0">S</text></svg>`;
}

export function renderSiteBundle(
  site: StudioSite,
  options: { wallet?: string; profileUrl?: string; isSeeker?: boolean } = {},
): SiteFile[] {
  const files: SiteFile[] = site.pages.map((page) => ({
    path: pageFilePath(page.slug),
    content: renderPageHtml(site, page, options),
    contentType: "text/html; charset=utf-8",
  }));
  files.push({
    path: "favicon.svg",
    content: faviconSvg(siteIdentity(site).tint),
    contentType: "image/svg+xml",
  });
  return files;
}

export function siteDraftStorageKey(wallet?: string): string {
  return wallet ? `${STUDIO_SITE_DRAFT_KEY}:${wallet}` : `${STUDIO_SITE_DRAFT_KEY}:guest`;
}

export function siteFromLegacyDraft(draft: StudioDraft): StudioSite {
  return {
    starter: draft.starter ?? "card",
    pages: [{
      id: newId(),
      title: "Home",
      slug: "",
      inNav: true,
      kind: "home",
      description: "",
      shareImage: "",
      blocks: draft.blocks,
    }],
  };
}

export function readSiteDraft(wallet?: string): StudioSite | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(siteDraftStorageKey(wallet))
      ?? (wallet ? window.localStorage.getItem(siteDraftStorageKey()) : null);
    if (raw) {
      const parsed = JSON.parse(raw) as { site?: StudioSite; pages?: SitePage[] };
      const site = parsed.site ?? (Array.isArray(parsed.pages) ? parsed as StudioSite : null);
      if (site?.pages?.length) return site;
    }
    const legacy = window.localStorage.getItem(wallet ? `${STUDIO_DRAFT_KEY}:${wallet}` : `${STUDIO_DRAFT_KEY}:guest`)
      ?? window.localStorage.getItem(`${STUDIO_DRAFT_KEY}:guest`);
    if (legacy) {
      const parsed = JSON.parse(legacy) as StudioDraft;
      if (Array.isArray(parsed.blocks)) return siteFromLegacyDraft(parsed);
    }
  } catch {
    return null;
  }
  return null;
}

export function writeSiteDraft(site: StudioSite, wallet?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(siteDraftStorageKey(wallet), JSON.stringify({ version: 2, starter: site.starter, site }));
}

export function demoCreatorSite(): StudioSite {
  let site = createDefaultSite("creator");
  const home = homePage(site);
  const identity = identityBlock(home.blocks);
  site = updatePageBlocks(site, home.id, home.blocks.map((block) => {
    if (block.type === "identity") {
      return { ...identity, name: "creator", tagline: "Seeker · builder on Solana Mobile", tint: "#00C9A7" };
    }
    if (block.type === "about") {
      return { ...block, text: "A Seeker building on Solana Mobile. This is a published .skr site — a home card plus real inner pages." };
    }
    if (block.type === "links") {
      return { ...block, items: [
        { label: "Projects", url: "/projects" },
        { label: "About", url: "/about" },
        { label: "Contact", url: "/contact" },
      ] };
    }
    return block;
  }));
  site = addPage(site, { starterId: "about", title: "About" });
  site = addPage(site, { starterId: "projects", title: "Projects" });
  site = addPage(site, { starterId: "blog", title: "Blog" });
  site = addPage(site, { starterId: "contact", title: "Contact" });
  site = addPage(site, { starterId: "post", title: "Hello Seeker" });

  const bySlug = (slug: string) => site.pages.find((page) => page.slug === slug)!;

  site = updatePageBlocks(site, bySlug("about").id, [
    { id: bySlug("about").blocks[0].id, type: "richtext", text: "I build tools for Seeker owners. This About page is just another page in the same site, with the same top nav." },
  ]);

  const projects = bySlug("projects");
  site = updatePage(site, {
    ...projects,
    description: "Work in the open on Solana Mobile.",
    blocks: [
      { id: projects.blocks[0].id, type: "richtext", text: "Work in the open. A couple of things shipped on Solana Mobile." },
      { id: projects.blocks[1].id, type: "gallery", items: [] },
      { id: projects.blocks[2].id, type: "cta", label: "Get in touch", url: "/contact" },
    ],
  });

  const contact = bySlug("contact");
  site = updatePageBlocks(site, contact.id, [
    { id: contact.blocks[0].id, type: "richtext", text: "Say hello. This button opens your mail app — no paid form service required." },
    { id: contact.blocks[1].id, type: "contact", email: "hello@skr.site", buttonLabel: "Email creator" },
  ]);

  const post = site.pages.find((page) => page.kind === "post")!;
  site = updatePage(site, {
    ...post,
    inNav: false,
    description: "A first note from this .skr site.",
    blocks: [
      { id: post.blocks[0].id, type: "richtext", text: "This post lives at /blog/hello-seeker and is listed on the Blog page." },
    ],
  });

  const blog = bySlug("blog");
  site = updatePageBlocks(site, blog.id, [
    { id: blog.blocks[0].id, type: "richtext", text: "Short notes, listed from other pages in this site." },
    { id: blog.blocks[1].id, type: "posts", heading: "Latest posts" },
  ]);

  return site;
}

export { addBlock, BLOCK_PAGE_TEMPLATE_ID, sanitizeEmail };
