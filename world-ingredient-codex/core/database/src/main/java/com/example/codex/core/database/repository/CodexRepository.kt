package com.example.codex.core.database.repository

import androidx.room.withTransaction
import com.example.codex.core.common.DispatchersProvider
import com.example.codex.core.model.BookmarkItem
import com.example.codex.core.model.BookmarkTargetType
import com.example.codex.core.model.BuildUnitSubregion
import com.example.codex.core.model.CodexImportDocument
import com.example.codex.core.model.CodexImportSummary
import com.example.codex.core.model.CodexLevel
import com.example.codex.core.model.CodexNodeSummary
import com.example.codex.core.model.IngredientEntry
import com.example.codex.core.model.MasterCategory
import com.example.codex.core.model.MasterCategoryCatalog
import com.example.codex.core.model.RecentViewItem
import com.example.codex.core.model.SearchResult
import com.example.codex.core.model.SearchResultType
import com.example.codex.core.database.CodexDatabase
import com.example.codex.core.database.dao.BookmarkDao
import com.example.codex.core.database.dao.CodexMetadataDao
import com.example.codex.core.database.dao.HierarchyNodeDao
import com.example.codex.core.database.dao.IngredientEntryDao
import com.example.codex.core.database.dao.MasterCategoryDao
import com.example.codex.core.database.dao.RecentViewDao
import com.example.codex.core.database.dao.SearchDao
import com.example.codex.core.database.entity.BookmarkEntity
import com.example.codex.core.database.entity.CodexAliasEntity
import com.example.codex.core.database.entity.CodexCitationEntity
import com.example.codex.core.database.entity.CodexCrossLinkEntity
import com.example.codex.core.database.entity.CodexTagEntity
import com.example.codex.core.database.entity.HierarchyNodeEntity
import com.example.codex.core.database.entity.IngredientEntryEntity
import com.example.codex.core.database.entity.MasterCategoryEntity
import com.example.codex.core.database.entity.RecentViewEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

interface CodexRepository {
    fun observeMacroAreas(): Flow<List<CodexNodeSummary>>
    fun observeNode(codexId: String): Flow<CodexNodeSummary?>
    fun observeChildren(parentCodexId: String): Flow<List<CodexNodeSummary>>
    fun observeBuildUnit(buildUnitCodexId: String): Flow<BuildUnitSubregion?>
    fun observeCategories(buildUnitCodexId: String): Flow<List<MasterCategory>>
    fun observeIngredients(categoryCodexId: String): Flow<List<IngredientEntry>>
    fun observeIngredient(ingredientCodexId: String): Flow<IngredientEntry?>
    fun observeBookmarks(): Flow<List<BookmarkItem>>
    fun observeRecentViews(limit: Int = 20): Flow<List<RecentViewItem>>
    fun observeIsBookmarked(codexId: String): Flow<Boolean>
    fun search(query: String): Flow<List<SearchResult>>
    suspend fun toggleBookmark(codexId: String, type: BookmarkTargetType, displayName: String, subtitle: String)
    suspend fun recordRecentView(codexId: String, type: BookmarkTargetType, displayName: String, subtitle: String)
    suspend fun importDocumentIfEmpty(document: CodexImportDocument): CodexImportSummary?
    suspend fun importDocument(document: CodexImportDocument, clearExisting: Boolean = false): CodexImportSummary
}

class OfflineFirstCodexRepository(
    private val database: CodexDatabase,
    private val hierarchyNodeDao: HierarchyNodeDao,
    private val masterCategoryDao: MasterCategoryDao,
    private val ingredientEntryDao: IngredientEntryDao,
    private val bookmarkDao: BookmarkDao,
    private val recentViewDao: RecentViewDao,
    private val searchDao: SearchDao,
    private val codexMetadataDao: CodexMetadataDao,
    private val dispatchers: DispatchersProvider,
) : CodexRepository {

    override fun observeMacroAreas(): Flow<List<CodexNodeSummary>> =
        hierarchyNodeDao.observeMacroAreas().map { it.map(HierarchyNodeEntity::toDomain) }

    override fun observeNode(codexId: String): Flow<CodexNodeSummary?> =
        hierarchyNodeDao.observeNode(codexId).map { it?.toDomain() }

    override fun observeChildren(parentCodexId: String): Flow<List<CodexNodeSummary>> =
        hierarchyNodeDao.observeChildren(parentCodexId).map { it.map(HierarchyNodeEntity::toDomain) }

    override fun observeBuildUnit(buildUnitCodexId: String): Flow<BuildUnitSubregion?> =
        hierarchyNodeDao.observeNode(buildUnitCodexId).map { entity ->
            entity?.takeIf { it.level == CodexLevel.D.name }?.let {
                BuildUnitSubregion(
                    codexId = it.codexId,
                    parentCodexId = it.parentCodexId,
                    displayName = it.displayName,
                    sortOrder = it.sortOrder,
                    notes = it.notes,
                    tags = it.tags,
                    importanceTags = it.importanceTags,
                    crossLinks = it.crossLinks,
                    aliases = it.aliases,
                )
            }
        }

    override fun observeCategories(buildUnitCodexId: String): Flow<List<MasterCategory>> =
        masterCategoryDao.observeByBuildUnit(buildUnitCodexId).map { list ->
            list.map { entity ->
                MasterCategory(
                    codexId = entity.codexId,
                    buildUnitCodexId = entity.buildUnitCodexId,
                    categoryIndex = entity.categoryIndex,
                    displayName = entity.displayName,
                    notes = entity.notes,
                    tags = entity.tags,
                    importanceTags = entity.importanceTags,
                    crossLinks = entity.crossLinks,
                    aliases = entity.aliases,
                )
            }
        }

    override fun observeIngredients(categoryCodexId: String): Flow<List<IngredientEntry>> =
        ingredientEntryDao.observeByCategory(categoryCodexId).map { list ->
            list.map { entity ->
                IngredientEntry(
                    codexId = entity.codexId,
                    categoryCodexId = entity.categoryCodexId,
                    buildUnitCodexId = entity.buildUnitCodexId,
                    displayName = entity.displayName,
                    scientificName = entity.scientificName,
                    notes = entity.notes,
                    aliases = entity.aliases,
                    tags = entity.tags,
                    importanceTags = entity.importanceTags,
                    crossLinks = entity.crossLinks,
                )
            }
        }

    override fun observeIngredient(ingredientCodexId: String): Flow<IngredientEntry?> =
        ingredientEntryDao.observeById(ingredientCodexId).map { entity ->
            entity?.let {
                IngredientEntry(
                    codexId = it.codexId,
                    categoryCodexId = it.categoryCodexId,
                    buildUnitCodexId = it.buildUnitCodexId,
                    displayName = it.displayName,
                    scientificName = it.scientificName,
                    notes = it.notes,
                    aliases = it.aliases,
                    tags = it.tags,
                    importanceTags = it.importanceTags,
                    crossLinks = it.crossLinks,
                )
            }
        }

    override fun observeBookmarks(): Flow<List<BookmarkItem>> =
        bookmarkDao.observeAll().map { list ->
            list.map {
                BookmarkItem(
                    codexId = it.codexId,
                    targetType = BookmarkTargetType.valueOf(it.targetType),
                    displayName = it.displayName,
                    subtitle = it.subtitle,
                )
            }
        }

    override fun observeRecentViews(limit: Int): Flow<List<RecentViewItem>> =
        recentViewDao.observeRecent(limit).map { list ->
            list.map {
                RecentViewItem(
                    codexId = it.codexId,
                    targetType = BookmarkTargetType.valueOf(it.targetType),
                    displayName = it.displayName,
                    subtitle = it.subtitle,
                    viewedAtEpochMs = it.viewedAtEpochMs,
                )
            }
        }

    override fun observeIsBookmarked(codexId: String): Flow<Boolean> = bookmarkDao.observeIsBookmarked(codexId)

    override fun search(query: String): Flow<List<SearchResult>> =
        if (query.isBlank()) {
            flowOf(emptyList())
        } else {
            searchDao.searchAll(query).map { list ->
                list.map {
                    SearchResult(
                        codexId = it.codexId,
                        title = it.title,
                        subtitle = it.subtitle,
                        type = SearchResultType.valueOf(it.type),
                    )
                }
            }
        }

    override suspend fun toggleBookmark(
        codexId: String,
        type: BookmarkTargetType,
        displayName: String,
        subtitle: String,
    ) = withContext(dispatchers.io) {
        val bookmarked = bookmarkDao.observeIsBookmarked(codexId).first()
        if (bookmarked) {
            bookmarkDao.delete(codexId)
        } else {
            bookmarkDao.upsert(
                BookmarkEntity(
                    codexId = codexId,
                    targetType = type.name,
                    displayName = displayName,
                    subtitle = subtitle,
                ),
            )
        }
    }

    override suspend fun recordRecentView(
        codexId: String,
        type: BookmarkTargetType,
        displayName: String,
        subtitle: String,
    ) = withContext(dispatchers.io) {
        recentViewDao.upsert(
            RecentViewEntity(
                codexId = codexId,
                targetType = type.name,
                displayName = displayName,
                subtitle = subtitle,
                viewedAtEpochMs = System.currentTimeMillis(),
            ),
        )
    }

    override suspend fun importDocumentIfEmpty(document: CodexImportDocument): CodexImportSummary? =
        withContext(dispatchers.io) {
            if (hierarchyNodeDao.countNodes() == 0) {
                importDocument(document, clearExisting = false)
            } else {
                null
            }
        }

    override suspend fun importDocument(
        document: CodexImportDocument,
        clearExisting: Boolean,
    ): CodexImportSummary = withContext(dispatchers.io) {
        database.withTransaction {
            if (clearExisting) {
                codexMetadataDao.clearCrossLinks()
                codexMetadataDao.clearCitations()
                codexMetadataDao.clearTags()
                codexMetadataDao.clearAliases()
                ingredientEntryDao.clearAll()
                masterCategoryDao.clearAll()
                hierarchyNodeDao.clearAll()
            }

            val nodeEntities = document.nodes.map {
                HierarchyNodeEntity(
                    codexId = it.codexId,
                    parentCodexId = it.parentCodexId,
                    level = it.level,
                    displayName = it.displayName,
                    sortOrder = it.sortOrder,
                    notes = it.notes,
                    tags = it.tags,
                    importanceTags = it.importanceTags,
                    crossLinks = it.crossLinks,
                    aliases = it.aliases,
                )
            }
            hierarchyNodeDao.insertAll(nodeEntities)

            val categoryOverrides = document.categories.associateBy { "${it.buildUnitCodexId}:${it.key}" }
            val buildUnits = nodeEntities.filter { it.level == CodexLevel.D.name }
            val categoryEntities = buildUnits.flatMap { buildUnit ->
                MasterCategoryCatalog.categories.map { definition ->
                    val override = categoryOverrides["${buildUnit.codexId}:${definition.key.name}"]
                    MasterCategoryEntity(
                        codexId = MasterCategoryCatalog.categoryCodexId(buildUnit.codexId, definition.key),
                        buildUnitCodexId = buildUnit.codexId,
                        categoryIndex = definition.index,
                        displayName = override?.displayName ?: definition.displayName,
                        notes = override?.notes,
                        tags = override?.tags ?: emptyList(),
                        importanceTags = override?.importanceTags ?: emptyList(),
                        crossLinks = override?.crossLinks ?: emptyList(),
                        aliases = override?.aliases ?: emptyList(),
                    )
                }
            }
            masterCategoryDao.insertAll(categoryEntities)

            val ingredientEntities = document.ingredients.map {
                IngredientEntryEntity(
                    codexId = it.codexId,
                    categoryCodexId = it.categoryCodexId,
                    buildUnitCodexId = it.buildUnitCodexId,
                    displayName = it.displayName,
                    scientificName = it.scientificName,
                    notes = it.notes,
                    aliases = it.aliases,
                    tags = it.tags,
                    importanceTags = it.importanceTags,
                    crossLinks = it.crossLinks,
                )
            }
            ingredientEntryDao.insertAll(ingredientEntities)

            codexMetadataDao.insertAliases(
                document.aliases.map {
                    CodexAliasEntity(
                        ownerCodexId = it.ownerCodexId,
                        ownerType = it.ownerType,
                        value = it.value,
                        isPrimary = it.isPrimary,
                    )
                },
            )
            codexMetadataDao.insertTags(
                document.tags.map {
                    CodexTagEntity(
                        ownerCodexId = it.ownerCodexId,
                        ownerType = it.ownerType,
                        tagType = it.tagType,
                        value = it.value,
                    )
                },
            )
            codexMetadataDao.insertCitations(
                document.citations.map {
                    CodexCitationEntity(
                        ownerCodexId = it.ownerCodexId,
                        ownerType = it.ownerType,
                        label = it.label,
                        sourceUrl = it.sourceUrl,
                        notes = it.notes,
                    )
                },
            )
            codexMetadataDao.insertCrossLinks(
                document.crossLinks.map {
                    CodexCrossLinkEntity(
                        fromCodexId = it.fromCodexId,
                        fromType = it.fromType,
                        toCodexId = it.toCodexId,
                        toType = it.toType,
                        relationType = it.relationType,
                    )
                },
            )

            CodexImportSummary(
                nodeCount = nodeEntities.size,
                categoryCount = categoryEntities.size,
                ingredientCount = ingredientEntities.size,
                aliasCount = document.aliases.size,
                tagCount = document.tags.size,
                citationCount = document.citations.size,
                crossLinkCount = document.crossLinks.size,
            )
        }
    }
}

private fun HierarchyNodeEntity.toDomain(): CodexNodeSummary =
    CodexNodeSummary(
        codexId = codexId,
        parentCodexId = parentCodexId,
        level = CodexLevel.valueOf(level),
        displayName = displayName,
        sortOrder = sortOrder,
        notes = notes,
        tags = tags,
        importanceTags = importanceTags,
        crossLinks = crossLinks,
        aliases = aliases,
    )
