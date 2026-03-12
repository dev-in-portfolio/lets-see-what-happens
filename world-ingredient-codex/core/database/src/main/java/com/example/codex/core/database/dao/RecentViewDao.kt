package com.example.codex.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.codex.core.database.entity.RecentViewEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface RecentViewDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: RecentViewEntity)

    @Query("SELECT * FROM recent_views ORDER BY viewedAtEpochMs DESC LIMIT :limit")
    fun observeRecent(limit: Int = 20): Flow<List<RecentViewEntity>>
}
