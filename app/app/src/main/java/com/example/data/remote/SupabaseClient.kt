package com.example.data.remote

import android.util.Log
import com.example.BuildConfig
import com.example.data.model.ClubEntity
import com.example.data.model.UserEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object SupabaseClient {
    private const val TAG = "SupabaseClient"

    val supabaseUrl: String
        get() = try {
            BuildConfig.SUPABASE_URL.trim().removeSuffix("/")
        } catch (e: Exception) {
            "https://your-project-id.supabase.co"
        }

    val supabaseAnonKey: String
        get() = try {
            BuildConfig.SUPABASE_ANON_KEY.trim()
        } catch (e: Exception) {
            "your-supabase-anon-key"
        }

    val isConfigured: Boolean
        get() = supabaseUrl.isNotBlank() &&
                !supabaseUrl.contains("your-project-id") &&
                supabaseAnonKey.isNotBlank() &&
                !supabaseAnonKey.contains("your-supabase-anon-key")

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    suspend fun checkConnection(): SupabaseStatus = withContext(Dispatchers.IO) {
        if (!isConfigured) {
            return@withContext SupabaseStatus(
                isConnected = false,
                message = "Supabase keys not yet configured in .env or Secrets panel. Using local Room database.",
                url = supabaseUrl
            )
        }

        try {
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/clubs?select=id&limit=1")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .get()
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (response.isSuccessful || response.code == 200 || response.code == 206) {
                    SupabaseStatus(
                        isConnected = true,
                        message = "Connected successfully to Supabase cloud database!",
                        url = supabaseUrl
                    )
                } else {
                    SupabaseStatus(
                        isConnected = false,
                        message = "Supabase responded with code ${response.code}: ${response.message}",
                        url = supabaseUrl
                    )
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Connection check failed", e)
            SupabaseStatus(
                isConnected = false,
                message = "Connection error: ${e.localizedMessage ?: "Unknown network issue"}",
                url = supabaseUrl
            )
        }
    }

    /**
     * Upserts a user into the Supabase public.users table.
     * If the user already exists, it checks if an elevated role (e.g. ADMIN) has been granted via SQL.
     * Returns the remote role or null if sync wasn't possible.
     */
    suspend fun syncUser(user: UserEntity): String? = withContext(Dispatchers.IO) {
        if (!isConfigured) return@withContext null

        try {
            // First check if user exists remotely to preserve any SQL-assigned role
            val existingRole = fetchUserRole(user.email)

            val jsonBody = JSONObject().apply {
                put("id", user.id)
                put("email", user.email)
                put("name", user.name)
                put("avatar_url", user.avatarUrl)
                put("bio", user.bio)
                put("university_id", user.universityId)
                put("university_name", user.universityName)
                // If the remote table has already elevated this user to ADMIN or MODERATOR via SQL, preserve it!
                put("role", existingRole ?: user.role)
                put("created_at", user.createdAt)
            }

            val mediaType = "application/json; charset=utf-8".toMediaType()
            val body = jsonBody.toString().toRequestBody(mediaType)

            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/users")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .header("Content-Type", "application/json")
                .header("Prefer", "resolution=merge-duplicates,return=representation")
                .post(body)
                .build()

            httpClient.newCall(request).execute().use { response ->
                val responseStr = response.body?.string().orEmpty()
                Log.d(TAG, "syncUser response: code=${response.code} body=$responseStr")
                if (response.isSuccessful) {
                    try {
                        val arr = JSONArray(responseStr)
                        if (arr.length() > 0) {
                            val obj = arr.getJSONObject(0)
                            return@withContext obj.optString("role", existingRole ?: user.role)
                        }
                    } catch (_: Exception) {
                    }
                    return@withContext existingRole ?: user.role
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to sync user to Supabase", e)
        }
        null
    }

    /**
     * Queries Supabase to fetch any SQL-designated role for this user's email.
     */
    suspend fun fetchUserRole(email: String): String? = withContext(Dispatchers.IO) {
        if (!isConfigured || email.isBlank()) return@withContext null

        try {
            val encodedEmail = java.net.URLEncoder.encode(email.trim().lowercase(), "UTF-8")
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/users?email=eq.$encodedEmail&select=role&limit=1")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .get()
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val bodyStr = response.body?.string().orEmpty()
                    val arr = JSONArray(bodyStr)
                    if (arr.length() > 0) {
                        val role = arr.getJSONObject(0).optString("role")
                        if (role.isNotBlank()) return@withContext role
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to fetch user role from Supabase", e)
        }
        null
    }

    /**
     * Updates an existing user's profile (name, bio, avatarUrl) in Supabase public.users.
     */
    suspend fun updateUserProfile(userId: String, name: String, bio: String, avatarUrl: String): Boolean = withContext(Dispatchers.IO) {
        if (!isConfigured || userId.isBlank()) return@withContext false

        try {
            val jsonBody = JSONObject().apply {
                put("name", name.trim())
                put("bio", bio.trim())
                put("avatar_url", avatarUrl)
            }

            val mediaType = "application/json; charset=utf-8".toMediaType()
            val body = jsonBody.toString().toRequestBody(mediaType)

            val encodedId = java.net.URLEncoder.encode(userId, "UTF-8")
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/users?id=eq.$encodedId")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .header("Content-Type", "application/json")
                .header("Prefer", "return=minimal")
                .patch(body)
                .build()

            httpClient.newCall(request).execute().use { response ->
                Log.d(TAG, "updateUserProfile response: code=${response.code}")
                return@withContext response.isSuccessful
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to update profile in Supabase", e)
        }
        false
    }

    /**
     * Upserts clubs into the Supabase public.clubs table.
     */
    suspend fun syncClubs(clubs: List<ClubEntity>): Boolean = withContext(Dispatchers.IO) {
        if (!isConfigured || clubs.isEmpty()) return@withContext false

        try {
            val jsonArray = JSONArray()
            for (club in clubs) {
                val obj = JSONObject().apply {
                    put("id", club.id)
                    put("name", club.name)
                    put("university_id", club.universityId)
                    put("university_name", club.universityName)
                    put("description", club.description)
                    put("member_count", club.memberCount)
                    put("category", club.category)
                    put("banner_gradient_start", club.bannerGradientStart)
                    put("banner_gradient_end", club.bannerGradientEnd)
                    put("whatsapp_link", club.whatsappLink)
                    put("discord_link", club.discordLink)
                    put("meeting_schedule", club.meetingSchedule)
                    put("room_or_location", club.roomOrLocation)
                }
                jsonArray.put(obj)
            }

            val mediaType = "application/json; charset=utf-8".toMediaType()
            val body = jsonArray.toString().toRequestBody(mediaType)

            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/clubs")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .header("Content-Type", "application/json")
                .header("Prefer", "resolution=merge-duplicates,return=minimal")
                .post(body)
                .build()

            httpClient.newCall(request).execute().use { response ->
                Log.d(TAG, "syncClubs response: code=${response.code}")
                return@withContext response.isSuccessful
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to sync clubs to Supabase", e)
        }
        false
    }
}

data class SupabaseStatus(
    val isConnected: Boolean,
    val message: String,
    val url: String
)
