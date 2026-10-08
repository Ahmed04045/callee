package com.example.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.data.model.ClubEntity
import com.example.data.model.NewsItemEntity
import com.example.data.model.NewsSourceType
import com.example.ui.components.ClubCard
import com.example.ui.components.NewsCard
import com.example.ui.theme.FalconTeal
import com.example.ui.theme.QatarMaroon
import com.example.ui.viewmodel.NewsFilter
import com.example.ui.viewmodel.VlsonneUiState

@Composable
fun HomeScreen(
    uiState: VlsonneUiState,
    onClubClick: (ClubEntity) -> Unit,
    onNavigateToGroups: () -> Unit,
    onOpenAuth: () -> Unit,
    onSetNewsFilter: (NewsFilter) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedNewsForDetail by remember { mutableStateOf<NewsItemEntity?>(null) }

    val filteredNews = remember(uiState.allNews, uiState.newsFilter, uiState.joinedClubIds) {
        when (uiState.newsFilter) {
            NewsFilter.ALL -> uiState.allNews
            NewsFilter.UNIVERSITY -> uiState.allNews.filter { it.sourceType == NewsSourceType.UNIVERSITY }
            NewsFilter.DEVELOPER -> uiState.allNews.filter { it.sourceType == NewsSourceType.DEVELOPER }
            NewsFilter.JOINED_CLUBS -> uiState.allNews.filter {
                it.associatedClubId != null && uiState.joinedClubIds.contains(it.associatedClubId)
            }
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("home_screen_lazy_column"),
        contentPadding = PaddingValues(bottom = 96.dp)
    ) {
        // Hero Header Banner
        item {
            HeroHeader(
                uiState = uiState,
                onOpenAuth = onOpenAuth,
                onNavigateToGroups = onNavigateToGroups
            )
        }

        // Signed-in User: Prominent "My Joined Clubs" Section
        if (uiState.currentUser != null) {
            item {
                Column(modifier = Modifier.padding(top = 20.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "My Joined Clubs",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onBackground
                            )
                            Text(
                                text = "${uiState.joinedClubs.size} of 5 slots used",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        TextButton(
                            onClick = onNavigateToGroups,
                            modifier = Modifier.testTag("explore_all_clubs_button")
                        ) {
                            Text("Explore All (${uiState.allClubs.size})")
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    if (uiState.joinedClubs.isEmpty()) {
                        // Empty joined state with guidance
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .testTag("no_joined_clubs_card")
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Groups,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "No Clubs Joined Yet",
                                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                                    )
                                    Text(
                                        text = "You can join up to 5 UDST clubs to unlock private community WhatsApp & Discord links.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                Spacer(modifier = Modifier.width(8.dp))

                                Button(
                                    onClick = onNavigateToGroups,
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                    modifier = Modifier.testTag("browse_clubs_btn_empty")
                                ) {
                                    Text("Browse", fontSize = 12.sp)
                                }
                            }
                        }
                    } else {
                        // Horizontal carousel of joined clubs with unlocked channels
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(uiState.joinedClubs, key = { it.id }) { club ->
                                JoinedClubQuickCard(
                                    club = club,
                                    onClick = { onClubClick(club) }
                                )
                            }
                        }
                    }
                }
            }

            // Updates from Joined Clubs (if any)
            if (uiState.joinedClubNews.isNotEmpty()) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 16.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Campaign,
                                contentDescription = null,
                                tint = FalconTeal,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Updates From Your Clubs",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onBackground
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            uiState.joinedClubNews.take(3).forEach { news ->
                                NewsCard(
                                    news = news,
                                    onClick = { selectedNewsForDetail = news }
                                )
                            }
                        }
                    }
                }
            }
        }

        // News & Announcements Section
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Campus News & Updates",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = "Official UDST announcements & Circosodal notices",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // News Filter Chips
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    item {
                        FilterChip(
                            selected = uiState.newsFilter == NewsFilter.ALL,
                            onClick = { onSetNewsFilter(NewsFilter.ALL) },
                            label = { Text("All (${uiState.allNews.size})") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = uiState.newsFilter == NewsFilter.UNIVERSITY,
                            onClick = { onSetNewsFilter(NewsFilter.UNIVERSITY) },
                            label = { Text("UDST Official") },
                            leadingIcon = {
                                Icon(Icons.Default.School, contentDescription = null, modifier = Modifier.size(14.dp))
                            }
                        )
                    }
                    item {
                        FilterChip(
                            selected = uiState.newsFilter == NewsFilter.DEVELOPER,
                            onClick = { onSetNewsFilter(NewsFilter.DEVELOPER) },
                            label = { Text("Developer Updates") },
                            leadingIcon = {
                                Icon(Icons.Default.Code, contentDescription = null, modifier = Modifier.size(14.dp))
                            }
                        )
                    }
                    if (uiState.currentUser != null && uiState.joinedClubs.isNotEmpty()) {
                        item {
                            FilterChip(
                                selected = uiState.newsFilter == NewsFilter.JOINED_CLUBS,
                                onClick = { onSetNewsFilter(NewsFilter.JOINED_CLUBS) },
                                label = { Text("My Clubs (${uiState.joinedClubNews.size})") }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    filteredNews.forEach { newsItem ->
                        NewsCard(
                            news = newsItem,
                            onClick = { selectedNewsForDetail = newsItem }
                        )
                    }
                }
            }
        }

        // Featured Clubs at UDST
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Featured UDST Clubs",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = "Discover 33 student communities",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    TextButton(onClick = onNavigateToGroups) {
                        Text("View All 33")
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Display first 4 featured clubs
                val featuredClubs = uiState.allClubs.take(4)
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    featuredClubs.forEach { club ->
                        ClubCard(
                            club = club,
                            isMember = uiState.joinedClubIds.contains(club.id),
                            onClick = { onClubClick(club) }
                        )
                    }
                }
            }
        }
    }

    // News Detail Dialog
    selectedNewsForDetail?.let { news ->
        AlertDialog(
            onDismissRequest = { selectedNewsForDetail = null },
            title = {
                Text(
                    text = news.title,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
            },
            text = {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = when (news.sourceType) {
                                NewsSourceType.UNIVERSITY -> QatarMaroon.copy(alpha = 0.15f)
                                NewsSourceType.DEVELOPER -> FalconTeal.copy(alpha = 0.15f)
                                NewsSourceType.CLUB -> MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                            }
                        ) {
                            Text(
                                text = news.sourceName,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold)
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = news.date, style = MaterialTheme.typography.labelSmall)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(text = news.content, style = MaterialTheme.typography.bodyMedium)
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedNewsForDetail = null }) {
                    Text("Close")
                }
            }
        )
    }
}

@Composable
private fun HeroHeader(
    uiState: VlsonneUiState,
    onOpenAuth: () -> Unit,
    onNavigateToGroups: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .testTag("hero_header_card")
    ) {
        Column {
            // Campus Banner Image
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(170.dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.udst_campus_hero),
                    contentDescription = "UDST Campus",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            brush = Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.2f),
                                    Color.Black.copy(alpha = 0.75f)
                                )
                            )
                        )
                )

                // University Badge on Hero
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.Black.copy(alpha = 0.5f),
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(14.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.School,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "UDST Campus Portal",
                            color = Color.White,
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold)
                        )
                    }
                }

                // Text overlay at bottom of banner
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(16.dp)
                ) {
                    Text(
                        text = if (uiState.currentUser != null) {
                            "Welcome, ${uiState.currentUser.name}!"
                        } else {
                            "Discover Your Community"
                        },
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )
                    Text(
                        text = "University of Doha for Science & Technology",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = Color.White.copy(alpha = 0.85f)
                        )
                    )
                }
            }

            // Info & Quick Action Footer
            Column(modifier = Modifier.padding(16.dp)) {
                if (uiState.currentUser != null) {
                    // Joined slots indicator
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Club Memberships",
                            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                        )
                        Text(
                            text = "${uiState.joinedClubs.size} / 5 Clubs",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = if (uiState.joinedClubs.size >= 5) QatarMaroon else FalconTeal
                            )
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    LinearProgressIndicator(
                        progress = { uiState.joinedClubs.size / 5f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = if (uiState.joinedClubs.size >= 5) QatarMaroon else FalconTeal,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = onNavigateToGroups,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Explore, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Browse Clubs")
                        }
                    }
                } else {
                    // Visitor guidance
                    Text(
                        text = "Browse 33 student clubs, campus news, and community updates openly without an account. Sign in when you are ready to join and unlock private group chats.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = onOpenAuth,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .weight(1f)
                                .testTag("hero_signin_button")
                        ) {
                            Text("Sign In / Join")
                        }

                        OutlinedButton(
                            onClick = onNavigateToGroups,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .weight(1f)
                                .testTag("hero_browse_clubs_button")
                        ) {
                            Text("Browse Clubs")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun JoinedClubQuickCard(
    club: ClubEntity,
    onClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .width(200.dp)
            .clickable { onClick() }
            .testTag("joined_club_card_${club.id}")
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    .background(
                        brush = Brush.horizontalGradient(
                            colors = listOf(
                                Color(club.bannerGradientStart),
                                Color(club.bannerGradientEnd)
                            )
                        )
                    )
                    .padding(8.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.Black.copy(alpha = 0.4f),
                    modifier = Modifier.align(Alignment.TopEnd)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(11.dp)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = "Joined",
                            color = Color.White,
                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp)
                        )
                    }
                }
            }

            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = club.name,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                    maxLines = 1
                )
                Text(
                    text = club.category,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Open Chats",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = FalconTeal
                        )
                    )
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        tint = FalconTeal,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
        }
    }
}
