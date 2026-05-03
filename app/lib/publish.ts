import type {
  CalendarDraft,
  DaoDraft,
  HealthDraft,
  LinkBioDraft,
  LinkItem,
  MetricItem,
  PersonalBioDraft,
  PortfolioDraft,
  ProductItem,
  ProposalItem,
  ShopStoreDraft,
  SocialHubDraft,
  SupporterItem,
  TemplateDraft,
  WorkoutItem,
} from "./templateDrafts";
import { uploadContent } from "./storage";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeCssColor(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  if (/^(rgb|rgba|hsl|hsla)\([0-9.%\s,]+\)$/i.test(v)) return v;
  return "#00C9A7";
}

function sanitizeHref(value: string): string {
  const raw = value.trim();
  if (!raw) return "#";

  if (raw.startsWith("/")) return raw;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
  } catch {
    return "#";
  }

  return "#";
}

export function buildTemplateHtml(
  domain: string,
  templateTitle: string,
  draft: TemplateDraft,
): string {
  const safeDomain = escapeHtml(domain);
  const safeTemplateTitle = escapeHtml(templateTitle);
  const safeAccentColor = sanitizeCssColor(draft.themeAccent || "#00C9A7");
  const safeMark = escapeHtml(draft.profileMark || "SKR");
  const safeHeadline = escapeHtml(draft.headline);
  const safeSubtext = escapeHtml(draft.subtext);
  const sections = renderTemplateSections(draft);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeDomain}</title>
  <style>
    :root { --bg:#0A0A0A; --teal:${safeAccentColor}; --chrome:#BEBEBE; --chromeLight:#E8E8E8; --text:#f0f0f0; --muted:#888; --accentGlow:rgba(0,201,167,.35); }
    body { margin:0; min-height:100vh; background:radial-gradient(circle at top,rgba(232,232,232,.08),transparent 35%),radial-gradient(circle at 20% 80%,rgba(0,201,167,.08),transparent 30%),var(--bg); color:var(--text); font-family:Inter,system-ui,sans-serif; display:grid; place-items:center; }
    .card { width:min(640px,92vw); background:rgba(255,255,255,.04); border:1px solid rgba(190,190,190,.18); border-radius:24px; padding:32px; box-shadow:0 0 32px rgba(0,201,167,.1); }
    .name { font-size:40px; font-weight:800; margin:0 0 8px; }
    .sub { color:var(--muted); margin:0 0 24px; }
    .badge { display:inline-block; padding:6px 12px; border-radius:999px; background:rgba(0,201,167,.15); border:1px solid rgba(0,201,167,.35); color:var(--teal); }
    .links { display:grid; gap:12px; margin-top:24px; }
    .link { color:var(--text); text-decoration:none; border:1px solid rgba(190,190,190,.2); border-radius:12px; padding:12px 14px; display:block; background:rgba(255,255,255,.02); }
    .section { margin-top:24px; border-top:1px solid rgba(190,190,190,.16); padding-top:18px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; }
    .mini { border:1px solid rgba(190,190,190,.18); border-radius:14px; padding:12px; background:rgba(255,255,255,.025); }
    .mini strong { display:block; color:var(--chromeLight); margin-bottom:4px; }
    .muted { color:var(--muted); }
    .dotSkr { background:linear-gradient(90deg,var(--teal),var(--chromeLight),var(--teal)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-size:200% auto; animation:shimmer 3s linear infinite; }
    @keyframes shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
  </style>
</head>
<body>
  <article class="card">
    <p class="badge">${safeMark} ${safeTemplateTitle}</p>
    <h1 class="name">${safeHeadline}<span class="dotSkr">.skr</span></h1>
    <p class="sub">${safeSubtext}</p>
    ${sections}
  </article>
</body>
</html>`;
}

function renderTemplateSections(draft: TemplateDraft): string {
  switch (draft.templateId) {
    case "personal-bio":
      return renderPersonalBio(draft);
    case "social-hub":
      return renderSocialHub(draft);
    case "shop":
      return renderShop(draft);
    case "calendar":
      return renderCalendar(draft);
    case "health":
      return renderHealth(draft);
    case "portfolio":
      return renderPortfolio(draft);
    case "organization":
      return renderDao(draft);
    case "link-in-bio":
      return renderLinkBio(draft);
  }
}

function renderPersonalBio(draft: PersonalBioDraft): string {
  return `
    <section class="section"><h2>About</h2><p class="muted">${escapeHtml(draft.bio)}</p></section>
    <section class="section"><h2>Links</h2><div class="links">${renderLinks(draft.links)}</div></section>
  `;
}

function renderSocialHub(draft: SocialHubDraft): string {
  return `
    ${renderStats(draft.stats)}
    <section class="section"><h2>Social</h2><div class="links">${renderLinks(draft.socialLinks)}</div></section>
    <section class="section"><h2>Web3</h2><div class="links">${renderLinks(draft.web3Links)}</div></section>
    <section class="section"><h2>Creator Links</h2><div class="links">${renderLinks(draft.creatorLinks)}</div></section>
    <section class="section"><p class="badge">${escapeHtml(draft.featuredCta)}</p></section>
  `;
}

function renderShop(draft: ShopStoreDraft): string {
  return `
    ${renderStats(draft.stats)}
    <section class="section"><h2>Featured Drop</h2><div class="mini"><strong>${escapeHtml(draft.featuredDrop.name)}</strong><span class="muted">${escapeHtml(draft.featuredDrop.price)} - ${escapeHtml(draft.dropEndsIn)}</span></div></section>
    <section class="section"><h2>Products</h2><div class="grid">${draft.products.map(renderProduct).join("")}</div></section>
  `;
}

function renderCalendar(draft: CalendarDraft): string {
  return `
    <section class="section"><h2>${escapeHtml(draft.livestreamTitle)}</h2><p class="muted">Starts in ${escapeHtml(draft.livestreamStartsIn)}</p></section>
    <section class="section"><h2>Events</h2><div class="grid">${draft.events.map((item) => `<div class="mini"><strong>${escapeHtml(item.title)}</strong><span class="muted">${escapeHtml(item.time)} - ${escapeHtml(item.cta)}</span></div>`).join("")}</div></section>
    <section class="section"><h2>Booking Slots</h2><p class="muted">${escapeHtml(draft.bookingSlots.join(", "))}</p></section>
    <section class="section"><h2>Sessions</h2><div class="grid">${draft.sessions.map((item) => `<div class="mini"><strong>${escapeHtml(item.name)}</strong><span class="muted">${escapeHtml(item.duration)} - ${escapeHtml(item.price)}</span></div>`).join("")}</div></section>
  `;
}

function renderHealth(draft: HealthDraft): string {
  return `
    ${renderStats(draft.metrics)}
    <section class="section"><h2>Workouts</h2><div class="grid">${draft.workouts.map(renderWorkout).join("")}</div></section>
    <section class="section"><h2>Coaching</h2><div class="grid">${draft.coaches.map((item) => `<div class="mini"><strong>${escapeHtml(item.name)}</strong><span class="muted">${escapeHtml(item.session)} - ${escapeHtml(item.price)}</span></div>`).join("")}</div></section>
  `;
}

function renderPortfolio(draft: PortfolioDraft): string {
  return `
    <section class="section"><h2>Featured Projects</h2><div class="grid">${draft.projects.map(renderLinkCard).join("")}</div></section>
    <section class="section"><h2>Press</h2><div class="grid">${draft.press.map(renderLinkCard).join("")}</div></section>
    <section class="section"><p class="badge">${escapeHtml(draft.contactCta)}</p></section>
  `;
}

function renderDao(draft: DaoDraft): string {
  return `
    <section class="section"><h2>Treasury</h2><p class="badge">${escapeHtml(draft.treasury)}</p></section>
    <section class="section"><h2>Proposals</h2><div class="grid">${draft.proposals.map(renderProposal).join("")}</div></section>
    <section class="section"><h2>Delegates</h2><div class="grid">${draft.delegates.map(renderLinkCard).join("")}</div></section>
  `;
}

function renderLinkBio(draft: LinkBioDraft): string {
  return `
    ${renderStats(draft.analytics)}
    <section class="section"><h2>Links</h2><div class="links">${renderLinks(draft.links)}</div></section>
    <section class="section"><h2>Support</h2><p class="muted">${escapeHtml(draft.tipAmounts.join(", "))}</p></section>
    <section class="section"><h2>Recent Supporters</h2><div class="grid">${draft.supporters.map(renderSupporter).join("")}</div></section>
  `;
}

function renderStats(stats: MetricItem[]): string {
  return `<section class="section"><h2>Highlights</h2><div class="grid">${stats.map((item) => `<div class="mini"><strong>${escapeHtml(item.value)}</strong><span class="muted">${escapeHtml(item.label)}</span></div>`).join("")}</div></section>`;
}

function renderLinks(links: LinkItem[]): string {
  return links
    .filter((item) => item.label.trim() || item.url.trim())
    .map((item) => `<a class="link" href="${escapeHtml(sanitizeHref(item.url))}" rel="noopener noreferrer">${escapeHtml(item.label || item.url)}<br><span class="muted">${escapeHtml(item.url)}</span></a>`)
    .join("\n");
}

function renderLinkCard(item: LinkItem): string {
  return `<div class="mini"><strong>${escapeHtml(item.label)}</strong><span class="muted">${escapeHtml(item.url)}</span></div>`;
}

function renderProduct(item: ProductItem): string {
  return `<div class="mini"><strong>${escapeHtml(item.name)}</strong><span class="muted">${escapeHtml(item.price)} - ${escapeHtml(item.category)}</span></div>`;
}

function renderWorkout(item: WorkoutItem): string {
  return `<div class="mini"><strong>${escapeHtml(item.name)}</strong><span class="muted">${escapeHtml(item.duration)} - ${escapeHtml(item.level)}</span></div>`;
}

function renderProposal(item: ProposalItem): string {
  return `<div class="mini"><strong>${escapeHtml(item.title)}</strong><span class="muted">${escapeHtml(item.status)} - ${escapeHtml(item.category)}</span></div>`;
}

function renderSupporter(item: SupporterItem): string {
  return `<div class="mini"><strong>${escapeHtml(item.name)}</strong><span class="muted">${escapeHtml(item.amount)}</span></div>`;
}

export async function createContentUriAndHash(
  html: string,
  uploadInput: { domain: string; templateId: string },
): Promise<{ contentUri: string; contentHash: string; publicUrl: string; metadataRecords: Record<string, string> }> {
  const uploaded = await uploadContent({
    html,
    domain: uploadInput.domain,
    templateId: uploadInput.templateId,
  });

  return {
    contentUri: uploaded.contentUri,
    contentHash: uploaded.contentHash,
    publicUrl: uploaded.publicUrl,
    metadataRecords: uploaded.metadataRecords,
  };
}
