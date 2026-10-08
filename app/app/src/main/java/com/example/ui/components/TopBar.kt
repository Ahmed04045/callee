package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.outlined.Login
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.model.UserEntity
import com.example.ui.theme.FalconTeal
import com.example.ui.theme.QatarMaroon

@Composable
fun TopBar(
    currentUser: UserEntity?,
    joinedClubsCount: Int,
    moderatedClubsCount: Int = 0,
    showProfileMenu: Boolean,
    onToggleProfileMenu: (Boolean) -> Unit,
    onOpenAuth: () -> Unit,
    onNavigateToAccount: () -> Unit,
    onNavigateToGroups: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenAppearance: () -> Unit = {},
    onOpenAdmin: () -> Unit = {},
    onOpenModerator: () -> Unit = {},
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Brand Name & University Tag
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .weight(1f)
                    .clickable { onNavigateToGroups() }
                    .testTag("app_brand_header")
            ) {
                Text(
                    text = "Circosodal",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = (-0.5).sp
                    ),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.width(8.dp))
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                ) {
                    Text(
                        text = "UDST",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            }

            // Quick Appearance Palette Button
            IconButton(
                onClick = onOpenAppearance,
                modifier = Modifier.testTag("topbar_theme_button")
            ) {
                Icon(
                    imageVector = Icons.Default.Palette,
                    contentDescription = "Change appearance theme",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(22.dp)
                )
            }

            // Top-Right User Avatar / Account Button
            Box {
                if (currentUser != null) {
                    BadgedBox(
                        badge = {
                            Badge(
                                containerColor = if (currentUser.isAdmin) MaterialTheme.colorScheme.primary else FalconTeal,
                                contentColor = Color.White
                            ) {
                                Text(if (currentUser.isAdmin) "ADM" else "$joinedClubsCount/5")
                            }
                        }
                    ) {
                        IconButton(
                            onClick = { onToggleProfileMenu(!showProfileMenu) },
                            modifier = Modifier.testTag("profile_avatar_button")
                        ) {
                            if (currentUser.avatarUrl.isNotBlank()) {
                                AsyncImage(
                                    model = currentUser.avatarUrl,
                                    contentDescription = "User profile picture",
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primaryContainer),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = currentUser.name.take(1).uppercase(),
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                }
                            }
                        }
                    }
                } else {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        modifier = Modifier
                            .clickable { onOpenAuth() }
                            .testTag("signin_top_button")
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Outlined.Login,
                                contentDescription = "Sign in",
                                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Sign In",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            )
                        }
                    }
                }

                // Profile dropdown menu
                DropdownMenu(
                    expanded = showProfileMenu,
                    onDismissRequest = { onToggleProfileMenu(false) }
                ) {
                    if (currentUser != null) {
                        Column(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = currentUser.name,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                text = currentUser.email.ifEmpty { "UDST Student" },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        HorizontalDivider()

                        DropdownMenuItem(
                            text = { Text("Profile & Account") },
                            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                            onClick = {
                                onToggleProfileMenu(false)
                                onNavigateToAccount()
                            },
                            modifier = Modifier.testTag("menu_profile_item")
                        )

                        // Admin entry if user is admin
                        if (currentUser.isAdmin) {
                            DropdownMenuItem(
                                text = { Text("Admin Command Center", fontWeight = FontWeight.Bold) },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.AdminPanelSettings,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                },
                                onClick = {
                                    onToggleProfileMenu(false)
                                    onOpenAdmin()
                                },
                                modifier = Modifier.testTag("menu_admin_portal_item")
                            )
                        }

                        // Moderator entry if user is moderator or has moderated clubs
                        if (currentUser.isModerator || moderatedClubsCount > 0 || currentUser.isAdmin) {
                            DropdownMenuItem(
                                text = { Text("Moderator Workspace") },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Shield,
                                        contentDescription = null,
                                        tint = FalconTeal
                                    )
                                },
                                onClick = {
                                    onToggleProfileMenu(false)
                                    onOpenModerator()
                                },
                                modifier = Modifier.testTag("menu_moderator_hub_item")
                            )
                        }

                        DropdownMenuItem(
                            text = { Text("Appearance & Theme") },
                            leadingIcon = { Icon(Icons.Default.Palette, contentDescription = null) },
                            onClick = {
                                onToggleProfileMenu(false)
                                onOpenAppearance()
                            },
                            modifier = Modifier.testTag("menu_appearance_item")
                        )

                        DropdownMenuItem(
                            text = { Text("My Joined Groups ($joinedClubsCount/5)") },
                            leadingIcon = { Icon(Icons.Default.Groups, contentDescription = null) },
                            onClick = {
                                onToggleProfileMenu(false)
                                onNavigateToAccount()
                            },
                            modifier = Modifier.testTag("menu_joined_groups_item")
                        )

                        DropdownMenuItem(
                            text = { Text("Platform Settings") },
                            leadingIcon = { Icon(Icons.Default.Settings, contentDescription = null) },
                            onClick = {
                                onToggleProfileMenu(false)
                                onOpenSettings()
                            },
                            modifier = Modifier.testTag("menu_settings_item")
                        )

                        HorizontalDivider()

                        DropdownMenuItem(
                            text = { Text("Sign Out", color = MaterialTheme.colorScheme.error) },
                            leadingIcon = {
                                Icon(
                                    Icons.AutoMirrored.Filled.ExitToApp,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.error
                                )
                            },
                            onClick = {
                                onToggleProfileMenu(false)
                                onSignOut()
                            },
                            modifier = Modifier.testTag("menu_signout_item")
                        )
                    }
                }
            }
        }
    }
}
