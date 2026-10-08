package com.example.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.graphics.Color

enum class AppThemeMode(val title: String, val subtitle: String) {
    UDST_BLUE_WHITE(
        title = "UDST Blue & White (Default)",
        subtitle = "Crisp plain white background with official UDST royal blue accents"
    ),
    QATAR_MAROON(
        title = "Qatar Maroon & Navy",
        subtitle = "Collegiate Qatar national maroon with rich deep navy contrasts"
    ),
    FALCON_SLATE(
        title = "Falcon Minimalist",
        subtitle = "Neutral slate monochrome with campus teal highlights"
    ),
    DARK_CAMPUS(
        title = "Midnight Campus",
        subtitle = "AMOLED dark background with glowing Falcon neon blue"
    )
}

val LocalAppTheme = compositionLocalOf { AppThemeMode.UDST_BLUE_WHITE }

// Default: Plain White with UDST Blue
private val UdstWhiteBlueColorScheme = lightColorScheme(
    primary = UdstBluePrimary,
    onPrimary = Color.White,
    primaryContainer = UdstBlueContainer,
    onPrimaryContainer = UdstBlueDark,
    secondary = UdstBlueLight,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFD6E4F0),
    onSecondaryContainer = Color(0xFF001A33),
    tertiary = FalconTeal,
    onTertiary = Color.White,
    background = PlainWhiteBackground,
    onBackground = DarkTextHeading,
    surface = PlainWhiteSurface,
    onSurface = DarkTextHeading,
    surfaceVariant = CleanSurfaceVariant,
    onSurfaceVariant = DarkTextBody,
    outline = CleanBorder,
    outlineVariant = Color(0xFFCBD5E1)
)

private val QatarMaroonColorScheme = lightColorScheme(
    primary = QatarMaroon,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFD9E2),
    onPrimaryContainer = Color(0xFF3B0014),
    secondary = UdstBluePrimary,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFDBEAFE),
    onSecondaryContainer = Color(0xFF1E3A8A),
    tertiary = WarmGold,
    background = PlainWhiteBackground,
    onBackground = DarkTextHeading,
    surface = PlainWhiteSurface,
    onSurface = DarkTextHeading,
    surfaceVariant = CleanSurfaceVariant,
    onSurfaceVariant = DarkTextBody,
    outline = CleanBorder
)

private val FalconSlateColorScheme = lightColorScheme(
    primary = Color(0xFF1E293B),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE2E8F0),
    onPrimaryContainer = Color(0xFF0F172A),
    secondary = FalconTeal,
    onSecondary = Color.White,
    tertiary = UdstBlueLight,
    background = PlainWhiteBackground,
    onBackground = DarkTextHeading,
    surface = PlainWhiteSurface,
    onSurface = DarkTextHeading,
    surfaceVariant = CleanSurfaceVariant,
    onSurfaceVariant = DarkTextBody,
    outline = CleanBorder
)

private val DarkCampusColorScheme = darkColorScheme(
    primary = Color(0xFF60A5FA),
    onPrimary = Color(0xFF0F172A),
    primaryContainer = UdstBluePrimary,
    onPrimaryContainer = Color(0xFFDBEAFE),
    secondary = Color(0xFF38BDF8),
    onSecondary = Color(0xFF0C4A6E),
    tertiary = FalconTeal,
    background = DarkBackground,
    onBackground = DarkTextPrimary,
    surface = DarkSurface,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkTextSecondary,
    outline = DarkOutline
)

@Composable
fun MyApplicationTheme(
    themeMode: AppThemeMode = AppThemeMode.UDST_BLUE_WHITE,
    content: @Composable () -> Unit
) {
    val colorScheme: ColorScheme = when (themeMode) {
        AppThemeMode.UDST_BLUE_WHITE -> UdstWhiteBlueColorScheme
        AppThemeMode.QATAR_MAROON -> QatarMaroonColorScheme
        AppThemeMode.FALCON_SLATE -> FalconSlateColorScheme
        AppThemeMode.DARK_CAMPUS -> DarkCampusColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
