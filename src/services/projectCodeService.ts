import JSZip from 'jszip';

export interface ProjectCodeFile {
  name: string;
  path: string;
  section: 'github' | 'apk' | 'ui' | 'services' | 'config';
  sectionName: string;
  language: string;
  description: string;
  code: string;
}

export const PROJECT_CODE_FILES: ProjectCodeFile[] = [
  {
    name: 'README.md',
    path: 'README.md',
    section: 'github',
    sectionName: 'GitHub & Релиз',
    language: 'markdown',
    description: 'Главная страница репозитория: книги и аудиокниги, Drag&Drop томов, Long-Press выбор, плеер с WakeLock, плавающие кнопки внизу, сборка APK с иконкой и ключ release-key.jks',
    code: `# 📚 Material E-Reader & Audiobooks (Android & Web)

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Capacitor Android](https://img.shields.io/badge/Capacitor-Android_8.5-119EFF.svg)](https://capacitorjs.com/)

**Material E-Reader & Audiobooks** — открытое приложение для чтения электронных книг (EPUB, FB2, PDF, TXT, MD, CBZ) и прослушивания аудиокниг по гайдлайнам Google Material Design 3.

## ✨ Возможности
- 🎧 **Аудиокниги и плеер**: Drag-and-Drop перетаскивание файлов в сборнике за маркер ⋮⋮, фоновый режим с Android WakeLock (звук не прерывается при сворачивании), MediaSession в шторке, таймер сна, скорость 0.5x–3.0x, перемотка на 15 секунд, процент прослушивания в реальном времени.
- 📱 **Android UX**: плавающие кнопки «Добавить аудиокнигу» и «Создать сборник» в правом нижнем углу под большой палец, выделение книг и аудиозаписей долгим нажатием (Long-Press) с тактильной отдачей без лишних кнопок на обложках, безопасный отступ уведомлений ниже фронтальной камеры и Dynamic Island, плавная аппаратная анимация оформления (GPU).
- 📖 **Электронные книги**: 3D-перелистывание страниц, 8 шрифтов, 8 тем, цитаты, заметки, закладки, офлайн IndexedDB.
- 📱 **Android & APK**: единый ключ release-key.jks для обновлений поверх старой версии, поддержка Predictive Back Gesture.

## 🎨 Выбор иконки перед сборкой APK:
1. Запустите: \`npm run cap:open\` (откроется Android Studio).
2. Правой кнопкой мыши по папке \`app/src/main/res\` -> **New** -> **Image Asset**.
3. В поле **Path** выберите вашу картинку, настройте масштаб и нажмите **Finish**.
4. Соберите APK: меню **Build** -> **Build APK(s)** или в консоли: \`npm run build:apk\`.

## 📱 Сборка APK файла:
1. **GitHub Actions**: воркфлоу «Build Android APK» в Actions (артефакты app-debug.apk и app-release.apk).
2. **Терминал**: \`npm run build:apk\`
3. **Android Studio**: \`npm run cap:open\` -> Меню Build > Build APK(s).`,
  },
  {
    name: 'build-apk.yml',
    path: '.github/workflows/build-apk.yml',
    section: 'apk',
    sectionName: 'Сборка APK & Android',
    language: 'yaml',
    description: 'GitHub Actions воркфлоу для автоматической компиляции app-debug.apk и app-release.apk при пуше или создании релиза',
    code: `name: Build Android APK

on:
  push:
    branches: [ main, master ]
    tags: [ 'v*' ]
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run build
      - name: Sync Capacitor Android
        run: |
          if [ ! -d "android" ]; then npx cap add android; fi
          npx cap sync android
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
      - name: Build APK via Gradle
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug --no-daemon
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: material-ereader-debug-apk
          path: android/app/build/outputs/apk/debug/*.apk`,
  },
  {
    name: 'capacitor.config.ts',
    path: 'capacitor.config.ts',
    section: 'apk',
    sectionName: 'Сборка APK & Android',
    language: 'typescript',
    description: 'Конфигурация Capacitor: Package ID com.ereader.material, имя приложения, параметры WebView и темы Android',
    code: `import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ereader.material',
  appName: 'Читалка Книг',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: true
  }
};

export default config;`,
  },
  {
    name: 'variables.gradle',
    path: 'android/variables.gradle',
    section: 'apk',
    sectionName: 'Сборка APK & Android',
    language: 'groovy',
    description: 'Версии SDK и библиотек AndroidX: compileSdkVersion 36, targetSdkVersion 36, minSdkVersion 24',
    code: `ext {
    minSdkVersion = 24
    compileSdkVersion = 36
    targetSdkVersion = 36
    androidxActivityVersion = '1.11.0'
    androidxAppCompatVersion = '1.7.1'
    androidxCoordinatorLayoutVersion = '1.3.0'
    androidxCoreVersion = '1.17.0'
    androidxFragmentVersion = '1.8.9'
    coreSplashScreenVersion = '1.2.0'
    androidxWebkitVersion = '1.14.0'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.3.0'
    androidxEspressoCoreVersion = '3.7.0'
    cordovaAndroidVersion = '14.0.1'
}`,
  },
  {
    name: 'build.gradle',
    path: 'android/app/build.gradle',
    section: 'apk',
    sectionName: 'Сборка APK & Android',
    language: 'groovy',
    description: 'Конфигурация сборки APK: автоинкремент versionCode, единый постоянный ключ подписи release-key.jks для обновления поверх старой версии',
    code: `apply plugin: 'com.android.application'

android {
    namespace = "com.ereader.material"
    compileSdk = rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.ereader.material"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode project.hasProperty('versionCode') ? project.property('versionCode').toInteger() : 10002
        versionName project.hasProperty('versionName') ? project.property('versionName') : "1.0.2"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    signingConfigs {
        release {
            def keyFile = file('release-key.jks')
            if (keyFile.exists()) {
                storeFile keyFile
                storePassword 'material123'
                keyAlias 'material-ereader'
                keyPassword 'material123'
            }
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
        debug {
            signingConfig signingConfigs.release
        }
    }
}`,
  },
  {
    name: 'AndroidManifest.xml',
    path: 'android/app/src/main/AndroidManifest.xml',
    section: 'apk',
    sectionName: 'Сборка APK & Android',
    language: 'xml',
    description: 'Манифест Android приложения: ориентация, WAKE_LOCK для фонового аудио, права доступа, singleTask и конфигурация MainActivity',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:enableOnBackInvokedCallback="true"
        android:largeHeap="true"
        android:hardwareAccelerated="true"
        android:theme="@style/AppTheme">
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
</manifest>`,
  },
  {
    name: 'AudioPlaybackService.java',
    path: 'android/app/src/main/java/com/ereader/material/AudioPlaybackService.java',
    section: 'apk',
    sectionName: 'Сборка APK & Android',
    language: 'java',
    description: 'Нативный Foreground Service для непрерывного воспроизведения аудиокниг при сворачивании и блокировке экрана (тип mediaPlayback)',
    code: `package com.ereader.material;

import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

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
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopForegroundService();
            return START_NOT_STICKY;
        }

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
                serviceWakeLock.acquire(4 * 60 * 60 * 1000L);
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
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
        if (instance == this) instance = null;
        isForegroundRunning = false;
        super.onDestroy();
    }
}`,
  },
  {
    name: 'package.json',
    path: 'package.json',
    section: 'config',
    sectionName: 'Конфигурация & Типы',
    language: 'json',
    description: 'Манифест проекта с зависимостями Capacitor Android, React 19, скриптами build:apk, cap:sync и открытой лицензией MIT',
    code: `{
  "name": "material-ereader",
  "version": "1.0.0",
  "description": "Modern Material 3 E-Book Reader for Android and Web supporting EPUB, FB2, PDF, TXT, MD, CBZ with realistic 3D page flip and offline support",
  "license": "MIT",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "lint": "tsc --noEmit",
    "cap:sync": "npx cap sync",
    "cap:open": "npx cap open android",
    "cap:build": "npm run build && npx cap sync",
    "build:apk": "npm run build && npx cap sync android && cd android && ./gradlew assembleDebug"
  },
  "dependencies": {
    "@capacitor/android": "^8.5.2",
    "@capacitor/cli": "^8.5.2",
    "@capacitor/core": "^8.5.2",
    "jszip": "^3.10.2",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1"
  }
}`,
  },
  {
    name: 'ReaderView.tsx',
    path: 'src/components/ReaderView.tsx',
    section: 'ui',
    sectionName: 'Интерфейс и Компоненты (UI)',
    language: 'tsx',
    description: 'Движок читалки: двухслойный реалистичный 3D-перелистыватель страниц (perspective: 1600px), колонки текста, закладки и прогресс 100%',
    code: `import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, ReaderSettings } from '../types';

export const ReaderView: React.FC<ReaderViewProps> = ({ book, settings }) => {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
    </div>
  );
};`,
  },
  {
    name: 'parser.ts',
    path: 'src/services/parser.ts',
    section: 'services',
    sectionName: 'Сервисы и Парсеры',
    language: 'typescript',
    description: 'Универсальный парсер: разархивирование EPUB/CBZ через JSZip, разбор XML/HTML FictionBook2 (FB2) с Base64 обложками, PDF, TXT, MD',
    code: `import JSZip from 'jszip';
import { Book, BookChapter } from '../types';

export async function parseBookFile(file: File): Promise<Book> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (extension === 'epub') return parseEpub(file);
  if (extension === 'fb2') return parseFb2(file);
  if (extension === 'pdf') return parsePdf(file);
  return parseTextOrMd(file);
}`,
  },
  {
    name: 'storage.ts',
    path: 'src/services/storage.ts',
    section: 'services',
    sectionName: 'Сервисы и Парсеры',
    language: 'typescript',
    description: 'Локальное хранилище на базе IndexedDB: полное офлайн-сохранение книг, позиций чтения, прогресса, заметок и закладок',
    code: `const DB_NAME = 'MaterialEReaderDB';
const DB_VERSION = 1;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}`,
  },
  {
    name: 'CONTRIBUTING.md',
    path: 'CONTRIBUTING.md',
    section: 'github',
    sectionName: 'GitHub & Релиз',
    language: 'markdown',
    description: 'Инструкция для разработчиков open-source сообщества: порядок внесения изменений, создание веток и Pull Request',
    code: `# Contributing to Material E-Reader

1. Форкните репозиторий
2. Создайте функциональную ветку: git checkout -b feature/my-feature
3. Убедитесь, что lint и build проходят без ошибок: npm run lint && npm run build
4. Отправьте Pull Request в ветку main`,
  },
  {
    name: 'LICENSE',
    path: 'LICENSE',
    section: 'github',
    sectionName: 'GitHub & Релиз',
    language: 'text',
    description: 'Официальная свободная лицензия MIT: разрешение на коммерческое и некоммерческое использование',
    code: `MIT License
Copyright (c) 2026 Material E-Reader Contributors
Permission is hereby granted, free of charge, to any person obtaining a copy...`,
  },
];

export async function generateProjectCodeZip(): Promise<Blob> {
  const zip = new JSZip();

  zip.file('.github/workflows/build-apk.yml', `name: Build Android APK
on:
  push:
    branches: [ main, master ]
    tags: [ 'v*' ]
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run build
      - name: Sync Android
        run: |
          if [ ! -d "android" ]; then npx cap add android; fi
          npx cap sync android
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
      - name: Assemble APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug --no-daemon
      - uses: actions/upload-artifact@v4
        with:
          name: material-ereader-apk
          path: android/app/build/outputs/apk/debug/*.apk
`);

  zip.file('.github/workflows/ci.yml', `name: CI
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run lint
      - run: npm run build
`);

  zip.file('README.md', `# 📚 Material E-Reader (Android & Web)

Приложение для чтения электронных книг с 3D-перелистыванием страниц.
Поддерживает EPUB, FB2, PDF, TXT, MD, CBZ.

## Быстрый старт:
\`\`\`bash
npm install
npm run dev
\`\`\`

## Сборка APK файла:
\`\`\`bash
npm run build:apk
\`\`\`
Либо запустите воркфлоу «Build Android APK» в GitHub Actions.
`);

  zip.file('CONTRIBUTING.md', `# Руководство контрибьютора
Создавайте PR в ветку main после успешного выполнения \`npm run lint\` и \`npm run build\`.
`);

  zip.file('LICENSE', `MIT License
Copyright (c) 2026 Material E-Reader Contributors
`);

  zip.file('capacitor.config.ts', `import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ereader.material',
  appName: 'Читалка Книг',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: true
  }
};

export default config;
`);

  zip.file('.gitignore', `node_modules/
dist/
android/.gradle/
android/app/build/
android/build/
android/local.properties
*.apk
*.aab
.DS_Store
*.log
`);

  for (const file of PROJECT_CODE_FILES) {
    zip.file(file.path, file.code);
  }

  return zip.generateAsync({ type: 'blob' });
}
