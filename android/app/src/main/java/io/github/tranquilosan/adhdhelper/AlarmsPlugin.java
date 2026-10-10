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

/** The page's handle on {@link Alarms}; see src/lib/native-alarm.ts. */
@CapacitorPlugin(
    name = "Alarms",
    permissions = { @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications") }
)
public class AlarmsPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        String kind = kind(call);
        // Not getDouble: an epoch in milliseconds is too big for an int, so the
        // bridge's JSON parser hands it over as a Long, and getDouble returns null
        // for a Long - which once left every alarm unset.
        Object at = call.getData().opt("at");
        if (kind == null || !(at instanceof Number)) {
            call.reject("kind and a numeric at are required");
            return;
        }
        Alarms.schedule(getContext(), kind, ((Number) at).longValue(), call.getString("title", ""), call.getString("body", ""));
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String kind = kind(call);
        if (kind == null) {
            call.reject("kind is required");
            return;
        }
        Alarms.cancel(getContext(), kind);
        call.resolve();
    }

    /** Without it the timer still rings, but the Stop button and the end of
     *  the day's notice never appear. */
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

    /** Only the two kinds the app knows; anything else is a bug in the page. */
    private static String kind(PluginCall call) {
        String kind = call.getString("kind");
        return Alarms.TIMER.equals(kind) || Alarms.DAY.equals(kind) ? kind : null;
    }
}
