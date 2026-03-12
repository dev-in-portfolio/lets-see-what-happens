package com.example.codex.feature.detail

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.codex.core.common.simpleViewModelFactory
import com.example.codex.core.database.repository.CodexRepository
import com.example.codex.core.ui.components.CodexScreenScaffold
import com.example.codex.core.ui.components.FoundationPlaceholder
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

data class DetailFoundationUiState(
    val title: String = "Detail",
    val body: String = "Detail screens will be attached after real ingredient records, citations, aliases, and cross-links are imported.",
)

class DetailFoundationViewModel(
    repository: CodexRepository,
) : ViewModel() {
    val uiState: StateFlow<DetailFoundationUiState> = repository.observeBookmarks()
        .map { bookmarks ->
            DetailFoundationUiState(
                body = if (bookmarks.isEmpty()) {
                    "The detail module is intentionally a placeholder in Phase 1. Phase 2 should bind ingredient detail data into this module."
                } else {
                    "The detail module remains placeholder-only even though local data exists. Phase 2 should replace this with real detail rendering."
                },
            )
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), DetailFoundationUiState())
}

@Composable
fun DetailFoundationRoute(
    repository: CodexRepository,
    title: String = "Detail",
    message: String = "Ingredient records are still sparse. This placeholder remains safe until the next data layer is imported.",
) {
    val viewModel: DetailFoundationViewModel = viewModel(
        factory = simpleViewModelFactory { DetailFoundationViewModel(repository) },
    )
    val uiState by viewModel.uiState.collectAsState()

    CodexScreenScaffold(title = title) { padding ->
        FoundationPlaceholder(
            title = "Detail scaffold",
            body = "$message\n\n${uiState.body}",
            paddingValues = padding,
        )
    }
}
