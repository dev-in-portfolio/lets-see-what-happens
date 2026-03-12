package com.example.codex.feature.import

import android.content.Context
import com.example.codex.core.model.CodexImportDocument
import com.example.codex.core.model.CodexLevel
import com.example.codex.core.model.ImportMetadata
import com.example.codex.core.model.SeedHierarchyNode
import kotlinx.serialization.json.Json

class CodexSeedAssetLoader(
    private val context: Context,
    private val json: Json = Json { ignoreUnknownKeys = true },
) {
    fun load(): CodexImportDocument =
        if (assetExists(TREE_ASSET_NAME)) {
            loadFromTreeAsset()
        } else {
            loadFromJsonAsset()
        }

    private fun loadFromTreeAsset(): CodexImportDocument {
        val lines = context.assets.open(TREE_ASSET_NAME).bufferedReader().use { reader ->
            reader.readLines().map(String::trim).filter(String::isNotEmpty)
        }
        val siblingCounts = linkedMapOf<String?, Int>()
        val nodes = lines.map { line ->
            val separatorIndex = line.indexOf(' ')
            require(separatorIndex > 0) { "Invalid hierarchy line: $line" }
            val codexId = line.substring(0, separatorIndex).removeSuffix(".")
            val displayName = line.substring(separatorIndex + 1).trim()
            val parentCodexId = codexId.substringBeforeLast('.', "")
                .ifBlank { null }
            val sortOrder = (siblingCounts[parentCodexId] ?: 0) + 1
            siblingCounts[parentCodexId] = sortOrder

            SeedHierarchyNode(
                codexId = codexId,
                parentCodexId = parentCodexId,
                level = CodexLevel.fromCodexId(codexId).name,
                displayName = displayName,
                sortOrder = sortOrder,
            )
        }

        return CodexImportDocument(
            metadata = ImportMetadata(
                schemaVersion = 1,
                source = TREE_ASSET_NAME,
                exportedAt = "2026-03-11",
                notes = "Parsed from raw tree asset. E1-E24 categories are generated automatically only under D-level nodes.",
            ),
            nodes = nodes,
        )
    }

    private fun loadFromJsonAsset(assetName: String = JSON_ASSET_NAME): CodexImportDocument {
        val text = context.assets.open(assetName).bufferedReader().use { it.readText() }
        return json.decodeFromString(CodexImportDocument.serializer(), text)
    }

    private fun assetExists(assetName: String): Boolean =
        context.assets.list("")?.contains(assetName) == true

    companion object {
        const val JSON_ASSET_NAME = "codex_seed.json"
        const val TREE_ASSET_NAME = "codex_tree.txt"
    }
}
