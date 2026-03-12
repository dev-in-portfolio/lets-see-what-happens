package com.example.codex.core.database.converter

import androidx.room.TypeConverter
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json

class CodexConverters {
    private val json = Json
    private val listSerializer = ListSerializer(String.serializer())

    @TypeConverter
    fun fromStringList(value: List<String>): String = json.encodeToString(listSerializer, value)

    @TypeConverter
    fun toStringList(value: String): List<String> =
        if (value.isBlank()) emptyList() else json.decodeFromString(listSerializer, value)
}
