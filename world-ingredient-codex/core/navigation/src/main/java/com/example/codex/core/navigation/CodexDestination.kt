package com.example.codex.core.navigation

sealed interface CodexDestination {
    val route: String

    data object Startup : CodexDestination { override val route = "startup" }
    data object Home : CodexDestination { override val route = "home" }
    data object Browse : CodexDestination { override val route = "browse" }
    data object Search : CodexDestination { override val route = "search" }
    data object Bookmarks : CodexDestination { override val route = "bookmarks" }
    data object ImportFoundation : CodexDestination { override val route = "import-foundation" }
    data object DetailFoundation : CodexDestination { override val route = "detail-foundation" }

    data object BrowseNode : CodexDestination {
        override val route = "browse-node/{nodeId}"
        fun create(nodeId: String): String = "browse-node/$nodeId"
    }

    data object Category : CodexDestination {
        override val route = "categories/{buildUnitId}"
        fun create(buildUnitId: String): String = "categories/$buildUnitId"
    }

    data object Ingredient : CodexDestination {
        override val route = "ingredient/{ingredientId}"
        fun create(ingredientId: String): String = "ingredient/$ingredientId"
    }
}
