# Jaipur Online

A real-time, two-player Jaipur card game. The online game UI is React/Vite and the authoritative multiplayer server runs on Cloudflare Worker + Durable Object over plain WebSockets.

## Web version

The web project lives in `client/`, with game logic in `server/` and shared types/rules in `shared/`.

The Cloudflare deployment is the live backend and website for multiplayer play.

## Android application — minimal-install workflow

The repository contains a **standalone Android Studio project** in `android/`. It does **not** use Capacitor and does not require Node.js or Git on the computer used only to build the Android app.

The Android app is a native WebView shell that opens the live HTTPS Jaipur website. Multiplayer still runs through the existing Cloudflare server.

### What you need on the Android build computer

Only:

1. **Android Studio**
2. The Android SDK components requested by Android Studio
3. Internet access for Gradle/Android dependencies

Android Studio supplies the JDK used by the Android build. The repository includes the Gradle wrapper configuration.

### Build from the GitHub ZIP

1. Open the GitHub repository:
   `https://github.com/AkhavanAtom1/Jaipur-Application`
2. Choose **Code → Download ZIP**.
3. Extract the ZIP.
4. Open **Android Studio**.
5. Choose **Open** and select the extracted **`android` folder** — not the repository root.
6. Wait for Gradle Sync to finish.
7. In `android/app/src/main/res/values/strings.xml`, change only the `game_url` value to the real HTTPS address of the live Jaipur game.
8. Connect an Android phone with USB debugging enabled, or start an emulator.
9. Press **Run ▶**.

No `npm install`, `npm run`, Node.js, Git or Capacitor command is needed for this Android-only workflow.

### Updating the game later

For ordinary React/CSS/game-logic changes, edit the source in GitHub and let the existing Cloudflare deployment publish the updated web version.

Because the Android app opens the live HTTPS game URL, the installed app will use the updated web game after it is refreshed/restarted. You do **not** need to rebuild the APK for every web-only change.

You only need a new Android build when the native Android shell itself changes, such as:

- application ID
- app icon
- Android permissions
- orientation
- WebView/native behavior
- store release version

### Important

- Do not put signing keystores (`.jks`, `.keystore`) in GitHub.
- Keep the Android package ID stable: `com.akhavan.jaipur`.
- The current Android project targets API 36.
- The app requires internet access because Jaipur multiplayer is online.
