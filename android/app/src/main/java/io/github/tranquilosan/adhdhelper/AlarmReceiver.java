package io.github.tranquilosan.adhdhelper;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

/** Woken by the system when the timer runs out. */
public class AlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String title = TimerAlarm.title(context);
        String body = TimerAlarm.body(context);
        TimerAlarm.markFired(context);
        TimerAlarm.createChannels(context);

        Intent ring = new Intent(context, AlarmService.class)
            .putExtra(AlarmService.EXTRA_TITLE, title)
            .putExtra(AlarmService.EXTRA_BODY, body);
        try {
            ContextCompat.startForegroundService(context, ring);
        } catch (IllegalStateException refused) {
            // Android refuses a service started from an inexact alarm, which is
            // all it allows without the exact-alarm permission. One chime is
            // worse than ringing, and better than nothing.
            context
                .getSystemService(NotificationManager.class)
                .notify(TimerAlarm.NOTIFICATION_ID, TimerAlarm.notification(context, TimerAlarm.FALLBACK_CHANNEL, title, body).build());
        }
    }
}
