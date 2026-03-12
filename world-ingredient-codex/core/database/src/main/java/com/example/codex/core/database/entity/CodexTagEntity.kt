package com.example.codex.core.database.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "codex_tags",
    indices = [
        Index("ownerCodexId"),
        Index(value = ["ownerCodexId", "tagType"]),
    ],
)
data class CodexTagEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val ownerCodexId: String,
    val ownerType: String,
    val tagType: String,
    val value: String,
)
