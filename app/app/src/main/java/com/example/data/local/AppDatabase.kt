package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.example.data.model.AuditLogEntity
import com.example.data.model.ClubEntity
import com.example.data.model.ClubModeratorEntity
import com.example.data.model.MembershipEntity
import com.example.data.model.NewsItemEntity
import com.example.data.model.UserEntity

@Database(
    entities = [
        UserEntity::class,
        MembershipEntity::class,
        ClubEntity::class,
        NewsItemEntity::class,
        ClubModeratorEntity::class,
        AuditLogEntity::class
    ],
    version = 3,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun vlsonneDao(): VlsonneDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "vlsonne_database"
                ).fallbackToDestructiveMigration(dropAllTables = true).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
