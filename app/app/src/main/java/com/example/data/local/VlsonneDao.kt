package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.example.data.model.AuditLogEntity
import com.example.data.model.ClubEntity
import com.example.data.model.ClubModeratorEntity
import com.example.data.model.MembershipEntity
import com.example.data.model.NewsItemEntity
import com.example.data.model.UserEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface VlsonneDao {

    // --- User Queries ---
    @Query("SELECT * FROM users WHERE isLoggedIn = 1 LIMIT 1")
    fun getActiveUser(): Flow<UserEntity?>

    @Query("SELECT * FROM users WHERE id = :userId LIMIT 1")
    fun getUserById(userId: String): Flow<UserEntity?>

    @Query("SELECT * FROM users WHERE id = :userId LIMIT 1")
    suspend fun getUserByIdDirect(userId: String): UserEntity?

    @Query("SELECT * FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1")
    suspend fun getUserByEmailDirect(email: String): UserEntity?

    @Query("SELECT * FROM users WHERE LOWER(email) = LOWER(:email) AND password = :password LIMIT 1")
    suspend fun getUserByEmailAndPassword(email: String, password: String): UserEntity?

    @Query("SELECT * FROM users ORDER BY name ASC")
    fun getAllUsers(): Flow<List<UserEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)

    @Query("UPDATE users SET isLoggedIn = 0")
    suspend fun setAllLoggedOut()

    @Query("UPDATE users SET isLoggedIn = 1 WHERE id = :userId")
    suspend fun setLoggedIn(userId: String)

    @Query("UPDATE users SET isLoggedIn = 0 WHERE id = :userId")
    suspend fun setLoggedOut(userId: String)

    @Query("UPDATE users SET role = :role WHERE id = :userId")
    suspend fun updateUserRole(userId: String, role: String)

    @Query("DELETE FROM users WHERE LOWER(email) IN (:emails)")
    suspend fun deleteUsersByEmails(emails: List<String>)

    @Query("UPDATE users SET name = :name, bio = :bio, avatarUrl = :avatarUrl WHERE id = :userId")
    suspend fun updateUserProfile(userId: String, name: String, bio: String, avatarUrl: String)

    @Query("DELETE FROM users WHERE id = :userId")
    suspend fun deleteUser(userId: String)

    @Query("DELETE FROM users")
    suspend fun clearAllUsers()

    @Query("DELETE FROM memberships")
    suspend fun clearAllMemberships()

    @Query("DELETE FROM club_moderators")
    suspend fun clearAllModerators()

    @Query("DELETE FROM audit_logs")
    suspend fun clearAllAuditLogs()

    @Query("UPDATE clubs SET memberCount = 0")
    suspend fun resetAllClubMemberCounts()

    // --- Membership Queries ---
    @Query("SELECT * FROM memberships WHERE userId = :userId ORDER BY joinedAt DESC")
    fun getUserMemberships(userId: String): Flow<List<MembershipEntity>>

    @Query("SELECT clubId FROM memberships WHERE userId = :userId")
    fun getJoinedClubIds(userId: String): Flow<List<String>>

    @Query("SELECT COUNT(*) FROM memberships WHERE userId = :userId")
    fun getMembershipCount(userId: String): Flow<Int>

    @Query("SELECT COUNT(*) FROM memberships WHERE userId = :userId")
    suspend fun getDirectMembershipCount(userId: String): Int

    @Query("SELECT COUNT(*) > 0 FROM memberships WHERE userId = :userId AND clubId = :clubId")
    suspend fun isDirectMember(userId: String, clubId: String): Boolean

    @Query("SELECT EXISTS(SELECT 1 FROM memberships WHERE userId = :userId AND clubId = :clubId)")
    fun isMember(userId: String, clubId: String): Flow<Boolean>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMembership(membership: MembershipEntity)

    @Query("DELETE FROM memberships WHERE userId = :userId AND clubId = :clubId")
    suspend fun deleteMembership(userId: String, clubId: String): Int

    @Query("DELETE FROM memberships WHERE userId = :userId")
    suspend fun clearUserMemberships(userId: String)

    @Query("SELECT * FROM users WHERE id IN (SELECT userId FROM memberships WHERE clubId = :clubId) ORDER BY name ASC")
    fun getClubMembers(clubId: String): Flow<List<UserEntity>>

    // --- Club Queries ---
    @Query("SELECT * FROM clubs ORDER BY name ASC")
    fun getAllClubs(): Flow<List<ClubEntity>>

    @Query("SELECT * FROM clubs WHERE id = :clubId LIMIT 1")
    fun getClubById(clubId: String): Flow<ClubEntity?>

    @Query("SELECT * FROM clubs WHERE id = :clubId LIMIT 1")
    suspend fun getClubByIdDirect(clubId: String): ClubEntity?

    @Query("SELECT * FROM clubs WHERE id IN (:clubIds) ORDER BY name ASC")
    fun getClubsByIds(clubIds: List<String>): Flow<List<ClubEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClubs(clubs: List<ClubEntity>)

    @Query("UPDATE clubs SET memberCount = memberCount + 1 WHERE id = :clubId")
    suspend fun incrementMemberCount(clubId: String)

    @Query("UPDATE clubs SET memberCount = CASE WHEN memberCount > 0 THEN memberCount - 1 ELSE 0 END WHERE id = :clubId")
    suspend fun decrementMemberCount(clubId: String)

    @Query("UPDATE clubs SET memberCount = (SELECT COUNT(*) FROM memberships WHERE memberships.clubId = clubs.id)")
    suspend fun syncAllMemberCounts()

    // --- Moderator Queries ---
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertModerator(moderator: ClubModeratorEntity)

    @Query("DELETE FROM club_moderators WHERE clubId = :clubId AND userId = :userId")
    suspend fun deleteModerator(clubId: String, userId: String): Int

    @Query("SELECT * FROM club_moderators WHERE clubId = :clubId ORDER BY assignedAt DESC")
    fun getClubModerators(clubId: String): Flow<List<ClubModeratorEntity>>

    @Query("SELECT * FROM club_moderators ORDER BY assignedAt DESC")
    fun getAllModerators(): Flow<List<ClubModeratorEntity>>

    @Query("SELECT clubId FROM club_moderators WHERE userId = :userId")
    fun getModeratedClubIds(userId: String): Flow<List<String>>

    @Query("SELECT COUNT(*) > 0 FROM club_moderators WHERE clubId = :clubId AND userId = :userId")
    suspend fun isUserClubModerator(clubId: String, userId: String): Boolean

    @Query("SELECT COUNT(*) FROM club_moderators WHERE userId = :userId")
    suspend fun countModeratedClubs(userId: String): Int

    // --- Audit Log Queries ---
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAuditLog(log: AuditLogEntity)

    @Query("SELECT * FROM audit_logs WHERE clubId = :clubId ORDER BY timestamp DESC")
    fun getAuditLogsForClub(clubId: String): Flow<List<AuditLogEntity>>

    @Query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 250")
    fun getAllAuditLogs(): Flow<List<AuditLogEntity>>

    // --- News Queries ---
    @Query("SELECT * FROM news_items ORDER BY timestamp DESC")
    fun getAllNews(): Flow<List<NewsItemEntity>>

    @Query("SELECT * FROM news_items WHERE associatedClubId IN (:clubIds) ORDER BY timestamp DESC")
    fun getNewsForClubs(clubIds: List<String>): Flow<List<NewsItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNews(news: List<NewsItemEntity>)
}
