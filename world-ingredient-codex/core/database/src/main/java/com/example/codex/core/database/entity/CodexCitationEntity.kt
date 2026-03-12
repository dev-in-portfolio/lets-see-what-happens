package com.example.codex.core.database.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "codex_citations",
    indices = [
        Index("ownerCodexId"),
    ],
)
data class CodexCitationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val ownerCodexId: String,
    val ownerType: String,
    val label: String,
    val sourceUrl: String?,
    val notes: String?,
)
