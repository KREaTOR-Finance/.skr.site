package com.skrstudio.app.chain

import android.util.Base64
import com.skrstudio.app.BuildConfig
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class SolanaRpcClient(
    private val network: ChainNetwork = when (BuildConfig.CHAIN_NETWORK.lowercase()) {
        "devnet" -> ChainNetwork.DEVNET
        else -> ChainNetwork.MAINNET
    },
    private val overrideRpcUrls: List<String> = emptyList(),
) {
    private val rpcUrls = buildRpcUrls(network, overrideRpcUrls)

    suspend fun getLatestBlockhash(): String {
        val result = callWithFailover("getLatestBlockhash", JSONArray().put(JSONObject().put("commitment", "confirmed")))
        val blockhash = result
            .optJSONObject("value")
            ?.optString("blockhash")
            ?.trim()
            .orEmpty()
        require(blockhash.isNotBlank()) { "RPC getLatestBlockhash returned empty blockhash" }
        return blockhash
    }

    suspend fun getAccountDataBase64(address: String): ByteArray? {
        val args = JSONArray()
            .put(address)
            .put(JSONObject().put("encoding", "base64").put("commitment", "confirmed"))
        val result = callWithFailover("getAccountInfo", args)
        val value = result.optJSONObject("value") ?: return null
        if (value.isNull("data")) return null
        val arr = value.optJSONArray("data") ?: return null
        if (arr.length() < 2) return null
        val payload = arr.optString(0)
        val encoding = arr.optString(1)
        require(encoding == "base64") { "Unexpected account data encoding: $encoding" }
        return Base64.decode(payload, Base64.DEFAULT)
    }

    suspend fun sendRawTransaction(transactionBytes: ByteArray): String {
        val txBase64 = Base64.encodeToString(transactionBytes, Base64.NO_WRAP)
        val args = JSONArray()
            .put(txBase64)
            .put(
                JSONObject()
                    .put("encoding", "base64")
                    .put("skipPreflight", false)
                    .put("preflightCommitment", "confirmed")
                    .put("maxRetries", 3),
            )
        val result = callWithFailover("sendTransaction", args)
        return result.optString("result")
            .takeIf { it.isNotBlank() }
            ?: throw IllegalStateException("RPC sendTransaction returned empty signature")
    }

    suspend fun waitForFinalized(signature: String, timeoutMs: Long = 45_000): Boolean {
        val start = System.currentTimeMillis()
        while (System.currentTimeMillis() - start < timeoutMs) {
            val args = JSONArray()
                .put(JSONArray().put(signature))
                .put(JSONObject().put("searchTransactionHistory", true))
            val result = callWithFailover("getSignatureStatuses", args)
            val value = result.optJSONArray("value")?.optJSONObject(0)
            val confirmationStatus = value?.optString("confirmationStatus")
            val err = value?.opt("err")
            if (err != null && err != JSONObject.NULL) {
                throw IllegalStateException("Transaction failed on-chain: $err")
            }
            if (confirmationStatus == "confirmed" || confirmationStatus == "finalized") return true
            delay(1_000)
        }
        return false
    }

    private suspend fun callWithFailover(method: String, params: JSONArray): JSONObject {
        var lastError: Throwable? = null
        for ((index, rpcUrl) in rpcUrls.withIndex()) {
            try {
                return callRpc(rpcUrl, method, params)
            } catch (e: Throwable) {
                lastError = e
                if (index == rpcUrls.lastIndex || !isRetriable(e)) {
                    throw e
                }
            }
        }
        throw lastError ?: IllegalStateException("RPC call failed: $method")
    }

    private suspend fun callRpc(rpcUrl: String, method: String, params: JSONArray): JSONObject = withContext(Dispatchers.IO) {
        val requestBody = JSONObject()
            .put("jsonrpc", "2.0")
            .put("id", UUID.randomUUID().toString())
            .put("method", method)
            .put("params", params)

        val connection = (URL(rpcUrl).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            connectTimeout = 15_000
            readTimeout = 30_000
            setRequestProperty("Content-Type", "application/json")
        }

        try {
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(requestBody.toString()) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (status !in 200..299) {
                throw IllegalStateException("RPC HTTP $status for $method: $body")
            }

            val parsed = JSONObject(body)
            if (parsed.has("error")) {
                throw IllegalStateException("RPC error for $method: ${parsed.getJSONObject("error")}")
            }
            return@withContext parsed
        } finally {
            connection.disconnect()
        }
    }

    private fun isRetriable(error: Throwable): Boolean {
        val msg = (error.message ?: error.toString()).lowercase()
        return listOf(
            "timeout",
            "429",
            "503",
            "504",
            "network",
            "temporarily unavailable",
            "connection",
            "blockhash not found",
        ).any(msg::contains)
    }

    private fun buildRpcUrls(network: ChainNetwork, overrides: List<String>): List<String> {
        val defaults = when (network) {
            ChainNetwork.MAINNET -> listOf(
                "https://api.mainnet-beta.solana.com",
                "https://solana-mainnet.g.alchemy.com/v2/demo",
            )
            ChainNetwork.DEVNET -> listOf(
                "https://api.devnet.solana.com",
            )
        }

        val fromBuildConfig = BuildConfig.SOLANA_RPC_URLS
            .split(",")
            .map { it.trim() }
            .filter { it.isNotBlank() }

        return (overrides + fromBuildConfig + defaults)
            .map(String::trim)
            .filter(String::isNotBlank)
            .filter(::isAllowedRpcUrl)
            .distinct()
    }

    private fun isAllowedRpcUrl(url: String): Boolean {
        return try {
            val parsed = URL(url)
            parsed.protocol == "https" || (parsed.protocol == "http" && parsed.host in setOf("10.0.2.2", "localhost", "127.0.0.1"))
        } catch (_: Throwable) {
            false
        }
    }
}
