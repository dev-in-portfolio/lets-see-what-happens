package com.example.codex.feature.browse

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.codex.core.common.simpleViewModelFactory
import com.example.codex.core.database.repository.CodexRepository
import com.example.codex.core.model.CodexNodeSummary
import com.example.codex.core.model.MasterCategory
import com.example.codex.core.ui.components.CodexNodeList
import com.example.codex.core.ui.components.CodexScreenScaffold
import com.example.codex.core.ui.components.DetailListItem
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

data class HomeUiState(
    val areas: List<CodexNodeSummary> = emptyList(),
)

class HomeViewModel(
    repository: CodexRepository,
) : ViewModel() {
    val uiState: StateFlow<HomeUiState> = repository.observeMacroAreas()
        .map(::HomeUiState)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())
}

@Composable
fun HomeRoute(
    repository: CodexRepository,
    onAreaClick: (CodexNodeSummary) -> Unit,
    onOpenSearch: () -> Unit,
    onOpenBookmarks: () -> Unit,
    onOpenImportFoundation: () -> Unit,
) {
    val viewModel: HomeViewModel = viewModel(factory = simpleViewModelFactory { HomeViewModel(repository) })
    val uiState by viewModel.uiState.collectAsState()

    CodexScreenScaffold(
        title = "World Ingredient Codex",
        actions = {
            androidx.compose.material3.TextButton(onClick = onOpenSearch) { Text("Search") }
            androidx.compose.material3.TextButton(onClick = onOpenBookmarks) { Text("Bookmarks") }
            androidx.compose.material3.TextButton(onClick = onOpenImportFoundation) { Text("Import") }
        },
    ) { padding ->
        CodexNodeList(
            nodes = uiState.areas,
            onNodeSelected = onAreaClick,
            modifier = Modifier.padding(padding),
        )
    }
}

data class BrowseUiState(
    val parent: CodexNodeSummary? = null,
    val children: List<CodexNodeSummary> = emptyList(),
)

class BrowseChildrenViewModel(
    repository: CodexRepository,
    parentCodexId: String,
) : ViewModel() {
    val uiState: StateFlow<BrowseUiState> = combine(
        repository.observeNode(parentCodexId),
        repository.observeChildren(parentCodexId),
    ) { parent, children ->
        BrowseUiState(parent = parent, children = children)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), BrowseUiState())
}

@Composable
fun BrowseNodeRoute(
    repository: CodexRepository,
    parentCodexId: String,
    onNodeClick: (CodexNodeSummary) -> Unit,
) {
    val viewModel: BrowseChildrenViewModel = viewModel(
        key = "browse-$parentCodexId",
        factory = simpleViewModelFactory { BrowseChildrenViewModel(repository, parentCodexId) },
    )
    val uiState by viewModel.uiState.collectAsState()

    CodexScreenScaffold(title = uiState.parent?.displayName ?: parentCodexId) { padding ->
        CodexNodeList(
            nodes = uiState.children,
            onNodeSelected = onNodeClick,
            modifier = Modifier.padding(padding),
        )
    }
}

data class BuildUnitCategoriesUiState(
    val buildUnit: CodexNodeSummary? = null,
    val categories: List<MasterCategory> = emptyList(),
)

class BuildUnitCategoriesViewModel(
    repository: CodexRepository,
    buildUnitCodexId: String,
) : ViewModel() {
    val uiState: StateFlow<BuildUnitCategoriesUiState> = combine(
        repository.observeNode(buildUnitCodexId),
        repository.observeCategories(buildUnitCodexId),
    ) { buildUnit, categories ->
        BuildUnitCategoriesUiState(buildUnit = buildUnit, categories = categories)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), BuildUnitCategoriesUiState())
}

@Composable
fun BuildUnitCategoriesRoute(
    repository: CodexRepository,
    buildUnitCodexId: String,
    onCategoryClick: (MasterCategory) -> Unit,
) {
    val viewModel: BuildUnitCategoriesViewModel = viewModel(
        key = "build-unit-$buildUnitCodexId",
        factory = simpleViewModelFactory { BuildUnitCategoriesViewModel(repository, buildUnitCodexId) },
    )
    val uiState by viewModel.uiState.collectAsState()

    CodexScreenScaffold(title = uiState.buildUnit?.displayName ?: buildUnitCodexId) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            items(uiState.categories, key = { it.codexId }) { category ->
                Card(onClick = { onCategoryClick(category) }) {
                    DetailListItem(
                        headline = category.displayName,
                        supporting = category.codexId,
                    )
                }
            }
        }
    }
}

@Composable
fun BrowseRoute(
    repository: CodexRepository,
    onAreaClick: (CodexNodeSummary) -> Unit,
    onOpenSearch: () -> Unit,
    onOpenBookmarks: () -> Unit,
    onOpenImportFoundation: () -> Unit,
) {
    HomeRoute(
        repository = repository,
        onAreaClick = onAreaClick,
        onOpenSearch = onOpenSearch,
        onOpenBookmarks = onOpenBookmarks,
        onOpenImportFoundation = onOpenImportFoundation,
    )
}
