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
 * The timer's alarm and the end of the day, held by Android rather than by the
 * page.
 *
 * The WebView is suspended once the app is out of view, so the page cannot
 * announce either. It hands the moment over instead, and the system wakes
 * {@link AlarmReceiver} then whether or not the app is running. Each moment is
 * also kept in preferences, because a reboot clears every alarm and
 * {@link BootReceiver} has to put them back.
 */
final class Alarms {

    /** Rings until stopped. */
    static final String TIMER = "timer";
    /** One chime and a notification: the end of the day is when you least want
     *  a dismiss-me alarm sitting on top of a thought. */
    static final String DAY = "day";

    static final String EXTRA_KIND = "kind";

    static final String TIMER_CHANNEL = "timer";
    static final String TIMER_FALLBACK_CHANNEL = "timer-fallback";
    static final String DAY_CHANNEL = "day";

    private static final String PREFS = "alarms";

    private Alarms() {}

    /** Replaces any alarm of the same kind, so a resumed timer cannot ring twice. */
    static void schedule(Context context, String kind, long at, String title, String body) {
        prefs(context).edit().putLong(kind + ".at", at).putString(kind + ".title", title).putString(kind + ".body", body).apply();
        arm(context, kind, at);
    }

    /** Clears the alarm, and silences or removes it if it has already gone off. */
    static void cancel(Context context, String kind) {
        context.getSystemService(AlarmManager.class).cancel(fireIntent(context, kind));
        prefs(context).edit().remove(kind + ".at").remove(kind + ".title").remove(kind + ".body").apply();
        if (TIMER.equals(kind)) context.stopService(new Intent(context, AlarmService.class));
        context.getSystemService(NotificationManager.class).cancel(notificationId(kind));
    }

    /** Puts stored alarms back after a reboot. One whose time passed while the
     *  phone was off goes off straight away, as the page does for a timer or a
     *  day that ran out while it was closed. */
    static void restore(Context context) {
        for (String kind : new String[] { TIMER, DAY }) {
            long at = prefs(context).getLong(kind + ".at", 0);
            if (at != 0) arm(context, kind, Math.max(at, System.currentTimeMillis() + 1000));
        }
    }

    /** Forgets the stored time once it has gone off, so a reboot does not set it
     *  off again after it was stopped. */
    static void markFired(Context context, String kind) {
        prefs(context).edit().remove(kind + ".at").apply();
    }

    static String title(Context context, String kind) {
        return prefs(context).getString(kind + ".title", TIMER.equals(kind) ? "Time is up" : "Day over");
    }

    static String body(Context context, String kind) {
        return prefs(context).getString(kind + ".body", "");
    }

    static int notificationId(String kind) {
        return TIMER.equals(kind) ? 1 : 2;
    }

    private static void arm(Context context, String kind, long at) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        PendingIntent fire = fireIntent(context, kind);
        // setAlarmClock is the one kind of alarm Doze and app standby never
        // defer, and the only one allowed to start the ringing service from the
        // background. It also shows the time on the lock screen.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()) {
            alarms.setAlarmClock(new AlarmManager.AlarmClockInfo(at, openApp(context)), fire);
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, fire);
        }
    }

    /** One per kind, told apart by request code, so each can be replaced or
     *  cancelled without touching the other. */
    private static PendingIntent fireIntent(Context context, String kind) {
        Intent intent = new Intent(context, AlarmReceiver.class).putExtra(EXTRA_KIND, kind);
        return PendingIntent.getBroadcast(
            context,
            notificationId(kind),
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
    }

    static PendingIntent openApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /**
     * The ringing service plays the timer's sound itself so that it can loop,
     * so its channel is silent. The others chime once, on the alarm stream, so
     * silent mode does not swallow them.
     */
    static void createChannels(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        AudioAttributes alarmAudio = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build();

        NotificationChannel ringing = new NotificationChannel(TIMER_CHANNEL, "Timer alarm", NotificationManager.IMPORTANCE_HIGH);
        ringing.setDescription("Rings when a timer finishes, until it is stopped.");
        ringing.setSound(null, null);
        ringing.enableVibration(false);
        ringing.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(ringing);

        NotificationChannel fallback = new NotificationChannel(
            TIMER_FALLBACK_CHANNEL,
            "Timer alarm (single chime)",
            NotificationManager.IMPORTANCE_HIGH
        );
        fallback.setDescription("Used only when Android will not let the timer ring.");
        fallback.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), alarmAudio);
        manager.createNotificationChannel(fallback);

        NotificationChannel day = new NotificationChannel(DAY_CHANNEL, "End of day", NotificationManager.IMPORTANCE_HIGH);
        day.setDescription("One chime when the day you named is over.");
        day.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), alarmAudio);
        day.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(day);
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
