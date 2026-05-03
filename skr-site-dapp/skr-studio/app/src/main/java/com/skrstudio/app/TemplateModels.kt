package com.skrstudio.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class LinkItem(val label: String, val url: String)
data class MetricItem(val label: String, val value: String)
data class ProductItem(val name: String, val price: String, val category: String)
data class EventItem(val title: String, val time: String, val cta: String)
data class WorkoutItem(val name: String, val duration: String, val level: String)
data class ProposalItem(val title: String, val status: String, val category: String)
data class SupporterItem(val name: String, val amount: String)
data class CoachItem(val name: String, val session: String, val price: String)
data class SessionItem(val name: String, val price: String, val duration: String)

sealed interface TemplateDraft {
    val templateId: String
    val headline: String
    val subtext: String
    val themeAccent: String
    val fontStyle: String
    val profileMark: String
}

data class PersonalBioDraft(
    override val templateId: String = "personal-bio",
    override val headline: String = "nakamura.skr",
    override val subtext: String = "Builder - Artist - Seeker",
    override val themeAccent: String = "#00C9A7",
    override val fontStyle: String = "Default",
    override val profileMark: String = "P",
    val bio: String = "Building on Solana. Creating with pixels. Living on-chain.",
    val links: List<LinkItem> = listOf(
        LinkItem("X", "https://x.com/nakamura_sol"),
        LinkItem("GitHub", "https://github.com/nakamura"),
    ),
) : TemplateDraft

data class SocialHubDraft(
    override val templateId: String = "social-hub",
    override val headline: String = "nakamura.skr",
    override val subtext: String = "Builder - Artist - Seeker native",
    override val themeAccent: String = "#00C9A7",
    override val fontStyle: String = "Default",
    override val profileMark: String = "S",
    val socialLinks: List<LinkItem> = listOf(
        LinkItem("Twitter / X", "@nakamura_sol"),
        LinkItem("Instagram", "@nakamura.art"),
        LinkItem("TikTok", "@nakamura.builds"),
    ),
    val web3Links: List<LinkItem> = listOf(
        LinkItem("Magic Eden", "12 NFTs"),
        LinkItem("GitHub", "34 repos"),
        LinkItem("Mirror", "7 essays"),
    ),
    val creatorLinks: List<LinkItem> = listOf(
        LinkItem("Collaborate", "Open for projects"),
        LinkItem("Newsletter", "Weekly build notes"),
    ),
    val stats: List<MetricItem> = listOf(
        MetricItem("Views", "2.4k"),
        MetricItem("Clicks", "186"),
        MetricItem("Links", "12"),
    ),
    val featuredCta: String = "Open for collaborations",
) : TemplateDraft

data class ShopStoreDraft(
    override val templateId: String = "shop",
    override val headline: String = "nakamura.store",
    override val subtext: String = "NFTs - Merch - Digital Assets",
    override val themeAccent: String = "#FF9432",
    override val fontStyle: String = "Default",
    override val profileMark: String = "M",
    val featuredDrop: ProductItem = ProductItem("Seeker Genesis #001", "2.5 SOL", "nft"),
    val products: List<ProductItem> = listOf(
        ProductItem("Seeker Genesis #001", "2.5 SOL", "nft"),
        ProductItem("Shader Pack Vol.1", "0.3 SOL", "digital"),
        ProductItem(".skr Tee", "38 USDC", "merch"),
    ),
    val stats: List<MetricItem> = listOf(
        MetricItem("Volume", "24 SOL"),
        MetricItem("Royalties", "3.2 SOL"),
        MetricItem("Sales", "47"),
    ),
    val dropEndsIn: String = "02:47:18",
) : TemplateDraft

data class CalendarDraft(
    override val templateId: String = "calendar",
    override val headline: String = "Events",
    override val subtext: String = "Live sessions and bookings",
    override val themeAccent: String = "#6366F1",
    override val fontStyle: String = "Default",
    override val profileMark: String = "C",
    val events: List<EventItem> = listOf(
        EventItem("Anchor Deep Dive", "Wed 10:00 AM", "RSVP"),
        EventItem("NFT Art Stream", "Thu 08:00 PM", "RSVP"),
        EventItem("Builders Meetup", "Fri 07:30 PM", "Ticket"),
    ),
    val bookingSlots: List<String> = listOf("09:00", "10:00", "14:00", "16:00"),
    val sessions: List<SessionItem> = listOf(
        SessionItem("Strategy Session", "0.5 SOL", "45 min"),
        SessionItem("Code Review", "0.8 SOL", "60 min"),
        SessionItem("Creator Mentoring", "0.4 SOL", "30 min"),
    ),
    val livestreamTitle: String = "Next creator livestream",
    val livestreamStartsIn: String = "04:23:45",
) : TemplateDraft

data class HealthDraft(
    override val templateId: String = "health",
    override val headline: String = "Fitness",
    override val subtext: String = "Goals, workouts and coaching",
    override val themeAccent: String = "#50DC64",
    override val fontStyle: String = "Default",
    override val profileMark: String = "F",
    val workouts: List<WorkoutItem> = listOf(
        WorkoutItem("Upper Body Strength", "45 min", "Intermediate"),
        WorkoutItem("HIIT Cardio Blast", "30 min", "Advanced"),
        WorkoutItem("Evening Flow Yoga", "40 min", "All levels"),
    ),
    val metrics: List<MetricItem> = listOf(
        MetricItem("Move", "842/1000"),
        MetricItem("Exercise", "42/60"),
        MetricItem("Stand", "10/12"),
    ),
    val coaches: List<CoachItem> = listOf(
        CoachItem("Coach Nova", "Strength", "0.5 SOL"),
        CoachItem("Coach Astra", "Mobility", "0.4 SOL"),
        CoachItem("Coach Vale", "Nutrition", "0.3 SOL"),
    ),
) : TemplateDraft

data class PortfolioDraft(
    override val templateId: String = "portfolio",
    override val headline: String = "Creator Portfolio",
    override val subtext: String = "Featured work and press",
    override val themeAccent: String = "#9945FF",
    override val fontStyle: String = "Default",
    override val profileMark: String = "A",
    val projects: List<LinkItem> = listOf(
        LinkItem("Solana Generative Art Engine v2", "Featured"),
        LinkItem("Vortex Shader", "GLSL - WebGL"),
        LinkItem("SolGrid SDK", "TypeScript"),
    ),
    val press: List<LinkItem> = listOf(
        LinkItem("Solana Compass", "Best generative art on Solana this year"),
        LinkItem("helius_xyz", "Exactly what builders needed"),
    ),
    val contactCta: String = "Start a collaboration",
) : TemplateDraft

data class DaoDraft(
    override val templateId: String = "organization",
    override val headline: String = "VOID DAO",
    override val subtext: String = "Governance and treasury",
    override val themeAccent: String = "#7C83FF",
    override val fontStyle: String = "Default",
    override val profileMark: String = "D",
    val treasury: String = "24,847 SOL",
    val proposals: List<ProposalItem> = listOf(
        ProposalItem("Fund Solana SDK v3 Development", "Active", "funding"),
        ProposalItem("Upgrade Governance Quorum to 60%", "Active", "protocol"),
        ProposalItem("Elect Council Seat #4", "Voting", "election"),
    ),
    val delegates: List<LinkItem> = listOf(
        LinkItem("Astra", "Protocol steward"),
        LinkItem("Nova", "Treasury lead"),
        LinkItem("Vale", "Community council"),
    ),
) : TemplateDraft

data class LinkBioDraft(
    override val templateId: String = "link-in-bio",
    override val headline: String = "kira.skr",
    override val subtext: String = "creator - builder - collector",
    override val themeAccent: String = "#F5A623",
    override val fontStyle: String = "Default",
    override val profileMark: String = "L",
    val links: List<LinkItem> = listOf(
        LinkItem("Creator Portfolio", "kira.skr/portfolio"),
        LinkItem("NFT Collection", "magiceden.io/kira-genesis"),
        LinkItem("YouTube Channel", "youtube.com/@kira_builds"),
    ),
    val supporters: List<SupporterItem> = listOf(
        SupporterItem("vex.sol", "1.0 SOL"),
        SupporterItem("astra.sol", "0.5 SOL"),
    ),
    val tipAmounts: List<String> = listOf("0.1 SOL", "0.5 SOL", "1 SOL", "Custom"),
    val analytics: List<MetricItem> = listOf(
        MetricItem("Views", "8,247"),
        MetricItem("Clicks", "5,628"),
    ),
) : TemplateDraft

fun defaultDraftFor(templateId: String): TemplateDraft {
    return when (templateId) {
        "personal-bio" -> PersonalBioDraft()
        "social-hub" -> SocialHubDraft()
        "shop" -> ShopStoreDraft()
        "calendar" -> CalendarDraft()
        "health" -> HealthDraft()
        "portfolio" -> PortfolioDraft()
        "organization" -> DaoDraft()
        "link-in-bio" -> LinkBioDraft()
        else -> PersonalBioDraft()
    }
}

fun validateDraft(draft: TemplateDraft): List<String> {
    val errors = mutableListOf<String>()
    if (draft.headline.isBlank()) errors += "Headline is required"
    if (draft.subtext.isBlank()) errors += "Subtext is required"
    when (draft) {
        is PersonalBioDraft -> {
            if (draft.bio.isBlank()) errors += "Bio is required"
            if (draft.links.isEmpty()) errors += "At least one link is required"
        }
        is SocialHubDraft -> if (draft.socialLinks.isEmpty()) errors += "Add at least one social link"
        is ShopStoreDraft -> if (draft.products.isEmpty()) errors += "Add at least one product"
        is CalendarDraft -> if (draft.events.isEmpty()) errors += "Add at least one event"
        is HealthDraft -> if (draft.workouts.isEmpty()) errors += "Add at least one workout"
        is PortfolioDraft -> if (draft.projects.isEmpty()) errors += "Add at least one project"
        is DaoDraft -> if (draft.proposals.isEmpty()) errors += "Add at least one proposal"
        is LinkBioDraft -> if (draft.links.isEmpty()) errors += "Add at least one link"
    }
    return errors
}

object TemplateDraftStorage {
    private const val PREF = "skr_template_drafts"

    fun load(context: Context, templateId: String): TemplateDraft {
        val raw = context.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString(templateId, null)
            ?: return defaultDraftFor(templateId)
        return runCatching { fromJson(JSONObject(raw)) }.getOrElse { defaultDraftFor(templateId) }
    }

    fun save(context: Context, draft: TemplateDraft) {
        val raw = toJson(draft).toString()
        context.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().putString(draft.templateId, raw).apply()
    }

    private fun toJson(draft: TemplateDraft): JSONObject {
        val o = JSONObject()
        o.put("templateId", draft.templateId)
        o.put("headline", draft.headline)
        o.put("subtext", draft.subtext)
        o.put("themeAccent", draft.themeAccent)
        o.put("fontStyle", draft.fontStyle)
        o.put("profileMark", draft.profileMark)
        when (draft) {
            is PersonalBioDraft -> {
                o.put("bio", draft.bio)
                o.put("links", draft.links.toJsonArray { it.toJson() })
            }
            is SocialHubDraft -> {
                o.put("socialLinks", draft.socialLinks.toJsonArray { it.toJson() })
                o.put("web3Links", draft.web3Links.toJsonArray { it.toJson() })
                o.put("creatorLinks", draft.creatorLinks.toJsonArray { it.toJson() })
                o.put("stats", draft.stats.toJsonArray { it.toJson() })
                o.put("featuredCta", draft.featuredCta)
            }
            is ShopStoreDraft -> {
                o.put("featuredDrop", draft.featuredDrop.toJson())
                o.put("products", draft.products.toJsonArray { it.toJson() })
                o.put("stats", draft.stats.toJsonArray { it.toJson() })
                o.put("dropEndsIn", draft.dropEndsIn)
            }
            is CalendarDraft -> {
                o.put("events", draft.events.toJsonArray { it.toJson() })
                o.put("slots", draft.bookingSlots.toJsonArray { it })
                o.put("sessions", draft.sessions.toJsonArray { it.toJson() })
                o.put("livestreamTitle", draft.livestreamTitle)
                o.put("livestreamStartsIn", draft.livestreamStartsIn)
            }
            is HealthDraft -> {
                o.put("workouts", draft.workouts.toJsonArray { it.toJson() })
                o.put("metrics", draft.metrics.toJsonArray { it.toJson() })
                o.put("coaches", draft.coaches.toJsonArray { it.toJson() })
            }
            is PortfolioDraft -> {
                o.put("projects", draft.projects.toJsonArray { it.toJson() })
                o.put("press", draft.press.toJsonArray { it.toJson() })
                o.put("contactCta", draft.contactCta)
            }
            is DaoDraft -> {
                o.put("treasury", draft.treasury)
                o.put("proposals", draft.proposals.toJsonArray { it.toJson() })
                o.put("delegates", draft.delegates.toJsonArray { it.toJson() })
            }
            is LinkBioDraft -> {
                o.put("links", draft.links.toJsonArray { it.toJson() })
                o.put("supporters", draft.supporters.toJsonArray { it.toJson() })
                o.put("tipAmounts", draft.tipAmounts.toJsonArray { it })
                o.put("analytics", draft.analytics.toJsonArray { it.toJson() })
            }
        }
        return o
    }

    private fun fromJson(o: JSONObject): TemplateDraft {
        val id = o.optString("templateId")
        return when (id) {
            "personal-bio" -> PersonalBioDraft(
                headline = o.optString("headline", "nakamura.skr"),
                subtext = o.optString("subtext", "Builder - Artist - Seeker"),
                themeAccent = o.optString("themeAccent", "#00C9A7"),
                fontStyle = o.optString("fontStyle", "Default"),
                profileMark = o.optProfileMark("P"),
                bio = o.optString("bio", ""),
                links = o.optJSONArray("links").toLinkItems(),
            )
            "social-hub" -> SocialHubDraft(
                headline = o.optString("headline", "nakamura.skr"),
                subtext = o.optString("subtext", ""),
                themeAccent = o.optString("themeAccent", "#00C9A7"),
                fontStyle = o.optString("fontStyle", "Default"),
                profileMark = o.optProfileMark("S"),
                socialLinks = o.optJSONArray("socialLinks").toLinkItems().ifEmpty { SocialHubDraft().socialLinks },
                web3Links = o.optJSONArray("web3Links").toLinkItems().ifEmpty { SocialHubDraft().web3Links },
                creatorLinks = o.optJSONArray("creatorLinks").toLinkItems().ifEmpty { SocialHubDraft().creatorLinks },
                stats = o.optJSONArray("stats").toMetricItems().ifEmpty { SocialHubDraft().stats },
                featuredCta = o.optString("featuredCta", SocialHubDraft().featuredCta),
            )
            "shop" -> ShopStoreDraft(
                headline = o.optString("headline", "nakamura.store"),
                subtext = o.optString("subtext", ""),
                themeAccent = o.optString("themeAccent", "#FF9432"),
                fontStyle = o.optString("fontStyle", "Default"),
                profileMark = o.optProfileMark("M"),
                featuredDrop = o.optJSONObject("featuredDrop").toProductItem() ?: ShopStoreDraft().featuredDrop,
                products = o.optJSONArray("products").toProductItems().ifEmpty { ShopStoreDraft().products },
                stats = o.optJSONArray("stats").toMetricItems().ifEmpty { ShopStoreDraft().stats },
                dropEndsIn = o.optString("dropEndsIn", ShopStoreDraft().dropEndsIn),
            )
            "calendar" -> CalendarDraft(
                headline = o.optString("headline", "Events"),
                subtext = o.optString("subtext", ""),
                themeAccent = o.optString("themeAccent", "#6366F1"),
                fontStyle = o.optString("fontStyle", "Default"),
                profileMark = o.optProfileMark("C"),
                events = o.optJSONArray("events").toEventItems().ifEmpty { CalendarDraft().events },
                bookingSlots = o.optJSONArray("slots").toStringItems().ifEmpty { CalendarDraft().bookingSlots },
                sessions = o.optJSONArray("sessions").toSessionItems().ifEmpty { CalendarDraft().sessions },
                livestreamTitle = o.optString("livestreamTitle", CalendarDraft().livestreamTitle),
                livestreamStartsIn = o.optString("livestreamStartsIn", CalendarDraft().livestreamStartsIn),
            )
            "health" -> HealthDraft(
                headline = o.optString("headline", "Fitness"),
                subtext = o.optString("subtext", ""),
                themeAccent = o.optString("themeAccent", "#50DC64"),
                fontStyle = o.optString("fontStyle", "Default"),
                profileMark = o.optProfileMark("F"),
                workouts = o.optJSONArray("workouts").toWorkoutItems().ifEmpty { HealthDraft().workouts },
                metrics = o.optJSONArray("metrics").toMetricItems().ifEmpty { HealthDraft().metrics },
                coaches = o.optJSONArray("coaches").toCoachItems().ifEmpty { HealthDraft().coaches },
            )
            "portfolio" -> PortfolioDraft(
                headline = o.optString("headline", "Creator Portfolio"),
                subtext = o.optString("subtext", ""),
                themeAccent = o.optString("themeAccent", "#9945FF"),
                fontStyle = o.optString("fontStyle", "Default"),
                profileMark = o.optProfileMark("A"),
                projects = o.optJSONArray("projects").toLinkItems().ifEmpty { PortfolioDraft().projects },
                press = o.optJSONArray("press").toLinkItems().ifEmpty { PortfolioDraft().press },
                contactCta = o.optString("contactCta", PortfolioDraft().contactCta),
            )
            "organization" -> DaoDraft(
                headline = o.optString("headline", "VOID DAO"),
                subtext = o.optString("subtext", ""),
                themeAccent = o.optString("themeAccent", "#7C83FF"),
                fontStyle = o.optString("fontStyle", "Default"),
                profileMark = o.optProfileMark("D"),
                treasury = o.optString("treasury", "24,847 SOL"),
                proposals = o.optJSONArray("proposals").toProposalItems().ifEmpty { DaoDraft().proposals },
                delegates = o.optJSONArray("delegates").toLinkItems().ifEmpty { DaoDraft().delegates },
            )
            "link-in-bio" -> LinkBioDraft(
                headline = o.optString("headline", "kira.skr"),
                subtext = o.optString("subtext", ""),
                themeAccent = o.optString("themeAccent", "#F5A623"),
                fontStyle = o.optString("fontStyle", "Default"),
                profileMark = o.optProfileMark("L"),
                links = o.optJSONArray("links").toLinkItems().ifEmpty { LinkBioDraft().links },
                supporters = o.optJSONArray("supporters").toSupporterItems().ifEmpty { LinkBioDraft().supporters },
                tipAmounts = o.optJSONArray("tipAmounts").toStringItems().ifEmpty { LinkBioDraft().tipAmounts },
                analytics = o.optJSONArray("analytics").toMetricItems().ifEmpty { LinkBioDraft().analytics },
            )
            else -> defaultDraftFor(id)
        }
    }
}

private fun JSONObject.optProfileMark(default: String): String {
    val legacyKey = "profile" + "Em" + "oji"
    val raw = optString("profileMark").ifBlank { optString(legacyKey) }.trim()
    if (raw.isBlank()) return default
    val asciiMark = raw.filter { it.isLetterOrDigit() }.take(3).uppercase()
    return asciiMark.ifBlank { default }
}

private fun LinkItem.toJson() = JSONObject().put("label", label).put("url", url)
private fun MetricItem.toJson() = JSONObject().put("label", label).put("value", value)
private fun ProductItem.toJson() = JSONObject().put("name", name).put("price", price).put("category", category)
private fun EventItem.toJson() = JSONObject().put("title", title).put("time", time).put("cta", cta)
private fun WorkoutItem.toJson() = JSONObject().put("name", name).put("duration", duration).put("level", level)
private fun ProposalItem.toJson() = JSONObject().put("title", title).put("status", status).put("category", category)
private fun SupporterItem.toJson() = JSONObject().put("name", name).put("amount", amount)
private fun CoachItem.toJson() = JSONObject().put("name", name).put("session", session).put("price", price)
private fun SessionItem.toJson() = JSONObject().put("name", name).put("price", price).put("duration", duration)

private fun <T> List<T>.toJsonArray(mapper: (T) -> Any): JSONArray {
    val a = JSONArray()
    forEach { a.put(mapper(it)) }
    return a
}

private fun JSONArray?.toLinkItems(): List<LinkItem> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { i ->
        optJSONObject(i)?.let { LinkItem(it.optString("label"), it.optString("url")) }
    }.filter { it.label.isNotBlank() }
}

private fun JSONArray?.toMetricItems(): List<MetricItem> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { i ->
        optJSONObject(i)?.let { MetricItem(it.optString("label"), it.optString("value")) }
    }.filter { it.label.isNotBlank() }
}

private fun JSONArray?.toProductItems(): List<ProductItem> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { i ->
        optJSONObject(i)?.let { ProductItem(it.optString("name"), it.optString("price"), it.optString("category")) }
    }.filter { it.name.isNotBlank() }
}

private fun JSONObject?.toProductItem(): ProductItem? {
    if (this == null) return null
    val name = optString("name")
    if (name.isBlank()) return null
    return ProductItem(name, optString("price"), optString("category"))
}

private fun JSONArray?.toEventItems(): List<EventItem> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { i ->
        optJSONObject(i)?.let { EventItem(it.optString("title"), it.optString("time"), it.optString("cta", "RSVP")) }
    }.filter { it.title.isNotBlank() }
}

private fun JSONArray?.toWorkoutItems(): List<WorkoutItem> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { i ->
        optJSONObject(i)?.let { WorkoutItem(it.optString("name"), it.optString("duration"), it.optString("level")) }
    }.filter { it.name.isNotBlank() }
}

private fun JSONArray?.toProposalItems(): List<ProposalItem> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { i ->
        optJSONObject(i)?.let { ProposalItem(it.optString("title"), it.optString("status"), it.optString("category")) }
    }.filter { it.title.isNotBlank() }
}

private fun JSONArray?.toSupporterItems(): List<SupporterItem> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { i ->
        optJSONObject(i)?.let { SupporterItem(it.optString("name"), it.optString("amount")) }
    }.filter { it.name.isNotBlank() }
}

private fun JSONArray?.toCoachItems(): List<CoachItem> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { i ->
        optJSONObject(i)?.let { CoachItem(it.optString("name"), it.optString("session"), it.optString("price")) }
    }.filter { it.name.isNotBlank() }
}

private fun JSONArray?.toSessionItems(): List<SessionItem> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { i ->
        optJSONObject(i)?.let { SessionItem(it.optString("name"), it.optString("price"), it.optString("duration")) }
    }.filter { it.name.isNotBlank() }
}

private fun JSONArray?.toStringItems(): List<String> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { i -> optString(i) }.filter { it.isNotBlank() }
}

data class SkrTemplate(
    val id: String,
    val title: String,
    val description: String,
    val mark: String,
    val premium: Boolean,
    val route: String,
    val imageRes: Int,
)

val allTemplates = listOf(
    SkrTemplate("personal-bio", "Personal Bio", "Free default profile", "P", false, "personalbio", R.drawable.seeker_img_01),
    SkrTemplate("social-hub", "Social Hub", "Community links", "S", true, "socialhub", R.drawable.seeker_img_02),
    SkrTemplate("shop", "Shop", "Sell with SKR", "M", true, "shopstore", R.drawable.seeker_img_03),
    SkrTemplate("calendar", "Calendar", "Events and RSVP", "C", true, "calendarevents", R.drawable.seeker_img_04),
    SkrTemplate("health", "Health & Fitness", "Track goals", "F", true, "healthfitness", R.drawable.seeker_img_05),
    SkrTemplate("portfolio", "Creator Portfolio", "Showcase work", "A", true, "creatorportfolio", R.drawable.seeker_img_06),
    SkrTemplate("organization", "DAO Governance", "Mission and voting", "D", true, "daogovernance", R.drawable.seeker_img_07),
    SkrTemplate("link-in-bio", "Link in Bio", "Tip jars and stacked links", "L", true, "linkbio", R.drawable.seeker_img_08),
    SkrTemplate("bring-your-own", "Bring Your Own", "Upload custom template", "B", true, "editor", R.drawable.seeker_img_09),
)
