package io.github.tranquilosan.adhdhelper;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

/** Woken by the system when the timer or the day runs out. */
public class AlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String kind = intent.getStringExtra(Alarms.EXTRA_KIND);
        if (kind == null) kind = Alarms.TIMER;

        String title = Alarms.title(context, kind);
        String body = Alarms.body(context, kind);
        Alarms.markFired(context, kind);
        Alarms.createChannels(context);
        NotificationManager notifications = context.getSystemService(NotificationManager.class);

        if (Alarms.DAY.equals(kind)) {
            notifications.notify(
                Alarms.notificationId(kind),
                Alarms.notification(context, Alarms.DAY_CHANNEL, title, body).setAutoCancel(true).build()
            );
            return;
        }

        Intent ring = new Intent(context, AlarmService.class)
            .putExtra(AlarmService.EXTRA_TITLE, title)
            .putExtra(AlarmService.EXTRA_BODY, body);
        try {
            ContextCompat.startForegroundService(context, ring);
        } catch (IllegalStateException refused) {
            // Android refuses a service started from an inexact alarm, which is
            // all it allows without the exact-alarm permission. One chime is
            // worse than ringing, and better than nothing.
            notifications.notify(
                Alarms.notificationId(kind),
                Alarms.notification(context, Alarms.TIMER_FALLBACK_CHANNEL, title, body).setAutoCancel(true).build()
            );
        }
    }
}
