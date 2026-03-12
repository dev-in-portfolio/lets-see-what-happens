package com.example.codex.core.model

enum class CodexLevel {
    A,
    B,
    C,
    D,
    E,
    F,
    ;

    companion object {
        fun fromCodexId(codexId: String): CodexLevel = when (codexId.split(".").size) {
            1 -> A
            2 -> B
            3 -> C
            4 -> D
            5 -> E
            6 -> F
            else -> error("Unsupported codex id depth: $codexId")
        }
    }
}

enum class BookmarkTargetType {
    BUILD_UNIT,
    CATEGORY,
    INGREDIENT,
}

enum class CodexRecordType {
    HIERARCHY_NODE,
    MASTER_CATEGORY,
    INGREDIENT_ENTRY,
}

enum class CodexTagType {
    GENERAL,
    IMPORTANCE,
}

enum class SearchResultType {
    HIERARCHY,
    CATEGORY,
    INGREDIENT,
}

interface CodexNode {
    val codexId: String
    val parentCodexId: String?
    val displayName: String
    val sortOrder: Int
    val notes: String?
    val tags: List<String>
    val importanceTags: List<String>
    val crossLinks: List<String>
    val aliases: List<String>
}

data class MacroWorldArea(
    override val codexId: String,
    override val parentCodexId: String?,
    override val displayName: String,
    override val sortOrder: Int,
    override val notes: String? = null,
    override val tags: List<String> = emptyList(),
    override val importanceTags: List<String> = emptyList(),
    override val crossLinks: List<String> = emptyList(),
    override val aliases: List<String> = emptyList(),
) : CodexNode

data class CulinaryZone(
    override val codexId: String,
    override val parentCodexId: String?,
    override val displayName: String,
    override val sortOrder: Int,
    override val notes: String? = null,
    override val tags: List<String> = emptyList(),
    override val importanceTags: List<String> = emptyList(),
    override val crossLinks: List<String> = emptyList(),
    override val aliases: List<String> = emptyList(),
) : CodexNode

data class RegionalBucket(
    override val codexId: String,
    override val parentCodexId: String?,
    override val displayName: String,
    override val sortOrder: Int,
    override val notes: String? = null,
    override val tags: List<String> = emptyList(),
    override val importanceTags: List<String> = emptyList(),
    override val crossLinks: List<String> = emptyList(),
    override val aliases: List<String> = emptyList(),
) : CodexNode

data class BuildUnitSubregion(
    override val codexId: String,
    override val parentCodexId: String?,
    override val displayName: String,
    override val sortOrder: Int,
    override val notes: String? = null,
    override val tags: List<String> = emptyList(),
    override val importanceTags: List<String> = emptyList(),
    override val crossLinks: List<String> = emptyList(),
    override val aliases: List<String> = emptyList(),
) : CodexNode

data class CodexNodeSummary(
    val codexId: String,
    val parentCodexId: String?,
    val level: CodexLevel,
    val displayName: String,
    val sortOrder: Int,
    val notes: String? = null,
    val tags: List<String> = emptyList(),
    val importanceTags: List<String> = emptyList(),
    val crossLinks: List<String> = emptyList(),
    val aliases: List<String> = emptyList(),
)

data class MasterCategory(
    val codexId: String,
    val buildUnitCodexId: String,
    val categoryIndex: Int,
    val displayName: String,
    val notes: String? = null,
    val tags: List<String> = emptyList(),
    val importanceTags: List<String> = emptyList(),
    val crossLinks: List<String> = emptyList(),
    val aliases: List<String> = emptyList(),
)

data class IngredientEntry(
    val codexId: String,
    val categoryCodexId: String,
    val buildUnitCodexId: String,
    val displayName: String,
    val scientificName: String? = null,
    val notes: String? = null,
    val aliases: List<String> = emptyList(),
    val tags: List<String> = emptyList(),
    val importanceTags: List<String> = emptyList(),
    val crossLinks: List<String> = emptyList(),
)

data class BookmarkItem(
    val codexId: String,
    val targetType: BookmarkTargetType,
    val displayName: String,
    val subtitle: String,
)

data class RecentViewItem(
    val codexId: String,
    val targetType: BookmarkTargetType,
    val displayName: String,
    val subtitle: String,
    val viewedAtEpochMs: Long,
)

data class SearchResult(
    val codexId: String,
    val title: String,
    val subtitle: String,
    val type: SearchResultType,
)

data class CodexImportSummary(
    val nodeCount: Int = 0,
    val categoryCount: Int = 0,
    val ingredientCount: Int = 0,
    val aliasCount: Int = 0,
    val tagCount: Int = 0,
    val citationCount: Int = 0,
    val crossLinkCount: Int = 0,
)
