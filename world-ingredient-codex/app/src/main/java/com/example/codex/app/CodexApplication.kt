package com.example.codex.app

import android.app.Application
import com.example.codex.core.common.DefaultDispatchersProvider
import com.example.codex.core.database.CodexDatabase
import com.example.codex.core.database.repository.CodexRepository
import com.example.codex.core.database.repository.OfflineFirstCodexRepository
import com.example.codex.feature.import.CodexSeedAssetLoader

class CodexApplication : Application() {
    lateinit var appContainer: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        appContainer = AppContainer(this)
    }
}

class AppContainer(application: Application) {
    private val database = CodexDatabase.build(application)
    private val dispatchers = DefaultDispatchersProvider

    val repository: CodexRepository = OfflineFirstCodexRepository(
        database = database,
        hierarchyNodeDao = database.hierarchyNodeDao(),
        masterCategoryDao = database.masterCategoryDao(),
        ingredientEntryDao = database.ingredientEntryDao(),
        bookmarkDao = database.bookmarkDao(),
        recentViewDao = database.recentViewDao(),
        searchDao = database.searchDao(),
        codexMetadataDao = database.codexMetadataDao(),
        dispatchers = dispatchers,
    )

    val seedLoader = CodexSeedAssetLoader(application)
}
