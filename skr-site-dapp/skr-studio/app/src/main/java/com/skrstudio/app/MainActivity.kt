package com.skrstudio.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.skrstudio.app.chain.MobileWalletSessionManager

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val walletSessionManager = MobileWalletSessionManager(this)
        setContent {
            SkrStudioApp(
                connectWallet = { walletSessionManager.connect() },
                signAndSendTransaction = { walletSessionManager.signAndSendSingleTransaction(it) },
            )
        }
    }
}
