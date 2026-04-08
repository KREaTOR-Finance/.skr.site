package com.skrstudio.app

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Scaffold
import androidx.compose.material3.TextButton
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
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
import com.skrstudio.app.screens.DetailTemplateScreen
import com.skrstudio.app.screens.EditorScreen
import com.skrstudio.app.screens.HomeScreen
import com.skrstudio.app.screens.PreviewScreen
import com.skrstudio.app.screens.PublishScreen
import com.skrstudio.app.screens.SplashScreen
import com.skrstudio.app.screens.TemplateGalleryScreen
import com.skrstudio.app.screens.WalletScreen
import com.skrstudio.app.ui.SkrStudioTheme
import kotlinx.coroutines.launch

@androidx.compose.runtime.Composable
fun SkrStudioApp(
    connectWallet: suspend () -> Result<WalletSession>,
    signAndSendTransaction: suspend (ByteArray) -> Result<com.skrstudio.app.chain.SignedTransactionResult>,
) {
    SkrStudioTheme {
        val navController = rememberNavController()
        val scope = rememberCoroutineScope()
        val chainPublisher = remember { OnChainPublisher() }
        val storageUploader = remember { GatewayStorageUploader() }
        val rpc = remember { SolanaRpcClient() }
        val analytics = remember { AppAnalytics() }

        var selectedTemplate by remember { mutableStateOf(allTemplates.first()) }
        var customization by remember { mutableStateOf(TemplateCustomization()) }
        var walletSession by remember { mutableStateOf<WalletSession?>(null) }
        var publishResult by remember { mutableStateOf<PublishResult?>(null) }
        var entitlementByTemplate by remember { mutableStateOf<Map<String, Boolean>>(emptyMap()) }
        var flowState by remember { mutableStateOf(PublishFlowState()) }

        Scaffold(bottomBar = { BottomNavigationBar(navController) }) { padding ->
            NavHost(
                navController = navController,
                startDestination = "splash",
                modifier = Modifier.padding(padding),
            ) {
                composable("splash") { SplashScreen(onStart = { navController.navigate("home") }) }
                composable("art") { DetailTemplateScreen("Art Direction", R.drawable.seeker_img_10, "Chrome + teal-cyan motion language", { navController.navigate("home") }) }
                composable("home") {
                    HomeScreen(
                        customization = customization,
                        selectedTemplate = selectedTemplate,
                        onOpenTemplates = { navController.navigate("templates") },
                        onOpenEditor = { navController.navigate("editor") },
                    )
                }
                composable("templates") {
                    TemplateGalleryScreen(
                        templates = allTemplates,
                        selectedTemplate = selectedTemplate,
                        onSelect = { template ->
                            selectedTemplate = template
                            flowState = reducePublishState(flowState, PublishAction.Reset)
                            navController.navigate(template.route)
                        },
                    )
                }
                composable("editor") {
                    EditorScreen(
                        template = selectedTemplate,
                        customization = customization,
                        onCustomizationChange = { customization = it },
                        onContinue = { navController.navigate("publish") },
                    )
                }
                composable("wallet") {
                    WalletScreen(
                        walletAddress = walletSession?.addressBase58,
                        onConnect = {
                            scope.launch {
                                analytics.track("wallet_connect_initiated")
                                val result = connectWallet()
                                result.onSuccess { session ->
                                    walletSession = session
                                    analytics.track(
                                        "wallet_connect_success",
                                        mapOf("address" to session.addressBase58),
                                    )
                                }.onFailure { error ->
                                    analytics.track(
                                        "wallet_connect_failed",
                                        mapOf("reason" to (error.message ?: "unknown")),
                                    )
                                    flowState = reducePublishState(
                                        flowState,
                                        PublishAction.Fail(error.message ?: "Wallet connection failed"),
                                    )
                                }
                            }
                        },
                    )
                }
                composable("profile") {
                    DetailTemplateScreen("Profile", R.drawable.seeker_img_01, "Rotate templates as often as you want after unlock", { navController.navigate("templates") })
                }
                composable("settings") {
                    DetailTemplateScreen("Settings", R.drawable.seeker_img_10, "On-chain enforcement only; no trusted backend", { navController.navigate("wallet") })
                }
                composable("social") {
                    DetailTemplateScreen("Social Feed", R.drawable.seeker_img_02, "Community activity and discoverability", { navController.navigate("editor") })
                }
                composable("socialhub") {
                    DetailTemplateScreen("Social Hub", R.drawable.seeker_img_02, "Community links and profile integrations", { navController.navigate("editor") })
                }
                composable("shopstore") {
                    DetailTemplateScreen("Shop Store", R.drawable.seeker_img_03, "Sell templates and goods in SKR", { navController.navigate("editor") })
                }
                composable("creatorportfolio") {
                    DetailTemplateScreen("Creator Portfolio", R.drawable.seeker_img_06, "Showcase your media and projects", { navController.navigate("editor") })
                }
                composable("calendarevents") {
                    DetailTemplateScreen("Calendar & Events", R.drawable.seeker_img_04, "Schedule events with RSVP", { navController.navigate("editor") })
                }
                composable("healthfitness") {
                    DetailTemplateScreen("Health & Fitness", R.drawable.seeker_img_05, "Track streaks and goals", { navController.navigate("editor") })
                }
                composable("daogovernance") {
                    DetailTemplateScreen("DAO Governance", R.drawable.seeker_img_07, "Proposals, voting, delegations", { navController.navigate("editor") })
                }
                composable("linkbio") {
                    DetailTemplateScreen("Link-in-Bio", R.drawable.seeker_img_08, "Tip jars and stacked links", { navController.navigate("editor") })
                }
                composable("publish") {
                    val purchased = entitlementByTemplate[selectedTemplate.id] == true
                    PublishScreen(
                        template = selectedTemplate,
                        walletAddress = walletSession?.addressBase58,
                        entitlementPurchased = purchased,
                        flowState = flowState,
                        onPublish = {
                            if (!flowState.canTapAction) return@PublishScreen
                            scope.launch {
                                flowState = reducePublishState(flowState, PublishAction.Start)
                                analytics.track("publish_initiated", mapOf("template_id" to selectedTemplate.id))
                                try {
                                    val session = walletSession ?: throw IllegalStateException("Connect wallet before publishing")
                                    val requiresEntitlement = selectedTemplate.premium
                                    val entitlementPurchased = if (requiresEntitlement) {
                                        val purchasedFromChain = fetchEntitlementPurchased(
                                            rpc = rpc,
                                            publisher = chainPublisher,
                                            walletAddress = session.addressBase58,
                                            templateId = selectedTemplate.id,
                                        )
                                        entitlementByTemplate = entitlementByTemplate + (selectedTemplate.id to purchasedFromChain)
                                        purchasedFromChain
                                    } else {
                                        true
                                    }

                                    flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.UPLOADING))
                                    analytics.track("upload_started", mapOf("template_id" to selectedTemplate.id))

                                    val domain = customization.headline.lowercase().replace(" ", "") + ".skr"
                                    val html = buildTemplateHtml(domain, selectedTemplate.title, customization)
                                    val uploaded = storageUploader.uploadContent(
                                        UploadContentInput(
                                            html = html,
                                            domain = domain,
                                            templateId = selectedTemplate.id,
                                        ),
                                    )
                                    analytics.track("upload_succeeded")

                                    if (requiresEntitlement && !entitlementPurchased) {
                                        flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.AWAITING_PURCHASE_SIGNATURE))
                                        analytics.track("purchase_sign_requested", mapOf("template_id" to selectedTemplate.id))
                                        val purchaseBlockhash = rpc.getLatestBlockhash()
                                        val purchaseTx = chainPublisher.buildPurchaseTransaction(
                                            walletAddress = session.addressBase58,
                                            templateId = selectedTemplate.id,
                                            blockhash = purchaseBlockhash,
                                        )
                                        val purchaseSigned = signAndSendTransaction(purchaseTx).getOrThrow()
                                        flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.PURCHASE_SUBMITTED))
                                        analytics.track("purchase_submitted", mapOf("signature" to purchaseSigned.signatureBase58))
                                        val purchaseConfirmed = rpc.waitForFinalized(purchaseSigned.signatureBase58)
                                        if (!purchaseConfirmed) throw IllegalStateException("Purchase confirmation timed out")
                                        analytics.track("purchase_confirmed")
                                        flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.PURCHASE_CONFIRMED))
                                        entitlementByTemplate = entitlementByTemplate + (selectedTemplate.id to true)
                                    }

                                    flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.AWAITING_PUBLISH_SIGNATURE))
                                    analytics.track("publish_sign_requested", mapOf("template_id" to selectedTemplate.id))
                                    val publishBlockhash = rpc.getLatestBlockhash()
                                    val publishTx = chainPublisher.buildPublishTransaction(
                                        walletAddress = session.addressBase58,
                                        blockhash = publishBlockhash,
                                        input = PublishInput(
                                            domain = domain,
                                            templateId = selectedTemplate.id,
                                            contentHashHex = uploaded.contentHashHex,
                                            contentUri = uploaded.contentUri,
                                        ),
                                    )
                                    val publishSigned = signAndSendTransaction(publishTx).getOrThrow()
                                    flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.PUBLISH_SUBMITTED))
                                    analytics.track("publish_submitted", mapOf("signature" to publishSigned.signatureBase58))
                                    val publishConfirmed = rpc.waitForFinalized(publishSigned.signatureBase58)
                                    if (!publishConfirmed) throw IllegalStateException("Publish confirmation timed out")
                                    analytics.track("publish_confirmed")

                                    publishResult = PublishResult(
                                        signature = publishSigned.signatureBase58,
                                        contentHashHex = uploaded.contentHashHex,
                                        contentUri = uploaded.contentUri,
                                    )
                                    flowState = reducePublishState(flowState, PublishAction.Move(PublishStep.PUBLISH_CONFIRMED))
                                    navController.navigate("preview")
                                } catch (error: Throwable) {
                                    analytics.track(
                                        "publish_failed",
                                        mapOf("reason" to (error.message ?: "unknown")),
                                    )
                                    flowState = reducePublishState(
                                        flowState,
                                        PublishAction.Fail(error.message ?: "Publish failed"),
                                    )
                                }
                            }
                        },
                    )
                }
                composable("preview") {
                    PreviewScreen(publishResult = publishResult, onHome = { navController.navigate("home") })
                }
            }
        }
    }
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

@androidx.compose.runtime.Composable
private fun BottomNavigationBar(navController: NavHostController) {
    val items = listOf(
        Triple("home", "Home", "🏠"),
        Triple("templates", "Templates", "✦"),
        Triple("wallet", "Wallet", "💰"),
        Triple("profile", "Profile", "👤"),
        Triple("settings", "Settings", "⚙"),
    )
    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        items.forEach { (route, label, icon) ->
            TextButton(onClick = { navController.navigate(route) { launchSingleTop = true } }) {
                androidx.compose.material3.Text(
                    text = "$icon $label",
                    color = if (currentRoute == route) com.skrstudio.app.ui.SeekerColors.TealCyan else com.skrstudio.app.ui.SeekerColors.TextMuted,
                )
            }
        }
    }
}
