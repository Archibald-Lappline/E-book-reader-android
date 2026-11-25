# 📚 Material E-Reader & Audiobooks (Android & Web)

[Русский](./README.md) | **English**

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Capacitor Android](https://img.shields.io/badge/Capacitor-Android_8.5-119EFF.svg)](https://capacitorjs.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_First-success.svg)](https://web.dev/progressive-web-apps/)

**Material E-Reader & Audiobooks** is a modern, fast and fully open-source app for reading e-books and listening to audiobooks. It follows **Google Material Design 3** and is built for Android devices and modern web browsers.

It works offline and has a realistic 3D page-turn effect, audio file uploads, custom collections and volumes, an audio player with a sleep timer, quotes and notes, and an automated APK build with a single permanent signing key for seamless updates. The interface is available in Russian and English.

---

## ✨ Key features

### 📖 Reading books
- **Formats**: EPUB, FB2, PDF, TXT, MD, and comics/manga in CBZ.
- **Full-text search**: the magnifier button in the reader's top bar, with arrows to jump between matches.
- **Notes, colored highlights and bookmarks**, with Markdown export.
- **Text settings**: typeface, font size, line spacing, alignment and margins; 7 color themes and page-turn animations.

### 🎧 Audiobooks and the built-in player
- **Upload any audio files**: `.mp3`, `.m4a`, `.aac`, `.wav`, `.ogg`, `.flac`, straight from the phone's storage.
- **Drag & Drop**: reorder audio files and volumes in any collection by dragging the `⋮⋮` handle or using the arrows.
- **Duplicate detection**: a warning when you try to add an audio file that is already in the library, with the option to upload only the new files or skip the duplicates.
- **Custom collections and series**:
    - Create your own collections (series, cycles, volumes, chapters).
    - Rename collections and individual tracks.
    - Set and replace custom covers for collections and tracks.
    - Add, sort and delete audiobooks and collections.
- **Full-featured audio player**:
    - **Automatic playback of the next file**: when one file in a collection ends, the next one starts right away.
    - **Mini player** at the bottom of the screen for quick access while browsing.
    - **Full-screen player** with the cover, a seek slider and a chapter list.
    - **Close or minimize the player** at any time.
    - **15-second skip** forward and back.
    - **Playback speed** from 0.5x to 3.0x in 0.25x steps.
    - **Sleep timer**: stops playback after a set time (5–60 minutes) or at the end of the current chapter/track.
    - **Live progress**: the listened percentage of each volume and collection updates in real time in the player and in the library.
    - **Reliable background playback (Foreground Service & AudioFocus)**: the native `AudioPlaybackService` with the `mediaPlayback` type and a `PARTIAL_WAKE_LOCK` keeps the CPU awake and stops the system from freezing or killing the app while it is minimized or other apps are in use.
    - **Seamless switch to the next file with the screen off**: the next volume is pre-buffered and the audio source is switched synchronously in the `ended` event, without timer delays.
    - **MediaSession integration**: control playback from the Android notification shade, the lock screen and Bluetooth headset buttons.

### 📱 Mobile interface and Android optimization
- **Swipe between "Books" and "Audiobooks"**: switch between the book and audiobook libraries with a horizontal swipe, with a smooth animation and haptic feedback.
- **"+" button in the center of the bottom bar**: it sits between the "Books" and "Audiobooks" tabs. On the "Books" tab it opens the book file picker. On the "Audiobooks" tab it opens a menu with two buttons, "Create collection" and "Add audiobook", and the "+" turns into an "×". Inside an open collection the "+" is hidden, because the collection has its own "Add volume" button.
- **Adapts to Android system navigation**: the bottom bar, mini player and pop-up panels are raised by the height of the system navigation, so three-button navigation no longer covers the interface.
- **Russian and English interface**: choose the app language in "App appearance" → "App language". It applies immediately, without a restart.
- **Consistent headers**: the "Books" and "Audiobooks" sections share one style (theme/settings indicator, item counter, source code and refresh).
- **Long-press selection**: hold your finger on a book or audio card (~450 ms). You'll feel a vibration, the card gets selected, and the bulk-action bar opens (delete, move to a collection, reset progress).
- **Smooth GPU-accelerated UI**: the app appearance sheet avoids heavy `backdrop-blur` effects and is tuned for lag-free 60/120 FPS on any Android device.
- **Smart toast placement**: pop-ups and toasts sit below punch-hole cameras, notches and Dynamic Island.
- **Predictive Back Gesture**: supports the system back gestures of Android 14/15/16 (Google Pixel 8a/9/10a, Samsung One UI, Xiaomi HyperOS) without accidentally minimizing the app.
- **Safe-area insets (`safe-area-inset-top` / `safe-area-inset-bottom`)**: correct spacing for camera cutouts, the status bar and the system navigation bar.
- **100% offline and private**: all books, audio files, bookmarks and progress are stored locally on the device in IndexedDB.

---

### 🎨 Setting your own icon before building the APK
To give the app your own home-screen icon on Android:
1. Prepare a square icon image, PNG or WEBP, ideally 512×512 or 1024×1024 pixels.
2. Run:
   ```bash
   npm run cap:open
   ```
   *This opens the project in Android Studio.*
3. In the project tree on the left, expand `app` ➔ `src` ➔ `main` ➔ `res`.
4. **Right-click** the `res` folder ➔ **New** ➔ **Image Asset**.
5. In the dialog:
    - Click the folder icon in the **Path** field and choose your image.
    - Use the **Resize** slider so the logo fits nicely in both the round and square masks.
    - Click **Next** ➔ **Finish**.
6. Build the APK via **Build** ➔ **Build Bundle(s) / APK(s)** ➔ **Build APK(s)** (or run `npm run build:apk` in a terminal).

*Android Studio generates every icon size for all screen densities (`mipmap-mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`).*

---

## 🚀 Quick start for web development

### Requirements
- **Node.js** 18+ (20 or 22 LTS recommended)
- **npm**, **pnpm** or **bun**

### Install and run
```bash
# 1. Clone the repository
git clone https://github.com/Archibald-Lappline/E-book-reader-android.git
cd E-book-reader-android

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```
Open `http://localhost:3000` in your browser.

### Build the web version
```bash
npm run build
```
The compiled static files go to the `dist/` folder.

---

## 📱 Building the Android APK and updates

The project uses **Capacitor 8.5** and includes a ready Android project in the `android/` folder.

### 🔄 Seamless updates over the installed version
The project has a single permanent signing key, `android/app/release-key.jks`, and increments `versionCode` automatically.
- You can **install new APKs over the installed app** without uninstalling it and without the "App not installed as package conflicts with an existing package" error.
- All your books, audiobooks, bookmarks, notes and listening progress are kept.

---

### Option 1: Automatic cloud build with GitHub Actions (recommended)
The repository includes the `.github/workflows/build-apk.yml` workflow:
1. Push the project to your GitHub repository.
2. Open the **Actions** tab of the repository.
3. Choose the **"Build Android APK"** workflow in the left column.
4. Click **"Run workflow"**.
5. After 2–3 minutes, an archive with the signed `app-debug.apk` and `app-release.apk` appears under **Artifacts**.
6. *(Optional)* When you push a tag such as `v1.0.0` (`git tag v1.0.0 && git push origin v1.0.0`), GitHub Actions attaches the APKs to a GitHub release automatically.

### Option 2: One-command local build (requires the Android SDK)
```bash
npm run build:apk
```
The installable file will be at:
`android/app/build/outputs/apk/debug/app-debug.apk`.

### Option 3: In Android Studio
1. Sync the web build with the Android project:
   ```bash
   npm run cap:build
   ```
2. Open the Android project:
   ```bash
   npm run cap:open
   ```
3. In Android Studio choose **Build ➔ Build Bundle(s) / APK(s) ➔ Build APK(s)**.

### Option 4: Install as a PWA on your phone
The app supports the **Progressive Web App** standard:
1. Open the site in Chrome on your phone.
2. In the `⋮` menu, choose **"Add to Home screen"** (or "Install app").
3. The app is added to your home screen, runs full-screen and works fully offline.

---

## 🛡️ FAQ: installing the APK

1. **Chrome says "This type of file can harm your device"**:
   Chrome shows this for any `.apk` downloaded directly from the internet (outside Google Play). Tap **"Download anyway"**. The app's code is fully open under the MIT license.
2. **Google Play Protect: "Play Protect doesn't recognize this app's developer"**:
   Tap **"More details"** in the dialog and choose **"Install anyway"**. Android does this for independent open-source apps published without a paid Google Play Console account.
3. **Permission to install unknown apps**:
   The first time you open the APK, allow *"Allow from this source"* for Chrome or the Files app in the system settings.

---

## 📂 Project structure

```text
├── .github/
│   ├── workflows/
│   │   ├── build-apk.yml       # Signed APK build in GitHub Actions
│   │   └── ci.yml              # TypeScript type checking and linting
│   └── ISSUE_TEMPLATE/         # Bug report and feature request templates
├── android/                    # Native Android Studio project
│   └── app/
│       ├── release-key.jks     # Permanent signing key for update compatibility
│       ├── build.gradle        # Signing config and versionCode auto-increment
│       └── src/main/           # AndroidManifest, resources, icons, Java sources
├── public/
│   ├── manifest.json           # PWA manifest for Android
│   ├── fonts/                  # Bundled fonts (OpenDyslexic and others)
│   └── gifs/                   # Celebration animations
├── src/
│   ├── components/             # UI components
│   │   ├── audio/              # Audiobook module
│   │   │   ├── AudiobookLibraryView.tsx # Audiobook and collection library
│   │   │   ├── AudioPlayerModal.tsx     # Full-screen player with timer and speed
│   │   │   ├── MiniAudioPlayer.tsx      # Compact mini player at the bottom
│   │   │   ├── EditCollectionModal.tsx  # Create and edit collections
│   │   │   ├── EditTrackModal.tsx       # Edit audio files and covers
│   │   │   └── AudioIcons.tsx           # 15-second skip icons
│   │   ├── ReaderView.tsx      # E-book reader (3D pages, columns)
│   │   ├── LibraryView.tsx     # Book library, search, sorting, filters
│   │   ├── SettingsSheet.tsx   # Fonts, spacing, alignment, margins
│   │   ├── AppAppearanceModal.tsx # App appearance and language picker
│   │   ├── SourceCodeModal.tsx # Source code and update check
│   │   ├── TextSelectionToolbar.tsx # Notes and highlights toolbar
│   │   └── ...
│   ├── i18n/
│   │   ├── index.ts            # tr() translation function and current language
│   │   └── en.ts               # English translations (keyed by the Russian text)
│   ├── context/
│   │   └── AudioPlayerContext.tsx # Global audio player and background audio context
│   ├── services/
│   │   ├── audioStorage.ts     # Local audiobook storage in IndexedDB
│   │   ├── parser.ts           # EPUB, FB2, PDF, TXT, MD, CBZ parser
│   │   └── storage.ts          # Local storage for books and notes
│   ├── utils/
│   │   ├── androidBackNavigation.ts # Android system back gesture handler
│   │   ├── useUpdateCheck.ts   # Checks GitHub for new releases
│   │   └── themeConfig.ts      # Color palettes and fonts
│   ├── types.ts                # TypeScript interfaces
│   ├── App.tsx                 # Root component (Books / Audiobooks tabs, bottom bar)
│   └── main.tsx                # Vite entry point
├── capacitor.config.ts         # Capacitor mobile app config
├── CONTRIBUTING.md             # Contributor guide
├── LICENSE                     # MIT license
└── package.json                # Dependencies and npm scripts
```

---

## 🌐 Translating the interface

UI text is wrapped in the `tr()` function from `src/i18n`. The translation key is the original Russian text:

```tsx
import { tr } from '../i18n';

<span>{tr("Добавить книгу")}</span>
showToast(tr`Удалено книг: ${count}`);
```

Add the English version to `src/i18n/en.ts`. In templates, values are marked with `{}`:

```ts
"Добавить книгу": "Add book",
"Удалено книг: {}": "Books deleted: {}",
```

If a translation is missing, the Russian text is shown.

---

## 🤝 Contributing

Ideas, pull requests and suggestions are welcome! Please read [CONTRIBUTING.en.md](./CONTRIBUTING.en.md) before opening a PR.

## 📄 License

The project is released under the **[MIT License](./LICENSE)**. You are free to use, modify and distribute the source code.