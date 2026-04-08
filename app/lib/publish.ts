import type { TemplateCustomization } from "./types";
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
  customization: TemplateCustomization,
  extraSections: string[] = [],
): string {
  const links = customization.links
    .filter((l) => l.label.trim() && l.url.trim())
    .map((l) => `<a class="link" href="${sanitizeHref(l.url)}" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`)
    .join("\n");
  const sections = extraSections.join("\n");
  const safeDomain = escapeHtml(domain);
  const safeTemplateTitle = escapeHtml(templateTitle);
  const safeAccentColor = sanitizeCssColor(customization.accentColor || "#00C9A7");
  const safeEmoji = escapeHtml(customization.emoji);
  const safeHeadline = escapeHtml(customization.headline);
  const safeSubtext = escapeHtml(customization.subtext);

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
    .dotSkr { background:linear-gradient(90deg,var(--teal),var(--chromeLight),var(--teal)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-size:200% auto; animation:shimmer 3s linear infinite; }
    @keyframes shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
  </style>
</head>
<body>
  <article class="card">
    <p class="badge">${safeEmoji} ${safeTemplateTitle}</p>
    <h1 class="name">${safeHeadline}<span class="dotSkr">.skr</span></h1>
    <p class="sub">${safeSubtext}</p>
    <div class="links">${links}</div>
    ${sections}
  </article>
</body>
</html>`;
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
