# BroPS spike: background GPS and voice alert (issue #1)

Throwaway Android app. It lives on the `spike/1-background-gps` branch and is never merged.

**Status: nothing here has been proven on a phone.** The code type-checks, the JavaScript bundles, and the Android project generates. No APK has been built, and no tracking or audio behavior has been observed. Only a real ride can answer the issue.

## What the app does

One screen with Start and Stop.

- Tracks location through an Android foreground service of type `location`, with the "While using the app" permission only. "Allow all the time" is not requested, and `ACCESS_BACKGROUND_LOCATION` is removed from the manifest.
- Takes a fix every 2 seconds and appends one line per fix to a local file: fix time, delivery time, speed (m/s, `null` if invalid), accuracy, and app state. **Coordinates are not logged.**
- Speaks one speed alert per ride above **30 km/h**. The threshold is deliberately low, so the alert can be tested at a legal speed. The product threshold of 130 km/h is not available in this app.
- Test mode (on by default) speaks a voice test 2, 30 and 55 minutes after Start.
- Records battery level at Start and Stop, and shows results after Stop.

The log stays on the phone until you export it with the share sheet. The app has no network code. Uninstalling it deletes the logs.

## Build and install

You need a **release-variant** APK. A debug build loads its JavaScript from a laptop, so it cannot work on a ride. The release build embeds the JavaScript. It is signed with the debug key from the generated project, which is fine for this test and must never be used for distribution.

### Option A: local build (free, no account)

Tested here: only as far as generating the project. The Gradle build has not been run, because this environment has no Android SDK.

1. Install [Android Studio and JDK 17](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=physical&mode=development-build&buildEnv=local). In the SDK Manager, install Android SDK Platform 37 and Build-Tools 37.0.0, which are the versions React Native 0.88 declares. The Expo page mentions platform 36, but the generated project compiles against 37.
2. Set the environment:

   ```sh
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
   ```

3. Build:

   ```sh
   cd spike
   npm ci
   npx expo prebuild --platform android --no-install
   cd android
   ./gradlew assembleRelease
   ```

4. Install. Enable USB debugging on the phone, connect it, then run:

   ```sh
   adb install -r app/build/outputs/apk/release/app-release.apk
   ```

   Without adb, copy the APK to the phone and open it, then allow installs from that source.

### Option B: EAS Build (free tier, needs an Expo account)

Add `spike/eas.json`:

```json
{
  "build": {
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } }
  }
}
```

Then run, from `spike/`:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build -p android --profile preview
```

The [Free plan](https://expo.dev/pricing) lists up to 15 Android builds, at low priority, with waits that can exceed 90 minutes at peak. `eas init` writes a project ID into `app.json`.

## Real-ride test protocol

**Safety rules**

- Do all setup while parked with the engine off. Never touch the phone while riding.
- Never exceed a speed limit for this test. Nothing in it requires that: the speed alert triggers above 30 km/h and the voice tests run on a timer.
- If a voice alert distracts you, stop the test at the next safe place.

**Before the ride**

1. Charge the phone, then unplug it. Do not charge it during the test, or the battery figure is meaningless.
2. Keep Battery Saver off. For the first ride, leave the app's battery setting on its default: that is what a real rider would have.
3. Pair the intercom. In the phone's Bluetooth settings for the intercom, make sure media audio is enabled. Confirm that music from another app plays in the helmet, then stop the music.

**Parked audio test, about 5 minutes, outdoors with open sky**

1. Open the app with test mode ON and press Start. Choose "While using the app" and "Precise". Allow notifications: that keeps the tracking notification visible, and tracking does not depend on it.
2. Listen for "Tracking started" in the helmet.
3. Lock the phone and put it away. After 2 minutes you should hear "Attention. BroPS voice test." The timer only advances when GPS fixes arrive, so stay outdoors.
4. Unlock, press Stop, and check that the results show at least 1 alert requested.

**The ride, at least 60 minutes**

1. Parked: press Start with test mode ON, confirm "Tracking started", lock the phone and stow it.
2. Ride normally. Do not open the app. You should hear a voice test at about 2, 30 and 55 minutes, and one speed alert the first time you pass 30 km/h.
3. Remember which alerts you heard, and any tunnels or underground stretches.
4. Parked at the end: unlock, press Stop, open the results.

Do not swipe the app away from the recent apps list during a ride (see the risks below).

**What to send back**

Send these through a private channel. Never put them on the GitHub issue or in the repository: the repository is public, and the log contains your ride's times and speeds even though it has no coordinates.

- A screenshot of the results screen and the exported `ride-*.jsonl` file (Share log).
- Phone model and Android version, and whether the app's battery setting was changed.
- Intercom model, and whether it was connected for media audio.
- For each expected alert (Tracking started, 2, 30 and 55 min, speed alert): heard clearly, clipped, or not heard. Say whether you were in an intercom conversation or listening to music at the time.
- Any tunnel or known signal loss, with its approximate time into the ride.
- Whether the tracking notification stayed visible, and anything unexpected.

Uninstall the app when testing is finished.

**Reading the results**

| Result | Meaning |
| --- | --- |
| Largest gap, gaps over 30 s | The core answer. The gap list shows when each gap happened, to compare with tunnels. The time from the last fix to Stop is included, so tracking that died early shows up. |
| Fixes with app in background | Should be almost all of them. |
| JS runtime restarts | Above 0 means the process was restarted during the ride. |
| Largest delivery delay | Time between a fix and the app receiving it. Large values mean late alerts. |
| Alerts reported finished | The speech engine said it finished. **This does not prove you heard it.** Only your report can. |

## Known Android risks

These come from reading the library source and platform documentation. None has been observed on a device.

**Audio**

- **React Native timers stop in the background** (`JavaTimerManager.kt` in React Native pauses them when the host pauses). A `setTimeout` alert would not fire with the screen off, so test alerts are driven by incoming GPS fixes instead. With no fixes, there are no alerts.
- **`expo-speech` shuts its engine down when the Activity is destroyed** (`OnActivityDestroys` in `SpeechModule.kt`), and the module has no code path that creates a new one. If Android destroys the Activity while the service keeps running, or the rider swipes the app away, later alerts can fail silently. In the log this appears as an `alert` record with no matching `speech` record.
- **No audio focus and no Bluetooth routing control.** `expo-speech` does not request audio focus or select an output. Speech plays on the media stream, mixed over any music, and follows whatever route Android has chosen.
- **Intercom behavior varies by model** (general knowledge, not verified for any unit). A headset connected for calls only may not carry media audio, in which case speech could come out of the phone speaker. During an active intercom conversation, some units suspend or lower media audio. This is the main thing the helmet test must answer.
- **Clipped starts.** Bluetooth media audio can take a moment to wake up, which is why the alerts begin with "Attention".
- **Speech engine availability.** The alert needs an installed text-to-speech engine. If it fails to start, the log shows `error`. If English is unavailable, the engine falls back to the phone's language and reads the English text with that voice. The "Tracking started" message starts the engine while the app is visible. A cold start from the background is not tested.

**Tracking**

- **Manufacturer battery management** can stop background work, foreground services included. [dontkillmyapp.com](https://dontkillmyapp.com/) ranks Huawei, Xiaomi, OnePlus and Samsung worst, and Pixel and Android One best.
- **Tracking does not recover after the process dies.** A location foreground service cannot be started from the background without `ACCESS_BACKGROUND_LOCATION` ([Android](https://developer.android.com/develop/background-work/services/fgs/service-types#location)). `expo-location` also refuses it while the app is not in the foreground (`LocationTaskConsumer.kt`). Tracking returns only when the rider reopens the app.
- **Fixes reach JavaScript through JobScheduler** (expedited jobs on Android 12 and later, in `TaskManagerUtils.java`). Delivery may be delayed or batched. The log records both fix time and delivery time, so this can be measured.
- **`coords.speed` is not expected to be `null` on this Android code path.** `LocationResults.kt` copies `location.speed` without checking `hasSpeed()`. [Android documents](https://developer.android.com/reference/android/location/Location#getSpeed()) that value as 0.0 or greater, and valid only if `hasSpeed()` is true. So a low value, including 0, may not be a real speed, and the log cannot tell the difference. Null or negative values are still treated as invalid, as required. A false low reading cannot trigger an alert, but a real speed reported as invalid would miss one.
- **`POST_NOTIFICATIONS`.** Foreground services [run without it](https://developer.android.com/develop/ui/views/notifications/notification-permission), but the notification is then hidden from the drawer. The app asks for it and carries on if refused.

## `react-native-background-geolocation`: is it needed?

Assessed from documentation only, on 2026-11-08. No code from it has been run.

**Licensing and cost**

- The [repository README](https://github.com/transistorsoft/react-native-background-geolocation) says: "A license is required for RELEASE builds on both iOS and Android", debug builds are free, and a free 30-day trial covers release testing. Version 4 keys do not work with version 5.
- The [Transistorsoft shop](https://shop.transistorsoft.com/) lists Starter at $399 (1 app), Venture at $599 (5), Pro at $749 (25) and Studio at $999 (100). All are perpetual licenses with one year of updates. The page does not list a separate React Native price.
- **It does not fit a $0 budget.** BroPS is distributed as an APK, so it needs a release build and therefore at least the $399 license. Shipping debug builds to avoid the license is not an acceptable option: they are not meant for distribution.

**When it would be needed**

Only if all of these are true after the real ride:

1. `expo-location` shows gaps that signal loss does not explain, or JS restarts, on the phones the group actually uses.
2. The cause is in the Expo delivery path, not manufacturer battery management. My assessment is that a paid library still runs as a foreground service under the same OS rules, so it should not be expected to defeat a manufacturer's app killer.
3. A $0 alternative has failed, such as a small native foreground service using the fused location client directly with no JobScheduler step. This is an idea and has not been built.

Its documented extras, such as [motion detection that switches location off when stationary](https://github.com/transistorsoft/react-native-background-geolocation), target battery life, and the `startOnBoot: true` setting in its [setup example](https://docs.transistorsoft.com/react-native/setup/) would conflict with the rule that location is collected only during a ride. The 30-day trial could be used for a one-off comparison, at no cost, if the CTO decides that is worthwhile.
