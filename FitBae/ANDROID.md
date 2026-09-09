# FitBae for Android

Capacitor packages the built React app inside an Android APK. It does not just
open the hosted website. Accounts, photos, partner chat and saved workouts still
use the same Supabase backend; AI plan generation uses the Vercel API.

## Build a directly installable test APK

Requirements: Node 22+, JDK 21+, Android SDK 36 and an up-to-date Android Studio
(Capacitor 8 recommends Android Studio 2025.2.1+). Accept Android SDK licenses in
Android Studio's SDK Manager. The build script detects the usual Windows SDK
and Android Studio Java paths; other locations need `ANDROID_HOME` / `JAVA_HOME`.

From `FitBae`:

```sh
npm ci
npm run android:apk
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.
Transfer that file to an Android 7+ phone, open it, and allow installation from
the app you used to open it when Android asks. This is a debug-signed **test**
build, not a Play Store release. Internet is required for backend features;
bundling the interface does not make all data available offline.

Use `npm run android:open` to open the native project in Android Studio, or
`npm run android:sync` to refresh its bundled web assets after changing the site.
Website builds remain `npm run build`; mobile builds use `npm run build:mobile`.
Changing the hosted website does not update an already installed APK.

On this Windows machine, `.env.android.local` selects the installed Java 24
runtime and Windows' trusted certificate store for dependency downloads. It is
ignored by Git. The Android Studio Java runtime here does not provide the Windows
certificate-store provider. This workaround retains TLS validation; do not disable
certificate verification. Other machines normally do not need this file.
The build script also registers Android Studio's Java 21 compiler separately;
the filesystem plugin requires a Java 21 toolchain even when Gradle runs on Java 24.
For a custom compiler location, set `FITBAE_JAVA21_HOME` to your JDK 21 directory.

## Required backend setup

1. Deploy this commit to `https://fitbae.vercel.app`. The generation endpoint now
   allows authenticated requests from Capacitor's exact `https://localhost`
   origin. Until this API update is deployed, generation in the APK will fail
   the browser's CORS check. Keep `GEMINI_API_KEY` and Supabase server settings
   configured on Vercel, not in the APK.
2. In Supabase → Authentication → URL Configuration → Redirect URLs, add both:
   - `com.fitbae.app://auth/callback`
   - `com.fitbae.app://auth/callback?mode=reset`
   Keep the existing website redirects and Site URL. These additional redirects
   enable Google sign-in, email confirmation and password reset in the APK.
   Existing confirmed accounts can use email/password without these additions.
3. Complete mobile confirmation/reset links on the same device and app installation
   that requested them: the native flow uses PKCE with a locally stored verifier.
   Google sign-in uses the system browser, not Google's login inside a WebView.

`.env.mobile` contains only the public API origin. `.env` supplies the public
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never prefix database passwords,
service-role keys, Gemini keys or test passwords with `VITE_`. Never copy `.env`
into `public/` or `android/app/src/main/assets/`.

## Phone test checklist

- Sign in with each test account; sign out and reopen the app.
- Google sign-in, confirm email, password reset (including cold-launch return).
- Open Plan, generate a plan, substitute an exercise and inspect its guide.
- Start a workout, enter sets, background/resume, finish and check history.
- Chat between two devices and verify timestamps/read indicators.
- Export workout history using Android's share sheet.
- Pick/crop/upload a profile photo from Android's file picker.
- Check light/dark themes, keyboard, hardware Back, dialogs and screen insets.

## Before a public release

Confirm ownership/uniqueness of the provisional package ID `com.fitbae.app`,
create and securely back up a release signing key, increment Android version
codes, and build a signed release APK or Play Store AAB. Debug builds enable
WebView debugging and should only be shared with trusted testers. Review
privacy/data-safety disclosures, Android backup/session storage, verified HTTPS
app links, notification permissions and real-device accessibility before launch.

References: [Capacitor Android](https://capacitorjs.com/docs/android),
[environment setup](https://capacitorjs.com/docs/getting-started/environment-setup),
[Supabase native links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
