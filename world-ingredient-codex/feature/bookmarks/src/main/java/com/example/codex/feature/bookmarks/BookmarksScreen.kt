package com.example.codex.feature.bookmarks

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

data class BookmarksUiState(
    val body: String = "Bookmarks are stored locally and will become meaningful once real build units, categories, and ingredients are imported.",
)

class BookmarksViewModel(
    repository: CodexRepository,
) : ViewModel() {
    val uiState: StateFlow<BookmarksUiState> = repository.observeBookmarks()
        .map { bookmarks ->
            BookmarksUiState(
                body = if (bookmarks.isEmpty()) {
                    "No bookmarks are stored yet. The persistence table exists and is ready for Phase 2 detail and browse interactions."
                } else {
                    "Stored ${bookmarks.size} bookmarks. Phase 2 can replace this placeholder with the real list UI."
                },
            )
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), BookmarksUiState())
}

@Composable
fun BookmarksRoute(
    repository: CodexRepository,
) {
    val viewModel: BookmarksViewModel = viewModel(factory = simpleViewModelFactory { BookmarksViewModel(repository) })
    val uiState by viewModel.uiState.collectAsState()

    CodexScreenScaffold(title = "Bookmarks") { padding ->
        FoundationPlaceholder(
            title = "Bookmarks scaffold",
            body = uiState.body,
            paddingValues = padding,
        )
    }
}
