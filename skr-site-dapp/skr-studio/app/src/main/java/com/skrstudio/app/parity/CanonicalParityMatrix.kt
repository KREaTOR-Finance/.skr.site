package com.skrstudio.app.parity

data class ParityEntry(
    val screenRoute: String,
    val module: String,
    val interactionHook: String,
    val status: String = "planned",
)

/**
 * Canonical source: first HTML block only from skr.site html.txt lines 547-6281.
 * Duplicate second block is intentionally ignored.
 */
val canonicalParityMatrix: List<ParityEntry> = listOf(
    ParityEntry("splash", "Hero + logo + CTA stack", "goto('home') / goto('art')", status = "implemented"),
    ParityEntry("art", "About feature rows", "back() / goto('home')", status = "implemented"),
    ParityEntry("home", "Live preview + stats + CTA", "goto('templates') / goto('preview')", status = "implemented"),
    ParityEntry("wallet", "Wallet options + connected state", "connectWallet(...) / goto('home')", status = "implemented"),
    ParityEntry("profile", "Profile stats + quick actions", "goto('social') / goto('editor') / goto('preview')", status = "implemented"),
    ParityEntry("settings", "Toggle rows + domain management", "toggle on/off / goto('wallet')", status = "implemented"),
    ParityEntry("social", "Editable social rows + add-link sheet", "showAddLink() / addLink() / goto('publish')", status = "implemented"),
    ParityEntry("templates", "8-template gallery", "selectTemplate(...) / goto(templateRoute)", status = "implemented"),
    ParityEntry("editor", "Color/font/media controls", "setColor / setFont / setMark / goto('publish')", status = "implemented"),
    ParityEntry("preview", "Public profile frame", "goto('publish') / back()", status = "implemented"),
    ParityEntry("socialhub", "Category pills + sections", "shFilter(...)", status = "implemented"),
    ParityEntry("shopstore", "Filters + cart + buy-now sheets", "shopFilter / addToCart / buyNow / checkout", status = "implemented"),
    ParityEntry("calendarevents", "Calendar grid + RSVP + booking", "calNav / calRSVP / calTicket / calBook", status = "implemented"),
    ParityEntry("healthfitness", "Day pills + timer + coach booking", "fitSelectDay / fitStartWorkout / fitBookCoach", status = "implemented"),
    ParityEntry("creatorportfolio", "Featured work sections", "goto('editor') / goto('socialhub')", status = "implemented"),
    ParityEntry("daogovernance", "Proposal filters + vote/delegate/create sheets", "daoFilterProposals / daoVote / daoOpenDelegate / daoOpenCreate", status = "implemented"),
    ParityEntry("linkbio", "Link stack + add-link + tip + analytics", "libOpenAddLink / libSendTip / libSwitchRange", status = "implemented"),
    ParityEntry("publish", "Success receipt + CTAs", "goto('preview') / goto('home')", status = "implemented"),
)
