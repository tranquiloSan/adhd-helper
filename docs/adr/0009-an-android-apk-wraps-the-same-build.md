# An Android APK wraps the same build

The tools are wanted on an Android phone - a Poco X3 Pro on Android 15 first,
a Galaxy Z Fold later - as an app that installs, not a tab to keep finding. So
CI now wraps the static build in Capacitor and publishes an APK from main, next
to the GitHub Pages site.

This narrows ADR 0001 without reversing it. The APK is the same web app in an
Android WebView, served from the app's own origin, so the base path is empty
there and `/adhd-helper` on Pages. Nothing in it times in the background: once
the app is out of view Android may suspend the WebView, and the alarm will not
fire until it is back on screen. The footer's warning stays true, so it stays.

Capacitor rather than a trusted web activity or a hand-written WebView shell. A
trusted web activity needs the site to carry a manifest and an asset-links file,
which ADR 0001 left out, and runs in the phone's browser, which suspends it the
same way. A bare WebView shell is less code to start with but leaves signing,
edge-to-edge insets and the foldable's resizing to us; Capacitor handles those
and is the obvious path to native local notifications, which are what would
actually make a phone alarm reliable - without a server, on Android at least.
That is the next step if the phone becomes where the timer is used, and it would
supersede ADR 0001 for Android.

The cost is a second build to keep green, a native project in `android/` that
Capacitor upgrades will touch, and a signing key held in CI secrets. Android
only installs an update signed with the key of the installed app, and
uninstalling clears the WebView's storage, notes included - so the key has to
stay the same for the life of the app.
