package com.example.codex.core.database.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "hierarchy_nodes",
    indices = [
        Index("parentCodexId"),
        Index("level"),
    ],
)
data class HierarchyNodeEntity(
    @PrimaryKey val codexId: String,
    val parentCodexId: String?,
    val level: String,
    val displayName: String,
    val sortOrder: Int,
    val notes: String?,
    val tags: List<String>,
    val importanceTags: List<String>,
    val crossLinks: List<String>,
    val aliases: List<String>,
)
