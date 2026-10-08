package com.example.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import coil.compose.AsyncImage
import com.example.BuildConfig
import com.example.data.model.University
import com.example.ui.theme.QatarMaroon
import com.example.ui.viewmodel.AuthMode
import com.example.util.FileUtils
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch
import java.io.File

@Composable
fun AuthDialog(
    isOpen: Boolean,
    authMode: AuthMode,
    universities: List<University>,
    onClose: () -> Unit,
    onSetAuthMode: (AuthMode) -> Unit,
    onGoogleSignIn: (email: String, name: String, avatarUrl: String, onResult: (Boolean, String?) -> Unit) -> Unit,
    onEmailSignIn: (email: String, password: String, onResult: (Boolean, String?) -> Unit) -> Unit,
    onRegister: (name: String, email: String, password: String, universityId: String, bio: String, avatarUrl: String, onResult: (Boolean, String?) -> Unit) -> Unit
) {
    if (!isOpen) return

    val context = LocalContext.current
    var selectedTab by remember {
        mutableIntStateOf(if (authMode == AuthMode.CREATE_ACCOUNT || authMode == AuthMode.ONBOARDING_UNIVERSITY || authMode == AuthMode.ONBOARDING_PROFILE) 1 else 0)
    }

    // Sign In Fields (NO DECOY ACCOUNTS - starts empty)
    var signInEmail by remember { mutableStateOf("") }
    var signInPassword by remember { mutableStateOf("") }
    var signInPasswordVisible by remember { mutableStateOf(false) }
    var signInError by remember { mutableStateOf<String?>(null) }
    var isSigningIn by remember { mutableStateOf(false) }

    // Create Account Fields
    var regName by remember { mutableStateOf("") }
    var regEmail by remember { mutableStateOf("") }
    var regPassword by remember { mutableStateOf("") }
    var regConfirmPassword by remember { mutableStateOf("") }
    var regPasswordVisible by remember { mutableStateOf(false) }
    var regBio by remember { mutableStateOf("") }
    var regUniversityId by remember { mutableStateOf("udst") }
    var regAvatarPath by remember { mutableStateOf("") }
    var regError by remember { mutableStateOf<String?>(null) }
    var isRegistering by remember { mutableStateOf(false) }

    // Google Sign-In Sheet / Modal
    var showGoogleAccountDialog by remember { mutableStateOf(false) }
    var googleAccountEmail by remember { mutableStateOf("") }
    var googleAccountName by remember { mutableStateOf("") }
    var isGoogleLoading by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()
    val credentialManager = remember { CredentialManager.create(context) }

    // Native Google One-Tap Credential Manager sign in function
    val triggerGoogleSignIn: () -> Unit = {
        val webClientId = try {
            BuildConfig::class.java.getField("GOOGLE_WEB_CLIENT_ID").get(null) as? String ?: ""
        } catch (_: Exception) {
            ""
        }

        if (webClientId.isNotBlank() && !webClientId.contains("your-google-web-client-id")) {
            coroutineScope.launch {
                isGoogleLoading = true
                try {
                    val googleIdOption = GetGoogleIdOption.Builder()
                        .setFilterByAuthorizedAccounts(false)
                        .setServerClientId(webClientId)
                        .setAutoSelectEnabled(false)
                        .build()

                    val request = GetCredentialRequest.Builder()
                        .addCredentialOption(googleIdOption)
                        .build()

                    val result = credentialManager.getCredential(
                        request = request,
                        context = context
                    )

                    val credential = result.credential
                    if (credential is CustomCredential &&
                        credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                    ) {
                        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                        val email = googleIdTokenCredential.id
                        val displayName = googleIdTokenCredential.displayName ?: email.substringBefore("@")
                        val photoUri = googleIdTokenCredential.profilePictureUri?.toString() ?: ""

                        onGoogleSignIn(email, displayName, photoUri) { success, _ ->
                            isGoogleLoading = false
                        }
                    } else {
                        isGoogleLoading = false
                        showGoogleAccountDialog = true
                    }
                } catch (e: GetCredentialCancellationException) {
                    // User canceled sheet
                    isGoogleLoading = false
                } catch (e: GetCredentialException) {
                    // Fall back to account dialog if no Google account on device or configuration pending
                    isGoogleLoading = false
                    showGoogleAccountDialog = true
                } catch (e: Exception) {
                    isGoogleLoading = false
                    showGoogleAccountDialog = true
                }
            }
        } else {
            // If GOOGLE_WEB_CLIENT_ID is not configured yet, seamlessly open account dialog
            showGoogleAccountDialog = true
        }
    }

    // Android Photo Picker for Profile Picture upload from device files
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            val savedPath = FileUtils.saveImageToInternalStorage(context, uri)
            regAvatarPath = savedPath
        }
    }

    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .padding(vertical = 20.dp)
        ) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("auth_dialog_card")
            ) {
                Column(
                    modifier = Modifier
                        .padding(22.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Header Bar (Clean, no 'V' letter)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Circosodal UDST",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = (-0.5).sp
                                )
                            )
                            Text(
                                text = "Student Community & Verified Groups",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        IconButton(
                            onClick = onClose,
                            modifier = Modifier.testTag("auth_dialog_close_button")
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Close")
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Tab Switcher between Sign In & Create Account
                    TabRow(
                        selectedTabIndex = selectedTab,
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        contentColor = MaterialTheme.colorScheme.primary,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                    ) {
                        Tab(
                            selected = selectedTab == 0,
                            onClick = {
                                selectedTab = 0
                                signInError = null
                            },
                            text = {
                                Text(
                                    "Sign In",
                                    fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            modifier = Modifier.testTag("tab_sign_in")
                        )
                        Tab(
                            selected = selectedTab == 1,
                            onClick = {
                                selectedTab = 1
                                regError = null
                            },
                            text = {
                                Text(
                                    "Create Account",
                                    fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            modifier = Modifier.testTag("tab_create_account")
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    if (selectedTab == 0) {
                        // =================== SIGN IN TAB ===================
                        Text(
                            text = "Sign in with your registered email and password or Google account.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // Functional Google Sign-In Button
                        OutlinedButton(
                            onClick = triggerGoogleSignIn,
                            shape = RoundedCornerShape(12.dp),
                            enabled = !isGoogleLoading,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("google_signin_button")
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(vertical = 4.dp)
                            ) {
                                if (isGoogleLoading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(18.dp),
                                        color = QatarMaroon,
                                        strokeWidth = 2.dp
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = "Connecting with Google...",
                                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                                    )
                                } else {
                                    Surface(
                                        shape = CircleShape,
                                        color = Color(0xFF4285F4),
                                        modifier = Modifier.size(22.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                "G",
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = "Continue with Google",
                                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            HorizontalDivider(modifier = Modifier.weight(1f))
                            Text(
                                text = "or sign in with email",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 10.dp)
                            )
                            HorizontalDivider(modifier = Modifier.weight(1f))
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        if (signInError != null) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = MaterialTheme.colorScheme.errorContainer,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 12.dp)
                            ) {
                                Text(
                                    text = signInError.orEmpty(),
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(10.dp)
                                )
                            }
                        }

                        OutlinedTextField(
                            value = signInEmail,
                            onValueChange = {
                                signInEmail = it
                                signInError = null
                            },
                            label = { Text("Email Address") },
                            placeholder = { Text("e.g. yourname@udst.edu.qa or gmail.com") },
                            leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("auth_email_input")
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = signInPassword,
                            onValueChange = {
                                signInPassword = it
                                signInError = null
                            },
                            label = { Text("Password") },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                            trailingIcon = {
                                IconButton(onClick = { signInPasswordVisible = !signInPasswordVisible }) {
                                    Icon(
                                        imageVector = if (signInPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = if (signInPasswordVisible) "Hide password" else "Show password"
                                    )
                                }
                            },
                            visualTransformation = if (signInPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("auth_password_input")
                        )

                        Spacer(modifier = Modifier.height(18.dp))

                        Button(
                            onClick = {
                                if (signInEmail.isBlank()) {
                                    signInError = "Please enter your email address."
                                    return@Button
                                }
                                if (signInPassword.isBlank()) {
                                    signInError = "Please enter your password."
                                    return@Button
                                }
                                isSigningIn = true
                                signInError = null
                                onEmailSignIn(signInEmail.trim(), signInPassword) { success, error ->
                                    isSigningIn = false
                                    if (!success) {
                                        signInError = error ?: "Failed to sign in. Please verify credentials."
                                    }
                                }
                            },
                            enabled = !isSigningIn,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("submit_signin_button")
                        ) {
                            if (isSigningIn) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Signing in...")
                            } else {
                                Text("Sign In")
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(
                                onClick = {
                                    selectedTab = 1
                                    regError = null
                                },
                                modifier = Modifier.testTag("switch_to_register_button")
                            ) {
                                Text("No account yet? Create one")
                            }

                            TextButton(
                                onClick = onClose,
                                modifier = Modifier.testTag("browse_as_guest_button")
                            ) {
                                Text("Browse as Guest", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    } else {
                        // =================== CREATE ACCOUNT TAB ===================
                        Text(
                            text = "Create your verified student profile. Enter an email, password, and upload a profile picture from your files.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        if (regError != null) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = MaterialTheme.colorScheme.errorContainer,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 12.dp)
                            ) {
                                Text(
                                    text = regError.orEmpty(),
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(10.dp)
                                )
                            }
                        }

                        // --- Profile Picture Upload from Files / Gallery ---
                        Text(
                            text = "Profile Picture (from your files):",
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold)
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(64.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                    .border(1.5.dp, MaterialTheme.colorScheme.outlineVariant, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                if (regAvatarPath.isNotBlank()) {
                                    AsyncImage(
                                        model = File(regAvatarPath).takeIf { it.exists() } ?: regAvatarPath,
                                        contentDescription = "Uploaded profile picture",
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                } else {
                                    Icon(
                                        imageVector = Icons.Default.Person,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(36.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(14.dp))

                            Column {
                                OutlinedButton(
                                    onClick = {
                                        photoPickerLauncher.launch(
                                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                        )
                                    },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.testTag("upload_picture_button")
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.AddPhotoAlternate,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(if (regAvatarPath.isNotBlank()) "Change Photo" else "Upload from Files")
                                }

                                if (regAvatarPath.isNotBlank()) {
                                    TextButton(
                                        onClick = { regAvatarPath = "" },
                                        colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                                        modifier = Modifier.height(30.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Remove", fontSize = 12.sp)
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Full Name
                        OutlinedTextField(
                            value = regName,
                            onValueChange = {
                                regName = it
                                regError = null
                            },
                            label = { Text("Full Name *") },
                            placeholder = { Text("e.g. Student Name") },
                            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("register_name_input")
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Email
                        OutlinedTextField(
                            value = regEmail,
                            onValueChange = {
                                regEmail = it
                                regError = null
                            },
                            label = { Text("Email Address *") },
                            placeholder = { Text("e.g. name@udst.edu.qa or personal email") },
                            leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("register_email_input")
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Password
                        OutlinedTextField(
                            value = regPassword,
                            onValueChange = {
                                regPassword = it
                                regError = null
                            },
                            label = { Text("Password * (Min. 6 characters)") },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                            trailingIcon = {
                                IconButton(onClick = { regPasswordVisible = !regPasswordVisible }) {
                                    Icon(
                                        imageVector = if (regPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = if (regPasswordVisible) "Hide password" else "Show password"
                                    )
                                }
                            },
                            visualTransformation = if (regPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("register_password_input")
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Confirm Password
                        OutlinedTextField(
                            value = regConfirmPassword,
                            onValueChange = {
                                regConfirmPassword = it
                                regError = null
                            },
                            label = { Text("Confirm Password *") },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("register_confirm_password_input")
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Bio / Academic Major
                        OutlinedTextField(
                            value = regBio,
                            onValueChange = { regBio = it },
                            label = { Text("Academic Major / Bio (Optional)") },
                            placeholder = { Text("e.g. Computer Science student, robotics enthusiast") },
                            maxLines = 2,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("register_bio_input")
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // Institution selector (default UDST)
                        Text(
                            text = "Institution: University of Doha for Science and Technology (UDST)",
                            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Spacer(modifier = Modifier.height(18.dp))

                        // Submit Registration Button
                        Button(
                            onClick = {
                                if (regName.isBlank()) {
                                    regError = "Please enter your full name."
                                    return@Button
                                }
                                if (regEmail.isBlank() || !regEmail.contains("@")) {
                                    regError = "Please enter a valid email address."
                                    return@Button
                                }
                                if (regPassword.length < 6) {
                                    regError = "Password must be at least 6 characters."
                                    return@Button
                                }
                                if (regPassword != regConfirmPassword) {
                                    regError = "Passwords do not match."
                                    return@Button
                                }

                                isRegistering = true
                                regError = null
                                onRegister(
                                    regName.trim(),
                                    regEmail.trim().lowercase(),
                                    regPassword,
                                    regUniversityId,
                                    regBio.trim(),
                                    regAvatarPath
                                ) { success, error ->
                                    isRegistering = false
                                    if (!success) {
                                        regError = error ?: "Registration failed."
                                    }
                                }
                            },
                            enabled = !isRegistering,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("submit_register_button")
                        ) {
                            if (isRegistering) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Creating Account...")
                            } else {
                                Text("Create Student Account")
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        TextButton(
                            onClick = {
                                selectedTab = 0
                                signInError = null
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Already have an account? Sign in")
                        }
                    }
                }
            }
        }
    }

    // =================== FUNCTIONAL GOOGLE SIGN IN DIALOG ===================
    if (showGoogleAccountDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!isGoogleLoading) showGoogleAccountDialog = false
            },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFF4285F4),
                        modifier = Modifier.size(28.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("G", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Sign in with Google",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Sign in using your Google account to automatically link your verified identity and SQL credentials:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    OutlinedTextField(
                        value = googleAccountEmail,
                        onValueChange = { googleAccountEmail = it },
                        label = { Text("Google Account Email") },
                        placeholder = { Text("your.email@gmail.com") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("google_dialog_email_input")
                    )

                    OutlinedTextField(
                        value = googleAccountName,
                        onValueChange = { googleAccountName = it },
                        label = { Text("Display Name") },
                        placeholder = { Text("Your full name") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("google_dialog_name_input")
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (googleAccountEmail.isNotBlank() && googleAccountEmail.contains("@")) {
                            isGoogleLoading = true
                            onGoogleSignIn(
                                googleAccountEmail.trim().lowercase(),
                                googleAccountName.trim(),
                                ""
                            ) { success, _ ->
                                isGoogleLoading = false
                                if (success) {
                                    showGoogleAccountDialog = false
                                }
                            }
                        }
                    },
                    enabled = !isGoogleLoading,
                    modifier = Modifier.testTag("google_dialog_confirm_button")
                ) {
                    if (isGoogleLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Connecting...")
                    } else {
                        Text("Sign In with Google")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showGoogleAccountDialog = false },
                    enabled = !isGoogleLoading
                ) {
                    Text("Cancel")
                }
            }
        )
    }
}
