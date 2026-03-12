package com.example.codex.core.database.dao

import androidx.room.Dao
import androidx.room.Query
import com.example.codex.core.database.model.SearchResultProjection
import kotlinx.coroutines.flow.Flow

@Dao
interface SearchDao {
    @Query(
        """
        SELECT codexId, displayName AS title, level AS subtitle, 'HIERARCHY' AS type
        FROM hierarchy_nodes
        WHERE codexId LIKE '%' || :query || '%'
           OR displayName LIKE '%' || :query || '%'
           OR aliases LIKE '%' || :query || '%'
        UNION ALL
        SELECT codexId, displayName AS title, buildUnitCodexId AS subtitle, 'CATEGORY' AS type
        FROM master_categories
        WHERE codexId LIKE '%' || :query || '%'
           OR displayName LIKE '%' || :query || '%'
           OR aliases LIKE '%' || :query || '%'
        UNION ALL
        SELECT codexId, displayName AS title, categoryCodexId AS subtitle, 'INGREDIENT' AS type
        FROM ingredient_entries
        WHERE codexId LIKE '%' || :query || '%'
           OR displayName LIKE '%' || :query || '%'
           OR aliases LIKE '%' || :query || '%'
        ORDER BY title
        """
    )
    fun searchAll(query: String): Flow<List<SearchResultProjection>>
}
