package com.ereader.material;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Base64;
import android.view.KeyEvent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.ValueCallback;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends BridgeActivity {
    private static final String CHANNEL_ID = "audiobook_playback_channel";
    private static final int NOTIFICATION_ID = AudioPlaybackService.NOTIFICATION_ID;
    private static final int PERMISSION_REQ_POST_NOTIFICATIONS = 101;

    private static final String ACTION_TOGGLE_PLAY = "com.ereader.material.ACTION_TOGGLE_PLAY";
    private static final String ACTION_REWIND = "com.ereader.material.ACTION_REWIND";
    private static final String ACTION_FORWARD = "com.ereader.material.ACTION_FORWARD";
    private static final String ACTION_PREV = "com.ereader.material.ACTION_PREV";
    private static final String ACTION_NEXT = "com.ereader.material.ACTION_NEXT";
    private static final String ACTION_STOP = "com.ereader.material.ACTION_STOP";

    private MediaSession mediaSession;
    private NotificationManager notificationManager;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private String currentTitle = "Аудиокнига";
    private String currentArtist = "BookSlut";
    private String currentAlbum = "";
    private Bitmap currentCoverBitmap = null;
    private boolean isCurrentlyPlaying = false;
    private boolean hasActiveTrack = false;
    private long currentPosMs = 0;
    private long currentDurMs = 0;
    private float currentSpeed = 1.0f;

    private PowerManager.WakeLock wakeLock;
    private BroadcastReceiver mediaActionReceiver;
    private final android.os.Handler pauseHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private Runnable pauseReleaseRunnable = null;
    private long lastPlaybackStateUpdateTime = 0;


    private BroadcastReceiver screenStateReceiver;
    private boolean isActivityStopped = false;
    private static final long KEEP_ALIVE_INTERVAL_MS = 5000;
    private final Runnable keepAliveRunnable = new Runnable() {
        @Override
        public void run() {
            if (isCurrentlyPlaying) {
                keepWebViewAwake();
                pauseHandler.postDelayed(this, KEEP_ALIVE_INTERVAL_MS);
            }
        }
    };

    private void keepWebViewAwake() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().onResume();
            getBridge().getWebView().resumeTimers();
        }
    }

    private void startKeepAlive() {
        pauseHandler.removeCallbacks(keepAliveRunnable);
        pauseHandler.postDelayed(keepAliveRunnable, KEEP_ALIVE_INTERVAL_MS);
    }

    private void stopKeepAlive() {
        pauseHandler.removeCallbacks(keepAliveRunnable);
    }

    private void registerScreenStateReceiver() {
        screenStateReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (!isCurrentlyPlaying) return;

                keepWebViewAwake();
                pauseHandler.postDelayed(MainActivity.this::keepWebViewAwake, 300);
                pauseHandler.postDelayed(MainActivity.this::keepWebViewAwake, 1500);
                acquireWakeLock();
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_USER_PRESENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenStateReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(screenStateReceiver, filter);
        }
    }

    private void maybeRequestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm == null || pm.isIgnoringBatteryOptimizations(getPackageName())) return;
            SharedPreferences prefs = getSharedPreferences("audio_prefs", MODE_PRIVATE);
            if (prefs.getBoolean("battery_opt_asked", false)) return;
            prefs.edit().putBoolean("battery_opt_asked", true).apply();
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } catch (Exception ignored) {}
    }

    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private boolean hasAudioFocus = false;
    private boolean resumeOnFocusGain = false;
    private boolean isDucked = false;
    private final AudioManager.OnAudioFocusChangeListener audioFocusListener = focusChange -> {
        switch (focusChange) {
            case AudioManager.AUDIOFOCUS_GAIN:
                hasAudioFocus = true;
                if (resumeOnFocusGain) {
                    resumeOnFocusGain = false;
                    isDucked = false;
                    sendActionToWeb("focusResume", null);
                } else if (isDucked) {
                    isDucked = false;
                    sendActionToWeb("unduck", null);
                }
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                if (isCurrentlyPlaying) {
                    isDucked = true;
                    sendActionToWeb("duck", null);
                }
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                if (isCurrentlyPlaying) {
                    resumeOnFocusGain = true;
                    sendActionToWeb("focusPause", null);
                }
                break;
            case AudioManager.AUDIOFOCUS_LOSS:
                hasAudioFocus = false;
                resumeOnFocusGain = false;
                isDucked = false;
                sendActionToWeb("focusPause", null);
                abandonAudioFocus();
                break;
        }
    };

    private void requestAudioFocus() {
        if (hasAudioFocus) return;
        if (audioManager == null) {
            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        }
        if (audioManager == null) return;
        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (audioFocusRequest == null) {
                AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(attrs)
                        // true = система не приглушает звук сама, а передаёт событие нам
                        .setWillPauseWhenDucked(true)
                        .setAcceptsDelayedFocusGain(false)
                        .setOnAudioFocusChangeListener(audioFocusListener, pauseHandler)
                        .build();
            }
            result = audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            result = audioManager.requestAudioFocus(audioFocusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
        hasAudioFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (audioFocusRequest != null) audioManager.abandonAudioFocusRequest(audioFocusRequest);
        } else {
            audioManager.abandonAudioFocus(audioFocusListener);
        }
        hasAudioFocus = false;
    }

    private void startForegroundServiceCompat(Notification notification) {
        try {
            AudioPlaybackService.latestNotification = notification;
            Intent serviceIntent = new Intent(this, AudioPlaybackService.class);
            serviceIntent.setAction(AudioPlaybackService.ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            AudioPlaybackService svc = AudioPlaybackService.getInstance();
            if (svc != null) {
                svc.updateNotification(notification, true);
            }
        } catch (Exception ignored) {}
    }

    private synchronized void acquireWakeLock() {
        try {
            if (pauseReleaseRunnable != null) {
                pauseHandler.removeCallbacks(pauseReleaseRunnable);
                pauseReleaseRunnable = null;
            }
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ereader:AudioPlaybackWakeLock");
                    wakeLock.setReferenceCounted(false);
                }
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(4 * 60 * 60 * 1000L); // Max 4 hours safety timeout
            }
        } catch (Exception ignored) {}
    }

    private synchronized void releaseWakeLock() {
        try {
            if (pauseReleaseRunnable != null) {
                pauseHandler.removeCallbacks(pauseReleaseRunnable);
                pauseReleaseRunnable = null;
            }
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        super.onPause();
        // Prevent WebView from freezing audio playback or JavaScript timers while background listening
        if ((isCurrentlyPlaying || hasActiveTrack) && getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().onResume();
            getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        isActivityStopped = true;
        if ((isCurrentlyPlaying || hasActiveTrack) && getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().onResume();
            getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        isActivityStopped = false;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
        initMediaSession();
        registerMediaReceiver();
        requestNotificationPermission();

        // Ensure no stale notification is shown on app launch
        hideNotification();

        registerScreenStateReceiver();

        // Register Javascript Interface with Capacitor WebView and allow background audio
        if (getBridge() != null && getBridge().getWebView() != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Процесс отрисовки WebView (в нём играет звук) должен оставаться важным
                // и когда WebView не виден — иначе система может его заморозить.
                getBridge().getWebView().setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
            }
            getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
            getBridge().getWebView().addJavascriptInterface(new MediaBridge(), "AndroidMediaBridge");
        }

        // Native back gesture handling for Android 14, 15, 16 (Pixel 8a, Pixel 9, Pixel 10a)
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function() { if (window.handleAndroidNativeBack) { return window.handleAndroidNativeBack(); } return false; })()",
                        new ValueCallback<String>() {
                            @Override
                            public void onReceiveValue(String value) {
                                if ("false".equals(value) || value == null) {
                                    moveTaskToBack(true);
                                }
                            }
                        }
                    );
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33) { // Android 13+
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    PERMISSION_REQ_POST_NOTIFICATIONS
                );
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Воспроизведение аудиокниг",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Управление воспроизведением аудиокниг в шторке уведомлений");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void initMediaSession() {
        mediaSession = new MediaSession(this, "AudiobookMediaSession");
        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public boolean onMediaButtonEvent(Intent mediaButtonIntent) {
                if (mediaButtonIntent != null && Intent.ACTION_MEDIA_BUTTON.equals(mediaButtonIntent.getAction())) {
                    KeyEvent event = mediaButtonIntent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
                    if (event != null && event.getAction() == KeyEvent.ACTION_DOWN) {
                        int keyCode = event.getKeyCode();
                        switch (keyCode) {
                            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                            case KeyEvent.KEYCODE_HEADSETHOOK:
                                sendActionToWeb("toggle", null);
                                return true;
                            case KeyEvent.KEYCODE_MEDIA_PLAY:
                                sendActionToWeb("play", null);
                                return true;
                            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                                sendActionToWeb("pause", null);
                                return true;
                            case KeyEvent.KEYCODE_MEDIA_NEXT:
                            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                                sendActionToWeb("next", null);
                                return true;
                            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                            case KeyEvent.KEYCODE_MEDIA_REWIND:
                                sendActionToWeb("previous", null);
                                return true;
                        }
                    }
                }
                return super.onMediaButtonEvent(mediaButtonIntent);
            }

            @Override
            public void onPlay() {
                if (!isCurrentlyPlaying) {
                    sendActionToWeb("play", null);
                }
            }

            @Override
            public void onPause() {
                // Ignore spurious system onPause echoes that occur right after playback start or state sync
                if (System.currentTimeMillis() - lastPlaybackStateUpdateTime < 3000) {
                    return;
                }
                if (isCurrentlyPlaying) {
                    sendActionToWeb("pause", null);
                }
            }

            @Override
            public void onSkipToNext() {
                sendActionToWeb("next", null);
            }

            @Override
            public void onSkipToPrevious() {
                sendActionToWeb("previous", null);
            }

            @Override
            public void onFastForward() {
                sendActionToWeb("forward", 15);
            }

            @Override
            public void onRewind() {
                sendActionToWeb("rewind", 15);
            }

            @Override
            public void onSeekTo(long pos) {
                sendActionToWeb("seek", pos / 1000.0);
            }

            @Override
            public void onStop() {
                sendActionToWeb("stop", null);
                hideNotification();
            }
        });
    }

    private void registerMediaReceiver() {
        mediaActionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null || intent.getAction() == null) return;
                String action = intent.getAction();
                switch (action) {
                    case ACTION_TOGGLE_PLAY:
                        sendActionToWeb("toggle", null);
                        break;
                    case ACTION_REWIND:
                        sendActionToWeb("rewind", 15);
                        break;
                    case ACTION_FORWARD:
                        sendActionToWeb("forward", 15);
                        break;
                    case ACTION_PREV:
                        sendActionToWeb("previous", null);
                        break;
                    case ACTION_NEXT:
                        sendActionToWeb("next", null);
                        break;
                    case ACTION_STOP:
                        sendActionToWeb("stop", null);
                        hideNotification();
                        break;
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_TOGGLE_PLAY);
        filter.addAction(ACTION_REWIND);
        filter.addAction(ACTION_FORWARD);
        filter.addAction(ACTION_PREV);
        filter.addAction(ACTION_NEXT);
        filter.addAction(ACTION_STOP);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(mediaActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(mediaActionReceiver, filter);
        }
    }

    private void sendActionToWeb(final String action, final Object param) {
        runOnUiThread(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().onResume();
                getBridge().getWebView().resumeTimers();
                String js;
                if (param != null) {
                    js = String.format("if (window.audioBridgeAction) { window.audioBridgeAction('%s', %s); }", action, param.toString());
                } else {
                    js = String.format("if (window.audioBridgeAction) { window.audioBridgeAction('%s'); }", action);
                }
                getBridge().getWebView().evaluateJavascript(js, null);
            }
        });
    }

    private void updateNotificationAndSession() {
        if (mediaSession == null || !hasActiveTrack) {
            hideNotification();
            return;
        }

        long actions = PlaybackState.ACTION_PLAY
                | PlaybackState.ACTION_PAUSE
                | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_NEXT
                | PlaybackState.ACTION_SKIP_TO_PREVIOUS
                | PlaybackState.ACTION_FAST_FORWARD
                | PlaybackState.ACTION_REWIND
                | PlaybackState.ACTION_SEEK_TO
                | PlaybackState.ACTION_STOP;

        int state = isCurrentlyPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
        PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                .setActions(actions)
                .setState(state, currentPosMs, currentSpeed);

        mediaSession.setPlaybackState(stateBuilder.build());

        MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, currentAlbum)
                .putLong(MediaMetadata.METADATA_KEY_DURATION, currentDurMs);

        if (currentCoverBitmap != null) {
            metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, currentCoverBitmap);
            metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ART, currentCoverBitmap);
        }

        mediaSession.setMetadata(metaBuilder.build());
        if (!mediaSession.isActive()) {
            mediaSession.setActive(true);
        }

        Notification.Builder notifBuilder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notifBuilder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            notifBuilder = new Notification.Builder(this);
        }

        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                this, 0, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent rewindIntent = PendingIntent.getBroadcast(
                this, 1, new Intent(ACTION_REWIND).setPackage(getPackageName()),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent playPauseIntent = PendingIntent.getBroadcast(
                this, 2, new Intent(ACTION_TOGGLE_PLAY).setPackage(getPackageName()),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent forwardIntent = PendingIntent.getBroadcast(
                this, 3, new Intent(ACTION_FORWARD).setPackage(getPackageName()),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent nextIntent = PendingIntent.getBroadcast(
                this, 4, new Intent(ACTION_NEXT).setPackage(getPackageName()),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int playPauseIcon = isCurrentlyPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String playPauseTitle = isCurrentlyPlaying ? "Пауза" : "Играть";

        Notification.Action rewindAction = new Notification.Action.Builder(
                android.R.drawable.ic_media_rew, "Назад 15с", rewindIntent
        ).build();

        Notification.Action playPauseAction = new Notification.Action.Builder(
                playPauseIcon, playPauseTitle, playPauseIntent
        ).build();

        Notification.Action forwardAction = new Notification.Action.Builder(
                android.R.drawable.ic_media_ff, "Вперед 15с", forwardIntent
        ).build();

        Notification.Action nextAction = new Notification.Action.Builder(
                android.R.drawable.ic_media_next, "Следующий", nextIntent
        ).build();

        Notification.MediaStyle mediaStyle = new Notification.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2);

        notifBuilder
                .setContentTitle(currentTitle)
                .setContentText(currentArtist + (currentAlbum.isEmpty() ? "" : " • " + currentAlbum))
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentIntent(contentPendingIntent)
                .setStyle(mediaStyle)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setOngoing(isCurrentlyPlaying)
                .setAutoCancel(false)
                .addAction(rewindAction)
                .addAction(playPauseAction)
                .addAction(forwardAction)
                .addAction(nextAction);

        if (currentCoverBitmap != null) {
            notifBuilder.setLargeIcon(currentCoverBitmap);
        }

        Notification notif = notifBuilder.build();
        if (notificationManager != null) {
            notificationManager.notify(NOTIFICATION_ID, notif);
        }

        if (isCurrentlyPlaying) {
            startForegroundServiceCompat(notif);
        } else {
            AudioPlaybackService svc = AudioPlaybackService.getInstance();
            if (svc != null) {
                svc.updateNotification(notif, false);
            }
        }
    }

    private void hideNotification() {
        if (pauseReleaseRunnable != null) {
            pauseHandler.removeCallbacks(pauseReleaseRunnable);
            pauseReleaseRunnable = null;
        }
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
        if (mediaSession != null) {
            mediaSession.setActive(false);
        }
        releaseWakeLock();
        try {
            AudioPlaybackService svc = AudioPlaybackService.getInstance();
            if (svc != null) {
                svc.stopForegroundService();
            } else {
                Intent serviceIntent = new Intent(this, AudioPlaybackService.class);
                serviceIntent.setAction(AudioPlaybackService.ACTION_STOP);
                startService(serviceIntent);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopKeepAlive();
        if (screenStateReceiver != null) {
            try {
                unregisterReceiver(screenStateReceiver);
            } catch (Exception ignored) {}
        }
        abandonAudioFocus();
        hideNotification();
        releaseWakeLock();
        if (mediaSession != null) {
            mediaSession.release();
        }
        if (mediaActionReceiver != null) {
            try {
                unregisterReceiver(mediaActionReceiver);
            } catch (Exception ignored) {}
        }
        executor.shutdown();
    }

    public class MediaBridge {
        @JavascriptInterface
        public void updateMediaMetadata(final String title, final String artist, final String album, final String coverUrl) {
            runOnUiThread(() -> {
                boolean validTitle = title != null && !title.trim().isEmpty();
                hasActiveTrack = validTitle;

                if (!hasActiveTrack) {
                    hideNotification();
                    return;
                }

                currentTitle = title;
                currentArtist = artist != null && !artist.isEmpty() ? artist : "BookSlut";
                currentAlbum = album != null ? album : "";

                if (coverUrl != null && !coverUrl.isEmpty()) {
                    executor.execute(() -> {
                        Bitmap bmp = null;
                        try {
                            if (coverUrl.startsWith("data:image")) {
                                String base64 = coverUrl.substring(coverUrl.indexOf(",") + 1);
                                byte[] decoded = Base64.decode(base64, Base64.DEFAULT);
                                bmp = BitmapFactory.decodeByteArray(decoded, 0, decoded.length);
                            } else if (coverUrl.startsWith("http://") || coverUrl.startsWith("https://")) {
                                URL url = new URL(coverUrl);
                                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                                conn.setDoInput(true);
                                conn.setConnectTimeout(4000);
                                conn.setReadTimeout(4000);
                                conn.connect();
                                InputStream input = conn.getInputStream();
                                bmp = BitmapFactory.decodeStream(input);
                            }
                        } catch (Exception ignored) {}

                        final Bitmap finalBmp = bmp;
                        runOnUiThread(() -> {
                            currentCoverBitmap = finalBmp;
                            if (hasActiveTrack) {
                                updateNotificationAndSession();
                            }
                        });
                    });
                } else {
                    currentCoverBitmap = null;
                    if (hasActiveTrack) {
                        updateNotificationAndSession();
                    }
                }
            });
        }

        @JavascriptInterface
        public void updatePlaybackState(final boolean isPlaying, final long positionMs, final long durationMs, final float speed) {
            runOnUiThread(() -> {
                lastPlaybackStateUpdateTime = System.currentTimeMillis();
                isCurrentlyPlaying = isPlaying;
                currentPosMs = Math.max(0, positionMs);
                currentDurMs = Math.max(0, durationMs);
                currentSpeed = speed > 0 ? speed : 1.0f;

                if (isCurrentlyPlaying) {
                    if (pauseReleaseRunnable != null) {
                        pauseHandler.removeCallbacks(pauseReleaseRunnable);
                        pauseReleaseRunnable = null;
                    }
                    acquireWakeLock();
                    requestAudioFocus();
                    resumeOnFocusGain = false;
                    startKeepAlive();
                    if (!isActivityStopped) maybeRequestBatteryOptimizationExemption();
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().onResume();
                        getBridge().getWebView().resumeTimers();
                    }
                    if (!hasActiveTrack) {
                        hideNotification();
                        return;
                    }
                    updateNotificationAndSession();
                } else {
                    stopKeepAlive();
                    if (pauseReleaseRunnable != null) {
                        pauseHandler.removeCallbacks(pauseReleaseRunnable);
                    }
                    pauseReleaseRunnable = () -> {
                        releaseWakeLock();
                        if (hasActiveTrack) {
                            updateNotificationAndSession();
                        }
                    };
                    pauseHandler.postDelayed(pauseReleaseRunnable, 15000);
                    if (hasActiveTrack) {
                        updateNotificationAndSession();
                    }
                }
            });
        }

        @JavascriptInterface
        public void stopMedia() {
            runOnUiThread(() -> {
                if (pauseReleaseRunnable != null) {
                    pauseHandler.removeCallbacks(pauseReleaseRunnable);
                    pauseReleaseRunnable = null;
                }
                hasActiveTrack = false;
                isCurrentlyPlaying = false;
                resumeOnFocusGain = false;
                isDucked = false;
                stopKeepAlive();
                abandonAudioFocus();
                releaseWakeLock();
                hideNotification();
            });
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            runOnUiThread(() -> MainActivity.this.requestNotificationPermission());
        }
    }
}
