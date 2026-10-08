package com.example.data.local

import androidx.room.TypeConverter
import com.example.data.model.NewsSourceType

class Converters {
    @TypeConverter
    fun fromNewsSourceType(value: NewsSourceType): String {
        return value.name
    }

    @TypeConverter
    fun toNewsSourceType(value: String): NewsSourceType {
        return try {
            NewsSourceType.valueOf(value)
        } catch (e: Exception) {
            NewsSourceType.UNIVERSITY
        }
    }
}
