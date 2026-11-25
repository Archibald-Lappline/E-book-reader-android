# Contributing Guide

[Русский](./CONTRIBUTING.md) | **English**

Thanks for your interest in **BookSlut**! 📖✨ This guide explains how to run the project, what to check before opening a pull request, and which rules to follow.

---

## 🚀 Quick start

**Requirements:** Node.js 18+ (20 or 22 LTS recommended), npm.

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/E-book-reader-android.git
   cd E-book-reader-android
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   The app opens at `http://localhost:3000`.

---

## 📱 Building the Android APK locally

You need Node.js, **JDK 17+** and Android Studio (or an installed Android SDK).

```bash
# Build the web version and sync it with Capacitor
npm run cap:build

# Open the project in Android Studio
npm run cap:open

# Or build a debug APK with one command
npm run build:apk
```

The output file is `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🐞 Bug reports and feature requests

Before opening an issue, check whether a similar one already exists. Use the templates:

- **Bug report**: what you did, what you expected, and what happened. Include your phone model, Android version, navigation type (gestures or three buttons) and app version. A screenshot or screen recording helps a lot.
- **Feature request**: what problem the idea solves and how you see it working in the interface.

---

## 🔀 Pull request process

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/short-description
   ```
   Use the `fix/` prefix for bug fixes and `docs/` for documentation.
2. Make your changes. One PR, one task.
3. Check that everything builds without errors:
   ```bash
   npm run lint
   npm run build
   ```
   CI (`.github/workflows/ci.yml`) runs the same checks on every PR.
4. Write clear commit messages in the imperative mood, for example `Add a 90-minute sleep timer` or `fix: hide "+" inside a collection`.
5. Push your branch and open a pull request against `main`. Describe what changed and how to test it. For UI changes, attach screenshots.

---

## ✅ Code guidelines

### UI text and translation
The app supports Russian and English. Wrap any new on-screen text in `tr()` and add its English version to `src/i18n/en.ts`:

```tsx
import { tr } from '../i18n';

<span>{tr("Добавить книгу")}</span>
showToast(tr`Удалено книг: ${count}`);
```

```ts
// src/i18n/en.ts
"Добавить книгу": "Add book",
"Удалено книг: {}": "Books deleted: {}",
```

The key is the original Russian text; in templates, inserted values are marked with `{}`. If you change the Russian text, update the key in `en.ts` too, or the translation will stop working.

### Bottom spacing and system navigation
Anything pinned to the bottom of the screen must account for the height of Android's system navigation: use `env(safe-area-inset-bottom)` the same way the bottom bar in `App.tsx` does. Test your changes with both gesture and three-button navigation.

### Don't change these without discussion
- **`com.ereader.material`** (`applicationId`, `namespace`, the Java package). To Android, a new ID is a different app: the update won't install over the old version, and users' books and progress stay behind in the old one.
- **`android/app/release-key.jks` and `keyAlias`** in `build.gradle`. They decide whether Android accepts a new APK as an update.
- **`localStorage` keys** (`ereader_view_mode`, `ereader_app_language` and others) and the **IndexedDB schema**. Renaming them resets users' settings and data. If the schema has to change, add a migration and bump `DB_VERSION`.

### Style
- TypeScript + React (function components and hooks), styling with Tailwind CSS.
- Follow the style of the surrounding code; don't reformat whole files in a PR about something else.
- Avoid adding new dependencies unless needed, and explain in the PR why one is required.

---

## 📄 License

By submitting a pull request, you agree that your contribution is released under the [MIT License](./LICENSE), like the rest of the project.