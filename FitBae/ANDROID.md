# FitBae for Android

## Appearance update (1.4)

Preferences now separates color themes from light/dark brightness and links to
the dedicated workout settings page. Theme choices are local to each device.
Five launcher icon colors are available in the updated Android APK; browser
and older APK users see an explanation instead of an unusable control.
Launcher refresh timing varies by device. MainActivity remains enabled for
authentication links; launcher aliases alone are toggled. After changing an
icon, test reopening from the launcher and Google/password-reset callbacks.
An Android build is required for icon changes; web deployment alone is not enough.

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

## Notifications (Android 1.1)

In Profile → Preferences → Notifications, enable system notifications, choose
training days and a local reminder time, then save notification preferences.
Reminders are off by default. Use **Send test alert** to check delivery.
Settings apply to the current account on this installation, not other devices.

Weekly reminders use Android calendar schedules in the phone's time zone, not
the profile display-time-zone preference. Open FitBae after a time-zone change
to refresh them. Quiet hours prevent selecting a reminder time in that window;
Android-delayed delivery can still arrive later. Explicitly started rest timers
are not muted by reminder quiet hours. Sounds, vibration and lock-screen display
can be changed in Android Settings → Apps → FitBae → Notifications.

Rest alerts are scheduled on-device when a timer starts, and updated/cancelled
when it is adjusted, ended, paused, discarded or saved. Leaving the workout
route cancels its alert; putting the app in the background does not. Signing
out clears this feature's pending and delivered notifications. Reminder taps
open Plan; rest-alert taps only reopen a matching, unpaused workout draft.

Notification permission and Android's **Alarms & reminders** permission are
separate. The latter is optional and requested only by the **Allow precise rest
alerts** button. Without it, alerts are inexact. Even with it, Doze, manufacturer
battery restrictions, force-stop and Do Not Disturb affect delivery. Android
limits idle alarms (roughly one per nine minutes), so this is not a guarantee
of second-accurate background interval coaching. Keep the workout screen open
for short intervals. Browser notifications remain best-effort; scheduled weekly
reminders are Android-only. No Firebase or database migration is needed here.

Install this APK over the previous test APK using the same debug signing key;
do not uninstall if you want to preserve device settings and workout drafts.

Real-device checks for this update:

- Deny permission, then enable it; verify countdowns still work when denied.
- Send a test alert, background the app, and tap the notification.
- Select training days/time, reject a time inside quiet hours, save and reopen.
- Complete a set, adjust its rest, lock/unlock, end it, pause and finish a workout.
- Sign out before a pending alert and switch to the other test account.
- Try precise-alarm permission both on and off, battery saver, and a reboot.

Partner-message **push notifications are not included**. The next phase needs
a Firebase project with an Android app registered as `com.fitbae.app`, its
`google-services.json` in `android/app/`, and a trusted server-side delivery
worker with private Firebase credentials. That phase must include per-user
token management, authenticated delivery, logout cleanup and message privacy.
Never put service-account private keys in Vite variables or bundled app assets.

Reference: [Capacitor local notifications](https://capacitorjs.com/docs/apis/local-notifications).

## Motion (Android 1.2)

Version 1.2 adds lightweight page/day/exercise transitions, set-completion
feedback, a rest-timer entrance, staggered dashboard cards and animated reminder
settings. Android/browser reduced-motion preferences disable decorative motion.
Screens are not remounted for transitions; workout drafts and form state stay
intact. Install the updated APK to receive these changes in the native app.

## Before a public release

Version 1.3 replaces loading spinners with paired dumbbells doing alternating
reps. Account and page loading include branded status text; buttons and inline
loaders use the compact motif. Reduced-motion mode shows stationary weights.

Confirm ownership/uniqueness of the provisional package ID `com.fitbae.app`,
create and securely back up a release signing key, increment Android version
codes, and build a signed release APK or Play Store AAB. Debug builds enable
WebView debugging and should only be shared with trusted testers. Review
privacy/data-safety disclosures, Android backup/session storage, verified HTTPS
app links, notification permissions and real-device accessibility before launch.

References: [Capacitor Android](https://capacitorjs.com/docs/android),
[environment setup](https://capacitorjs.com/docs/getting-started/environment-setup),
[Supabase native links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
