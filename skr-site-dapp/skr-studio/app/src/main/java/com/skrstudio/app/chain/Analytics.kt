package com.skrstudio.app.chain

import android.util.Log
import java.util.UUID

interface Analytics {
    val sessionId: String
    fun track(event: String, properties: Map<String, String> = emptyMap())
}

class AppAnalytics(
    override val sessionId: String = UUID.randomUUID().toString(),
) : Analytics {
    override fun track(event: String, properties: Map<String, String>) {
        val details = properties.entries.joinToString(",") { "${it.key}=${it.value}" }
        Log.i("skr-analytics", "session=$sessionId event=$event $details")
    }
}
