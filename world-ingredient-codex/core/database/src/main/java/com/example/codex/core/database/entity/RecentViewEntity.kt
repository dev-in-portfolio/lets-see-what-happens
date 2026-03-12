package com.example.codex.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "recent_views")
data class RecentViewEntity(
    @PrimaryKey val codexId: String,
    val targetType: String,
    val displayName: String,
    val subtitle: String,
    val viewedAtEpochMs: Long,
)
