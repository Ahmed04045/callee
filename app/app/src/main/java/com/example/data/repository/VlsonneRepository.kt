package com.example.data.repository

import com.example.data.local.VlsonneDao
import com.example.data.model.AuditLogEntity
import com.example.data.model.ClubEntity
import com.example.data.model.ClubModeratorEntity
import com.example.data.model.MembershipEntity
import com.example.data.model.NewsItemEntity
import com.example.data.model.University
import com.example.data.model.UserEntity
import com.example.data.remote.SupabaseClient
import com.example.util.SecurityUtils
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

class VlsonneRepository(
    private val dao: VlsonneDao,
    private val scope: CoroutineScope
) {
    val maxClubsAllowed = 5

    init {
        // Prepopulate clubs & news if database is fresh
        scope.launch(Dispatchers.IO) {
            val existingClubs = dao.getAllClubs().first()
            val clubsToUse = if (existingClubs.isEmpty()) {
                dao.insertClubs(InitialData.udstClubs)
                InitialData.udstClubs
            } else {
                // Ensure member counts are accurate according to actual memberships
                dao.syncAllMemberCounts()
                existingClubs
            }

            // Sync clubs to Supabase cloud table if configured
            SupabaseClient.syncClubs(clubsToUse)

            val existingNews = dao.getAllNews().first()
            if (existingNews.isEmpty()) {
                dao.insertNews(InitialData.initialNews)
            }

            // Remove any legacy test accounts or hardcoded credentials from older builds
            dao.deleteUsersByEmails(listOf(
                "admin@udst.edu.qa",
                "student@udst.edu.qa",
                "falcon@domain.edu",
                "custom.student@domain.edu",
                "m.ahmed04045@gmail.com"
            ))
        }
    }

    suspend fun removeAllAccounts() = withContext(Dispatchers.IO) {
        dao.clearAllUsers()
        dao.clearAllMemberships()
        dao.clearAllModerators()
        dao.clearAllAuditLogs()
        dao.resetAllClubMemberCounts()
    }

    // --- Active User State ---
    val currentUser: Flow<UserEntity?> = dao.getActiveUser().flowOn(Dispatchers.IO)
    val allUsers: Flow<List<UserEntity>> = dao.getAllUsers().flowOn(Dispatchers.IO)

    fun getUserJoinedClubIds(userId: String): Flow<List<String>> {
        return dao.getJoinedClubIds(userId).flowOn(Dispatchers.IO)
    }

    fun getUserMembershipCount(userId: String): Flow<Int> {
        return dao.getMembershipCount(userId).flowOn(Dispatchers.IO)
    }

    fun isClubMember(userId: String, clubId: String): Flow<Boolean> {
        return dao.isMember(userId, clubId).flowOn(Dispatchers.IO)
    }

    fun getClubMembers(clubId: String): Flow<List<UserEntity>> {
        return dao.getClubMembers(clubId).flowOn(Dispatchers.IO)
    }

    // --- Clubs ---
    val allClubs: Flow<List<ClubEntity>> = dao.getAllClubs().flowOn(Dispatchers.IO)

    fun getClub(clubId: String): Flow<ClubEntity?> {
        return dao.getClubById(clubId).flowOn(Dispatchers.IO)
    }

    fun getClubsForUser(clubIds: List<String>): Flow<List<ClubEntity>> {
        return dao.getClubsByIds(clubIds).flowOn(Dispatchers.IO)
    }

    // --- News ---
    val allNews: Flow<List<NewsItemEntity>> = dao.getAllNews().flowOn(Dispatchers.IO)

    fun getNewsForClubs(clubIds: List<String>): Flow<List<NewsItemEntity>> {
        return dao.getNewsForClubs(clubIds).flowOn(Dispatchers.IO)
    }

    // --- Moderators ---
    val allModerators: Flow<List<ClubModeratorEntity>> = dao.getAllModerators().flowOn(Dispatchers.IO)

    fun getClubModerators(clubId: String): Flow<List<ClubModeratorEntity>> {
        return dao.getClubModerators(clubId).flowOn(Dispatchers.IO)
    }

    fun getModeratedClubIds(userId: String): Flow<List<String>> {
        return dao.getModeratedClubIds(userId).flowOn(Dispatchers.IO)
    }

    // --- Audit Logs ---
    fun getAuditLogsForClub(clubId: String): Flow<List<AuditLogEntity>> {
        return dao.getAuditLogsForClub(clubId).flowOn(Dispatchers.IO)
    }

    val allAuditLogs: Flow<List<AuditLogEntity>> = dao.getAllAuditLogs().flowOn(Dispatchers.IO)

    // --- Authentication Actions ---
    sealed class AuthResult {
        data class Success(val user: UserEntity) : AuthResult()
        data class Error(val message: String) : AuthResult()
    }

    suspend fun registerAccount(
        name: String,
        email: String,
        password: String,
        universityId: String = "udst",
        bio: String = "",
        avatarUrl: String = ""
    ): AuthResult = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        if (cleanEmail.isBlank() || !cleanEmail.contains("@")) {
            return@withContext AuthResult.Error("Please enter a valid email address.")
        }
        if (password.length < 6) {
            return@withContext AuthResult.Error("Password must be at least 6 characters.")
        }
        val existing = dao.getUserByEmailDirect(cleanEmail)
        if (existing != null) {
            return@withContext AuthResult.Error("An account with $cleanEmail already exists. Please sign in instead.")
        }

        val university = InitialData.universities.firstOrNull { it.id == universityId }
            ?: InitialData.universities.first()

        val newUser = UserEntity(
            id = "user_${cleanEmail.replace(Regex("[^a-zA-Z0-9]"), "_").take(16)}_${UUID.randomUUID().toString().take(4)}",
            name = name.trim().ifEmpty { "UDST Student" },
            email = cleanEmail,
            password = SecurityUtils.hashPassword(password),
            avatarUrl = avatarUrl,
            bio = bio.trim(),
            universityId = university.id,
            universityName = university.name,
            role = "STUDENT", // Role is strictly STUDENT by default, only designated via SQL
            isLoggedIn = true
        )

        dao.setAllLoggedOut()
        dao.insertUser(newUser)

        // Sync new user to Supabase cloud database if configured
        val remoteRole = SupabaseClient.syncUser(newUser)
        val finalUser = if (remoteRole != null && remoteRole != newUser.role) {
            val elevated = newUser.copy(role = remoteRole)
            dao.insertUser(elevated)
            elevated
        } else {
            newUser
        }

        AuthResult.Success(finalUser)
    }

    suspend fun signInWithPassword(
        email: String,
        password: String
    ): AuthResult = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        if (cleanEmail.isBlank()) {
            return@withContext AuthResult.Error("Please enter your email.")
        }
        val user = dao.getUserByEmailDirect(cleanEmail)
            ?: return@withContext AuthResult.Error("No account found for $cleanEmail. Please create an account first.")

        if (user.password.isNotBlank() && !SecurityUtils.verifyPassword(password, user.password)) {
            return@withContext AuthResult.Error("Incorrect password. Please try again.")
        }

        dao.setAllLoggedOut()
        dao.setLoggedIn(user.id)
        val updatedUser = user.copy(isLoggedIn = true)

        // Sync with Supabase and check if role was elevated in Postgres SQL
        val remoteRole = SupabaseClient.syncUser(updatedUser)
        val finalUser = if (remoteRole != null && remoteRole != updatedUser.role) {
            val elevated = updatedUser.copy(role = remoteRole)
            dao.insertUser(elevated)
            elevated
        } else {
            updatedUser
        }

        AuthResult.Success(finalUser)
    }

    suspend fun signInWithGoogle(
        email: String,
        name: String,
        avatarUrl: String = ""
    ): AuthResult = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        if (cleanEmail.isBlank() || !cleanEmail.contains("@")) {
            return@withContext AuthResult.Error("Invalid Google account email.")
        }

        val existing = dao.getUserByEmailDirect(cleanEmail)
        val user = if (existing != null) {
            existing.copy(
                name = if (name.isNotBlank()) name.trim() else existing.name,
                avatarUrl = if (avatarUrl.isNotBlank()) avatarUrl else existing.avatarUrl,
                isLoggedIn = true
            )
        } else {
            UserEntity(
                id = "google_${cleanEmail.replace(Regex("[^a-zA-Z0-9]"), "_").take(16)}_${UUID.randomUUID().toString().take(4)}",
                name = name.trim().ifEmpty {
                    cleanEmail.substringBefore("@").replace(".", " ")
                        .split(" ")
                        .joinToString(" ") { it.replaceFirstChar(Char::titlecase) }
                },
                email = cleanEmail,
                password = "",
                avatarUrl = avatarUrl,
                bio = "UDST Student",
                universityId = "udst",
                universityName = "University of Doha for Science and Technology (UDST)",
                role = "STUDENT",
                isLoggedIn = true
            )
        }

        dao.setAllLoggedOut()
        dao.insertUser(user)

        // Immediately upsert user into Supabase public.users and fetch any SQL-designated role
        val remoteRole = SupabaseClient.syncUser(user)
        val finalUser = if (remoteRole != null && remoteRole != user.role) {
            val elevated = user.copy(role = remoteRole)
            dao.insertUser(elevated)
            elevated
        } else {
            user
        }

        AuthResult.Success(finalUser)
    }

    suspend fun updateProfile(userId: String, name: String, bio: String, avatarUrl: String) = withContext(Dispatchers.IO) {
        val currentUser = dao.getUserByIdDirect(userId)
        if (currentUser != null) {
            val finalName = name.trim().ifEmpty { currentUser.name }
            val finalBio = bio.trim()
            val updated = currentUser.copy(
                name = finalName,
                bio = finalBio,
                avatarUrl = avatarUrl
            )
            dao.insertUser(updated)

            // Sync update to Supabase public.users
            SupabaseClient.updateUserProfile(userId, finalName, finalBio, avatarUrl)
        }
    }

    suspend fun signOut(userId: String) = withContext(Dispatchers.IO) {
        dao.setLoggedOut(userId)
    }

    // --- Membership Join / Leave with 5-Club Limit & Audit Logging ---
    sealed class JoinResult {
        object Success : JoinResult()
        object LimitReached : JoinResult()
        object AlreadyMember : JoinResult()
        object NotAuthenticated : JoinResult()
    }

    suspend fun joinClub(userId: String?, clubId: String): JoinResult = withContext(Dispatchers.IO) {
        if (userId.isNullOrBlank()) return@withContext JoinResult.NotAuthenticated
        val user = dao.getUserByIdDirect(userId) ?: return@withContext JoinResult.NotAuthenticated

        val count = dao.getDirectMembershipCount(userId)
        if (count >= maxClubsAllowed) {
            return@withContext JoinResult.LimitReached
        }

        val isAlready = dao.isDirectMember(userId, clubId)
        if (isAlready) {
            return@withContext JoinResult.AlreadyMember
        }

        dao.insertMembership(MembershipEntity(userId = userId, clubId = clubId))
        dao.incrementMemberCount(clubId)

        val club = dao.getClubByIdDirect(clubId)
        val clubName = club?.name ?: clubId

        // Record audit log
        val log = AuditLogEntity(
            id = "log_${UUID.randomUUID().toString().take(12)}",
            clubId = clubId,
            clubName = clubName,
            userId = user.id,
            userName = user.name,
            userEmail = user.email,
            action = "JOINED",
            details = "Joined club via student discovery portal"
        )
        dao.insertAuditLog(log)

        JoinResult.Success
    }

    suspend fun leaveClub(userId: String?, clubId: String): Boolean = withContext(Dispatchers.IO) {
        if (userId.isNullOrBlank()) return@withContext false
        val user = dao.getUserByIdDirect(userId)
        val deletedRows = dao.deleteMembership(userId, clubId)

        if (deletedRows > 0) {
            dao.decrementMemberCount(clubId)
            val club = dao.getClubByIdDirect(clubId)
            val clubName = club?.name ?: clubId

            // Record audit log
            val log = AuditLogEntity(
                id = "log_${UUID.randomUUID().toString().take(12)}",
                clubId = clubId,
                clubName = clubName,
                userId = user?.id ?: userId,
                userName = user?.name ?: "Student",
                userEmail = user?.email ?: "",
                action = "LEFT",
                details = "Student voluntarily departed group"
            )
            dao.insertAuditLog(log)
            return@withContext true
        }
        return@withContext false
    }

    // --- Moderator Member Removal ---
    suspend fun removeMemberByModerator(
        clubId: String,
        targetUserId: String,
        moderator: UserEntity
    ): Boolean = withContext(Dispatchers.IO) {
        val targetUser = dao.getUserByIdDirect(targetUserId)
        val deletedRows = dao.deleteMembership(targetUserId, clubId)

        if (deletedRows > 0) {
            dao.decrementMemberCount(clubId)
            val club = dao.getClubByIdDirect(clubId)
            val clubName = club?.name ?: clubId

            // Record audit log with moderator attribution
            val log = AuditLogEntity(
                id = "log_${UUID.randomUUID().toString().take(12)}",
                clubId = clubId,
                clubName = clubName,
                userId = targetUser?.id ?: targetUserId,
                userName = targetUser?.name ?: "Student",
                userEmail = targetUser?.email ?: "",
                action = "REMOVED_BY_MOD",
                actorId = moderator.id,
                actorName = moderator.name,
                details = "Removed from group by Club Moderator (${moderator.name})"
            )
            dao.insertAuditLog(log)
            return@withContext true
        }
        return@withContext false
    }

    // --- Admin Moderator Management ---
    suspend fun assignModerator(clubId: String, userIdentifier: String): Boolean = withContext(Dispatchers.IO) {
        val club = dao.getClubByIdDirect(clubId) ?: return@withContext false
        val cleanIdentifier = userIdentifier.trim()
        var user = dao.getUserByIdDirect(cleanIdentifier)
        if (user == null) {
            user = dao.getUserByEmailDirect(cleanIdentifier.lowercase())
        }

        // If user isn't locally registered yet, create an invited student profile
        if (user == null && cleanIdentifier.contains("@")) {
            val email = cleanIdentifier.lowercase()
            val fallbackName = email.substringBefore("@").replace(".", " ")
                .split(" ")
                .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
            val newUser = UserEntity(
                id = "user_${email.replace(Regex("[^a-zA-Z0-9]"), "_").take(16)}_${UUID.randomUUID().toString().take(4)}",
                name = fallbackName,
                email = email,
                password = "",
                role = "MODERATOR",
                isLoggedIn = false
            )
            dao.insertUser(newUser)
            user = newUser
        }

        if (user == null) return@withContext false

        val modEntity = ClubModeratorEntity(
            clubId = clubId,
            userId = user.id,
            userEmail = user.email,
            userName = user.name
        )
        dao.insertModerator(modEntity)

        // Upgrade user role if not already admin
        if (!user.isAdmin) {
            dao.updateUserRole(user.id, "MODERATOR")
        }

        val log = AuditLogEntity(
            id = "log_${UUID.randomUUID().toString().take(12)}",
            clubId = clubId,
            clubName = club.name,
            userId = user.id,
            userName = user.name,
            userEmail = user.email,
            action = "MOD_ASSIGNED",
            details = "Assigned as Club Moderator by System Admin"
        )
        dao.insertAuditLog(log)
        true
    }

    suspend fun removeModerator(clubId: String, userId: String): Boolean = withContext(Dispatchers.IO) {
        val user = dao.getUserByIdDirect(userId)
        val club = dao.getClubByIdDirect(clubId)
        val deleted = dao.deleteModerator(clubId, userId)

        if (deleted > 0 && user != null) {
            val remainingMods = dao.countModeratedClubs(userId)
            if (remainingMods == 0 && !user.isAdmin) {
                dao.updateUserRole(userId, "STUDENT")
            }

            val log = AuditLogEntity(
                id = "log_${UUID.randomUUID().toString().take(12)}",
                clubId = clubId,
                clubName = club?.name ?: clubId,
                userId = user.id,
                userName = user.name,
                userEmail = user.email,
                action = "MOD_REMOVED",
                details = "Moderator privileges revoked by System Admin"
            )
            dao.insertAuditLog(log)
            return@withContext true
        }
        return@withContext false
    }

    fun getUniversities(): List<University> = InitialData.universities
}
