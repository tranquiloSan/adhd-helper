package io.github.tranquilosan.adhdhelper;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;

/**
 * The timer's alarm, held by Android rather than by the page.
 *
 * The WebView is suspended once the app is out of view, so the page cannot ring
 * at the end of a timer. It hands the finish time over instead, and the system
 * wakes {@link AlarmReceiver} at that moment whether or not the app is running.
 * The time is also kept in preferences, because a reboot clears every alarm and
 * {@link BootReceiver} has to put it back.
 */
final class TimerAlarm {

    static final String CHANNEL = "timer";
    static final String FALLBACK_CHANNEL = "timer-fallback";
    static final int NOTIFICATION_ID = 1;

    private static final String PREFS = "timer-alarm";
    private static final String KEY_AT = "at";
    private static final String KEY_TITLE = "title";
    private static final String KEY_BODY = "body";

    private TimerAlarm() {}

    /** Replaces any alarm already set, so a resumed timer cannot ring twice. */
    static void schedule(Context context, long at, String title, String body) {
        prefs(context).edit().putLong(KEY_AT, at).putString(KEY_TITLE, title).putString(KEY_BODY, body).apply();
        arm(context, at);
    }

    /** Clears the alarm, and silences it if it is already ringing. */
    static void cancel(Context context) {
        context.getSystemService(AlarmManager.class).cancel(fireIntent(context));
        prefs(context).edit().clear().apply();
        context.stopService(new Intent(context, AlarmService.class));
    }

    /** Puts a stored alarm back after a reboot. One whose time passed while the
     *  phone was off rings straight away, as the page does for a timer that ran
     *  out while it was closed. */
    static void restore(Context context) {
        long at = prefs(context).getLong(KEY_AT, 0);
        if (at == 0) return;
        arm(context, Math.max(at, System.currentTimeMillis() + 1000));
    }

    /** Forgets the stored time once it has rung, so a reboot does not ring it
     *  again after it was stopped. */
    static void markFired(Context context) {
        prefs(context).edit().remove(KEY_AT).apply();
    }

    static String title(Context context) {
        return prefs(context).getString(KEY_TITLE, "Time is up");
    }

    static String body(Context context) {
        return prefs(context).getString(KEY_BODY, "Your timer has finished.");
    }

    private static void arm(Context context, long at) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        PendingIntent fire = fireIntent(context);
        // setAlarmClock is the one kind of alarm Doze and app standby never
        // defer, and the only one allowed to start the ringing service from the
        // background. It also shows the finish time on the lock screen.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()) {
            alarms.setAlarmClock(new AlarmManager.AlarmClockInfo(at, openApp(context)), fire);
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, fire);
        }
    }

    private static PendingIntent fireIntent(Context context) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static PendingIntent openApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** The service plays the sound itself so that it can loop, so this channel
     *  is silent; the fallback channel carries a sound for when it cannot run. */
    static void createChannels(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);

        NotificationChannel ringing = new NotificationChannel(CHANNEL, "Timer alarm", NotificationManager.IMPORTANCE_HIGH);
        ringing.setDescription("Rings when a timer finishes, until it is stopped.");
        ringing.setSound(null, null);
        ringing.enableVibration(false);
        ringing.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(ringing);

        NotificationChannel fallback = new NotificationChannel(
            FALLBACK_CHANNEL,
            "Timer alarm (single chime)",
            NotificationManager.IMPORTANCE_HIGH
        );
        fallback.setDescription("Used only when Android will not let the alarm ring.");
        fallback.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
        );
        manager.createNotificationChannel(fallback);
    }

    static NotificationCompat.Builder notification(Context context, String channel, String title, String body) {
        return new NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_timer)
            .setContentTitle(title)
            .setContentText(body)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openApp(context));
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
