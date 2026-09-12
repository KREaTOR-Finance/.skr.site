export type KreationLink = { label: string; url: string };

export type KreationInput = {
  name: string;
  pitch: string;
  photoUrl: string;
  tint: string;
  links: KreationLink[];
  prompt: string;
};

const TINTS = ["#00C9A7", "#8B7CFF", "#D4AF37"];

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function kreationPaymentMemo(prompt: string): string {
  return `skr-kreation:${hashSeed(prompt.trim()).toString(16)}`;
}

export const KREATION_HTML_CHAR_CAP = 40_000;

export function extractKreationHtmlFromModel(text: string): string {
  let raw = text.trim();
  const fence = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) raw = fence[1].trim();
  const start = raw.search(/<!doctype html|<html/i);
  if (start >= 0) raw = raw.slice(start);
  if (!/<(?:!doctype|html|body|main|section|article|div)/i.test(raw)) {
    throw new Error("Grok did not return HTML");
  }
  return stripUnsafeHtml(raw).slice(0, KREATION_HTML_CHAR_CAP);
}

export function sanitizeKreationColor(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  return "#00C9A7";
}

export function sanitizeKreationHref(value: string): string {
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

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+=/gi, " data-dropped=")
    .replace(/javascript:/gi, "");
}

const LAYOUTS = ["poster", "split", "manifesto", "links", "signal"] as const;

function layoutFor(seed: number): (typeof LAYOUTS)[number] {
  return LAYOUTS[seed % LAYOUTS.length];
}

function linkHtml(links: KreationLink[]): string {
  const items = links
    .filter((item) => item.label.trim())
    .slice(0, 5)
    .map((item) => `<a class="link" href="${esc(sanitizeKreationHref(item.url))}">${esc(item.label)}</a>`)
    .join("");
  return items ? `<nav class="links">${items}</nav>` : "";
}

export function buildKreationHtml(input: KreationInput): string {
  const name = (input.name.trim() || "your").replace(/\.skr$/i, "");
  const pitch = input.pitch.trim() || "Seeker ID";
  const prompt = input.prompt.trim();
  const tint = sanitizeKreationColor(input.tint || TINTS[0]);
  const photo = input.photoUrl.trim();
  const seed = hashSeed(`${name}|${prompt}|${pitch}|${tint}`);
  const layout = layoutFor(seed);
  const mark = (seed % 9000 + 1000).toString(16).toUpperCase();
  const photoTag = photo
    ? `<img class="photo" src="${esc(sanitizeKreationHref(photo))}" alt="" />`
    : `<div class="knot" aria-hidden="true"></div>`;
  const promptBlock = prompt
    ? `<blockquote class="brief">${esc(prompt)}</blockquote>`
    : "";
  const links = linkHtml(input.links);
  const domain = `${esc(name)}.skr`;

  const inner = {
    poster: `${photoTag}<p class="kicker">${domain} · ${mark}</p><h1>${esc(name)}</h1><p class="pitch">${esc(pitch)}</p>${promptBlock}${links}`,
    split: `<div class="split">${photoTag}<div><p class="kicker">${domain}</p><h1>${esc(name)}</h1><p class="pitch">${esc(pitch)}</p>${promptBlock}${links}</div></div>`,
    manifesto: `<p class="kicker">Kreation ${mark}</p><h1>${esc(name)}</h1>${promptBlock}<p class="pitch">${esc(pitch)}</p>${photoTag}${links}`,
    links: `<p class="kicker">${domain}</p><h1>${esc(name)}</h1><p class="pitch">${esc(pitch)}</p>${links}${promptBlock}${photoTag}`,
    signal: `${photoTag}<h1>${esc(name)}</h1><p class="kicker">${domain} · layout ${layout}</p><p class="pitch">${esc(pitch)}</p>${promptBlock}${links}`,
  }[layout];

  return stripUnsafeHtml(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${domain}</title>
  <style>
    :root { --bg:#0A0A0A; --teal:${tint}; --chrome:#BEBEBE; --text:#F0F0F0; --muted:#888; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; color:var(--text); font-family:Inter,system-ui,sans-serif;
      background: radial-gradient(circle at 50% -10%, rgba(232,232,232,.12), transparent 34%),
                  radial-gradient(circle at 18% 80%, color-mix(in srgb, var(--teal) 28%, transparent), transparent 32%),
                  var(--bg); display:grid; place-items:center; padding:28px 16px; }
    .card { width:min(720px,94vw); background:rgba(255,255,255,.04); border:1px solid rgba(190,190,190,.2);
      border-radius:28px; padding:32px; box-shadow:0 22px 80px rgba(0,0,0,.42), 0 0 40px color-mix(in srgb, var(--teal) 22%, transparent); }
    h1 { margin:8px 0 10px; font-size:clamp(2rem,6vw,3.2rem); letter-spacing:-.03em; }
    .kicker { color:var(--teal); letter-spacing:.16em; text-transform:uppercase; font-size:.72rem; font-weight:800; }
    .pitch { color:var(--muted); margin:0 0 18px; }
    .brief { margin:0 0 18px; padding:14px 16px; border-left:3px solid var(--teal); color:var(--chrome); }
    .links { display:flex; flex-wrap:wrap; gap:8px; }
    .link { color:#000; background:linear-gradient(135deg,var(--teal),#8ed4c0); text-decoration:none; font-weight:700; border-radius:14px; padding:10px 14px; }
    .photo { width:88px; height:88px; border-radius:50%; object-fit:cover; border:2px solid color-mix(in srgb, var(--teal) 60%, #000); }
    .knot { width:88px; height:88px; border-radius:50%; background:radial-gradient(circle at 35% 30%, #e8e8e8, transparent 42%), radial-gradient(circle at 70% 70%, var(--teal), transparent 46%), #111; }
    .split { display:grid; gap:20px; align-items:center; }
    @media (min-width:640px) { .split { grid-template-columns: 120px 1fr; } }
  </style>
</head>
<body>
  <main class="card" data-layout="${layout}" data-mark="${mark}">${inner}</main>
</body>
</html>`);
}
