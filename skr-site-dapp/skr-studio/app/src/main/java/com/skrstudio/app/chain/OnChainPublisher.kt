package com.skrstudio.app.chain

import com.solana.programs.Program
import com.solana.programs.SystemProgram
import com.solana.publickey.SolanaPublicKey
import com.solana.transaction.AccountMeta
import com.solana.transaction.Message
import com.solana.transaction.Transaction
import com.solana.transaction.TransactionInstruction
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

enum class ChainNetwork { MAINNET, DEVNET }

object ChainConfig {
    const val PROGRAM_ID = "8krPuBvS8nKkQ5fhqeHAAhY47Y9b6iG6XU4Ut5xtf1fH"
    const val SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3"
    const val SKR_DECIMALS = 6
    const val SKR_UNLOCK_AMOUNT_UI = 1000L
    const val SKR_UNLOCK_AMOUNT_RAW = 1_000_000_000L
    const val SKR_TREASURY = "7NQnWRziGPj3XWRwyEZzqqfYhvPZjCHBtJ3g96QQXbDH"
    const val TEMPLATE_CHANGE_FEE_SOL = 0.01
    const val TEMPLATE_CHANGE_FEE_LAMPORTS = 10_000_000L

    const val SYSTEM_PROGRAM_ID = "11111111111111111111111111111111"
    const val TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    const val ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1h2hvZbsiqW5xWH25efTNsLJA8knL"

    const val ANS_PROGRAM_ID = "ALTNSZ46uaAUU7XUV6awvdorLGqAsPwa9shm7h4uP2FK"
    const val ANS_CREATE_DISCRIMINATOR_HEX = "181ec828051c0777"
    const val ANS_UPDATE_DISCRIMINATOR_HEX = "dbc858b09e3ffd7f"
    const val DEFAULT_RECORD_SPACE = 512
}

data class PublishInput(
    val domain: String,
    val templateId: String,
    val contentUri: String,
    val contentHashHex: String,
)

data class PublishResult(
    val signature: String,
    val contentHashHex: String,
    val contentUri: String,
)

data class EntitlementState(
    val templateId: String,
    val purchased: Boolean,
    val purchasedAtUnix: Long,
    val initialized: Boolean,
)

data class SignedTransactionResult(
    val signatureBase58: String,
    val transactionBytes: ByteArray,
)

class OnChainPublisher {
    private val programId = SolanaPublicKey.Companion.from(ChainConfig.PROGRAM_ID)
    private val mint = SolanaPublicKey.Companion.from(ChainConfig.SKR_MINT)
    private val treasury = SolanaPublicKey.Companion.from(ChainConfig.SKR_TREASURY)
    private val tokenProgramId = SolanaPublicKey.Companion.from(ChainConfig.TOKEN_PROGRAM_ID)
    private val associatedTokenProgramId = SolanaPublicKey.Companion.from(ChainConfig.ASSOCIATED_TOKEN_PROGRAM_ID)

    suspend fun buildPurchaseTransaction(
        walletAddress: String,
        templateId: String,
        blockhash: String,
    ): ByteArray = withContext(Dispatchers.Default) {
        val payer = SolanaPublicKey.Companion.from(walletAddress)
        val entitlement = deriveEntitlementPda(payer, templateId)
        val payerAta = deriveAssociatedTokenAddress(owner = payer, mint = mint)
        val treasuryAta = deriveAssociatedTokenAddress(owner = treasury, mint = mint)

        val instruction = TransactionInstruction(
            programId = programId,
            accounts = listOf(
                AccountMeta(payer, true, true),
                AccountMeta(entitlement, false, true),
                AccountMeta(mint, false, false),
                AccountMeta(payerAta, false, true),
                AccountMeta(treasuryAta, false, true),
                AccountMeta(treasury, false, true),
                AccountMeta(tokenProgramId, false, false),
                AccountMeta(SystemProgram.PROGRAM_ID, false, false),
            ),
            data = encodePurchaseInstructionData(templateId),
        )

        buildUnsignedTx(
            payer = payer,
            blockhash = blockhash,
            instructions = listOf(instruction),
        )
    }

    suspend fun buildPublishTransaction(
        walletAddress: String,
        input: PublishInput,
        blockhash: String,
    ): ByteArray = withContext(Dispatchers.Default) {
        val payer = SolanaPublicKey.Companion.from(walletAddress)
        val publisher = derivePublisherPda(payer)
        val receipt = deriveReceiptPda(payer, input.contentHashHex)
        val entitlement = deriveEntitlementPda(payer, input.templateId)
        val requiresEntitlement = isPremiumTemplate(input.templateId)

        val accounts = buildList {
            add(AccountMeta(payer, true, true))
            add(AccountMeta(publisher, false, true))
            add(AccountMeta(receipt, false, true))
            if (requiresEntitlement) {
                add(AccountMeta(entitlement, false, false))
            }
            add(AccountMeta(treasury, false, true))
            add(AccountMeta(SystemProgram.PROGRAM_ID, false, false))
        }

        val instruction = TransactionInstruction(
            programId = programId,
            accounts = accounts,
            data = encodeRecordPublishInstructionData(input),
        )

        buildUnsignedTx(
            payer = payer,
            blockhash = blockhash,
            instructions = listOf(instruction),
        )
    }

    suspend fun deriveEntitlementPda(wallet: SolanaPublicKey, templateId: String): SolanaPublicKey {
        val pda = Program.findDerivedAddress(
            listOf(
                "entitlement".toByteArray(Charsets.UTF_8),
                wallet.bytes,
                templateId.toByteArray(Charsets.UTF_8),
            ),
            programId,
        )
        return pda.getOrNull()?.let { it as SolanaPublicKey }
            ?: error("Unable to derive entitlement PDA")
    }

    suspend fun derivePublisherPda(wallet: SolanaPublicKey): SolanaPublicKey {
        val pda = Program.findDerivedAddress(
            listOf(
                "publisher".toByteArray(Charsets.UTF_8),
                wallet.bytes,
            ),
            programId,
        )
        return pda.getOrNull()?.let { it as SolanaPublicKey }
            ?: error("Unable to derive publisher PDA")
    }

    suspend fun deriveReceiptPda(wallet: SolanaPublicKey, contentHashHex: String): SolanaPublicKey {
        val pda = Program.findDerivedAddress(
            listOf(
                "receipt".toByteArray(Charsets.UTF_8),
                wallet.bytes,
                hexToBytes(contentHashHex),
            ),
            programId,
        )
        return pda.getOrNull()?.let { it as SolanaPublicKey }
            ?: error("Unable to derive receipt PDA")
    }

    suspend fun deriveAssociatedTokenAddress(owner: SolanaPublicKey, mint: SolanaPublicKey): SolanaPublicKey {
        val pda = Program.findDerivedAddress(
            listOf(owner.bytes, tokenProgramId.bytes, mint.bytes),
            associatedTokenProgramId,
        )
        return pda.getOrNull()?.let { it as SolanaPublicKey }
            ?: error("Unable to derive ATA")
    }

    fun encodePurchaseInstructionData(templateId: String): ByteArray {
        return anchorDiscriminator("global:purchase_template") + writeBorshString(templateId)
    }

    fun encodeRecordPublishInstructionData(input: PublishInput): ByteArray {
        val hash = hexToBytes(input.contentHashHex)
        require(hash.size == 32) { "contentHashHex must be 32-byte hex" }

        return anchorDiscriminator("global:record_publish") +
            writeBorshString(input.domain) +
            writeBorshString(input.templateId) +
            hash +
            writeBorshString(input.contentUri)
    }

    fun parseEntitlementAccount(accountData: ByteArray): EntitlementState {
        require(accountData.size >= 8 + 32 + 4 + 1 + 8 + 1 + 1) { "Invalid entitlement account data" }
        val expected = anchorDiscriminator("account:TemplateEntitlement")
        val discriminator = accountData.copyOfRange(0, 8)
        require(discriminator.contentEquals(expected)) { "Account discriminator mismatch" }

        var offset = 8 + 32
        val (templateId, nextOffset) = readBorshString(accountData, offset)
        offset = nextOffset
        val purchased = accountData[offset].toInt() != 0
        offset += 1
        val purchasedAtUnix = readI64LE(accountData, offset)
        offset += 8
        offset += 1 // bump
        val initialized = accountData[offset].toInt() != 0
        return EntitlementState(
            templateId = templateId,
            purchased = purchased,
            purchasedAtUnix = purchasedAtUnix,
            initialized = initialized,
        )
    }

    // Mirrors live mainnet ANS Create instruction payload.
    fun encodeAnsCreateData(hashedName: ByteArray, recordSpace: Int = ChainConfig.DEFAULT_RECORD_SPACE): ByteArray {
        require(hashedName.size == 32) { "hashedName must be 32 bytes" }
        val discriminator = hexToBytes(ChainConfig.ANS_CREATE_DISCRIMINATOR_HEX)
        val out = ByteBuffer.allocate(8 + 4 + 32 + 4 + 1 + 8).order(ByteOrder.LITTLE_ENDIAN)
        out.put(discriminator)
        out.putInt(32)
        out.put(hashedName)
        out.putInt(recordSpace)
        out.put(1) // Some(u64)
        out.putLong(0)
        return out.array()
    }

    // Mirrors live mainnet ANS Update instruction payload.
    fun encodeAnsUpdateData(hashedName: ByteArray, value: String): ByteArray {
        require(hashedName.size == 32) { "hashedName must be 32 bytes" }
        val discriminator = hexToBytes(ChainConfig.ANS_UPDATE_DISCRIMINATOR_HEX)
        val valueBytes = (value + "\u0000").toByteArray(Charsets.UTF_8)
        val out = ByteBuffer
            .allocate(8 + 4 + 32 + 4 + 4 + valueBytes.size)
            .order(ByteOrder.LITTLE_ENDIAN)
        out.put(discriminator)
        out.putInt(32)
        out.put(hashedName)
        out.putInt(0)
        out.putInt(valueBytes.size)
        out.put(valueBytes)
        return out.array()
    }

    private fun anchorDiscriminator(value: String): ByteArray {
        val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
        return digest.copyOfRange(0, 8)
    }

    private fun buildUnsignedTx(
        payer: SolanaPublicKey,
        blockhash: String,
        instructions: List<TransactionInstruction>,
    ): ByteArray {
        val builder = Message.Builder()
        builder.setRecentBlockhash(blockhash)
        instructions.forEach(builder::addInstruction)
        val message = builder.build()
        val tx = Transaction(message)
        return tx.serialize()
    }

    private fun writeBorshString(value: String): ByteArray {
        val bytes = value.toByteArray(Charsets.UTF_8)
        val out = ByteBuffer.allocate(4 + bytes.size).order(ByteOrder.LITTLE_ENDIAN)
        out.putInt(bytes.size)
        out.put(bytes)
        return out.array()
    }

    private fun readBorshString(data: ByteArray, offset: Int): Pair<String, Int> {
        val length = readU32LE(data, offset)
        val start = offset + 4
        val end = start + length
        require(end <= data.size) { "Invalid borsh string length" }
        return String(data.copyOfRange(start, end), Charsets.UTF_8) to end
    }

    private fun readU32LE(data: ByteArray, offset: Int): Int {
        return (data[offset].toInt() and 0xff) or
            ((data[offset + 1].toInt() and 0xff) shl 8) or
            ((data[offset + 2].toInt() and 0xff) shl 16) or
            ((data[offset + 3].toInt() and 0xff) shl 24)
    }

    private fun readI64LE(data: ByteArray, offset: Int): Long {
        var out = 0L
        repeat(8) { i ->
            out = out or ((data[offset + i].toLong() and 0xffL) shl (8 * i))
        }
        return out
    }

    private fun hexToBytes(hex: String): ByteArray {
        val normalized = hex.trim().lowercase()
        require(normalized.length % 2 == 0) { "Invalid hex string" }
        return ByteArray(normalized.length / 2) { i ->
            val index = i * 2
            normalized.substring(index, index + 2).toInt(16).toByte()
        }
    }

    private fun isPremiumTemplate(templateId: String): Boolean {
        return templateId in setOf(
            "social-hub",
            "shop",
            "calendar",
            "health",
            "portfolio",
            "organization",
            "link-in-bio",
            "bring-your-own",
        )
    }
}
