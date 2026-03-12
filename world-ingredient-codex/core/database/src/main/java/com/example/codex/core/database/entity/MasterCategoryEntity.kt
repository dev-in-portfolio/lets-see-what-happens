package com.example.codex.core.database.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "master_categories",
    indices = [
        Index("buildUnitCodexId"),
    ],
)
data class MasterCategoryEntity(
    @PrimaryKey val codexId: String,
    val buildUnitCodexId: String,
    val categoryIndex: Int,
    val displayName: String,
    val notes: String?,
    val tags: List<String>,
    val importanceTags: List<String>,
    val crossLinks: List<String>,
    val aliases: List<String>,
)
