package com.example.codex.core.model

import kotlinx.serialization.Serializable

@Serializable
data class CodexImportDocument(
    val metadata: ImportMetadata,
    val nodes: List<SeedHierarchyNode> = emptyList(),
    val categories: List<SeedMasterCategory> = emptyList(),
    val ingredients: List<SeedIngredientEntry> = emptyList(),
    val aliases: List<SeedAlias> = emptyList(),
    val tags: List<SeedTag> = emptyList(),
    val citations: List<SeedCitation> = emptyList(),
    val crossLinks: List<SeedCrossLink> = emptyList(),
)

@Serializable
data class ImportMetadata(
    val schemaVersion: Int,
    val source: String,
    val exportedAt: String? = null,
    val notes: String? = null,
)

@Serializable
data class RawHierarchyImport(
    val metadata: ImportMetadata,
    val treeText: String,
)

@Serializable
data class SeedHierarchyNode(
    val codexId: String,
    val parentCodexId: String? = null,
    val level: String,
    val displayName: String,
    val sortOrder: Int,
    val notes: String? = null,
    val tags: List<String> = emptyList(),
    val importanceTags: List<String> = emptyList(),
    val crossLinks: List<String> = emptyList(),
    val aliases: List<String> = emptyList(),
)

@Serializable
data class SeedMasterCategory(
    val buildUnitCodexId: String,
    val key: String,
    val displayName: String? = null,
    val notes: String? = null,
    val aliases: List<String> = emptyList(),
    val tags: List<String> = emptyList(),
    val importanceTags: List<String> = emptyList(),
    val crossLinks: List<String> = emptyList(),
)

@Serializable
data class SeedIngredientEntry(
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

@Serializable
data class SeedAlias(
    val ownerCodexId: String,
    val ownerType: String,
    val value: String,
    val isPrimary: Boolean = false,
)

@Serializable
data class SeedTag(
    val ownerCodexId: String,
    val ownerType: String,
    val tagType: String,
    val value: String,
)

@Serializable
data class SeedCitation(
    val ownerCodexId: String,
    val ownerType: String,
    val label: String,
    val sourceUrl: String? = null,
    val notes: String? = null,
)

@Serializable
data class SeedCrossLink(
    val fromCodexId: String,
    val fromType: String,
    val toCodexId: String,
    val toType: String,
    val relationType: String,
)
