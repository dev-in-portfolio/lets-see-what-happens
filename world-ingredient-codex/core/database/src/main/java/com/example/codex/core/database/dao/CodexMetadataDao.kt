package com.example.codex.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.codex.core.database.entity.CodexAliasEntity
import com.example.codex.core.database.entity.CodexCitationEntity
import com.example.codex.core.database.entity.CodexCrossLinkEntity
import com.example.codex.core.database.entity.CodexTagEntity

@Dao
interface CodexMetadataDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAliases(items: List<CodexAliasEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTags(items: List<CodexTagEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCitations(items: List<CodexCitationEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCrossLinks(items: List<CodexCrossLinkEntity>)

    @Query("DELETE FROM codex_aliases")
    suspend fun clearAliases()

    @Query("DELETE FROM codex_tags")
    suspend fun clearTags()

    @Query("DELETE FROM codex_citations")
    suspend fun clearCitations()

    @Query("DELETE FROM codex_cross_links")
    suspend fun clearCrossLinks()
}
