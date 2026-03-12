package com.example.codex.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.example.codex.core.database.converter.CodexConverters
import com.example.codex.core.database.dao.BookmarkDao
import com.example.codex.core.database.dao.CodexMetadataDao
import com.example.codex.core.database.dao.HierarchyNodeDao
import com.example.codex.core.database.dao.IngredientEntryDao
import com.example.codex.core.database.dao.MasterCategoryDao
import com.example.codex.core.database.dao.RecentViewDao
import com.example.codex.core.database.dao.SearchDao
import com.example.codex.core.database.entity.BookmarkEntity
import com.example.codex.core.database.entity.CodexAliasEntity
import com.example.codex.core.database.entity.CodexCitationEntity
import com.example.codex.core.database.entity.CodexCrossLinkEntity
import com.example.codex.core.database.entity.CodexTagEntity
import com.example.codex.core.database.entity.HierarchyNodeEntity
import com.example.codex.core.database.entity.IngredientEntryEntity
import com.example.codex.core.database.entity.MasterCategoryEntity
import com.example.codex.core.database.entity.RecentViewEntity

@Database(
    entities = [
        HierarchyNodeEntity::class,
        MasterCategoryEntity::class,
        IngredientEntryEntity::class,
        BookmarkEntity::class,
        RecentViewEntity::class,
        CodexAliasEntity::class,
        CodexTagEntity::class,
        CodexCitationEntity::class,
        CodexCrossLinkEntity::class,
    ],
    version = 2,
    exportSchema = false,
)
@TypeConverters(CodexConverters::class)
abstract class CodexDatabase : RoomDatabase() {
    abstract fun hierarchyNodeDao(): HierarchyNodeDao
    abstract fun masterCategoryDao(): MasterCategoryDao
    abstract fun ingredientEntryDao(): IngredientEntryDao
    abstract fun bookmarkDao(): BookmarkDao
    abstract fun recentViewDao(): RecentViewDao
    abstract fun searchDao(): SearchDao
    abstract fun codexMetadataDao(): CodexMetadataDao

    companion object {
        fun build(context: Context): CodexDatabase =
            Room.databaseBuilder(
                context,
                CodexDatabase::class.java,
                "world_ingredient_codex.db",
            ).fallbackToDestructiveMigration()
                .build()
    }
}
