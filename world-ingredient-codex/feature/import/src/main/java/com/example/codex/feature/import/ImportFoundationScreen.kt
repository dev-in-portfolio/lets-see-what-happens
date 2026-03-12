package com.example.codex.feature.import

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.codex.core.common.simpleViewModelFactory
import com.example.codex.core.ui.components.CodexScreenScaffold
import com.example.codex.core.ui.components.FoundationPlaceholder
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

data class ImportFoundationUiState(
    val body: String,
)

class ImportFoundationViewModel(
    seedLoader: CodexSeedAssetLoader,
) : ViewModel() {
    val uiState: StateFlow<ImportFoundationUiState> = MutableStateFlow(
        seedLoader.load().let { document ->
            ImportFoundationUiState(
                body = "Schema v${document.metadata.schemaVersion} is present with ${document.nodes.size} nodes and ${document.ingredients.size} ingredients. The asset is schema-only and ready for your real tree payload.",
            )
        },
    )
}

@Composable
fun ImportFoundationRoute(
    seedLoader: CodexSeedAssetLoader,
) {
    val viewModel: ImportFoundationViewModel = viewModel(
        factory = simpleViewModelFactory { ImportFoundationViewModel(seedLoader) },
    )
    val uiState by viewModel.uiState.collectAsState()

    CodexScreenScaffold(title = "Import") { padding ->
        FoundationPlaceholder(
            title = "Import contract",
            body = uiState.body,
            paddingValues = padding,
        )
    }
}
