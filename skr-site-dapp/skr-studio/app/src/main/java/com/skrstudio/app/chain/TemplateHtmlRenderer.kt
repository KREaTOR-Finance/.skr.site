package com.skrstudio.app.chain

import com.skrstudio.app.CalendarDraft
import com.skrstudio.app.DaoDraft
import com.skrstudio.app.HealthDraft
import com.skrstudio.app.LinkBioDraft
import com.skrstudio.app.LinkItem
import com.skrstudio.app.MetricItem
import com.skrstudio.app.PersonalBioDraft
import com.skrstudio.app.PortfolioDraft
import com.skrstudio.app.ProductItem
import com.skrstudio.app.ProposalItem
import com.skrstudio.app.ShopStoreDraft
import com.skrstudio.app.SocialHubDraft
import com.skrstudio.app.TemplateDraft

fun buildTemplateHtml(
    domain: String,
    templateTitle: String,
    draft: TemplateDraft,
): String {
    val accent = escapeCssColor(draft.themeAccent)
    val sections = when (draft) {
        is PersonalBioDraft -> personalSections(draft)
        is SocialHubDraft -> socialSections(draft)
        is ShopStoreDraft -> shopSections(draft)
        is CalendarDraft -> calendarSections(draft)
        is HealthDraft -> healthSections(draft)
        is PortfolioDraft -> portfolioSections(draft)
        is DaoDraft -> daoSections(draft)
        is LinkBioDraft -> linkBioSections(draft)
    }

    return """
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(domain)}</title>
          <style>
            :root { --bg:#0A0A0A; --teal:$accent; --chrome:#BEBEBE; --chromeLight:#E8E8E8; --text:#f0f0f0; --muted:#929292; --border:rgba(190,190,190,.18); }
            * { box-sizing:border-box; }
            body { margin:0; min-height:100vh; background:radial-gradient(circle at 50% 0%,rgba(232,232,232,.1),transparent 28%),radial-gradient(circle at 18% 80%,rgba(0,201,167,.11),transparent 32%),#0A0A0A; color:var(--text); font-family:Inter,system-ui,sans-serif; }
            main { width:min(720px,92vw); margin:0 auto; padding:42px 0; }
            .hero,.section { background:rgba(255,255,255,.045); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 0 34px rgba(0,201,167,.09); backdrop-filter:blur(18px); }
            .hero { margin-bottom:16px; position:relative; overflow:hidden; }
            .hero:before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 70% 10%,rgba(232,232,232,.08),transparent 35%); pointer-events:none; }
            .brand { display:inline-flex; padding:6px 12px; border-radius:999px; color:var(--teal); border:1px solid rgba(0,201,167,.35); background:rgba(0,201,167,.11); font-size:13px; }
            h1 { font-size:40px; line-height:1.05; margin:20px 0 8px; }
            h2 { margin:0 0 12px; font-size:20px; }
            p { color:var(--muted); line-height:1.55; }
            .mark { width:54px; height:54px; border-radius:16px; display:grid; place-items:center; color:#050505; font-weight:900; background:linear-gradient(135deg,var(--teal),var(--chromeLight)); box-shadow:0 0 30px rgba(0,201,167,.24); }
            .grid { display:grid; gap:10px; }
            .grid.three { grid-template-columns:repeat(3,1fr); }
            .row { display:flex; justify-content:space-between; gap:14px; align-items:center; padding:12px 14px; border:1px solid var(--border); border-radius:14px; background:rgba(255,255,255,.03); margin:8px 0; }
            .muted { color:var(--muted); }
            .pill { display:inline-flex; padding:5px 10px; border-radius:999px; background:rgba(0,201,167,.1); color:var(--teal); margin:3px; }
            .section { margin-top:14px; }
            a { color:var(--text); text-decoration:none; }
            @media(max-width:620px){ .grid.three { grid-template-columns:1fr; } h1 { font-size:32px; } main { padding:20px 0; } }
          </style>
        </head>
        <body>
          <main>
            <section class="hero">
              <div class="mark">${escapeHtml(draft.profileMark)}</div>
              <span class="brand">${escapeHtml(templateTitle)}</span>
              <h1>${escapeHtml(draft.headline)}</h1>
              <p>${escapeHtml(draft.subtext)}</p>
            </section>
            $sections
          </main>
        </body>
        </html>
    """.trimIndent()
}

private fun personalSections(d: PersonalBioDraft): String = section("About", "<p>${escapeHtml(d.bio)}</p>") +
    section("Links", linkRows(d.links))

private fun socialSections(d: SocialHubDraft): String = section("Activity", metricGrid(d.stats)) +
    section("Social links", linkRows(d.socialLinks)) +
    section("Web3 links", linkRows(d.web3Links)) +
    section("Creator links", linkRows(d.creatorLinks)) +
    section("Featured action", "<p>${escapeHtml(d.featuredCta)}</p>")

private fun shopSections(d: ShopStoreDraft): String = section("Featured drop", productRows(listOf(d.featuredDrop)) + "<p class=\"muted\">Ends in ${escapeHtml(d.dropEndsIn)}</p>") +
    section("Store stats", metricGrid(d.stats)) +
    section("Products", productRows(d.products))

private fun calendarSections(d: CalendarDraft): String = section("Livestream", "<p>${escapeHtml(d.livestreamTitle)} starts in ${escapeHtml(d.livestreamStartsIn)}</p>") +
    section("Events", d.events.joinToString("") { row(it.title, "${it.time} - ${it.cta}") }) +
    section("Booking slots", d.bookingSlots.joinToString("") { "<span class=\"pill\">${escapeHtml(it)}</span>" }) +
    section("Sessions", d.sessions.joinToString("") { row(it.name, "${it.duration} - ${it.price}") })

private fun healthSections(d: HealthDraft): String = section("Daily metrics", metricGrid(d.metrics)) +
    section("Workouts", d.workouts.joinToString("") { row(it.name, "${it.duration} - ${it.level}") }) +
    section("Coaching", d.coaches.joinToString("") { row(it.name, "${it.session} - ${it.price}") })

private fun portfolioSections(d: PortfolioDraft): String = section("Featured projects", linkRows(d.projects)) +
    section("Press", linkRows(d.press)) +
    section("Contact", "<p>${escapeHtml(d.contactCta)}</p>")

private fun daoSections(d: DaoDraft): String = section("Treasury", "<h2>${escapeHtml(d.treasury)}</h2>") +
    section("Proposals", proposalRows(d.proposals)) +
    section("Delegates", linkRows(d.delegates))

private fun linkBioSections(d: LinkBioDraft): String = section("Links", linkRows(d.links)) +
    section("Tip options", d.tipAmounts.joinToString("") { "<span class=\"pill\">${escapeHtml(it)}</span>" }) +
    section("Analytics", metricGrid(d.analytics)) +
    section("Recent supporters", d.supporters.joinToString("") { row(it.name, it.amount) })

private fun section(title: String, body: String): String = "<section class=\"section\"><h2>${escapeHtml(title)}</h2>$body</section>"

private fun linkRows(links: List<LinkItem>): String = links.joinToString("") { item ->
    val href = sanitizeUrl(item.url)
    if (href == null) row(item.label, item.url) else "<a class=\"row\" href=\"${escapeHtml(href)}\"><span>${escapeHtml(item.label)}</span><span class=\"muted\">${escapeHtml(item.url)}</span></a>"
}

private fun metricGrid(metrics: List<MetricItem>): String = "<div class=\"grid three\">" + metrics.joinToString("") {
    "<div class=\"row\"><strong>${escapeHtml(it.value)}</strong><span class=\"muted\">${escapeHtml(it.label)}</span></div>"
} + "</div>"

private fun productRows(products: List<ProductItem>): String = products.joinToString("") { row(it.name, "${it.price} - ${it.category}") }

private fun proposalRows(proposals: List<ProposalItem>): String = proposals.joinToString("") { row(it.title, "${it.status} - ${it.category}") }

private fun row(left: String, right: String): String = "<div class=\"row\"><span>${escapeHtml(left)}</span><span class=\"muted\">${escapeHtml(right)}</span></div>"

private fun sanitizeUrl(value: String): String? {
    val v = value.trim()
    if (v.isBlank()) return null
    return if (v.startsWith("https://") || v.startsWith("http://")) v else null
}

private fun escapeCssColor(value: String): String {
    val raw = value.trim()
    return if (Regex("^#[0-9a-fA-F]{6}$").matches(raw)) raw else "#00C9A7"
}

private fun escapeHtml(value: String): String {
    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")
}
