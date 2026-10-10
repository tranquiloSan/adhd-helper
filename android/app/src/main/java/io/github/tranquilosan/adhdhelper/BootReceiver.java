package io.github.tranquilosan.adhdhelper;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** A reboot clears every alarm; this sets the timer's back. */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            TimerAlarm.restore(context);
        }
    }
}
