package com.skrstudio.app.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.skrstudio.app.CalendarDraft
import com.skrstudio.app.DaoDraft
import com.skrstudio.app.EventItem
import com.skrstudio.app.HealthDraft
import com.skrstudio.app.LinkBioDraft
import com.skrstudio.app.LinkItem
import com.skrstudio.app.MetricItem
import com.skrstudio.app.PersonalBioDraft
import com.skrstudio.app.PortfolioDraft
import com.skrstudio.app.ProductItem
import com.skrstudio.app.ProposalItem
import com.skrstudio.app.ShopStoreDraft
import com.skrstudio.app.SkrTemplate
import com.skrstudio.app.SocialHubDraft
import com.skrstudio.app.SupporterItem
import com.skrstudio.app.TemplateDraft
import com.skrstudio.app.WorkoutItem
import com.skrstudio.app.chain.ChainConfig
import com.skrstudio.app.chain.PublishFlowState
import com.skrstudio.app.chain.PublishResult
import com.skrstudio.app.chain.PublishStep
import com.skrstudio.app.ui.SeekerColors
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onStart: () -> Unit, onAbout: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Color(0xFF121629), SeekerColors.BgDark))),
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            HeroBird()
            Text(".skr Studio", color = SeekerColors.TextPrimary, fontSize = 36.sp, fontWeight = FontWeight.Black)
            Text("Your .skr, your way", color = SeekerColors.TextMuted)
            Spacer(Modifier.height(6.dp))
            Button(onClick = onStart, modifier = Modifier.fillMaxWidth()) { Text("Get Started") }
            OutlinedButton(onClick = onAbout, modifier = Modifier.fillMaxWidth()) { Text("What is .skr Studio?") }
            Text("Powered by Solana • alldomains.id", color = SeekerColors.TextMuted, fontSize = 11.sp)
        }
    }
}

@Composable
fun ArtScreen(onBack: () -> Unit, onBuild: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        TopBar("About .skr Studio", onBack)
        HeroCard("Official Seeker dApp", "Build a profile page linked to your .skr identity.")
        InfoRow("8 Ready Templates", "Social, shop, calendar, fitness, portfolio, DAO, and link-in-bio.")
        InfoRow("On-Chain Publish", "Each publish is signed and confirmed on Solana.")
        InfoRow("Made for Seeker", "Mobile-first flow with wallet approval.")
        Button(onClick = onBuild, modifier = Modifier.fillMaxWidth()) { Text("Let's build mine") }
    }
}

@Composable
fun HomeScreen(
    selectedTemplate: SkrTemplate,
    onOpenTemplates: () -> Unit,
    onOpenEditor: () -> Unit,
    onOpenPreview: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFF0F1426), SeekerColors.BgDark))).verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Good morning", color = SeekerColors.TextMuted, fontSize = 12.sp)
        Text("nakamura.skr", color = SeekerColors.TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)

        Card(colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border), shape = RoundedCornerShape(18.dp)) {
            Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Your Public Page", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Image(
                    painter = painterResource(selectedTemplate.imageRes),
                    contentDescription = selectedTemplate.title,
                    modifier = Modifier.fillMaxWidth().height(190.dp).clip(RoundedCornerShape(14.dp)),
                    contentScale = ContentScale.Crop,
                )
                Text(selectedTemplate.title, color = SeekerColors.TextPrimary, fontWeight = FontWeight.SemiBold)
                Text(selectedTemplate.description, color = SeekerColors.TextMuted, fontSize = 12.sp)
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("2.4k", "Views", Modifier.weight(1f))
            StatCard("186", "Clicks", Modifier.weight(1f))
            StatCard("12", "Links", Modifier.weight(1f))
        }

        Button(onClick = onOpenTemplates, modifier = Modifier.fillMaxWidth()) { Text("Browse Templates") }
        OutlinedButton(onClick = onOpenEditor, modifier = Modifier.fillMaxWidth()) { Text("Open Template") }
        OutlinedButton(onClick = onOpenPreview, modifier = Modifier.fillMaxWidth()) { Text("Preview Public Page") }
    }
}

@Composable
fun TemplateGalleryScreen(templates: List<SkrTemplate>, selectedTemplate: SkrTemplate, onSelect: (SkrTemplate) -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).padding(12.dp)) {
        Text("Choose Template", color = SeekerColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.padding(8.dp))
        Text("Pick a layout, then make it yours.", color = SeekerColors.TextMuted, fontSize = 12.sp, modifier = Modifier.padding(start = 8.dp, bottom = 8.dp))
        LazyVerticalGrid(columns = GridCells.Fixed(2), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(templates) { template ->
                Card(
                    onClick = { onSelect(template) },
                    colors = CardDefaults.cardColors(if (template.id == selectedTemplate.id) SeekerColors.BgCard else Color(0xFF121A2D)),
                    border = BorderStroke(1.dp, if (template.id == selectedTemplate.id) SeekerColors.TealCyan else SeekerColors.Border),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Image(painter = painterResource(template.imageRes), contentDescription = template.title, modifier = Modifier.fillMaxWidth().height(100.dp).clip(RoundedCornerShape(12.dp)), contentScale = ContentScale.Crop)
                        Text(template.title, color = SeekerColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text(template.description, color = SeekerColors.TextMuted, fontSize = 11.sp)
                        Text(if (template.premium) "Unlock required" else "Included", color = if (template.premium) SeekerColors.TealCyan else SeekerColors.ChromeLight, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileScreen(onEditLinks: () -> Unit, onPreview: () -> Unit, onDesign: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("My Profile", color = SeekerColors.TextPrimary, fontSize = 26.sp, fontWeight = FontWeight.Bold)
        HeroCard("nakamura.skr", "Builder • Artist • Seeker")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("2.4k", "Views", Modifier.weight(1f))
            StatCard("186", "Clicks", Modifier.weight(1f))
            StatCard("41d", "Days live", Modifier.weight(1f))
        }
        OutlinedButton(onClick = onEditLinks, modifier = Modifier.fillMaxWidth()) { Text("Edit links") }
        OutlinedButton(onClick = onDesign, modifier = Modifier.fillMaxWidth()) { Text("Edit design") }
        OutlinedButton(onClick = onPreview, modifier = Modifier.fillMaxWidth()) { Text("Preview page") }
    }
}

@Composable
fun SettingsScreen(onManageDomain: () -> Unit) {
    var notifications by remember { mutableStateOf(true) }
    var analytics by remember { mutableStateOf(true) }
    var autoPublish by remember { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Settings", color = SeekerColors.TextPrimary, fontSize = 26.sp, fontWeight = FontWeight.Bold)
        ToggleRow("Push notifications", notifications) { notifications = it }
        ToggleRow("Analytics tracking", analytics) { analytics = it }
        ToggleRow("Auto-publish after save", autoPublish) { autoPublish = it }
        InfoRow("Connected wallet", "Use your wallet to unlock and publish")
        OutlinedButton(onClick = onManageDomain, modifier = Modifier.fillMaxWidth()) { Text("Manage wallet") }
    }
}

@Composable
fun SocialLinksScreen(draft: TemplateDraft, onDraftChange: (TemplateDraft) -> Unit, onBack: () -> Unit, onPublish: () -> Unit) {
    val source = when (draft) {
        is PersonalBioDraft -> draft.links
        is SocialHubDraft -> draft.socialLinks
        is LinkBioDraft -> draft.links
        else -> emptyList()
    }
    var local by remember(source) { mutableStateOf(source) }
    var showAdd by remember { mutableStateOf(false) }
    var label by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }

    Box(Modifier.fillMaxSize().background(SeekerColors.BgDark)) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            TopBar("Social Links", onBack)
            Text("These links show on your public page.", color = SeekerColors.TextMuted, fontSize = 12.sp)
            EditableLinks(local) { local = it }
            OutlinedButton(onClick = { showAdd = true }, modifier = Modifier.fillMaxWidth()) { Text("Add link") }
            Button(onClick = {
                onDraftChange(
                    when (draft) {
                        is PersonalBioDraft -> draft.copy(links = local)
                        is SocialHubDraft -> draft.copy(socialLinks = local)
                        is LinkBioDraft -> draft.copy(links = local)
                        else -> draft
                    },
                )
                onPublish()
            }, modifier = Modifier.fillMaxWidth()) { Text("Save and publish") }
        }

        if (showAdd) {
            OverlaySheet("Add New Link", onClose = { showAdd = false }) {
                OutlinedTextField(value = label, onValueChange = { label = it }, label = { Text("Label") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = url, onValueChange = { url = it }, label = { Text("URL") }, modifier = Modifier.fillMaxWidth())
                Button(onClick = {
                    if (label.isNotBlank() && url.isNotBlank()) {
                        local = local + LinkItem(label.trim(), url.trim())
                        label = ""
                        url = ""
                        showAdd = false
                    }
                }, modifier = Modifier.fillMaxWidth()) { Text("Add") }
            }
        }
    }
}

@Composable
fun EditorScreen(template: SkrTemplate, draft: TemplateDraft, unlocked: Boolean, validationErrors: List<String>, onDraftChange: (TemplateDraft) -> Unit, onContinue: () -> Unit, onUnlock: () -> Unit) {
    TemplateRouteScreen(template, draft, unlocked || !template.premium, validationErrors, onDraftChange, onContinue, onUnlock)
}

@Composable
fun WalletScreen(walletAddress: String?, onConnect: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Connect Wallet", color = SeekerColors.TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.Bold)
        Text("Connect once to unlock premium templates and publish your page.", color = SeekerColors.TextMuted)
        listOf(
            "Phantom" to "Most used Solana wallet",
            "Backpack" to "xNFT-ready wallet",
            "Seed Vault" to "Secure Seeker wallet option",
            "Solflare" to "Browser and mobile support",
        ).forEach { (name, note) -> InfoRow(name, note) }

        Button(onClick = onConnect, modifier = Modifier.fillMaxWidth()) { Text(if (walletAddress == null) "Connect wallet" else "Reconnect wallet") }
        if (walletAddress != null) {
            Text("Connected", color = SeekerColors.TealCyan, fontWeight = FontWeight.SemiBold)
            Text(walletAddress, color = SeekerColors.ChromeLight, fontSize = 12.sp)
        }
    }
}

@Composable
fun PublishScreen(template: SkrTemplate, walletAddress: String?, entitlementPurchased: Boolean, flowState: PublishFlowState, validationErrors: List<String>, onPublish: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Publish", color = SeekerColors.TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.Bold)
        Text(template.title, color = SeekerColors.ChromeLight)
        Text(if (walletAddress == null) "Wallet not connected" else "Wallet connected", color = SeekerColors.TextMuted)
        Text(if (entitlementPurchased || !template.premium) "Template unlocked" else "Unlock required (${ChainConfig.SKR_UNLOCK_AMOUNT_UI} SKR)", color = SeekerColors.TextMuted)

        if (validationErrors.isNotEmpty()) {
            BasicCard("Finish these details", "Complete required fields before publishing") {
                validationErrors.forEach { Text("• $it", color = Color(0xFFFF8A80), fontSize = 12.sp) }
            }
        }
        InfoRow("Current step", publishStatus(flowState.step))
        if (!flowState.error.isNullOrBlank()) Text(publishError(flowState.error), color = Color(0xFFFF8A80), fontSize = 12.sp)

        Button(onClick = onPublish, enabled = flowState.canTapAction && validationErrors.isEmpty(), modifier = Modifier.fillMaxWidth()) { Text(publishCta(flowState.step)) }
    }
}

@Composable
fun PreviewScreen(publishResult: PublishResult?, onHome: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Publish Receipt", color = SeekerColors.TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        if (publishResult == null) {
            Text("No publish yet.", color = SeekerColors.TextMuted)
        } else {
            InfoRow("Confirmation", publishResult.signature)
            InfoRow("Page version", publishResult.contentHashHex)
            InfoRow("Page link", publishResult.contentUri)
        }
        Button(onClick = onHome) { Text("Back Home") }
    }
}

@Composable
fun TemplateRouteScreen(template: SkrTemplate, draft: TemplateDraft, unlocked: Boolean, validationErrors: List<String>, onDraftChange: (TemplateDraft) -> Unit, onContinue: () -> Unit, onUnlock: () -> Unit) {
    val accent = draftAccent(draft, template.id)
    LazyColumn(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(accent.copy(alpha = 0.08f), SeekerColors.BgDark))).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { HeaderCard(template, draft) }
        item { PreviewModules(draft) }

        if (!unlocked && template.premium) {
            item {
                BasicCard("Unlock to continue", "Purchase this template to open editing and publishing.") {
                    Button(onClick = onUnlock, modifier = Modifier.fillMaxWidth()) {
                        Text("Unlock ${template.title} (${ChainConfig.SKR_UNLOCK_AMOUNT_UI} SKR)")
                    }
                }
            }
        } else {
            item { StyleControls(draft, onDraftChange) }
            item { InputTables(draft, onDraftChange) }
            if (validationErrors.isNotEmpty()) {
                item {
                    BasicCard("Finish these fields", "Please update the items below.") {
                        validationErrors.forEach { Text("• $it", color = Color(0xFFFF8A80), fontSize = 12.sp) }
                    }
                }
            }
            item { Button(onClick = onContinue, modifier = Modifier.fillMaxWidth(), enabled = validationErrors.isEmpty()) { Text("Continue to publish") } }
        }
    }
}

@Composable
private fun PreviewModules(draft: TemplateDraft) {
    when (draft) {
        is PersonalBioDraft -> PersonalBioModules(draft)
        is SocialHubDraft -> SocialHubModules(draft)
        is ShopStoreDraft -> ShopModules(draft)
        is CalendarDraft -> CalendarModules(draft)
        is HealthDraft -> HealthModules(draft)
        is PortfolioDraft -> PortfolioModules(draft)
        is DaoDraft -> DaoModules(draft)
        is LinkBioDraft -> LinkBioModules(draft)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PersonalBioModules(draft: PersonalBioDraft) {
    BasicCard("Personal Bio", "Hero, social chips, and intro message") {
        Text(draft.headline, color = SeekerColors.TextPrimary, fontWeight = FontWeight.Bold)
        Text(draft.subtext, color = SeekerColors.TextMuted, fontSize = 12.sp)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            draft.links.take(4).forEach { Chip(it.label) }
        }
        Text("\"${draft.bio}\"", color = SeekerColors.ChromeLight, fontSize = 12.sp)
    }
}

@Composable
private fun SocialHubModules(draft: SocialHubDraft) {
    var filter by remember { mutableStateOf("all") }
    BasicCard("Social Hub", "Categories, stacked links, and metrics") {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("all", "social", "web3").forEach {
                FilterChip(selected = filter == it, onClick = { filter = it }, label = { Text(it.uppercase()) })
            }
        }
        if (filter != "web3") {
            Text("Social", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            LinkList(draft.socialLinks)
        }
        if (filter != "social") {
            Text("Web3", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            LinkList(draft.web3Links)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            draft.stats.forEach { StatCard(it.value, it.label, Modifier.weight(1f)) }
        }
    }
}

@Composable
private fun ShopModules(draft: ShopStoreDraft) {
    var filter by remember { mutableStateOf("all") }
    var cart by remember { mutableStateOf(listOf<ProductItem>()) }
    var showCartSheet by remember { mutableStateOf(false) }
    var showBuyNowSheet by remember { mutableStateOf(false) }
    var selectedBuyNow by remember { mutableStateOf<ProductItem?>(null) }
    var countdown by remember { mutableIntStateOf(2 * 3600 + 47 * 60 + 18) }

    LaunchedEffect(Unit) {
        while (countdown > 0) {
            delay(1000)
            countdown -= 1
        }
    }

    Box {
        BasicCard("Shop / Store", "Filters, cart flow, buy now, and timed drop") {
            Text("Drop ends in ${formatHms(countdown)}", color = SeekerColors.TextMuted, fontSize = 12.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("all", "nft", "digital", "merch").forEach {
                    FilterChip(selected = filter == it, onClick = { filter = it }, label = { Text(it.uppercase()) })
                }
            }

            draft.products.filter { filter == "all" || it.category == filter }.forEach { product ->
                Card(colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border)) {
                    Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(product.name, color = SeekerColors.TextPrimary, fontWeight = FontWeight.SemiBold)
                        Text(product.price, color = SeekerColors.TextMuted, fontSize = 12.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { selectedBuyNow = product; showBuyNowSheet = true }, modifier = Modifier.weight(1f)) { Text("Buy now") }
                            Button(onClick = { cart = cart + product }, modifier = Modifier.weight(1f)) { Text("Add to cart") }
                        }
                    }
                }
            }

            if (cart.isNotEmpty()) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Cart: ${cart.size} item(s)", color = SeekerColors.TealCyan, fontWeight = FontWeight.SemiBold)
                    TextButton(onClick = { showCartSheet = true }) { Text("Open cart") }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                draft.stats.forEach { StatCard(it.value, it.label, Modifier.weight(1f)) }
            }
        }

        if (showCartSheet) {
            OverlaySheet("Your Cart", onClose = { showCartSheet = false }) {
                if (cart.isEmpty()) {
                    Text("Your cart is empty.", color = SeekerColors.TextMuted, fontSize = 12.sp)
                } else {
                    cart.forEachIndexed { index, item ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text(item.name, color = SeekerColors.TextPrimary, fontSize = 12.sp)
                                Text(item.price, color = SeekerColors.TextMuted, fontSize = 11.sp)
                            }
                            TextButton(onClick = { cart = cart.toMutableList().also { it.removeAt(index) } }) { Text("Remove") }
                        }
                    }
                    Button(onClick = { cart = emptyList(); showCartSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Complete checkout") }
                }
            }
        }

        if (showBuyNowSheet) {
            val buy = selectedBuyNow
            OverlaySheet("Buy Now", onClose = { showBuyNowSheet = false }) {
                if (buy != null) {
                    InfoRow("Item", buy.name)
                    InfoRow("Price", buy.price)
                    Button(onClick = { showBuyNowSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Confirm purchase") }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CalendarModules(draft: CalendarDraft) {
    val months = listOf("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")
    var monthIndex by remember { mutableIntStateOf(5) }
    var selectedSlot by remember { mutableStateOf(draft.bookingSlots.firstOrNull().orEmpty()) }
    var selectedSession by remember { mutableStateOf("Strategy Session") }
    var livestreamCountdown by remember { mutableIntStateOf(4 * 3600 + 23 * 60 + 45) }
    var showRsvpSheet by remember { mutableStateOf(false) }
    var showTicketSheet by remember { mutableStateOf(false) }
    var showBookingSheet by remember { mutableStateOf(false) }
    var selectedEvent by remember { mutableStateOf(draft.events.firstOrNull()?.title ?: "Event") }

    LaunchedEffect(Unit) {
        while (livestreamCountdown > 0) {
            delay(1000)
            livestreamCountdown -= 1
        }
    }

    Box {
        BasicCard("Calendar & Events", "Month view, RSVP, tickets, and booking") {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { monthIndex = (monthIndex + 11) % 12 }) { Text("Prev") }
                Text(months[monthIndex], color = SeekerColors.ChromeLight, fontWeight = FontWeight.SemiBold)
                TextButton(onClick = { monthIndex = (monthIndex + 1) % 12 }) { Text("Next") }
            }

            Text("Next livestream in ${formatHms(livestreamCountdown)}", color = SeekerColors.TextMuted, fontSize = 12.sp)

            draft.events.forEach { event ->
                Card(colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border)) {
                    Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(event.title, color = SeekerColors.TextPrimary, fontWeight = FontWeight.SemiBold)
                        Text(event.time, color = SeekerColors.TextMuted, fontSize = 12.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { selectedEvent = event.title; showRsvpSheet = true }, modifier = Modifier.weight(1f)) { Text("RSVP") }
                            Button(onClick = { selectedEvent = event.title; showTicketSheet = true }, modifier = Modifier.weight(1f)) { Text("Get ticket") }
                        }
                    }
                }
            }

            Text("Book a session", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                draft.bookingSlots.forEach { slot ->
                    FilterChip(selected = selectedSlot == slot, onClick = { selectedSlot = slot }, label = { Text(slot) })
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Strategy Session", "Code Review", "Creator Mentoring").forEach { session ->
                    FilterChip(selected = selectedSession == session, onClick = { selectedSession = session }, label = { Text(session) })
                }
            }
            Button(onClick = { showBookingSheet = true }, modifier = Modifier.fillMaxWidth()) { Text("Confirm booking") }
        }

        if (showRsvpSheet) {
            OverlaySheet("RSVP Confirmed", onClose = { showRsvpSheet = false }) {
                Text("You're on the list for $selectedEvent.", color = SeekerColors.TextMuted, fontSize = 12.sp)
            }
        }
        if (showTicketSheet) {
            OverlaySheet("Ticket Ready", onClose = { showTicketSheet = false }) {
                Text("Ticket for $selectedEvent is ready.", color = SeekerColors.TextMuted, fontSize = 12.sp)
                InfoRow("Code", "SKR-${(1000..9999).random()}")
            }
        }
        if (showBookingSheet) {
            OverlaySheet("Booking Requested", onClose = { showBookingSheet = false }) {
                InfoRow("Session", selectedSession)
                InfoRow("Time", selectedSlot)
                Text("We'll confirm by wallet message shortly.", color = SeekerColors.TextMuted, fontSize = 12.sp)
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HealthModules(draft: HealthDraft) {
    var dayIndex by remember { mutableIntStateOf(1) }
    var running by remember { mutableStateOf(false) }
    var workoutSeconds by remember { mutableIntStateOf(0) }
    var showCoachSheet by remember { mutableStateOf(false) }
    var selectedCoach by remember { mutableStateOf("Coach Nova") }

    LaunchedEffect(running) {
        while (running) {
            delay(1000)
            workoutSeconds += 1
        }
    }

    Box {
        BasicCard("Health & Fitness", "Daily focus, timer, and coach booking") {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                (1..7).forEach { d ->
                    FilterChip(selected = dayIndex == d, onClick = { dayIndex = d }, label = { Text("D$d") })
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                draft.metrics.forEach { StatCard(it.value, it.label, Modifier.weight(1f)) }
            }
            draft.workouts.forEach { workout ->
                InfoRow(workout.name, "${workout.duration} • ${workout.level}")
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { running = !running }, modifier = Modifier.weight(1f)) { Text(if (running) "Pause timer" else "Start timer") }
                OutlinedButton(onClick = { running = false; workoutSeconds = 0 }, modifier = Modifier.weight(1f)) { Text("Reset") }
            }
            Text("Workout timer: ${formatHms(workoutSeconds)}", color = SeekerColors.ChromeLight, fontSize = 12.sp)

            Text("Coaching", color = SeekerColors.ChromeLight, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Coach Nova", "Coach Astra", "Coach Vale").forEach { coach ->
                    OutlinedButton(onClick = { selectedCoach = coach; showCoachSheet = true }) { Text(coach) }
                }
            }
        }

        if (showCoachSheet) {
            OverlaySheet("Coach Session", onClose = { showCoachSheet = false }) {
                InfoRow("Coach", selectedCoach)
                InfoRow("Session", "45 minutes")
                Button(onClick = { showCoachSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Book session") }
            }
        }
    }
}

@Composable
private fun PortfolioModules(draft: PortfolioDraft) {
    var showContactSheet by remember { mutableStateOf(false) }
    var showWorkSheet by remember { mutableStateOf(false) }

    Box {
        BasicCard("Creator Portfolio", "Featured work, media, and contact actions") {
            Text("Featured Projects", color = SeekerColors.ChromeLight, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            draft.projects.forEach { InfoRow(it.label, it.url) }
            Text("Press", color = SeekerColors.ChromeLight, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            draft.press.forEach { InfoRow(it.label, it.url) }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { showContactSheet = true }, modifier = Modifier.weight(1f)) { Text("Contact") }
                OutlinedButton(onClick = { showWorkSheet = true }, modifier = Modifier.weight(1f)) { Text("View all") }
            }
        }

        if (showContactSheet) {
            OverlaySheet("Contact Creator", onClose = { showContactSheet = false }) {
                Text("Pick how you want to reach out.", color = SeekerColors.TextMuted, fontSize = 12.sp)
                OutlinedButton(onClick = { showContactSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Send a message") }
                OutlinedButton(onClick = { showContactSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Open social links") }
            }
        }
        if (showWorkSheet) {
            OverlaySheet("All Work", onClose = { showWorkSheet = false }) {
                Text("Browse all projects and highlights.", color = SeekerColors.TextMuted, fontSize = 12.sp)
                draft.projects.forEach { InfoRow(it.label, it.url) }
            }
        }
    }
}

@Composable
private fun DaoModules(draft: DaoDraft) {
    var filter by remember { mutableStateOf("all") }
    var showVoteSheet by remember { mutableStateOf(false) }
    var showDelegateSheet by remember { mutableStateOf(false) }
    var showCreateSheet by remember { mutableStateOf(false) }
    var selectedProposal by remember { mutableStateOf(draft.proposals.firstOrNull()?.title ?: "Proposal") }
    var voteChoice by remember { mutableStateOf("For") }
    var delegateChoice by remember { mutableStateOf("Astra") }
    var newProposalTitle by remember { mutableStateOf("") }

    Box {
        BasicCard("DAO Governance", "Treasury, proposal filters, and action sheets") {
            InfoRow("Treasury", draft.treasury)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("all", "funding", "protocol", "election").forEach {
                    FilterChip(selected = filter == it, onClick = { filter = it }, label = { Text(it.uppercase()) })
                }
            }

            draft.proposals.filter { filter == "all" || it.category == filter }.forEach { proposal ->
                Card(colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border)) {
                    Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(proposal.title, color = SeekerColors.TextPrimary, fontWeight = FontWeight.SemiBold)
                        Text("Status: ${proposal.status}", color = SeekerColors.TextMuted, fontSize = 12.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { selectedProposal = proposal.title; showVoteSheet = true }, modifier = Modifier.weight(1f)) { Text("Vote") }
                            OutlinedButton(onClick = { showDelegateSheet = true }, modifier = Modifier.weight(1f)) { Text("Delegate") }
                        }
                    }
                }
            }
            Button(onClick = { showCreateSheet = true }, modifier = Modifier.fillMaxWidth()) { Text("Create proposal") }
        }

        if (showVoteSheet) {
            OverlaySheet("Vote", onClose = { showVoteSheet = false }) {
                InfoRow("Proposal", selectedProposal)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("For", "Against", "Abstain").forEach { choice ->
                        FilterChip(selected = voteChoice == choice, onClick = { voteChoice = choice }, label = { Text(choice) })
                    }
                }
                Button(onClick = { showVoteSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Submit vote") }
            }
        }

        if (showDelegateSheet) {
            OverlaySheet("Delegate Votes", onClose = { showDelegateSheet = false }) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Astra", "Nova", "Vale").forEach { person ->
                        FilterChip(selected = delegateChoice == person, onClick = { delegateChoice = person }, label = { Text(person) })
                    }
                }
                Button(onClick = { showDelegateSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Confirm delegate") }
            }
        }

        if (showCreateSheet) {
            OverlaySheet("Create Proposal", onClose = { showCreateSheet = false }) {
                OutlinedTextField(value = newProposalTitle, onValueChange = { newProposalTitle = it }, label = { Text("Proposal title") }, modifier = Modifier.fillMaxWidth())
                Button(onClick = { showCreateSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Submit proposal") }
            }
        }
    }
}

@Composable
private fun LinkBioModules(draft: LinkBioDraft) {
    var links by remember(draft.links) { mutableStateOf(draft.links) }
    var tipSelection by remember { mutableStateOf("0.5 SOL") }
    var range by remember { mutableStateOf("7d") }
    var views by remember { mutableIntStateOf(8247) }
    var clicks by remember { mutableIntStateOf(5628) }
    var showAddSheet by remember { mutableStateOf(false) }
    var showTipSheet by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }
    var newUrl by remember { mutableStateOf("") }

    Box {
        BasicCard("Link-in-Bio+", "Links, add-link sheet, tips, and analytics toggles") {
            links.forEachIndexed { index, item ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(item.label, color = SeekerColors.TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                        Text(item.url, color = SeekerColors.TextMuted, fontSize = 11.sp)
                    }
                    TextButton(onClick = {
                        clicks += 1
                        links = links.toMutableList().also { it[index] = it[index].copy(label = it[index].label) }
                    }) { Text("Open") }
                }
            }
            OutlinedButton(onClick = { showAddSheet = true }, modifier = Modifier.fillMaxWidth()) { Text("Add link") }

            Text("Support", color = SeekerColors.ChromeLight, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("0.1 SOL", "0.5 SOL", "1 SOL", "Custom").forEach {
                    FilterChip(selected = tipSelection == it, onClick = { tipSelection = it }, label = { Text(it) })
                }
            }
            Button(onClick = { showTipSheet = true }, modifier = Modifier.fillMaxWidth()) { Text("Send tip") }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("7d", "30d", "all").forEach {
                    FilterChip(
                        selected = range == it,
                        onClick = {
                            range = it
                            when (it) {
                                "7d" -> {
                                    views = 8247
                                    clicks = 5628
                                }
                                "30d" -> {
                                    views = 32841
                                    clicks = 21093
                                }
                                else -> {
                                    views = 147562
                                    clicks = 89247
                                }
                            }
                        },
                        label = { Text(it.uppercase()) },
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                StatCard(views.toString(), "Views", Modifier.weight(1f))
                StatCard(clicks.toString(), "Clicks", Modifier.weight(1f))
            }

            Text("Recent supporters", color = SeekerColors.ChromeLight, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            draft.supporters.forEach { InfoRow(it.name, it.amount) }
        }

        if (showAddSheet) {
            OverlaySheet("Add New Link", onClose = { showAddSheet = false }) {
                OutlinedTextField(value = newTitle, onValueChange = { newTitle = it }, label = { Text("Title") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = newUrl, onValueChange = { newUrl = it }, label = { Text("URL") }, modifier = Modifier.fillMaxWidth())
                Button(onClick = {
                    if (newTitle.isNotBlank() && newUrl.isNotBlank()) {
                        links = links + LinkItem(newTitle.trim(), newUrl.trim())
                        newTitle = ""
                        newUrl = ""
                        showAddSheet = false
                    }
                }, modifier = Modifier.fillMaxWidth()) { Text("Add link") }
            }
        }

        if (showTipSheet) {
            OverlaySheet("Confirm Tip", onClose = { showTipSheet = false }) {
                InfoRow("Amount", tipSelection)
                InfoRow("Network", "Solana")
                Button(onClick = { showTipSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Confirm and send") }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun StyleControls(draft: TemplateDraft, onDraftChange: (TemplateDraft) -> Unit) = BasicCard("Style Controls", "Set accent, font, and profile icon") {
    val accentChoices = listOf("#00C9A7", "#9945FF", "#FF4FCB", "#FF9432", "#4F9FFF")
    Text("Accent color", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        accentChoices.forEach { hex ->
            FilterChip(selected = draft.themeAccent == hex, onClick = { onDraftChange(updateStyle(draft, themeAccent = hex)) }, label = { Text(hex.removePrefix("#")) })
        }
    }

    Text("Font style", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        listOf("Default", "Bold", "Italic").forEach { style ->
            FilterChip(selected = draft.fontStyle == style, onClick = { onDraftChange(updateStyle(draft, fontStyle = style)) }, label = { Text(style) })
        }
    }

    Text("Profile icon", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        listOf("🐦", "🎨", "⚡", "🔮", "🌐").forEach { icon ->
            FilterChip(selected = draft.profileEmoji == icon, onClick = { onDraftChange(updateStyle(draft, profileEmoji = icon)) }, label = { Text(icon) })
        }
    }
}

@Composable
private fun InputTables(draft: TemplateDraft, onDraftChange: (TemplateDraft) -> Unit) = BasicCard("Customize", "Update each section before publishing") {
    when (draft) {
        is PersonalBioDraft -> {
            CommonFields(draft.headline, draft.subtext) { h, s -> onDraftChange(draft.copy(headline = h, subtext = s)) }
            OutlinedTextField(value = draft.bio, onValueChange = { onDraftChange(draft.copy(bio = it)) }, label = { Text("About you") }, modifier = Modifier.fillMaxWidth())
            EditableLinks(draft.links) { onDraftChange(draft.copy(links = it)) }
        }
        is SocialHubDraft -> {
            CommonFields(draft.headline, draft.subtext) { h, s -> onDraftChange(draft.copy(headline = h, subtext = s)) }
            Text("Social links", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            EditableLinks(draft.socialLinks) { onDraftChange(draft.copy(socialLinks = it)) }
            Text("Web3 links", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            EditableLinks(draft.web3Links) { onDraftChange(draft.copy(web3Links = it)) }
        }
        is ShopStoreDraft -> {
            CommonFields(draft.headline, draft.subtext) { h, s -> onDraftChange(draft.copy(headline = h, subtext = s)) }
            EditableProducts(draft.products) { onDraftChange(draft.copy(products = it)) }
        }
        is CalendarDraft -> {
            CommonFields(draft.headline, draft.subtext) { h, s -> onDraftChange(draft.copy(headline = h, subtext = s)) }
            EditableEvents(draft.events) { onDraftChange(draft.copy(events = it)) }
            EditableSlots(draft.bookingSlots) { onDraftChange(draft.copy(bookingSlots = it)) }
        }
        is HealthDraft -> {
            CommonFields(draft.headline, draft.subtext) { h, s -> onDraftChange(draft.copy(headline = h, subtext = s)) }
            EditableWorkouts(draft.workouts) { onDraftChange(draft.copy(workouts = it)) }
            EditableMetrics(draft.metrics) { onDraftChange(draft.copy(metrics = it)) }
        }
        is PortfolioDraft -> {
            CommonFields(draft.headline, draft.subtext) { h, s -> onDraftChange(draft.copy(headline = h, subtext = s)) }
            Text("Projects", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            EditableLinks(draft.projects) { onDraftChange(draft.copy(projects = it)) }
            Text("Press", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            EditableLinks(draft.press) { onDraftChange(draft.copy(press = it)) }
        }
        is DaoDraft -> {
            CommonFields(draft.headline, draft.subtext) { h, s -> onDraftChange(draft.copy(headline = h, subtext = s)) }
            OutlinedTextField(value = draft.treasury, onValueChange = { onDraftChange(draft.copy(treasury = it)) }, label = { Text("Treasury") }, modifier = Modifier.fillMaxWidth())
            EditableProposals(draft.proposals) { onDraftChange(draft.copy(proposals = it)) }
        }
        is LinkBioDraft -> {
            CommonFields(draft.headline, draft.subtext) { h, s -> onDraftChange(draft.copy(headline = h, subtext = s)) }
            EditableLinks(draft.links) { onDraftChange(draft.copy(links = it)) }
            EditableSupporters(draft.supporters) { onDraftChange(draft.copy(supporters = it)) }
        }
    }
}

@Composable
private fun TopBar(title: String, onBack: () -> Unit) = Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
    TextButton(onClick = onBack) { Text("Back") }
    Text(title, color = SeekerColors.TextPrimary, fontWeight = FontWeight.SemiBold)
    Spacer(Modifier.size(48.dp))
}

@Composable
private fun ToggleRow(title: String, checked: Boolean, onChecked: (Boolean) -> Unit) = Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
    Text(title, color = SeekerColors.TextPrimary)
    Switch(checked = checked, onCheckedChange = onChecked)
}

@Composable
private fun HeroBird() {
    Box(
        modifier = Modifier
            .size(116.dp)
            .clip(RoundedCornerShape(26.dp))
            .background(Brush.linearGradient(listOf(SeekerColors.TealCyan.copy(alpha = 0.25f), SeekerColors.Chrome.copy(alpha = 0.22f))))
            .border(1.dp, SeekerColors.Border, RoundedCornerShape(26.dp)),
        contentAlignment = Alignment.Center,
    ) { Text("??", fontSize = 44.sp) }
}

@Composable
private fun HeroCard(title: String, subtitle: String) {
    Card(colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border), shape = RoundedCornerShape(16.dp)) {
        Row(modifier = Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(52.dp).clip(RoundedCornerShape(14.dp)).background(Brush.linearGradient(listOf(SeekerColors.TealCyan.copy(alpha = 0.25f), SeekerColors.Chrome.copy(alpha = 0.2f)))), contentAlignment = Alignment.Center) {
                Text("??", fontSize = 24.sp)
            }
            Column {
                Text(title, color = SeekerColors.TextPrimary, fontWeight = FontWeight.Bold)
                Text(subtitle, color = SeekerColors.TextMuted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun InfoRow(title: String, subtitle: String) = Card(colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border), shape = RoundedCornerShape(12.dp)) {
    Column(Modifier.padding(12.dp)) {
        Text(title, color = SeekerColors.TextPrimary, fontWeight = FontWeight.SemiBold)
        Text(subtitle, color = SeekerColors.TextMuted, fontSize = 12.sp)
    }
}

@Composable
private fun StatCard(value: String, label: String, modifier: Modifier = Modifier) = Card(modifier = modifier, colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border), shape = RoundedCornerShape(12.dp)) {
    Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, color = SeekerColors.TealCyan, fontWeight = FontWeight.Bold)
        Text(label, color = SeekerColors.TextMuted, fontSize = 11.sp)
    }
}

@Composable
private fun OverlaySheet(title: String, onClose: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Box(Modifier.fillMaxSize().background(Color(0xAA000000))) {
        Card(modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(), colors = CardDefaults.cardColors(SeekerColors.BgCard), shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(title, color = SeekerColors.TextPrimary, fontWeight = FontWeight.SemiBold)
                content()
                OutlinedButton(onClick = onClose, modifier = Modifier.fillMaxWidth()) { Text("Close") }
            }
        }
    }
}

@Composable
private fun HeaderCard(template: SkrTemplate, draft: TemplateDraft) = BasicCard(template.title, template.description) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
        Image(painter = painterResource(template.imageRes), contentDescription = template.title, modifier = Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)), contentScale = ContentScale.Crop)
        Column {
            Text(draft.profileEmoji, fontSize = 18.sp)
            Text(
                draft.headline,
                color = SeekerColors.TextPrimary,
                fontWeight = if (draft.fontStyle == "Bold") FontWeight.ExtraBold else FontWeight.Bold,
                fontStyle = if (draft.fontStyle == "Italic") FontStyle.Italic else FontStyle.Normal,
            )
            Text(draft.subtext, color = SeekerColors.TextMuted, fontSize = 12.sp)
        }
    }
}

@Composable
private fun BasicCard(title: String, subtitle: String, content: @Composable ColumnScope.() -> Unit) = Card(colors = CardDefaults.cardColors(SeekerColors.BgCard.copy(alpha = 0.94f)), shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, SeekerColors.Border)) {
    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, color = SeekerColors.TextPrimary, fontWeight = FontWeight.Bold)
        Text(subtitle, color = SeekerColors.TextMuted, fontSize = 12.sp)
        content()
    }
}

@Composable
private fun Chip(label: String) {
    Row(modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(SeekerColors.BgCard).border(1.dp, SeekerColors.Border, RoundedCornerShape(999.dp)).padding(horizontal = 10.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = SeekerColors.TextMuted, fontSize = 11.sp)
    }
}

@Composable
private fun CommonFields(headline: String, subtext: String, onChange: (String, String) -> Unit) {
    OutlinedTextField(value = headline, onValueChange = { onChange(it, subtext) }, label = { Text("Headline") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(value = subtext, onValueChange = { onChange(headline, it) }, label = { Text("Short message") }, modifier = Modifier.fillMaxWidth())
}

@Composable
private fun LinkList(links: List<LinkItem>) {
    links.forEach { link ->
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(link.label, color = SeekerColors.TextPrimary, fontSize = 12.sp)
            Text(link.url, color = SeekerColors.TextMuted, fontSize = 11.sp)
        }
    }
}

@Composable
private fun EditableLinks(items: List<LinkItem>, onChange: (List<LinkItem>) -> Unit) {
    items.forEachIndexed { i, item ->
        Card(colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border), shape = RoundedCornerShape(12.dp)) {
            Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = item.label, onValueChange = { v -> onChange(items.updated(i, item.copy(label = v))) }, label = { Text("Label") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = item.url, onValueChange = { v -> onChange(items.updated(i, item.copy(url = v))) }, label = { Text("URL") }, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { onChange(items.moveUp(i)) }, enabled = i > 0, modifier = Modifier.weight(1f)) { Text("Up") }
                    OutlinedButton(onClick = { onChange(items.moveDown(i)) }, enabled = i < items.lastIndex, modifier = Modifier.weight(1f)) { Text("Down") }
                    OutlinedButton(onClick = { onChange(items.removeAtSafe(i)) }, modifier = Modifier.weight(1f)) { Text("Delete") }
                }
            }
        }
    }
    OutlinedButton(onClick = { onChange(items + LinkItem("", "")) }, modifier = Modifier.fillMaxWidth()) { Text("Add row") }
}

@Composable
private fun EditableProducts(items: List<ProductItem>, onChange: (List<ProductItem>) -> Unit) {
    items.forEachIndexed { i, item ->
        Card(colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border), shape = RoundedCornerShape(12.dp)) {
            Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = item.name, onValueChange = { v -> onChange(items.updated(i, item.copy(name = v))) }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = item.price, onValueChange = { v -> onChange(items.updated(i, item.copy(price = v))) }, label = { Text("Price") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = item.category, onValueChange = { v -> onChange(items.updated(i, item.copy(category = v.lowercase()))) }, label = { Text("Category (nft, digital, merch)") }, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { onChange(items.moveUp(i)) }, enabled = i > 0, modifier = Modifier.weight(1f)) { Text("Up") }
                    OutlinedButton(onClick = { onChange(items.moveDown(i)) }, enabled = i < items.lastIndex, modifier = Modifier.weight(1f)) { Text("Down") }
                    OutlinedButton(onClick = { onChange(items.removeAtSafe(i)) }, modifier = Modifier.weight(1f)) { Text("Delete") }
                }
            }
        }
    }
    OutlinedButton(onClick = { onChange(items + ProductItem("", "", "nft")) }, modifier = Modifier.fillMaxWidth()) { Text("Add product") }
}

@Composable
private fun EditableEvents(items: List<EventItem>, onChange: (List<EventItem>) -> Unit) {
    items.forEachIndexed { i, item ->
        Card(colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border), shape = RoundedCornerShape(12.dp)) {
            Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = item.title, onValueChange = { v -> onChange(items.updated(i, item.copy(title = v))) }, label = { Text("Event title") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = item.time, onValueChange = { v -> onChange(items.updated(i, item.copy(time = v))) }, label = { Text("Time") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = item.cta, onValueChange = { v -> onChange(items.updated(i, item.copy(cta = v))) }, label = { Text("Primary action") }, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { onChange(items.moveUp(i)) }, enabled = i > 0, modifier = Modifier.weight(1f)) { Text("Up") }
                    OutlinedButton(onClick = { onChange(items.moveDown(i)) }, enabled = i < items.lastIndex, modifier = Modifier.weight(1f)) { Text("Down") }
                    OutlinedButton(onClick = { onChange(items.removeAtSafe(i)) }, modifier = Modifier.weight(1f)) { Text("Delete") }
                }
            }
        }
    }
    OutlinedButton(onClick = { onChange(items + EventItem("", "", "RSVP")) }, modifier = Modifier.fillMaxWidth()) { Text("Add event") }
}

@Composable
private fun EditableSlots(items: List<String>, onChange: (List<String>) -> Unit) {
    Text("Booking slots", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    items.forEachIndexed { i, slot ->
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(value = slot, onValueChange = { v -> onChange(items.updated(i, v)) }, label = { Text("Slot") }, modifier = Modifier.weight(1f))
            TextButton(onClick = { onChange(items.removeAtSafe(i)) }) { Text("Delete") }
        }
    }
    OutlinedButton(onClick = { onChange(items + "") }, modifier = Modifier.fillMaxWidth()) { Text("Add slot") }
}

@Composable
private fun EditableWorkouts(items: List<WorkoutItem>, onChange: (List<WorkoutItem>) -> Unit) {
    items.forEachIndexed { i, item ->
        Card(colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border), shape = RoundedCornerShape(12.dp)) {
            Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = item.name, onValueChange = { v -> onChange(items.updated(i, item.copy(name = v))) }, label = { Text("Workout") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = item.duration, onValueChange = { v -> onChange(items.updated(i, item.copy(duration = v))) }, label = { Text("Duration") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = item.level, onValueChange = { v -> onChange(items.updated(i, item.copy(level = v))) }, label = { Text("Level") }, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { onChange(items.moveUp(i)) }, enabled = i > 0, modifier = Modifier.weight(1f)) { Text("Up") }
                    OutlinedButton(onClick = { onChange(items.moveDown(i)) }, enabled = i < items.lastIndex, modifier = Modifier.weight(1f)) { Text("Down") }
                    OutlinedButton(onClick = { onChange(items.removeAtSafe(i)) }, modifier = Modifier.weight(1f)) { Text("Delete") }
                }
            }
        }
    }
    OutlinedButton(onClick = { onChange(items + WorkoutItem("", "", "")) }, modifier = Modifier.fillMaxWidth()) { Text("Add workout") }
}

@Composable
private fun EditableMetrics(items: List<MetricItem>, onChange: (List<MetricItem>) -> Unit) {
    Text("Metrics", color = SeekerColors.ChromeLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    items.forEachIndexed { i, item ->
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(value = item.label, onValueChange = { v -> onChange(items.updated(i, item.copy(label = v))) }, label = { Text("Label") }, modifier = Modifier.weight(1f))
            OutlinedTextField(value = item.value, onValueChange = { v -> onChange(items.updated(i, item.copy(value = v))) }, label = { Text("Value") }, modifier = Modifier.weight(1f))
            TextButton(onClick = { onChange(items.removeAtSafe(i)) }) { Text("Delete") }
        }
    }
    OutlinedButton(onClick = { onChange(items + MetricItem("", "")) }, modifier = Modifier.fillMaxWidth()) { Text("Add metric") }
}

@Composable
private fun EditableProposals(items: List<ProposalItem>, onChange: (List<ProposalItem>) -> Unit) {
    items.forEachIndexed { i, item ->
        Card(colors = CardDefaults.cardColors(SeekerColors.BgCard), border = BorderStroke(1.dp, SeekerColors.Border), shape = RoundedCornerShape(12.dp)) {
            Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = item.title, onValueChange = { v -> onChange(items.updated(i, item.copy(title = v))) }, label = { Text("Proposal") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = item.status, onValueChange = { v -> onChange(items.updated(i, item.copy(status = v))) }, label = { Text("Status") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = item.category, onValueChange = { v -> onChange(items.updated(i, item.copy(category = v.lowercase()))) }, label = { Text("Category") }, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { onChange(items.moveUp(i)) }, enabled = i > 0, modifier = Modifier.weight(1f)) { Text("Up") }
                    OutlinedButton(onClick = { onChange(items.moveDown(i)) }, enabled = i < items.lastIndex, modifier = Modifier.weight(1f)) { Text("Down") }
                    OutlinedButton(onClick = { onChange(items.removeAtSafe(i)) }, modifier = Modifier.weight(1f)) { Text("Delete") }
                }
            }
        }
    }
    OutlinedButton(onClick = { onChange(items + ProposalItem("", "Active", "funding")) }, modifier = Modifier.fillMaxWidth()) { Text("Add proposal") }
}

@Composable
private fun EditableSupporters(items: List<SupporterItem>, onChange: (List<SupporterItem>) -> Unit) {
    items.forEachIndexed { i, item ->
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(value = item.name, onValueChange = { v -> onChange(items.updated(i, item.copy(name = v))) }, label = { Text("Name") }, modifier = Modifier.weight(1f))
            OutlinedTextField(value = item.amount, onValueChange = { v -> onChange(items.updated(i, item.copy(amount = v))) }, label = { Text("Amount") }, modifier = Modifier.weight(1f))
            TextButton(onClick = { onChange(items.removeAtSafe(i)) }) { Text("Delete") }
        }
    }
    OutlinedButton(onClick = { onChange(items + SupporterItem("", "")) }, modifier = Modifier.fillMaxWidth()) { Text("Add supporter") }
}

private fun updateStyle(draft: TemplateDraft, themeAccent: String? = null, fontStyle: String? = null, profileEmoji: String? = null): TemplateDraft = when (draft) {
    is PersonalBioDraft -> draft.copy(themeAccent = themeAccent ?: draft.themeAccent, fontStyle = fontStyle ?: draft.fontStyle, profileEmoji = profileEmoji ?: draft.profileEmoji)
    is SocialHubDraft -> draft.copy(themeAccent = themeAccent ?: draft.themeAccent, fontStyle = fontStyle ?: draft.fontStyle, profileEmoji = profileEmoji ?: draft.profileEmoji)
    is ShopStoreDraft -> draft.copy(themeAccent = themeAccent ?: draft.themeAccent, fontStyle = fontStyle ?: draft.fontStyle, profileEmoji = profileEmoji ?: draft.profileEmoji)
    is CalendarDraft -> draft.copy(themeAccent = themeAccent ?: draft.themeAccent, fontStyle = fontStyle ?: draft.fontStyle, profileEmoji = profileEmoji ?: draft.profileEmoji)
    is HealthDraft -> draft.copy(themeAccent = themeAccent ?: draft.themeAccent, fontStyle = fontStyle ?: draft.fontStyle, profileEmoji = profileEmoji ?: draft.profileEmoji)
    is PortfolioDraft -> draft.copy(themeAccent = themeAccent ?: draft.themeAccent, fontStyle = fontStyle ?: draft.fontStyle, profileEmoji = profileEmoji ?: draft.profileEmoji)
    is DaoDraft -> draft.copy(themeAccent = themeAccent ?: draft.themeAccent, fontStyle = fontStyle ?: draft.fontStyle, profileEmoji = profileEmoji ?: draft.profileEmoji)
    is LinkBioDraft -> draft.copy(themeAccent = themeAccent ?: draft.themeAccent, fontStyle = fontStyle ?: draft.fontStyle, profileEmoji = profileEmoji ?: draft.profileEmoji)
}

private fun draftAccent(draft: TemplateDraft, templateId: String): Color {
    val raw = draft.themeAccent.trim()
    return if (raw.startsWith("#") && (raw.length == 7 || raw.length == 9)) {
        runCatching { Color(android.graphics.Color.parseColor(raw)) }.getOrElse { templateAccent(templateId) }
    } else {
        templateAccent(templateId)
    }
}

private fun templateAccent(templateId: String): Color = when (templateId) {
    "social-hub" -> SeekerColors.TealCyan
    "shop" -> Color(0xFFFF9432)
    "calendar" -> Color(0xFF6366F1)
    "health" -> Color(0xFF50DC64)
    "portfolio" -> Color(0xFF9945FF)
    "organization" -> Color(0xFF7C83FF)
    "link-in-bio" -> Color(0xFFF5A623)
    else -> SeekerColors.ChromeLight
}

private fun publishStatus(step: PublishStep): String = when (step) {
    PublishStep.IDLE -> "Waiting"
    PublishStep.CHECKING_ENTITLEMENT -> "Checking access"
    PublishStep.UPLOADING -> "Saving page"
    PublishStep.AWAITING_PURCHASE_SIGNATURE -> "Waiting for purchase approval"
    PublishStep.PURCHASE_SUBMITTED -> "Purchase sent"
    PublishStep.PURCHASE_CONFIRMED -> "Purchase complete"
    PublishStep.AWAITING_PUBLISH_SIGNATURE -> "Waiting for publish approval"
    PublishStep.PUBLISH_SUBMITTED -> "Publish sent"
    PublishStep.PUBLISH_CONFIRMED -> "Done"
    PublishStep.FAILED -> "Needs attention"
}

private fun publishCta(step: PublishStep): String = when (step) {
    PublishStep.IDLE, PublishStep.FAILED, PublishStep.PUBLISH_CONFIRMED -> "Buy and publish"
    PublishStep.CHECKING_ENTITLEMENT -> "Checking access..."
    PublishStep.UPLOADING -> "Saving your page..."
    PublishStep.AWAITING_PURCHASE_SIGNATURE -> "Waiting for approval..."
    PublishStep.PURCHASE_SUBMITTED -> "Purchase in progress..."
    PublishStep.PURCHASE_CONFIRMED -> "Purchase complete..."
    PublishStep.AWAITING_PUBLISH_SIGNATURE -> "One last approval..."
    PublishStep.PUBLISH_SUBMITTED -> "Publishing now..."
}

private fun publishError(raw: String?): String {
    val msg = raw?.lowercase().orEmpty()
    return when {
        msg.contains("wallet") -> "Please connect your wallet and try again."
        msg.contains("timeout") -> "The network took too long to respond. Please try again."
        msg.contains("upload") -> "We couldn't save your page right now. Please retry."
        msg.contains("purchase") -> "Your unlock payment did not finish. Please retry."
        else -> "Something went wrong. Please try again."
    }
}

private fun formatHms(total: Int): String {
    val safe = if (total < 0) 0 else total
    val h = safe / 3600
    val m = (safe % 3600) / 60
    val s = safe % 60
    return "%02d:%02d:%02d".format(h, m, s)
}

private fun <T> List<T>.updated(index: Int, value: T): List<T> {
    if (index !in indices) return this
    val copy = toMutableList()
    copy[index] = value
    return copy
}

private fun <T> List<T>.removeAtSafe(index: Int): List<T> {
    if (index !in indices) return this
    val copy = toMutableList()
    copy.removeAt(index)
    return copy
}

private fun <T> List<T>.moveUp(index: Int): List<T> {
    if (index <= 0 || index !in indices) return this
    val copy = toMutableList()
    val item = copy.removeAt(index)
    copy.add(index - 1, item)
    return copy
}

private fun <T> List<T>.moveDown(index: Int): List<T> {
    if (index !in indices || index >= lastIndex) return this
    val copy = toMutableList()
    val item = copy.removeAt(index)
    copy.add(index + 1, item)
    return copy
}

