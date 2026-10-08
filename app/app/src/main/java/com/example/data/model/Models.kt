package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class NewsSourceType {
    UNIVERSITY,
    DEVELOPER,
    CLUB
}

data class University(
    val id: String,
    val name: String,
    val shortName: String,
    val location: String,
    val isAvailable: Boolean = true,
    val description: String = ""
)

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val name: String,
    val email: String,
    val password: String = "", // Hashed/stored for email & password authentication
    val avatarUrl: String = "",
    val bio: String = "",
    val universityId: String = "udst",
    val universityName: String = "University of Doha for Science and Technology (UDST)",
    val role: String = "STUDENT", // "STUDENT", "MODERATOR", "ADMIN" (Only set via DB SQL)
    val isLoggedIn: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
) {
    val isAdmin: Boolean get() = role.equals("ADMIN", ignoreCase = true)
    val isModerator: Boolean get() = role.equals("MODERATOR", ignoreCase = true) || isAdmin
}

@Entity(tableName = "memberships", primaryKeys = ["userId", "clubId"])
data class MembershipEntity(
    val userId: String,
    val clubId: String,
    val joinedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "club_moderators", primaryKeys = ["clubId", "userId"])
data class ClubModeratorEntity(
    val clubId: String,
    val userId: String,
    val userEmail: String,
    val userName: String,
    val assignedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "audit_logs")
data class AuditLogEntity(
    @PrimaryKey val id: String,
    val clubId: String,
    val clubName: String,
    val userId: String,
    val userName: String,
    val userEmail: String,
    val action: String, // "JOINED", "LEFT", "REMOVED_BY_MOD"
    val actorId: String? = null,
    val actorName: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val details: String = ""
)

@Entity(tableName = "clubs")
data class ClubEntity(
    @PrimaryKey val id: String,
    val name: String,
    val universityId: String = "udst",
    val universityName: String = "UDST",
    val description: String,
    val memberCount: Int = 0, // Starts at 0, strictly increments when an account joins
    val category: String,
    val bannerGradientStart: Long,
    val bannerGradientEnd: Long,
    val whatsappLink: String,
    val discordLink: String,
    val meetingSchedule: String = "Weekly Meetings & Community Events",
    val roomOrLocation: String = "UDST Student Center"
)

@Entity(tableName = "news_items")
data class NewsItemEntity(
    @PrimaryKey val id: String,
    val title: String,
    val summary: String,
    val content: String,
    val sourceType: NewsSourceType,
    val sourceName: String,
    val associatedClubId: String? = null,
    val associatedClubName: String? = null,
    val date: String,
    val timestamp: Long = System.currentTimeMillis()
)
