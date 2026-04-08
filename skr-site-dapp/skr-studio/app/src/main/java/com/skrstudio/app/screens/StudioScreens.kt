package com.skrstudio.app.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.skrstudio.app.SkrTemplate
import com.skrstudio.app.TemplateCustomization
import com.skrstudio.app.chain.ChainConfig
import com.skrstudio.app.chain.PublishFlowState
import com.skrstudio.app.chain.PublishStep
import com.skrstudio.app.chain.PublishResult
import com.skrstudio.app.ui.SeekerColors

@Composable
fun SplashScreen(onStart: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Image(
            painter = painterResource(com.skrstudio.app.R.drawable.ic_seeker_logo),
            contentDescription = "Logo",
            modifier = Modifier.size(160.dp).clip(RoundedCornerShape(80.dp)),
        )
        Spacer(Modifier.height(20.dp))
        Text(".skr Studio", color = SeekerColors.TextPrimary, fontSize = 34.sp, fontWeight = FontWeight.Black)
        Text("Seeker-native publish flow", color = SeekerColors.TextMuted)
        Spacer(Modifier.height(20.dp))
        Button(onClick = onStart) { Text("Start") }
    }
}

@Composable
fun HomeScreen(
    customization: TemplateCustomization,
    selectedTemplate: SkrTemplate,
    onOpenTemplates: () -> Unit,
    onOpenEditor: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("${customization.headline}.skr", color = SeekerColors.TextPrimary, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold)
        Text(customization.subtext, color = SeekerColors.TextMuted)
        Image(
            painter = painterResource(selectedTemplate.imageRes),
            contentDescription = selectedTemplate.title,
            modifier = Modifier.fillMaxWidth().height(220.dp).clip(RoundedCornerShape(18.dp)),
            contentScale = ContentScale.Crop,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = onOpenTemplates) { Text("Templates") }
            OutlinedButton(onClick = onOpenEditor) { Text("Editor") }
        }
    }
}

@Composable
fun TemplateGalleryScreen(
    templates: List<SkrTemplate>,
    selectedTemplate: SkrTemplate,
    onSelect: (SkrTemplate) -> Unit,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        items(templates) { template ->
            Card(
                onClick = { onSelect(template) },
                colors = CardDefaults.cardColors(if (template.id == selectedTemplate.id) SeekerColors.BgCard else Color(0xFF121212)),
            ) {
                Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Image(
                        painter = painterResource(template.imageRes),
                        contentDescription = template.title,
                        modifier = Modifier.fillMaxWidth().height(120.dp).clip(RoundedCornerShape(12.dp)),
                        contentScale = ContentScale.Crop,
                    )
                    Text("${template.emoji} ${template.title}", color = SeekerColors.TextPrimary, fontWeight = FontWeight.Bold)
                    Text(template.description, color = SeekerColors.TextMuted, fontSize = 12.sp)
                    Text(if (template.premium) "Premium" else "Free", color = if (template.premium) SeekerColors.TealCyan else SeekerColors.ChromeLight, fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
fun EditorScreen(
    template: SkrTemplate,
    customization: TemplateCustomization,
    onCustomizationChange: (TemplateCustomization) -> Unit,
    onContinue: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("${template.title} Editor", color = SeekerColors.TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        androidx.compose.material3.OutlinedTextField(
            value = customization.headline,
            onValueChange = { onCustomizationChange(customization.copy(headline = it)) },
            label = { Text("Headline") },
            modifier = Modifier.fillMaxWidth(),
        )
        androidx.compose.material3.OutlinedTextField(
            value = customization.subtext,
            onValueChange = { onCustomizationChange(customization.copy(subtext = it)) },
            label = { Text("Subtext") },
            modifier = Modifier.fillMaxWidth(),
        )
        androidx.compose.material3.OutlinedTextField(
            value = customization.emoji,
            onValueChange = { onCustomizationChange(customization.copy(emoji = it)) },
            label = { Text("Emoji") },
            modifier = Modifier.fillMaxWidth(),
        )
        Button(onClick = onContinue, modifier = Modifier.fillMaxWidth()) { Text("Continue to Publish") }
    }
}

@Composable
fun WalletScreen(walletAddress: String?, onConnect: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Wallet", color = SeekerColors.TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.Bold)
        Text("Solana Mobile Wallet Adapter dependencies are included. Wire your app identity and auth session in this screen for production signing.", color = SeekerColors.TextMuted)
        Button(onClick = onConnect) { Text("Connect Wallet") }
        if (walletAddress != null) {
            Text("Address: $walletAddress", color = SeekerColors.ChromeLight)
        }
        Text("Purchase and publish are signed via Mobile Wallet Adapter.", color = SeekerColors.TextMuted)
    }
}

@Composable
fun PublishScreen(
    template: SkrTemplate,
    walletAddress: String?,
    entitlementPurchased: Boolean,
    flowState: PublishFlowState,
    onPublish: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Publish", color = SeekerColors.TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.Bold)
        Text("Template: ${template.title}", color = SeekerColors.ChromeLight)
        Text("Wallet: ${walletAddress ?: "Not connected"}", color = SeekerColors.TextMuted)
        Text(
            if (template.premium) {
                if (entitlementPurchased) "Template already unlocked. Publish may still charge ${ChainConfig.TEMPLATE_CHANGE_FEE_SOL} SOL on template switch"
                else "First premium publish charges ${ChainConfig.SKR_UNLOCK_AMOUNT_UI} SKR once"
            } else {
                "Free template: no unlock charge"
            },
            color = SeekerColors.TextMuted,
        )
        Text(
            "Entitlement: ${if (entitlementPurchased) "purchased" else "not purchased"}",
            color = if (entitlementPurchased) SeekerColors.TealCyan else SeekerColors.TextMuted,
        )
        Text("Status: ${flowState.step.name.lowercase().replace('_', ' ')}", color = SeekerColors.ChromeLight)
        if (!flowState.error.isNullOrBlank()) {
            Text("Error: ${flowState.error}", color = Color(0xFFFF8A80))
        }
        Button(
            onClick = onPublish,
            enabled = flowState.canTapAction,
            modifier = Modifier.fillMaxWidth(),
        ) {
            val cta = when (flowState.step) {
                PublishStep.IDLE, PublishStep.FAILED, PublishStep.PUBLISH_CONFIRMED -> "Purchase & Publish"
                PublishStep.CHECKING_ENTITLEMENT -> "Checking entitlement..."
                PublishStep.UPLOADING -> "Uploading content..."
                PublishStep.AWAITING_PURCHASE_SIGNATURE -> "Awaiting purchase signature..."
                PublishStep.PURCHASE_SUBMITTED -> "Purchase submitted..."
                PublishStep.PURCHASE_CONFIRMED -> "Purchase confirmed..."
                PublishStep.AWAITING_PUBLISH_SIGNATURE -> "Awaiting publish signature..."
                PublishStep.PUBLISH_SUBMITTED -> "Publish submitted..."
            }
            Text(cta)
        }
    }
}

@Composable
fun PreviewScreen(publishResult: PublishResult?, onHome: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Publish Receipt", color = SeekerColors.TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        if (publishResult == null) {
            Text("No publish yet", color = SeekerColors.TextMuted)
        } else {
            Text("Signature: ${publishResult.signature}", color = SeekerColors.ChromeLight)
            Text("Hash: ${publishResult.contentHashHex}", color = SeekerColors.TextMuted)
            Text("URI: ${publishResult.contentUri}", color = SeekerColors.TextMuted)
        }
        Button(onClick = onHome) { Text("Back Home") }
    }
}

@Composable
fun DetailTemplateScreen(title: String, imageRes: Int, description: String, onEdit: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(SeekerColors.BgDark).verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(title, color = SeekerColors.TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
        Text(description, color = SeekerColors.TextMuted)
        Box(modifier = Modifier.fillMaxWidth().height(230.dp).clip(RoundedCornerShape(16.dp))) {
            Image(
                painter = painterResource(imageRes),
                contentDescription = title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        }
        Button(onClick = onEdit, modifier = Modifier.fillMaxWidth()) { Text("Open Editor") }
    }
}
