package com.skrstudio.app.chain

import com.skrstudio.app.TemplateCustomization

fun buildTemplateHtml(
    domain: String,
    templateTitle: String,
    customization: TemplateCustomization,
): String {
    val links = customization.links
        .filter { it.label.isNotBlank() && it.url.isNotBlank() }
        .mapNotNull { link ->
            val safeUrl = sanitizeUrl(link.url) ?: return@mapNotNull null
            "<a class=\"link\" href=\"${escapeHtml(safeUrl)}\">${escapeHtml(link.label)}</a>"
        }
        .joinToString("\n")

    return """
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>$domain</title>
          <style>
            :root { --bg:#0A0A0A; --teal:${escapeHtml(customization.accentHex)}; --chrome:#BEBEBE; --chromeLight:#E8E8E8; --text:#f0f0f0; --muted:#888; --accentGlow:rgba(0,201,167,.35); }
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
            <p class="badge">${escapeHtml(customization.emoji)} ${escapeHtml(templateTitle)}</p>
            <h1 class="name">${escapeHtml(customization.headline)}<span class="dotSkr">.skr</span></h1>
            <p class="sub">${escapeHtml(customization.subtext)}</p>
            <div class="links">$links</div>
          </article>
        </body>
        </html>
    """.trimIndent()
}

private fun sanitizeUrl(value: String): String? {
    val v = value.trim()
    if (v.isBlank()) return null
    return if (v.startsWith("https://") || v.startsWith("http://")) v else null
}

private fun escapeHtml(value: String): String {
    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")
}
