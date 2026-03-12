package com.example.codex.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.codex.core.database.entity.IngredientEntryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface IngredientEntryDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entries: List<IngredientEntryEntity>)

    @Query("SELECT * FROM ingredient_entries WHERE categoryCodexId = :categoryCodexId ORDER BY displayName")
    fun observeByCategory(categoryCodexId: String): Flow<List<IngredientEntryEntity>>

    @Query("SELECT * FROM ingredient_entries WHERE codexId = :codexId LIMIT 1")
    fun observeById(codexId: String): Flow<IngredientEntryEntity?>

    @Query("DELETE FROM ingredient_entries")
    suspend fun clearAll()
}
