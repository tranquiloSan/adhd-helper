# On Android the alarms are the system's

ADR 0009 shipped the APK with the desktop's limit: the alarm rang only while the
app was on screen, because Android suspends the WebView once it is not. On a
phone that is most of the time, so the limit was most of the tool. This
supersedes ADR 0001 for the Android app; the website is unchanged.

Android, unlike iOS, lets an app ask the system to wake it at a set time, so
no server is needed. When the timer starts, the page hands its end to a small
native plugin, which sets it with `AlarmManager.setAlarmClock` - the one kind
of alarm Doze and app standby never defer, and the one allowed to start a
foreground service from the background. Pausing, resetting or dismissing takes
it back. The page's time is still derived from its own timestamps; only the
ringing moved.

The ringing is a foreground service that loops the phone's alarm sound on the
alarm stream, and vibrates, until Stop is pressed on the notification or the
timer is dismissed in the app. A scheduled notification was the smaller option
and was rejected: its sound plays once, follows silent mode, and a single chime
is the failure the desktop alarm's repeat exists to prevent. On Android the page
does not beep as well; two alarms would only talk over each other.

Three lines drawn around it. The app does not open over the lock screen: the
notification there carries Stop, and showing the app would show the notes too.
The end of the day goes through the same alarm, so it too arrives with the app
closed, but as one chime and a notification rather than ringing: the page has
always announced it once, since the end of the day is when you least want a
dismiss-me alarm sitting on top of a thought. And a reboot is covered - the end
is kept and set again on boot, going off at once if it passed while the phone was
off - but a force stop is not, since Android clears an app's alarms then and
gives it no chance to object.

What it costs: native code in `android/` with no tests of its own and no way to
run it in CI, so it is verified on a phone or not at all. Phones whose makers
add their own battery saver - Xiaomi and Samsung among them - can still hold
the alarm back, so the app says so until it is allowed to run in the
background.
