package com.skrstudio.app.chain

object ChainCodec {
    private const val ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    private val BASE_58 = ALPHABET.toCharArray()
    private val INDEXES = IntArray(128) { -1 }.also { indexes ->
        BASE_58.forEachIndexed { i, c -> indexes[c.code] = i }
    }

    fun encodeBase58(input: ByteArray): String {
        if (input.isEmpty()) return ""
        var zeros = 0
        while (zeros < input.size && input[zeros].toInt() == 0) zeros++

        val encoded = CharArray(input.size * 2)
        var outputStart = encoded.size
        val copy = input.copyOf()
        var inputStart = zeros
        while (inputStart < copy.size) {
            val mod = divmod58(copy, inputStart)
            if (copy[inputStart].toInt() == 0) inputStart++
            encoded[--outputStart] = BASE_58[mod]
        }
        while (outputStart < encoded.size && encoded[outputStart] == BASE_58[0]) outputStart++
        while (--zeros >= 0) encoded[--outputStart] = BASE_58[0]
        return String(encoded, outputStart, encoded.size - outputStart)
    }

    fun decodeBase58(input: String): ByteArray {
        if (input.isEmpty()) return byteArrayOf()
        val input58 = ByteArray(input.length)
        for (i in input.indices) {
            val c = input[i]
            val digit = if (c.code < 128) INDEXES[c.code] else -1
            require(digit >= 0) { "Invalid base58 character '$c'" }
            input58[i] = digit.toByte()
        }

        var zeros = 0
        while (zeros < input58.size && input58[zeros].toInt() == 0) zeros++
        val decoded = ByteArray(input.length)
        var outputStart = decoded.size
        var inputStart = zeros
        while (inputStart < input58.size) {
            val mod = divmod256(input58, inputStart)
            if (input58[inputStart].toInt() == 0) inputStart++
            decoded[--outputStart] = mod.toByte()
        }
        while (outputStart < decoded.size && decoded[outputStart].toInt() == 0) outputStart++
        return decoded.copyOfRange(outputStart - zeros, decoded.size)
    }

    private fun divmod58(number: ByteArray, firstDigit: Int): Int {
        var remainder = 0
        for (i in firstDigit until number.size) {
            val digit = number[i].toInt() and 0xff
            val temp = remainder * 256 + digit
            number[i] = (temp / 58).toByte()
            remainder = temp % 58
        }
        return remainder
    }

    private fun divmod256(number58: ByteArray, firstDigit: Int): Int {
        var remainder = 0
        for (i in firstDigit until number58.size) {
            val digit58 = number58[i].toInt() and 0xff
            val temp = remainder * 58 + digit58
            number58[i] = (temp / 256).toByte()
            remainder = temp % 256
        }
        return remainder
    }
}
