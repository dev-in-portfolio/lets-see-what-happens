package com.example.codex.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "bookmarks")
data class BookmarkEntity(
    @PrimaryKey val codexId: String,
    val targetType: String,
    val displayName: String,
    val subtitle: String,
)
