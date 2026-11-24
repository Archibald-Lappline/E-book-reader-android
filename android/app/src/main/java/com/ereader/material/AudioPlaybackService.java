package com.ereader.material;

import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

/**
 * Foreground Service for persistent audiobook playback in background and lockscreen.
 * Prevents Android OS CGroup freezer and Low Memory Killer from throttling or pausing audio
 * when the app is minimized or while other apps are actively used.
 */
public class AudioPlaybackService extends Service {
    public static final String ACTION_START = "com.ereader.material.action.START_FOREGROUND";
    public static final String ACTION_STOP = "com.ereader.material.action.STOP_FOREGROUND";
    public static final int NOTIFICATION_ID = 1001;

    public static volatile Notification latestNotification = null;
    private static AudioPlaybackService instance;
    private final IBinder binder = new LocalBinder();
    private boolean isForegroundRunning = false;
    private PowerManager.WakeLock serviceWakeLock;

    public class LocalBinder extends Binder {
        public AudioPlaybackService getService() {
            return AudioPlaybackService.this;
        }
    }

    public static AudioPlaybackService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        acquireServiceWakeLock();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        instance = this;
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                stopForegroundService();
                return START_NOT_STICKY;
            }
        }

        // On Android 8.0+, startForeground MUST be called synchronously within seconds of startForegroundService()
        if (latestNotification != null) {
            startForegroundWithNotification(latestNotification);
        }
        acquireServiceWakeLock();
        return START_STICKY;
    }

    private synchronized void acquireServiceWakeLock() {
        try {
            if (serviceWakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    serviceWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ereader:PlaybackServiceWakeLock");
                    serviceWakeLock.setReferenceCounted(false);
                }
            }
            if (serviceWakeLock != null && !serviceWakeLock.isHeld()) {
                serviceWakeLock.acquire(4 * 60 * 60 * 1000L); // Max 4 hours safety timeout
            }
        } catch (Exception ignored) {}
    }

    private synchronized void releaseServiceWakeLock() {
        try {
            if (serviceWakeLock != null && serviceWakeLock.isHeld()) {
                serviceWakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    private void startForegroundWithNotification(Notification notification) {
        if (notification == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // Android 10+ (API 29+)
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
            isForegroundRunning = true;
            acquireServiceWakeLock();
        } catch (Exception ignored) {}
    }

    public void updateNotification(Notification notification, boolean isPlaying) {
        if (notification == null) return;
        latestNotification = notification;
        try {
            if (isPlaying) {
                startForegroundWithNotification(notification);
            } else {
                // Keep notification visible in shade without immediately terminating service during pause/track switch
                if (isForegroundRunning) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        stopForeground(STOP_FOREGROUND_DETACH);
                    } else {
                        stopForeground(false);
                    }
                    isForegroundRunning = false;
                }
                releaseServiceWakeLock();
            }
        } catch (Exception ignored) {}
    }

    public void stopForegroundService() {
        releaseServiceWakeLock();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
        } catch (Exception ignored) {}
        isForegroundRunning = false;
        latestNotification = null;
        stopSelf();
    }

    @Override
    public void onDestroy() {
        releaseServiceWakeLock();
        if (instance == this) {
            instance = null;
        }
        isForegroundRunning = false;
        super.onDestroy();
    }
}
