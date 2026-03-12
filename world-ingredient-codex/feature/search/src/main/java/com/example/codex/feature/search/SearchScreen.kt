package com.example.codex.feature.search

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.codex.core.common.simpleViewModelFactory
import com.example.codex.core.database.repository.CodexRepository
import com.example.codex.core.model.SearchResult
import com.example.codex.core.ui.components.CodexScreenScaffold
import com.example.codex.core.ui.components.DetailListItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn

class SearchViewModel(
    repository: CodexRepository,
) : ViewModel() {
    private val query = MutableStateFlow("")
    val searchResults: StateFlow<List<SearchResult>> = query
        .flatMapLatest(repository::search)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun updateQuery(value: String) {
        query.value = value
    }
}

@Composable
fun SearchRoute(
    repository: CodexRepository,
) {
    val viewModel: SearchViewModel = viewModel(factory = simpleViewModelFactory { SearchViewModel(repository) })
    val results by viewModel.searchResults.collectAsState()
    var query by remember { mutableStateOf("") }

    CodexScreenScaffold(title = "Search") { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
        ) {
            OutlinedTextField(
                value = query,
                onValueChange = {
                    query = it
                    viewModel.updateQuery(it)
                },
                label = { Text("Search by codex id or name") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
            )
            LazyColumn(
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                items(results, key = { it.codexId }) { result ->
                    DetailListItem(
                        headline = result.title,
                        supporting = "${result.codexId} • ${result.subtitle}",
                    )
                }
            }
        }
    }
}
