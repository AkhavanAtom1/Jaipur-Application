# Jaipur Online

A real-time, two-player web version of **Jaipur**. Create a room, share the 5-character code, and play online against a friend.

## Web version

The web client is built with React + Vite. The authoritative game server runs on a Cloudflare Worker + Durable Object using plain WebSockets.

Node.js is required only for web/server development and deployment tooling. It is **not required on a computer that is only being used to build the Android app**.

## Android version — no Node.js or Git required locally

The repository contains a standalone Android project in:

`android/`

The Android app is a native WebView shell that opens the live Cloudflare Jaipur game over HTTPS. The Android project is independent from the React build tools, so the Android build computer does not need Node.js, npm, Git, or Capacitor.

### One-time GitHub edit

Before downloading the repository ZIP for Android Studio, open:

`android/app/src/main/res/values/strings.xml`

and replace the value of `game_url` with the real public HTTPS URL of your deployed Jaipur game.

Example:

`https://your-jaipur-domain.example.com/`

The Android app automatically adds `native=1` to the URL. The web client uses that flag to persist the player's seat in device-local storage.

### Build with Android Studio

1. Install Android Studio.
2. In SDK Manager install Android 16 / API 36 and the latest Android 36 Build Tools.
3. Download this repository as a ZIP from GitHub.
4. Extract the ZIP.
5. In Android Studio choose **Open** and select the repository's `android/` folder.
6. Let Gradle Sync finish. The included Gradle wrapper downloads the required Gradle distribution and Android build dependencies.
7. Select an emulator or a connected Android phone.
8. Press **Run ▶**.

No Node.js, npm, Git command line, or Capacitor command is needed for this Android workflow.

### Updating the game

The Android app loads the live Cloudflare game URL. Therefore React/game changes committed to GitHub and deployed to Cloudflare become visible in the installed app without rebuilding the Android package.

A new Android build is needed only for native Android changes such as the package name, icon, permissions, signing configuration, native code, or release metadata.

### Important

- Keep `game_url` pointed at an HTTPS URL you control.
- Do not put release keystores or signing passwords in GitHub.
- The Android package name is `com.akhavan.jaipur`.
- The Android project targets Android 16 / API 36.
