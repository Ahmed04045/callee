# Circosodal Android prototype

**I have not tried this app, so it may have bugs.** It is included so another student can explore the mobile side of the project and continue the work. It is not a tested release or a finished Android version of the website.

## What it is and why it matters

This is a native Android project using Kotlin, Jetpack Compose, Material 3, Room, Coil and OkHttp/Retrofit. It contains club discovery, group details, account screens, themes, and early moderator/admin interfaces. It preserves the earlier mobile work and gives future contributors a starting point for an Android client.

The website at the repository root is the more complete implementation. This app still uses local Room data, seed content and an older app-only backend contract, including a `users` table and custom password/role handling. It does **not** currently share the website's Supabase Auth and complete schema. Use dummy accounts and an isolated development environment; do not connect real users or production data to this prototype.

Names such as `Vlsonne`, the `com.example` namespace and `com.aistudio.vlsonne.udst` application ID are historical. Their presence does not indicate a separate maintained product.

## Open and try it

1. Open this `app/` directory in Android Studio, not the repository root. The inner `app/` directory is the Android application module.
2. The checked-in configuration uses Android Gradle Plugin **9.1.1**, Gradle **9.3.1**, compile SDK **36.1**, target SDK **36**, and minimum SDK **24**. Install the corresponding Android SDK components and use JDK **17** for Gradle. See the [official AGP compatibility notes](https://developer.android.com/build/releases/agp-9-1-0-release-notes).
3. Copy `.env.example` to `.env` in this directory. Keep the placeholders initially: the app detects these and uses its local prototype data. The Gradle Secrets plugin reads these files into `BuildConfig`. Do not use the website's `.env.local`, and never add a service-role key to an Android build.
4. The supplied source contains `gradle/wrapper/gradle-wrapper.properties` but **does not include the wrapper scripts or JAR**. With a local Gradle 9.3.1 installation, run `gradle wrapper --gradle-version 9.3.1` from this directory to generate them. Configure the SDK location through Android Studio or an ignored `local.properties` file if needed. If project configuration fails, resolve that sync error before building; this import has not been build-verified.
5. The existing debug signing configuration expects `debug.keystore` in this directory. Generate your own disposable development key with the JDK's `keytool` (one line):

   ```sh
   keytool -genkeypair -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
   ```

6. Sync Gradle, select the inner `app` module, and run on an emulator or test device with Android API 24 or newer.

After generating the wrapper, the intended checks are:

```sh
./gradlew :app:assembleDebug
./gradlew :app:testDebugUnitTest :app:lintDebug
```

On Windows PowerShell, use `Copy-Item .env.example .env` and `./gradlew.bat` in place of `./gradlew`. These are setup instructions, not a claim that the prototype builds or its tests pass. Android tooling was unavailable during this repository import.

The build includes Firebase dependencies but no Firebase project configuration is supplied. The Google Services plugin is configured to warn when that file is absent. Any Firebase-dependent work needs your own project setup. Release signing uses `KEYSTORE_PATH`, `STORE_PASSWORD` and `KEY_PASSWORD`; no signing keys are included.

## Continue the mobile work

[AI_STUDIO_MIGRATION.md](./AI_STUDIO_MIGRATION.md) is an unfinished implementation brief, not a description of completed features. Start by replacing the old authentication and role model with the website's Supabase Auth/RLS contract, then migrate clubs, events, tickets, gigs and notifications. Do not create the obsolete public `users` table merely to make this prototype connect.

Use [the website documentation](../DOCUMENTATION.md), [the migration guide](../README.md#2-database-setup-supabase-sql-editor), and the current SQL in [supabase/](../supabase/) as the source of truth. New migrations after the original brief changed some fields and function signatures. Porting the app is still outstanding work.

The repository's [MIT License](../LICENSE) applies to this project; dependencies and third-party assets retain their own licenses.
