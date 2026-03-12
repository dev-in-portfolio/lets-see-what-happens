package com.example.codex.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.codex.core.database.entity.BookmarkEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BookmarkDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(bookmarkEntity: BookmarkEntity)

    @Query("DELETE FROM bookmarks WHERE codexId = :codexId")
    suspend fun delete(codexId: String)

    @Query("SELECT * FROM bookmarks ORDER BY displayName")
    fun observeAll(): Flow<List<BookmarkEntity>>

    @Query("SELECT EXISTS(SELECT 1 FROM bookmarks WHERE codexId = :codexId)")
    fun observeIsBookmarked(codexId: String): Flow<Boolean>
}
