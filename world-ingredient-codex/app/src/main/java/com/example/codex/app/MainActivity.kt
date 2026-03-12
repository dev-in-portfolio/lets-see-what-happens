package com.example.codex.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.example.codex.core.ui.theme.CodexTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val application = application as CodexApplication
        setContent {
            CodexTheme {
                CodexApp(appContainer = application.appContainer)
            }
        }
    }
}
