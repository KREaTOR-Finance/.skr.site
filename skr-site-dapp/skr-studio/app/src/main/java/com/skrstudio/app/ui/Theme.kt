package com.skrstudio.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

@Composable
fun SkrStudioTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            background = SeekerColors.BgDark,
            surface = SeekerColors.BgCard,
            primary = SeekerColors.TealCyan,
            onPrimary = SeekerColors.BgDark,
        ),
        content = content,
    )
}
