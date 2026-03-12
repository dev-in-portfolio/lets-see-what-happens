package com.example.codex.core.database.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "ingredient_entries",
    indices = [
        Index("categoryCodexId"),
        Index("buildUnitCodexId"),
    ],
)
data class IngredientEntryEntity(
    @PrimaryKey val codexId: String,
    val categoryCodexId: String,
    val buildUnitCodexId: String,
    val displayName: String,
    val scientificName: String?,
    val notes: String?,
    val aliases: List<String>,
    val tags: List<String>,
    val importanceTags: List<String>,
    val crossLinks: List<String>,
)
