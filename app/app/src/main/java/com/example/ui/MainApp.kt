package com.example.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Diversity3
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Diversity3
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import com.example.ui.components.TopBar
import com.example.ui.screens.AccountScreen
import com.example.ui.screens.AdminScreen
import com.example.ui.screens.AppearanceDialog
import com.example.ui.screens.AuthDialog
import com.example.ui.screens.GroupDetailScreen
import com.example.ui.screens.GroupsScreen
import com.example.ui.screens.HomeScreen
import com.example.ui.screens.ModeratorScreen
import com.example.ui.screens.SettingsDialog
import com.example.ui.viewmodel.AuthMode
import com.example.ui.viewmodel.VlsonneViewModel

enum class ScreenTab {
    HOME,
    GROUPS,
    ACCOUNT
}

@Composable
fun MainApp(
    viewModel: VlsonneViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    var currentTab by remember { mutableStateOf(ScreenTab.HOME) }
    val snackbarHostState = remember { SnackbarHostState() }

    // Handle snackbar messages from ViewModel
    LaunchedEffect(uiState.snackbarMessage) {
        uiState.snackbarMessage?.let { msg ->
            snackbarHostState.showSnackbar(
                message = msg,
                duration = SnackbarDuration.Short
            )
            viewModel.clearSnackbar()
        }
    }

    // Hardware/gesture Back button handling
    BackHandler(enabled = uiState.showAdminScreen) {
        viewModel.openAdminScreen(false)
    }

    BackHandler(enabled = uiState.showModeratorScreen && !uiState.showAdminScreen) {
        viewModel.openModeratorScreen(false)
    }

    BackHandler(enabled = uiState.selectedClub != null && !uiState.showAdminScreen && !uiState.showModeratorScreen) {
        viewModel.selectClub(null)
    }

    // Check if showing dedicated fullscreen views (Admin / Moderator)
    if (uiState.showAdminScreen) {
        AdminScreen(
            currentUser = uiState.currentUser,
            allClubs = uiState.allClubs,
            allUsers = uiState.allUsers,
            allModerators = uiState.allModerators,
            allAuditLogs = uiState.allAuditLogs,
            supabaseStatus = uiState.supabaseStatus,
            isCheckingSupabase = uiState.isCheckingSupabase,
            onBack = { viewModel.openAdminScreen(false) },
            onAssignModerator = { clubId, userId -> viewModel.assignModerator(clubId, userId) },
            onRemoveModerator = { clubId, userId -> viewModel.removeModerator(clubId, userId) },
            onCheckSupabase = { viewModel.checkSupabaseConnection() }
        )
        return
    }

    if (uiState.showModeratorScreen) {
        ModeratorScreen(
            currentUser = uiState.currentUser,
            moderatedClubIds = uiState.moderatedClubIds,
            allClubs = uiState.allClubs,
            selectedClubId = uiState.selectedModeratorClubId,
            members = uiState.currentClubMembers,
            logs = uiState.currentClubLogs,
            onSelectClub = { viewModel.selectModeratorClub(it) },
            onRemoveMember = { clubId, userId -> viewModel.removeMember(clubId, userId) },
            onBack = { viewModel.openModeratorScreen(false) }
        )
        return
    }

    Scaffold(
        topBar = {
            if (uiState.selectedClub == null) {
                TopBar(
                    currentUser = uiState.currentUser,
                    joinedClubsCount = uiState.joinedClubs.size,
                    moderatedClubsCount = uiState.moderatedClubIds.size,
                    showProfileMenu = uiState.showProfileMenu,
                    onToggleProfileMenu = { viewModel.toggleProfileMenu(it) },
                    onOpenAuth = { viewModel.openAuth(AuthMode.SIGN_IN) },
                    onNavigateToAccount = { currentTab = ScreenTab.ACCOUNT },
                    onNavigateToGroups = { currentTab = ScreenTab.GROUPS },
                    onOpenSettings = { viewModel.toggleSettingsModal(true) },
                    onOpenAppearance = { viewModel.toggleAppearanceModal(true) },
                    onOpenAdmin = { viewModel.openAdminScreen(true) },
                    onOpenModerator = { viewModel.openModeratorScreen(true) },
                    onSignOut = { viewModel.signOut() }
                )
            }
        },
        bottomBar = {
            if (uiState.selectedClub == null) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    modifier = Modifier.testTag("main_navigation_bar")
                ) {
                    NavigationBarItem(
                        selected = currentTab == ScreenTab.HOME,
                        onClick = { currentTab = ScreenTab.HOME },
                        icon = {
                            Icon(
                                imageVector = if (currentTab == ScreenTab.HOME) Icons.Filled.Home else Icons.Outlined.Home,
                                contentDescription = "Home"
                            )
                        },
                        label = { Text("Home") },
                        modifier = Modifier.testTag("nav_home_tab")
                    )

                    NavigationBarItem(
                        selected = currentTab == ScreenTab.GROUPS,
                        onClick = { currentTab = ScreenTab.GROUPS },
                        icon = {
                            Icon(
                                imageVector = if (currentTab == ScreenTab.GROUPS) Icons.Filled.Diversity3 else Icons.Outlined.Diversity3,
                                contentDescription = "Groups"
                            )
                        },
                        label = { Text("Groups") },
                        modifier = Modifier.testTag("nav_groups_tab")
                    )

                    NavigationBarItem(
                        selected = currentTab == ScreenTab.ACCOUNT,
                        onClick = {
                            if (uiState.currentUser == null) {
                                viewModel.openAuth(AuthMode.SIGN_IN)
                            }
                            currentTab = ScreenTab.ACCOUNT
                        },
                        icon = {
                            Icon(
                                imageVector = if (currentTab == ScreenTab.ACCOUNT) Icons.Filled.Person else Icons.Outlined.Person,
                                contentDescription = "Account"
                            )
                        },
                        label = { Text("Account") },
                        modifier = Modifier.testTag("nav_account_tab")
                    )
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        modifier = modifier.fillMaxSize()
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            val selectedClub = uiState.selectedClub

            if (selectedClub != null) {
                // Individual Club Details Page
                val isMember = uiState.joinedClubIds.contains(selectedClub.id)
                val clubNews = uiState.allNews.filter { it.associatedClubId == selectedClub.id }

                GroupDetailScreen(
                    club = selectedClub,
                    isMember = isMember,
                    isSignedIn = uiState.currentUser != null,
                    joinedCount = uiState.joinedClubs.size,
                    clubNews = clubNews,
                    onBack = { viewModel.selectClub(null) },
                    onJoinClick = { viewModel.joinClub(selectedClub.id) },
                    onLeaveClick = { viewModel.leaveClub(selectedClub.id) },
                    onSignInClick = {
                        viewModel.openAuth(AuthMode.SIGN_IN, pendingClubId = selectedClub.id)
                    }
                )
            } else {
                when (currentTab) {
                    ScreenTab.HOME -> {
                        HomeScreen(
                            uiState = uiState,
                            onClubClick = { viewModel.selectClub(it) },
                            onNavigateToGroups = { currentTab = ScreenTab.GROUPS },
                            onOpenAuth = { viewModel.openAuth(AuthMode.SIGN_IN) },
                            onSetNewsFilter = { viewModel.setNewsFilter(it) }
                        )
                    }

                    ScreenTab.GROUPS -> {
                        GroupsScreen(
                            uiState = uiState,
                            onClubClick = { viewModel.selectClub(it) },
                            onSearchChange = { viewModel.setSearchQuery(it) },
                            onCategorySelect = { viewModel.setSelectedCategory(it) },
                            onOpenUniversitySelector = { viewModel.toggleSettingsModal(true) }
                        )
                    }

                    ScreenTab.ACCOUNT -> {
                        AccountScreen(
                            currentUser = uiState.currentUser,
                            joinedClubs = uiState.joinedClubs,
                            moderatedClubCount = uiState.moderatedClubIds.size,
                            supabaseStatus = uiState.supabaseStatus,
                            themeTitle = uiState.themeMode.title,
                            onOpenAuth = { viewModel.openAuth(AuthMode.SIGN_IN) },
                            onClubClick = { viewModel.selectClub(it) },
                            onLeaveClub = { viewModel.leaveClub(it) },
                            onUpdateProfile = { name, bio, avatar ->
                                viewModel.updateProfile(name, bio, avatar)
                            },
                            onSignOut = { viewModel.signOut() },
                            onOpenAdmin = { viewModel.openAdminScreen(true) },
                            onOpenModerator = { viewModel.openModeratorScreen(true) },
                            onOpenAppearance = { viewModel.toggleAppearanceModal(true) }
                        )
                    }
                }
            }
        }
    }

    // Appearance Customization Dialog
    if (uiState.showAppearanceModal) {
        AppearanceDialog(
            currentTheme = uiState.themeMode,
            onSelectTheme = { viewModel.setThemeMode(it) },
            onDismiss = { viewModel.toggleAppearanceModal(false) }
        )
    }

    // Auth & Onboarding Modal
    AuthDialog(
        isOpen = uiState.showAuthModal,
        authMode = uiState.authMode,
        universities = viewModel.getUniversities(),
        onClose = { viewModel.closeAuth() },
        onSetAuthMode = { viewModel.setAuthMode(it) },
        onGoogleSignIn = { email, name, avatar, onResult ->
            viewModel.signInWithGoogle(email, name, avatar, onResult)
        },
        onEmailSignIn = { email, password, onResult ->
            viewModel.signIn(email, password, onResult)
        },
        onRegister = { name, email, password, univId, bio, avatar, onResult ->
            viewModel.register(name, email, password, univId, bio, avatar, onResult)
        }
    )

    // Platform Settings Modal (Scalable university preview & preferences)
    SettingsDialog(
        isOpen = uiState.showSettingsModal,
        universities = viewModel.getUniversities(),
        selectedUniversityId = uiState.selectedUniversityId,
        onClose = { viewModel.toggleSettingsModal(false) }
    )
}
