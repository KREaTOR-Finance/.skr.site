package com.skrstudio.app.chain

import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.security.MessageDigest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONObject

private const val CIRCUIT_BREAKER_THRESHOLD = 3
private const val CIRCUIT_BREAKER_COOLDOWN_MS = 20_000L

class GatewayStorageUploader(
    private val config: StorageConfig = resolveStorageConfig(),
) : StorageUploader {
    private var consecutiveFailures = 0
    private var circuitOpenedAtMs = 0L

    override suspend fun uploadContent(input: UploadContentInput): UploadedContent = withContext(Dispatchers.IO) {
        ensureCircuitClosed()
        val localHash = sha256Hex(input.html)
        val endpoint = config.uploadApiBaseUrl + "/api/upload"
        val payload = JSONObject().apply {
            put("html", input.html)
            put("domain", input.domain)
            put("templateId", input.templateId)
            put("provider", (input.provider ?: config.provider).name.lowercase())
        }

        val response = retry(times = 3, initialDelayMs = 600) {
            postJson(endpoint, payload)
        }

        try {
            if (response.status !in 200..299) {
                throw classifyUploadFailure("Upload failed (${response.status})", retryable = response.status >= 500)
            }
            val parsed = JSONObject(response.body)
            val uploaded = parseUploadedContent(parsed, localHash)
            consecutiveFailures = 0
            uploaded
        } catch (t: Throwable) {
            onFailure()
            throw t
        }
    }

    private fun parseUploadedContent(parsed: JSONObject, localHash: String): UploadedContent {
        val contentUri = parsed.optString("contentUri")
        val publicUrl = parsed.optString("publicUrl")
        val providerValue = parsed.optString("provider").lowercase()
        val contentHash = parsed.optString("contentHash")
        val metadataRecordsObj = parsed.optJSONObject("metadataRecords")
            ?: throw classifyUploadFailure("Uploader response missing metadataRecords", retryable = false)

        val provider = when (providerValue) {
            "arweave" -> StorageProvider.ARWEAVE
            "ipfs" -> StorageProvider.IPFS
            else -> throw classifyUploadFailure("Uploader response has unsupported provider", retryable = false)
        }

        require(contentUri.isNotBlank()) { "Uploader response missing contentUri" }
        require(publicUrl.isNotBlank()) { "Uploader response missing publicUrl" }
        require(contentHash.isNotBlank()) { "Uploader response missing contentHash" }
        require(contentHash.equals(localHash, ignoreCase = true)) {
            "Uploader hash mismatch; publish blocked for safety"
        }

        when (provider) {
            StorageProvider.ARWEAVE -> require(contentUri.startsWith("ar://")) { "Invalid Arweave contentUri" }
            StorageProvider.IPFS -> require(contentUri.startsWith("ipfs://")) { "Invalid IPFS contentUri" }
        }

        val metadata = buildMap {
            metadataRecordsObj.keys().forEach { key ->
                val value = metadataRecordsObj.optString(key)
                if (value.isNotBlank()) put(key, value)
            }
        }
        require(metadata["url"] == publicUrl) { "Uploader metadata url mismatch" }

        return UploadedContent(
            contentUri = contentUri,
            publicUrl = publicUrl,
            contentHashHex = localHash,
            provider = provider,
            metadataRecords = metadata,
        )
    }

    private data class HttpResponse(val status: Int, val body: String)

    private fun postJson(endpoint: String, payload: JSONObject): HttpResponse {
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            connectTimeout = 12_000
            readTimeout = 25_000
            setRequestProperty("Content-Type", "application/json")
        }
        return try {
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payload.toString())
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            HttpResponse(status = status, body = body)
        } catch (timeout: SocketTimeoutException) {
            throw classifyUploadFailure("Upload timed out", retryable = true)
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun <T> retry(times: Int, initialDelayMs: Long, block: suspend () -> T): T {
        var attempt = 0
        var delayMs = initialDelayMs
        var lastError: Throwable? = null
        while (attempt < times) {
            try {
                return block()
            } catch (t: Throwable) {
                lastError = t
                val retryable = t is UploadFailure && t.retryable
                if (!retryable || attempt == times - 1) break
                delay(delayMs)
                delayMs *= 2
            }
            attempt++
        }
        throw lastError ?: IllegalStateException("Upload failed")
    }

    private fun classifyUploadFailure(message: String, retryable: Boolean): UploadFailure {
        return UploadFailure(message = message, retryable = retryable)
    }

    private fun ensureCircuitClosed() {
        if (consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD) return
        val elapsed = System.currentTimeMillis() - circuitOpenedAtMs
        if (elapsed < CIRCUIT_BREAKER_COOLDOWN_MS) {
            throw UploadFailure(
                message = "Upload temporarily unavailable. Please retry shortly",
                retryable = true,
            )
        }
        consecutiveFailures = 0
        circuitOpenedAtMs = 0L
    }

    private fun onFailure() {
        consecutiveFailures += 1
        if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
            circuitOpenedAtMs = System.currentTimeMillis()
        }
    }
}

class UploadFailure(
    message: String,
    val retryable: Boolean,
) : IllegalStateException(message)

private fun sha256Hex(value: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
    val out = StringBuilder(digest.size * 2)
    for (byte in digest) {
        out.append(String.format("%02x", byte))
    }
    return out.toString()
}
