package io.github.tranquilosan.adhdhelper;

import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.media.ToneGenerator;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.ServiceCompat;

/**
 * Rings until stopped, from the notification or from the app.
 *
 * A notification's own sound plays once, and a single chime is the main way a
 * timer fails someone in hyperfocus - so the ringing is a foreground service
 * playing the alarm sound on a loop, on the alarm stream, which silent mode and
 * the default Do Not Disturb settings let through.
 */
public class AlarmService extends Service {

    static final String EXTRA_TITLE = "title";
    static final String EXTRA_BODY = "body";
    static final String ACTION_STOP = "io.github.tranquilosan.adhdhelper.STOP_ALARM";

    private static final AudioAttributes ALARM_AUDIO = new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build();

    private MediaPlayer player;
    private ToneGenerator tones;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private PowerManager.WakeLock wakeLock;
    private Vibrator vibrator;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String title = intent == null ? null : intent.getStringExtra(EXTRA_TITLE);
        String body = intent == null ? null : intent.getStringExtra(EXTRA_BODY);
        Alarms.createChannels(this);

        Intent stop = new Intent(this, AlarmService.class).setAction(ACTION_STOP);
        PendingIntent stopIntent = PendingIntent.getService(this, 0, stop, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        ServiceCompat.startForeground(
            this,
            Alarms.notificationId(Alarms.TIMER),
            Alarms.notification(this, Alarms.TIMER_CHANNEL, title == null ? "Time is up" : title, body == null ? "" : body)
                .setOngoing(true)
                .addAction(0, "Stop", stopIntent)
                .build(),
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0
        );

        if (player == null && tones == null) ring();
        return START_NOT_STICKY;
    }

    private void ring() {
        PowerManager power = getSystemService(PowerManager.class);
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "adhd-helper:alarm");
        wakeLock.acquire();

        if (!playAlarmSound()) beep();

        vibrator = getSystemService(Vibrator.class);
        if (vibrator != null && vibrator.hasVibrator()) {
            vibrator.vibrate(VibrationEffect.createWaveform(new long[] { 0, 800, 800 }, 0), ALARM_AUDIO);
        }
    }

    /** The phone's own alarm sound, so it rings the way the person chose. */
    private boolean playAlarmSound() {
        Uri sound = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM);
        if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (sound == null) return false;
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(ALARM_AUDIO);
            player.setDataSource(this, sound);
            player.setLooping(true);
            player.prepare();
            player.start();
            return true;
        } catch (Exception unplayable) {
            if (player != null) player.release();
            player = null;
            return false;
        }
    }

    /** Some ROMs ship with no alarm sound set; beep rather than stay silent. */
    private void beep() {
        tones = new ToneGenerator(AudioManager.STREAM_ALARM, ToneGenerator.MAX_VOLUME);
        handler.post(
            new Runnable() {
                @Override
                public void run() {
                    if (tones == null) return;
                    tones.startTone(ToneGenerator.TONE_PROP_BEEP2, 1000);
                    handler.postDelayed(this, 2000);
                }
            }
        );
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (player != null) {
            player.stop();
            player.release();
            player = null;
        }
        if (tones != null) {
            tones.release();
            tones = null;
        }
        if (vibrator != null) vibrator.cancel();
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
