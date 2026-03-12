package com.example.codex.core.database.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "codex_cross_links",
    indices = [
        Index("fromCodexId"),
        Index("toCodexId"),
    ],
)
data class CodexCrossLinkEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val fromCodexId: String,
    val fromType: String,
    val toCodexId: String,
    val toType: String,
    val relationType: String,
)
