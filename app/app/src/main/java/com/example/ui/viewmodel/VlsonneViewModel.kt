package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.model.AuditLogEntity
import com.example.data.model.ClubEntity
import com.example.data.model.ClubModeratorEntity
import com.example.data.model.NewsItemEntity
import com.example.data.model.University
import com.example.data.model.UserEntity
import com.example.data.remote.SupabaseClient
import com.example.data.remote.SupabaseStatus
import com.example.data.repository.VlsonneRepository
import com.example.ui.theme.AppThemeMode
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class NewsFilter {
    ALL,
    UNIVERSITY,
    DEVELOPER,
    JOINED_CLUBS
}

enum class AuthMode {
    SIGN_IN,
    CREATE_ACCOUNT,
    ONBOARDING_UNIVERSITY,
    ONBOARDING_PROFILE
}

data class VlsonneUiState(
    val currentUser: UserEntity? = null,
    val allClubs: List<ClubEntity> = emptyList(),
    val joinedClubs: List<ClubEntity> = emptyList(),
    val joinedClubIds: Set<String> = emptySet(),
    val allNews: List<NewsItemEntity> = emptyList(),
    val joinedClubNews: List<NewsItemEntity> = emptyList(),
    val selectedUniversityId: String = "udst",
    val selectedCategory: String = "All",
    val searchQuery: String = "",
    val newsFilter: NewsFilter = NewsFilter.ALL,
    val selectedClub: ClubEntity? = null,
    val showAuthModal: Boolean = false,
    val authMode: AuthMode = AuthMode.SIGN_IN,
    val showProfileMenu: Boolean = false,
    val showSettingsModal: Boolean = false,
    val showAppearanceModal: Boolean = false,
    val showAdminScreen: Boolean = false,
    val showModeratorScreen: Boolean = false,
    val snackbarMessage: String? = null,
    val pendingClubToJoinAfterAuth: String? = null,
    // Appearance preference (Defaults to plain white with UDST blue)
    val themeMode: AppThemeMode = AppThemeMode.UDST_BLUE_WHITE,
    // Admin & Moderator specific data
    val allUsers: List<UserEntity> = emptyList(),
    val allModerators: List<ClubModeratorEntity> = emptyList(),
    val allAuditLogs: List<AuditLogEntity> = emptyList(),
    val moderatedClubIds: Set<String> = emptySet(),
    val selectedModeratorClubId: String? = null,
    val currentClubMembers: List<UserEntity> = emptyList(),
    val currentClubLogs: List<AuditLogEntity> = emptyList(),
    val supabaseStatus: SupabaseStatus? = null,
    val isCheckingSupabase: Boolean = false
)

@OptIn(ExperimentalCoroutinesApi::class)
class VlsonneViewModel(
    private val repository: VlsonneRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(VlsonneUiState())
    val uiState: StateFlow<VlsonneUiState> = _uiState.asStateFlow()

    init {
        // 1. Reactively stream current user
        viewModelScope.launch {
            repository.currentUser.collect { user ->
                _uiState.update { state ->
                    state.copy(currentUser = user)
                }
            }
        }

        // 2. Reactively stream all clubs & keep selectedClub / joinedClubs synchronized
        viewModelScope.launch {
            repository.allClubs.collect { clubs ->
                _uiState.update { state ->
                    val updatedSelected = if (state.selectedClub != null) {
                        clubs.find { it.id == state.selectedClub.id } ?: state.selectedClub
                    } else null
                    val updatedJoined = clubs.filter { state.joinedClubIds.contains(it.id) }
                    state.copy(
                        allClubs = clubs,
                        selectedClub = updatedSelected,
                        joinedClubs = updatedJoined
                    )
                }
            }
        }

        // 3. Reactively stream all news
        viewModelScope.launch {
            repository.allNews.collect { news ->
                _uiState.update { it.copy(allNews = news) }
            }
        }

        // 4. Reactively stream memberships using flatMapLatest to avoid locking/stale outer collections
        viewModelScope.launch {
            repository.currentUser
                .flatMapLatest { user ->
                    if (user != null) {
                        repository.getUserJoinedClubIds(user.id)
                    } else {
                        flowOf(emptyList())
                    }
                }
                .collect { joinedIds ->
                    val idSet = joinedIds.toSet()
                    _uiState.update { state ->
                        val joinedList = state.allClubs.filter { idSet.contains(it.id) }
                        val clubNews = state.allNews.filter {
                            it.associatedClubId != null && idSet.contains(it.associatedClubId)
                        }
                        state.copy(
                            joinedClubIds = idSet,
                            joinedClubs = joinedList,
                            joinedClubNews = clubNews
                        )
                    }
                }
        }

        // 5. Reactively stream moderated club IDs for current user
        viewModelScope.launch {
            repository.currentUser
                .flatMapLatest { user ->
                    if (user != null) {
                        repository.getModeratedClubIds(user.id)
                    } else {
                        flowOf(emptyList())
                    }
                }
                .collect { modClubIds ->
                    val set = modClubIds.toSet()
                    _uiState.update { state ->
                        val selectedModClub = state.selectedModeratorClubId
                            ?: set.firstOrNull()
                        state.copy(
                            moderatedClubIds = set,
                            selectedModeratorClubId = selectedModClub
                        )
                    }
                }
        }

        // 6. Reactively stream all users for Admin
        viewModelScope.launch {
            repository.allUsers.collect { users ->
                _uiState.update { it.copy(allUsers = users) }
            }
        }

        // 7. Reactively stream all moderators for Admin
        viewModelScope.launch {
            repository.allModerators.collect { mods ->
                _uiState.update { it.copy(allModerators = mods) }
            }
        }

        // 8. Reactively stream global audit logs for Admin
        viewModelScope.launch {
            repository.allAuditLogs.collect { logs ->
                _uiState.update { it.copy(allAuditLogs = logs) }
            }
        }

        // Perform initial Supabase status check
        checkSupabaseConnection()
    }

    fun getUniversities(): List<University> = repository.getUniversities()

    fun selectClub(club: ClubEntity?) {
        _uiState.update { it.copy(selectedClub = club) }
    }

    fun setSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun setSelectedCategory(category: String) {
        _uiState.update { it.copy(selectedCategory = category) }
    }

    fun setNewsFilter(filter: NewsFilter) {
        _uiState.update { it.copy(newsFilter = filter) }
    }

    fun setThemeMode(mode: AppThemeMode) {
        _uiState.update { it.copy(themeMode = mode) }
    }

    fun toggleProfileMenu(show: Boolean) {
        _uiState.update { it.copy(showProfileMenu = show) }
    }

    fun toggleSettingsModal(show: Boolean) {
        _uiState.update { it.copy(showSettingsModal = show) }
    }

    fun toggleAppearanceModal(show: Boolean) {
        _uiState.update { it.copy(showAppearanceModal = show) }
    }

    fun openAdminScreen(open: Boolean = true) {
        _uiState.update { it.copy(showAdminScreen = open, showModeratorScreen = false) }
    }

    fun openModeratorScreen(open: Boolean = true, clubId: String? = null) {
        _uiState.update {
            it.copy(
                showModeratorScreen = open,
                showAdminScreen = false,
                selectedModeratorClubId = clubId ?: it.selectedModeratorClubId
            )
        }
        val targetClub = clubId ?: _uiState.value.selectedModeratorClubId
        if (targetClub != null) {
            loadModeratorClubData(targetClub)
        }
    }

    fun selectModeratorClub(clubId: String) {
        _uiState.update { it.copy(selectedModeratorClubId = clubId) }
        loadModeratorClubData(clubId)
    }

    private fun loadModeratorClubData(clubId: String) {
        viewModelScope.launch {
            repository.getClubMembers(clubId).collect { members ->
                _uiState.update { it.copy(currentClubMembers = members) }
            }
        }
        viewModelScope.launch {
            repository.getAuditLogsForClub(clubId).collect { logs ->
                _uiState.update { it.copy(currentClubLogs = logs) }
            }
        }
    }

    fun openAuth(mode: AuthMode = AuthMode.SIGN_IN, pendingClubId: String? = null) {
        _uiState.update {
            it.copy(
                showAuthModal = true,
                authMode = mode,
                pendingClubToJoinAfterAuth = pendingClubId,
                showProfileMenu = false
            )
        }
    }

    fun closeAuth() {
        _uiState.update { it.copy(showAuthModal = false, pendingClubToJoinAfterAuth = null) }
    }

    fun setAuthMode(mode: AuthMode) {
        _uiState.update { it.copy(authMode = mode) }
    }

    fun signInWithGoogle(
        email: String,
        name: String,
        avatarUrl: String = "",
        onResult: (Boolean, String?) -> Unit = { _, _ -> }
    ) {
        viewModelScope.launch {
            when (val result = repository.signInWithGoogle(email, name, avatarUrl)) {
                is VlsonneRepository.AuthResult.Success -> {
                    _uiState.update {
                        it.copy(
                            currentUser = result.user,
                            showAuthModal = false,
                            snackbarMessage = "Signed in with Google as ${result.user.name}!"
                        )
                    }
                    handlePendingClubJoin(result.user.id)
                    onResult(true, null)
                }
                is VlsonneRepository.AuthResult.Error -> {
                    onResult(false, result.message)
                }
            }
        }
    }

    fun signIn(
        email: String,
        password: String,
        onResult: (Boolean, String?) -> Unit = { _, _ -> }
    ) {
        viewModelScope.launch {
            when (val result = repository.signInWithPassword(email, password)) {
                is VlsonneRepository.AuthResult.Success -> {
                    _uiState.update {
                        it.copy(
                            currentUser = result.user,
                            showAuthModal = false,
                            snackbarMessage = "Welcome back, ${result.user.name}!"
                        )
                    }
                    handlePendingClubJoin(result.user.id)
                    onResult(true, null)
                }
                is VlsonneRepository.AuthResult.Error -> {
                    onResult(false, result.message)
                }
            }
        }
    }

    fun register(
        name: String,
        email: String,
        password: String,
        universityId: String,
        bio: String,
        avatarUrl: String,
        onResult: (Boolean, String?) -> Unit = { _, _ -> }
    ) {
        viewModelScope.launch {
            when (val result = repository.registerAccount(
                name = name,
                email = email,
                password = password,
                universityId = universityId,
                bio = bio,
                avatarUrl = avatarUrl
            )) {
                is VlsonneRepository.AuthResult.Success -> {
                    _uiState.update {
                        it.copy(
                            currentUser = result.user,
                            showAuthModal = false,
                            snackbarMessage = "Account created! Welcome to Circosodal, ${result.user.name}."
                        )
                    }
                    handlePendingClubJoin(result.user.id)
                    onResult(true, null)
                }
                is VlsonneRepository.AuthResult.Error -> {
                    onResult(false, result.message)
                }
            }
        }
    }

    private fun handlePendingClubJoin(userId: String) {
        val pending = _uiState.value.pendingClubToJoinAfterAuth
        if (pending != null) {
            _uiState.update { it.copy(pendingClubToJoinAfterAuth = null) }
            joinClub(pending)
        }
    }

    fun updateProfile(name: String, bio: String, avatarUrl: String) {
        val user = _uiState.value.currentUser ?: return
        viewModelScope.launch {
            repository.updateProfile(user.id, name, bio, avatarUrl)
            _uiState.update { it.copy(snackbarMessage = "Profile updated successfully!") }
        }
    }

    fun signOut() {
        val user = _uiState.value.currentUser ?: return
        viewModelScope.launch {
            repository.signOut(user.id)
            _uiState.update {
                it.copy(
                    currentUser = null,
                    showProfileMenu = false,
                    showAdminScreen = false,
                    showModeratorScreen = false,
                    snackbarMessage = "Signed out successfully."
                )
            }
        }
    }

    fun joinClub(clubId: String) {
        val user = _uiState.value.currentUser
        if (user == null) {
            openAuth(AuthMode.SIGN_IN, pendingClubId = clubId)
            return
        }

        viewModelScope.launch {
            val result = repository.joinClub(user.id, clubId)
            when (result) {
                VlsonneRepository.JoinResult.Success -> {
                    val club = _uiState.value.allClubs.find { it.id == clubId }
                    val clubName = club?.name ?: "Club"
                    _uiState.update {
                        it.copy(snackbarMessage = "You joined $clubName! WhatsApp & Discord access unlocked.")
                    }
                }
                VlsonneRepository.JoinResult.LimitReached -> {
                    _uiState.update {
                        it.copy(
                            snackbarMessage = "Maximum limit reached! You can belong to at most 5 clubs. Leave a club first."
                        )
                    }
                }
                VlsonneRepository.JoinResult.AlreadyMember -> {
                    _uiState.update {
                        it.copy(snackbarMessage = "You are already a member of this club.")
                    }
                }
                VlsonneRepository.JoinResult.NotAuthenticated -> {
                    openAuth(AuthMode.SIGN_IN, pendingClubId = clubId)
                }
            }
        }
    }

    fun leaveClub(clubId: String) {
        val user = _uiState.value.currentUser ?: return
        viewModelScope.launch {
            val success = repository.leaveClub(user.id, clubId)
            val club = _uiState.value.allClubs.find { it.id == clubId }
            val clubName = club?.name ?: "Club"
            if (success) {
                _uiState.update {
                    it.copy(snackbarMessage = "You left $clubName. Private resources locked.")
                }
            }
        }
    }

    // --- Moderator Member Removal ---
    fun removeMember(clubId: String, targetUserId: String) {
        val currentUser = _uiState.value.currentUser ?: return
        viewModelScope.launch {
            val success = repository.removeMemberByModerator(clubId, targetUserId, currentUser)
            if (success) {
                _uiState.update {
                    it.copy(snackbarMessage = "Member successfully removed from group.")
                }
                loadModeratorClubData(clubId)
            }
        }
    }

    // --- Admin Moderator Management ---
    fun assignModerator(clubId: String, userId: String) {
        val user = _uiState.value.currentUser
        if (user == null || !user.isAdmin) {
            _uiState.update { it.copy(snackbarMessage = "Admin privilege required.") }
            return
        }
        viewModelScope.launch {
            val success = repository.assignModerator(clubId, userId)
            if (success) {
                _uiState.update {
                    it.copy(snackbarMessage = "Moderator assigned successfully!")
                }
            }
        }
    }

    fun removeModerator(clubId: String, userId: String) {
        val user = _uiState.value.currentUser
        if (user == null || !user.isAdmin) {
            _uiState.update { it.copy(snackbarMessage = "Admin privilege required.") }
            return
        }
        viewModelScope.launch {
            val success = repository.removeModerator(clubId, userId)
            if (success) {
                _uiState.update {
                    it.copy(snackbarMessage = "Moderator removed successfully.")
                }
            }
        }
    }

    fun checkSupabaseConnection() {
        viewModelScope.launch {
            _uiState.update { it.copy(isCheckingSupabase = true) }
            val status = SupabaseClient.checkConnection()
            _uiState.update { it.copy(supabaseStatus = status, isCheckingSupabase = false) }
        }
    }

    fun clearSnackbar() {
        _uiState.update { it.copy(snackbarMessage = null) }
    }
}

class VlsonneViewModelFactory(
    private val repository: VlsonneRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(VlsonneViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return VlsonneViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
