package com.example.codex.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.codex.core.database.entity.HierarchyNodeEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface HierarchyNodeDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(nodes: List<HierarchyNodeEntity>)

    @Query("SELECT * FROM hierarchy_nodes WHERE level = 'A' ORDER BY sortOrder, codexId")
    fun observeMacroAreas(): Flow<List<HierarchyNodeEntity>>

    @Query("SELECT * FROM hierarchy_nodes WHERE parentCodexId = :parentCodexId ORDER BY sortOrder, codexId")
    fun observeChildren(parentCodexId: String): Flow<List<HierarchyNodeEntity>>

    @Query("SELECT * FROM hierarchy_nodes WHERE codexId = :codexId LIMIT 1")
    fun observeNode(codexId: String): Flow<HierarchyNodeEntity?>

    @Query("SELECT * FROM hierarchy_nodes WHERE codexId = :codexId LIMIT 1")
    suspend fun getNode(codexId: String): HierarchyNodeEntity?

    @Query("SELECT COUNT(*) FROM hierarchy_nodes")
    suspend fun countNodes(): Int

    @Query("DELETE FROM hierarchy_nodes")
    suspend fun clearAll()
}
