package com.skrstudio.app.chain

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

class OnChainPublisherTest {
    private val publisher = OnChainPublisher()

    @Test
    fun `purchase payload uses anchor discriminator and borsh string`() {
        val out = publisher.encodePurchaseInstructionData("social-hub")
        assertEquals(8 + 4 + "social-hub".length, out.size)
        assertEquals(8, out.copyOfRange(0, 8).size)
        assertEquals("social-hub".length, out.copyOfRange(8, 12).toLittleInt())
    }

    @Test
    fun `record publish payload matches field order`() {
        val payload = publisher.encodeRecordPublishInstructionData(
            PublishInput(
                domain = "nakamura.skr",
                templateId = "social-hub",
                contentUri = "ar://abc123",
                contentHashHex = "11".repeat(32),
            ),
        )
        assertEquals(8, payload.copyOfRange(0, 8).size)
        assertEquals("nakamura.skr".length, payload.copyOfRange(8, 12).toLittleInt())
        val hashStart = 8 + 4 + "nakamura.skr".length + 4 + "social-hub".length
        assertEquals(0x11.toByte(), payload[hashStart])
        assertEquals(0x11.toByte(), payload[hashStart + 31])
    }

    @Test
    fun `create payload matches ANS shape`() {
        val hashed = ByteArray(32) { 0x11.toByte() }
        val out = publisher.encodeAnsCreateData(hashed, 512)
        assertEquals(57, out.size)
        assertEquals("181ec828051c0777", out.copyOfRange(0, 8).toHex())
        assertEquals(32, out.copyOfRange(8, 12).toLittleInt())
        assertArrayEquals(hashed, out.copyOfRange(12, 44))
        assertEquals(512, out.copyOfRange(44, 48).toLittleInt())
    }

    @Test
    fun `update payload uses null terminated value`() {
        val hashed = ByteArray(32) { 0x22.toByte() }
        val out = publisher.encodeAnsUpdateData(hashed, "https://skr.site")
        assertEquals("dbc858b09e3ffd7f", out.copyOfRange(0, 8).toHex())
        assertEquals(0, out.last().toInt())
    }
}

private fun ByteArray.toHex(): String = joinToString(separator = "") { "%02x".format(it) }

private fun ByteArray.toLittleInt(): Int =
    (this[0].toInt() and 0xFF) or
        ((this[1].toInt() and 0xFF) shl 8) or
        ((this[2].toInt() and 0xFF) shl 16) or
        ((this[3].toInt() and 0xFF) shl 24)
