package com.example.codex.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bookmarks
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.codex.core.database.repository.CodexRepository
import com.example.codex.core.model.CodexLevel
import com.example.codex.core.model.CodexNodeSummary
import com.example.codex.core.model.MasterCategory
import com.example.codex.core.navigation.CodexDestination
import com.example.codex.feature.bookmarks.BookmarksRoute
import com.example.codex.feature.browse.BrowseNodeRoute
import com.example.codex.feature.browse.BrowseRoute
import com.example.codex.feature.browse.BuildUnitCategoriesRoute
import com.example.codex.feature.detail.DetailFoundationRoute
import com.example.codex.feature.import.ImportFoundationRoute
import com.example.codex.feature.search.SearchRoute
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun CodexApp(
    appContainer: AppContainer,
    navController: NavHostController = rememberNavController(),
) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = currentRoute != CodexDestination.Startup.route

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomDestinations().forEach { destination ->
                        NavigationBarItem(
                            selected = currentRoute == destination.route,
                            onClick = {
                                navController.navigate(destination.route) {
                                    launchSingleTop = true
                                    restoreState = true
                                    popUpTo(navController.graph.startDestinationId) {
                                        saveState = true
                                    }
                                }
                            },
                            icon = { Icon(destination.icon, contentDescription = destination.label) },
                            label = { Text(destination.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = CodexDestination.Startup.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(CodexDestination.Startup.route) {
                StartupRoute(
                    repository = appContainer.repository,
                    seedLoader = appContainer.seedLoader,
                    onReady = {
                        navController.navigate(CodexDestination.Home.route) {
                            popUpTo(CodexDestination.Startup.route) { inclusive = true }
                        }
                    },
                )
            }
            composable(CodexDestination.Home.route) {
                BrowseRoute(
                    repository = appContainer.repository,
                    onAreaClick = { node -> navController.navigate(CodexDestination.BrowseNode.create(node.codexId)) },
                    onOpenSearch = { navController.navigate(CodexDestination.Search.route) },
                    onOpenBookmarks = { navController.navigate(CodexDestination.Bookmarks.route) },
                    onOpenImportFoundation = { navController.navigate(CodexDestination.ImportFoundation.route) },
                )
            }
            composable(CodexDestination.BrowseNode.route) { entry ->
                val nodeId = entry.arguments?.getString("nodeId").orEmpty()
                BrowseNodeRoute(
                    repository = appContainer.repository,
                    parentCodexId = nodeId,
                    onNodeClick = { node -> navigateFromNode(navController, node) },
                )
            }
            composable(CodexDestination.Category.route) { entry ->
                val buildUnitId = entry.arguments?.getString("buildUnitId").orEmpty()
                BuildUnitCategoriesRoute(
                    repository = appContainer.repository,
                    buildUnitCodexId = buildUnitId,
                    onCategoryClick = { category -> navigateFromCategory(navController, category) },
                )
            }
            composable(CodexDestination.Search.route) {
                SearchRoute(repository = appContainer.repository)
            }
            composable(CodexDestination.Bookmarks.route) {
                BookmarksRoute(repository = appContainer.repository)
            }
            composable(CodexDestination.ImportFoundation.route) {
                ImportFoundationRoute(seedLoader = appContainer.seedLoader)
            }
            composable(CodexDestination.DetailFoundation.route) {
                DetailFoundationRoute(repository = appContainer.repository)
            }
            composable(CodexDestination.Ingredient.route) { entry ->
                val ingredientId = entry.arguments?.getString("ingredientId").orEmpty()
                DetailFoundationRoute(
                    repository = appContainer.repository,
                    title = ingredientId,
                    message = "Ingredient entries have not been imported yet for this category.",
                )
            }
        }
    }
}

private fun navigateFromNode(
    navController: NavHostController,
    node: CodexNodeSummary,
) {
    when (node.level) {
        CodexLevel.A,
        CodexLevel.B,
        CodexLevel.C,
        -> navController.navigate(CodexDestination.BrowseNode.create(node.codexId))
        CodexLevel.D -> navController.navigate(CodexDestination.Category.create(node.codexId))
        else -> Unit
    }
}

private fun navigateFromCategory(
    navController: NavHostController,
    category: MasterCategory,
) {
    val _ = category
    navController.navigate(CodexDestination.DetailFoundation.route)
}

@Composable
private fun StartupRoute(
    repository: CodexRepository,
    seedLoader: com.example.codex.feature.import.CodexSeedAssetLoader,
    onReady: () -> Unit,
) {
    var message by remember { mutableStateOf("Loading codex foundation...") }

    LaunchedEffect(Unit) {
        val messageText = withContext(Dispatchers.IO) {
            val document = seedLoader.load()
            val summary = repository.importDocument(document, clearExisting = true)
            "Imported ${summary.nodeCount} hierarchy nodes and ${summary.categoryCount} generated categories"
        }
        message = messageText
        onReady()
    }

    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator()
        Text(text = message, modifier = Modifier.padding(top = 16.dp))
    }
}

private data class BottomDestination(
    val route: String,
    val label: String,
    val icon: ImageVector,
)

private fun bottomDestinations(): List<BottomDestination> = listOf(
    BottomDestination(CodexDestination.Home.route, "Home", Icons.Outlined.Home),
    BottomDestination(CodexDestination.Search.route, "Search", Icons.Outlined.Search),
    BottomDestination(CodexDestination.Bookmarks.route, "Bookmarks", Icons.Outlined.Bookmarks),
)
