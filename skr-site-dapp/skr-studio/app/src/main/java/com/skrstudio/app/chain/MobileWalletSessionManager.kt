package com.skrstudio.app.chain

import android.net.Uri
import androidx.activity.ComponentActivity
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import com.solana.mobilewalletadapter.clientlib.ConnectionIdentity
import com.solana.mobilewalletadapter.clientlib.DefaultTransactionParams
import com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter
import com.solana.mobilewalletadapter.clientlib.TransactionResult

data class WalletSession(
    val addressBase58: String,
    val authToken: String,
)

class MobileWalletSessionManager(activity: ComponentActivity) {
    private val walletAdapter = MobileWalletAdapter(
        connectionIdentity = ConnectionIdentity(
            identityUri = Uri.parse("https://skr.site"),
            iconUri = Uri.parse("favicon.ico"),
            identityName = ".skr Studio",
        ),
    )
    private val sender = ActivityResultSender(activity)
    private var currentSession: WalletSession? = null

    suspend fun connect(): Result<WalletSession> {
        return when (val result = walletAdapter.connect(sender)) {
            is TransactionResult.Success -> {
                val auth = result.authResult
                val first = auth.accounts.firstOrNull()
                    ?: return Result.failure(IllegalStateException("No wallet account returned"))
                val address = ChainCodec.encodeBase58(first.publicKey)
                val session = WalletSession(
                    addressBase58 = address,
                    authToken = auth.authToken,
                )
                currentSession = session
                walletAdapter.authToken = auth.authToken
                Result.success(session)
            }

            is TransactionResult.NoWalletFound -> Result.failure(IllegalStateException("No MWA wallet found"))
            is TransactionResult.Failure -> Result.failure(result.e)
        }
    }

    suspend fun signAndSendSingleTransaction(unsignedTx: ByteArray): Result<SignedTransactionResult> {
        return when (
            val result = walletAdapter.transact(
                sender = sender,
                signInPayload = null,
            ) { authResult ->
                val txResult = signAndSendTransactions(
                    arrayOf(unsignedTx),
                    DefaultTransactionParams,
                )
                currentSession = currentSession?.copy(authToken = authResult.authToken)
                walletAdapter.authToken = authResult.authToken
                txResult
            }
        ) {
            is TransactionResult.Success -> {
                val payload = result.payload
                val signature = payload.signatures.firstOrNull()
                    ?: return Result.failure(IllegalStateException("Wallet returned no signature"))
                Result.success(
                    SignedTransactionResult(
                        signatureBase58 = ChainCodec.encodeBase58(signature),
                        transactionBytes = unsignedTx,
                    ),
                )
            }

            is TransactionResult.NoWalletFound -> Result.failure(IllegalStateException("No MWA wallet found"))
            is TransactionResult.Failure -> mapWalletFailure(result.e)
        }
    }

    suspend fun disconnect() {
        walletAdapter.disconnect(sender)
        currentSession = null
        walletAdapter.authToken = null
    }

    fun activeSession(): WalletSession? = currentSession

    private fun mapWalletFailure(error: Throwable): Result<SignedTransactionResult> {
        val message = error.message.orEmpty().lowercase()
        if (message.contains("reject") || message.contains("deny") || message.contains("cancel")) {
            return Result.failure(IllegalStateException("Transaction was rejected in wallet"))
        }
        if (message.contains("auth")) {
            return Result.failure(IllegalStateException("Wallet session expired. Reconnect and retry"))
        }
        return Result.failure(error)
    }
}
