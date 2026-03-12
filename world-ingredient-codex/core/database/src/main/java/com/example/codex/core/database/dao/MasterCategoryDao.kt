package com.example.codex.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.codex.core.database.entity.MasterCategoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MasterCategoryDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(categories: List<MasterCategoryEntity>)

    @Query("SELECT * FROM master_categories WHERE buildUnitCodexId = :buildUnitCodexId ORDER BY categoryIndex")
    fun observeByBuildUnit(buildUnitCodexId: String): Flow<List<MasterCategoryEntity>>

    @Query("SELECT * FROM master_categories WHERE codexId = :codexId LIMIT 1")
    suspend fun getCategory(codexId: String): MasterCategoryEntity?

    @Query("DELETE FROM master_categories")
    suspend fun clearAll()
}
