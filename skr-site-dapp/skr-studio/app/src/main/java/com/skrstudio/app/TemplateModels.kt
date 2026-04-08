package com.skrstudio.app

data class TemplateLink(val label: String, val url: String)

data class TemplateCustomization(
    val headline: String = "Thomas",
    val subtext: String = "Builder on Solana • Seeker",
    val accentHex: String = "#00C9A7",
    val emoji: String = "⚡",
    val links: List<TemplateLink> = listOf(
        TemplateLink("X", "https://x.com"),
        TemplateLink("Discord", "https://discord.com"),
    ),
)

data class SkrTemplate(
    val id: String,
    val title: String,
    val description: String,
    val emoji: String,
    val premium: Boolean,
    val route: String,
    val imageRes: Int,
)

val allTemplates = listOf(
    SkrTemplate("personal-bio", "Personal Bio", "Free default profile", "👤", false, "home", R.drawable.seeker_img_01),
    SkrTemplate("social-hub", "Social Hub", "Community links", "🌐", true, "socialhub", R.drawable.seeker_img_02),
    SkrTemplate("shop", "Shop", "Sell with SKR", "🛒", true, "shopstore", R.drawable.seeker_img_03),
    SkrTemplate("calendar", "Calendar", "Events and RSVP", "📅", true, "calendarevents", R.drawable.seeker_img_04),
    SkrTemplate("health", "Health & Fitness", "Track goals", "🏋️", true, "healthfitness", R.drawable.seeker_img_05),
    SkrTemplate("portfolio", "Creator Portfolio", "Showcase work", "🎨", true, "creatorportfolio", R.drawable.seeker_img_06),
    SkrTemplate("organization", "DAO Governance", "Mission and voting", "🏢", true, "daogovernance", R.drawable.seeker_img_07),
    SkrTemplate("link-in-bio", "Link in Bio", "Tip jars and stacked links", "🔗", true, "linkbio", R.drawable.seeker_img_08),
    SkrTemplate("bring-your-own", "Bring Your Own", "Upload custom template", "🧩", true, "editor", R.drawable.seeker_img_09),
)
