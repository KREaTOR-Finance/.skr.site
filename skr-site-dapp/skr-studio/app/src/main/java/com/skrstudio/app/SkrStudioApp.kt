package com.skrstudio.app

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.solana.publickey.SolanaPublicKey
import com.skrstudio.app.chain.AppAnalytics
import com.skrstudio.app.chain.GatewayStorageUploader
import com.skrstudio.app.chain.OnChainPublisher
import com.skrstudio.app.chain.PublishAction
import com.skrstudio.app.chain.PublishFlowState
import com.skrstudio.app.chain.PublishInput
import com.skrstudio.app.chain.PublishResult
import com.skrstudio.app.chain.PublishStep
import com.skrstudio.app.chain.SolanaRpcClient
import com.skrstudio.app.chain.UploadContentInput
import com.skrstudio.app.chain.WalletSession
import com.skrstudio.app.chain.buildTemplateHtml
import com.skrstudio.app.chain.reducePublishState
import com.skrstudio.app.screens.EditorScreen
import com.skrstudio.app.screens.ArtScreen
import com.skrstudio.app.screens.HomeScreen
import com.skrstudio.app.screens.PreviewScreen
import com.skrstudio.app.screens.ProfileScreen
import com.skrstudio.app.screens.PublishScreen
import com.skrstudio.app.screens.SettingsScreen
import com.skrstudio.app.screens.SocialLinksScreen
import com.skrstudio.app.screens.SplashScreen
import com.skrstudio.app.screens.TemplateGalleryScreen
import com.skrstudio.app.screens.WalletScreen
import com.skrstudio.app.ui.SeekerColors
import com.skrstudio.app.ui.SkrStudioTheme
import kotlinx.coroutines.launch

@Composable
fun SkrStudioApp(
    connectWallet: suspend () -> Result<WalletSession>,
    signAndSendTransaction: suspend (ByteArray) -> Result<com.skrstudio.app.chain.SignedTransactionResult>,
) {
    SkrStudioTheme {
        val navController = rememberNavController()
        val scope = rememberCoroutineScope()
        val context = LocalContext.current
        val chainPublisher = remember { OnChainPublisher() }
        val storageUploader = remember { GatewayStorageUploader() }
        val rpc = remember { SolanaRpcClient() }
        val analytics = remember { AppAnalytics() }
        val draftStore = remember { mutableStateMapOf<String, TemplateDraft>() }

        var selectedTemplate by remember { mutableStateOf(allTemplates.first()) }
        var walletSession by remember { mutableStateOf<WalletSession?>(null) }
        var publishResult by remember { mutableStateOf<PublishResult?>(null) }
        var entitlementByTemplate by remember { mutableStateOf<Map<String, Boolean>>(emptyMap()) }
        var flowState by remember { mutableStateOf(PublishFlowState()) }
        var validationErrors by remember { mutableStateOf<List<String>>(emptyList()) }

        val currentDraft = draftStore[selectedTemplate.id] ?: defaultDraftFor(selectedTemplate.id)
        LaunchedEffect(selectedTemplate.id) {
            if (!draftStore.containsKey(selectedTemplate.id)) {
                draftStore[selectedTemplate.id] = TemplateDraftStorage.load(context, selectedTemplate.id)
            }
        }

        val routeWithBottomNav = setOf("home", "templates", "profile", "settings")
        val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route

        Scaffold(
            bottomBar = {
                if (currentRoute in routeWithBottomNav) {
                    BottomNavigationBar(navController)
                }
            },
        ) { padding ->
            NavHost(navController = navController, startDestination = "splash", modifier = Modifier.padding(padding)) {
                composable("splash") {
                    SplashScreen(
                        onStart = { navController.navigate("home") },
                        onFind = {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://skr.site/reverse")))
                        },
                    )
                }
                composable("art") {
                    ArtScreen(
                        onBack = { navController.popBackStack() },
                        onBuild = { navController.navigate("home") },
                    )
                }
                composable("home") {
                    HomeScreen(
                        selectedTemplate = selectedTemplate,
                        onOpenTemplates = { navController.navigate("templates") },
                        onOpenEditor = { navController.navigate(selectedTemplate.route) },
                        onOpenPreview = { navController.navigate("preview") },
                    )
                }
                composable("templates") {
                    TemplateGalleryScreen(
                        templates = allTemplates.filter { it.id != "bring-your-own" },
                        selectedTemplate = selectedTemplate,
                        onSelect = { template ->
                            selectedTemplate = template
                            validationErrors = emptyList()
                            flowState = reducePublishState(flowState, PublishAction.Reset)
                            navController.navigate(template.route)
                        },
                    )
                }
                composable("wallet") {
                    WalletScreen(
                        walletAddress = walletSession?.addressBase58,
                        onConnect = {
                            scope.launch {
                                analytics.track("wallet_connect_initiated")
                                connectWallet().onSuccess { session ->
                                    walletSession = session
                                    analytics.track("wallet_connect_success")
                                }.onFailure { error ->
                                    analytics.track("wallet_connect_failed", mapOf("reason" to (error.message ?: "unknown")))
                                    flowState = reducePublishState(flowState, PublishAction.Fail(error.message ?: "Wallet connection failed"))
                                }
                            }
                        },
                    )
                }
                composable("profile") {
                    ProfileScreen(
                        onEditLinks = { navController.navigate("social") },
                        onPreview = { navController.navigate("preview") },
                        onDesign = { navController.navigate(selectedTemplate.route) },
                    )
                }
                composable("settings") {
                    SettingsScreen(
                        onManageDomain = { navController.navigate("wallet") },
                    )
                }
                composable("social") {
                    SocialLinksScreen(
                        draft = currentDraft,
                        onDraftChange = { d -> onDraftUpdate(context, draftStore, d) },
                        onBack = { navController.popBackStack() },
                        onPublish = { navController.navigate("publish") },
                    )
                }

                composable("personalbio") { TemplateEditorRoute(selectedTemplate = allTemplates.first { it.id == "personal-bio" }, selectedDraft = draftStore["personal-bio"] ?: defaultDraftFor("personal-bio"), entitlementByTemplate, validationErrors, onDraftChange = { d -> onDraftUpdate(context, draftStore, d) }, onUnlock = { navController.navigate("publish") }, onPublish = { navController.navigate("publish") }) }
                composable("socialhub") { TemplateEditorRoute(selectedTemplate = allTemplates.first { it.id == "social-hub" }, selectedDraft = draftStore["social-hub"] ?: defaultDraftFor("social-hub"), entitlementByTemplate, validationErrors, onDraftChange = { d -> onDraftUpdate(context, draftStore, d) }, onUnlock = { navController.navigate("publish") }, onPublish = { navController.navigate("publish") }) }
                composable("shopstore") { TemplateEditorRoute(selectedTemplate = allTemplates.first { it.id == "shop" }, selectedDraft = draftStore["shop"] ?: defaultDraftFor("shop"), entitlementByTemplate, validationErrors, onDraftChange = { d -> onDraftUpdate(context, draftStore, d) }, onUnlock = { navController.navigate("publish") }, onPublish = { navController.navigate("publish") }) }
                composable("calendarevents") { TemplateEditorRoute(selectedTemplate = allTemplates.first { it.id == "calendar" }, selectedDraft = draftStore["calendar"] ?: defaultDraftFor("calendar"), entitlementByTemplate, validationErrors, onDraftChange = { d -> onDraftUpdate(context, draftStore, d) }, onUnlock = { navController.navigate("publish") }, onPublish = { navController.navigate("publish") }) }
                composable("healthfitness") { TemplateEditorRoute(selectedTemplate = allTemplates.first { it.id == "health" }, selectedDraft = draftStore["health"] ?: defaultDraftFor("health"), entitlementByTemplate, validationErrors, onDraftChange = { d -> onDraftUpdate(context, draftStore, d) }, onUnlock = { navController.navigate("publish") }, onPublish = { navController.navigate("publish") }) }
                composable("creatorportfolio") { TemplateEditorRoute(selectedTemplate = allTemplates.first { it.id == "portfolio" }, selectedDraft = draftStore["portfolio"] ?: defaultDraftFor("portfolio"), entitlementByTemplate, validationErrors, onDraftChange = { d -> onDraftUpdate(context, draftStore, d) }, onUnlock = { navController.navigate("publish") }, onPublish = { navController.navigate("publish") }) }
                composable("daogovernance") { TemplateEditorRoute(selectedTemplate = allTemplates.first { it.id == "organization" }, selectedDraft = draftStore["organization"] ?: defaultDraftFor("organization"), entitlementByTemplate, validationErrors, onDraftChange = { d -> onDraftUpdate(context, draftStore, d) }, onUnlock = { navController.navigate("publish") }, onPublish = { navController.navigate("publish") }) }
                composable("linkbio") { TemplateEditorRoute(selectedTemplate = allTemplates.first { it.id == "link-in-bio" }, selectedDraft = draftStore["link-in-bio"] ?: defaultDraftFor("link-in-bio"), entitlementByTemplate, validationErrors, onDraftChange = { d -> onDraftUpdate(context, draftStore, d) }, onUnlock = { navController.navigate("publish") }, onPublish = { navController.navigate("publish") }) }
                composable("editor") { TemplateEditorRoute(selectedTemplate, currentDraft, entitlementByTemplate, validationErrors, onDraftChange = { d -> onDraftUpdate(context, draftStore, d) }, onUnlock = { navController.navigate("publish") }, onPublish = { navController.navigate("publish") }) }

                composable("publish") {
                    val purchased = entitlementByTemplate[selectedTemplate.id] == true
                    validationErrors = validateDraft(currentDraft)
                    PublishScreen(
                        template = selectedTemplate,
                        walletAddress = walletSession?.addressBase58,
                        entitlementPurchased = purchased || !selectedTemplate.premium,
                        flowState = flowState,
                        validationErrors = validationErrors,
                        onPublish = {
                            if (!flowState.canTapAction || validationErrors.isNotEmpty()) return@PublishScreen
                            scope.launch {
                                flowState = reducePublishState(flowState, PublishAction.Start)
                                try {
                                    val session = walletSession ?: throw IllegalStateException("Connect wallet before publishing")
                                    val requiresEntitlement = selectedTemplate.premium
                                    val entitlementPurchased = if (requiresEntitlement) {
                                        val purchasedFromChain = fetchEntitlementPurchased(rpc, chainPublisher, session.addressBase58, selectedTemplate.id)
                                        entitlementByTemplate = entitlementByTemplate + (selectedTemplate.id to purchasedFromChain)
                                        purchasedFromChain
                                    } else true

                                    flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.UPLOADING))
                                    val domain = currentDraft.headline.lowercase().replace(" ", "") + ".skr"
                                    val html = buildTemplateHtml(domain, selectedTemplate.title, currentDraft)
                                    val uploaded = storageUploader.uploadContent(UploadContentInput(html = html, domain = domain, templateId = selectedTemplate.id))

                                    if (requiresEntitlement && !entitlementPurchased) {
                                        flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.AWAITING_PURCHASE_SIGNATURE))
                                        val purchaseTx = chainPublisher.buildPurchaseTransaction(session.addressBase58, selectedTemplate.id, rpc.getLatestBlockhash())
                                        val purchaseSigned = signAndSendTransaction(purchaseTx).getOrThrow()
                                        flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.PURCHASE_SUBMITTED))
                                        val purchaseConfirmed = rpc.waitForFinalized(purchaseSigned.signatureBase58)
                                        if (!purchaseConfirmed) throw IllegalStateException("Purchase confirmation timed out")
                                        flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.PURCHASE_CONFIRMED))
                                        entitlementByTemplate = entitlementByTemplate + (selectedTemplate.id to true)
                                    }

                                    flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.AWAITING_PUBLISH_SIGNATURE))
                                    val publishTx = chainPublisher.buildPublishTransaction(
                                        walletAddress = session.addressBase58,
                                        blockhash = rpc.getLatestBlockhash(),
                                        input = PublishInput(domain, selectedTemplate.id, uploaded.contentUri, uploaded.contentHashHex),
                                    )
                                    val publishSigned = signAndSendTransaction(publishTx).getOrThrow()
                                    flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.PUBLISH_SUBMITTED))
                                    val publishConfirmed = rpc.waitForFinalized(publishSigned.signatureBase58)
                                    if (!publishConfirmed) throw IllegalStateException("Publish confirmation timed out")
                                    publishResult = PublishResult(publishSigned.signatureBase58, uploaded.contentHashHex, uploaded.contentUri)
                                    flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.PUBLISH_CONFIRMED))
                                    navController.navigate("preview")
                                } catch (error: Throwable) {
                                    flowState = reducePublishState(flowState, PublishAction.Fail(error.message ?: "Publish failed"))
                                }
                            }
                        },
                    )
                }
                composable("preview") { PreviewScreen(publishResult = publishResult, onHome = { navController.navigate("home") }) }
            }
        }
    }
}

@Composable
private fun TemplateEditorRoute(
    selectedTemplate: SkrTemplate,
    selectedDraft: TemplateDraft,
    entitlementByTemplate: Map<String, Boolean>,
    validationErrors: List<String>,
    onDraftChange: (TemplateDraft) -> Unit,
    onUnlock: () -> Unit,
    onPublish: () -> Unit,
) {
    com.skrstudio.app.screens.EditorScreen(
        template = selectedTemplate,
        draft = selectedDraft,
        unlocked = entitlementByTemplate[selectedTemplate.id] == true,
        validationErrors = validationErrors,
        onDraftChange = onDraftChange,
        onContinue = onPublish,
        onUnlock = onUnlock,
    )
}

private fun onDraftUpdate(
    context: android.content.Context,
    map: MutableMap<String, TemplateDraft>,
    draft: TemplateDraft,
) {
    map[draft.templateId] = draft
    TemplateDraftStorage.save(context, draft)
}

private suspend fun fetchEntitlementPurchased(
    rpc: SolanaRpcClient,
    publisher: OnChainPublisher,
    walletAddress: String,
    templateId: String,
): Boolean {
    val wallet = SolanaPublicKey.Companion.from(walletAddress)
    val pda = publisher.deriveEntitlementPda(wallet, templateId)
    val data = rpc.getAccountDataBase64(pda.base58()) ?: return false
    return publisher.parseEntitlementAccount(data).purchased
}

@Composable
private fun BottomNavigationBar(navController: NavHostController) {
    val items = listOf(
        Triple("home", "Home", "H"),
        Triple("templates", "Templates", "T"),
        Triple("profile", "Profile", "P"),
        Triple("settings", "Settings", "S"),
    )
    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
        items.forEach { (route, label, icon) ->
            TextButton(onClick = { navController.navigate(route) { launchSingleTop = true } }) {
                Text(
                    text = "$icon $label",
                    color = if (currentRoute == route) SeekerColors.TealCyan else SeekerColors.TextMuted,
                )
            }
        }
    }
}
