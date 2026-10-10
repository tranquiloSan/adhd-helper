package io.github.tranquilosan.adhdhelper;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** The page's handle on {@link TimerAlarm}; see src/lib/native-alarm.ts. */
@CapacitorPlugin(
    name = "TimerAlarm",
    permissions = { @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications") }
)
public class TimerAlarmPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        Double at = call.getDouble("at");
        if (at == null) {
            call.reject("at is required");
            return;
        }
        TimerAlarm.schedule(getContext(), at.longValue(), call.getString("title", "Time is up"), call.getString("body", ""));
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        TimerAlarm.cancel(getContext());
        call.resolve();
    }

    /** Without it the alarm still rings, but the Stop button never appears. */
    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve();
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationsAnswered");
    }

    @PermissionCallback
    private void notificationsAnswered(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void batteryStatus(PluginCall call) {
        PowerManager power = getContext().getSystemService(PowerManager.class);
        JSObject result = new JSObject();
        result.put("restricted", !power.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        call.resolve(result);
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        Intent ask = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName()));
        try {
            getActivity().startActivity(ask);
        } catch (ActivityNotFoundException missing) {
            // Some ROMs drop the direct prompt; the list is the next best thing.
            getActivity().startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
        }
        call.resolve();
    }
}
