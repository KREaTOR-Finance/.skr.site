package com.skrstudio.app.chain

import com.skrstudio.app.BuildConfig

data class StorageConfig(
    val provider: StorageProvider,
    val uploadApiBaseUrl: String,
    val arweaveJwk: String,
    val pinataJwt: String,
)

fun resolveStorageConfig(): StorageConfig {
    val provider = when (BuildConfig.STORAGE_PROVIDER.lowercase()) {
        "arweave" -> StorageProvider.ARWEAVE
        "ipfs" -> StorageProvider.IPFS
        else -> if (BuildConfig.ARWEAVE_JWK.isNotBlank()) StorageProvider.ARWEAVE else StorageProvider.IPFS
    }

    return StorageConfig(
        provider = provider,
        uploadApiBaseUrl = BuildConfig.UPLOAD_API_BASE_URL.trimEnd('/'),
        arweaveJwk = BuildConfig.ARWEAVE_JWK,
        pinataJwt = BuildConfig.PINATA_JWT,
    )
}
