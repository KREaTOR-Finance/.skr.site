package com.skrstudio.app.chain

enum class StorageProvider {
    ARWEAVE,
    IPFS,
}

data class UploadContentInput(
    val html: String,
    val domain: String,
    val templateId: String,
    val provider: StorageProvider? = null,
)

data class UploadedContent(
    val contentUri: String,
    val publicUrl: String,
    val contentHashHex: String,
    val provider: StorageProvider,
    val metadataRecords: Map<String, String>,
)

interface StorageUploader {
    suspend fun uploadContent(input: UploadContentInput): UploadedContent
}
