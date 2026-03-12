package com.example.codex.core.database.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "codex_aliases",
    indices = [
        Index("ownerCodexId"),
        Index(value = ["ownerCodexId", "value"], unique = true),
    ],
)
data class CodexAliasEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val ownerCodexId: String,
    val ownerType: String,
    val value: String,
    val isPrimary: Boolean,
)
