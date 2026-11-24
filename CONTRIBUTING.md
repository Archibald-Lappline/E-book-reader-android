# Руководство по внесению вклада (Contributing Guide)

Спасибо за интерес к участию в развитии проекта **Material E-Reader**! 📖✨

## Быстрый старт для разработки

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/material-ereader.git
   cd material-ereader
   ```

2. **Установите зависимости:**
   ```bash
   npm install
   ```

3. **Запустите локальный сервер разработки:**
   ```bash
   npm run dev
   ```
   Приложение откроется на `http://localhost:3000`.

4. **Проверка типов и сборка:**
   ```bash
   npm run lint
   npm run build
   ```

## Сборка Android APK локально

Для сборки APK файла на своём компьютере необходимы Node.js, JDK 17+ и Android Studio (либо установленный Android SDK):

```bash
# 1. Собрать веб-версию и синхронизировать с Capacitor:
npm run cap:build

# 2. Открыть проект в Android Studio:
npm run cap:open

# Либо собрать debug APK напрямую через командную строку:
cd android
./gradlew assembleDebug
```
Собранный файл будет находиться по пути:
`android/app/build/outputs/apk/debug/app-debug.apk`.

## Процесс создания Pull Request

1. Создайте новую ветку для вашей фичи или бага:
   ```bash
   git checkout -b feature/awesome-feature
   ```
2. Внесите изменения и убедитесь, что `npm run lint` и `npm run build` проходят без ошибок.
3. Зафиксируйте коммиты с понятными описаниями.
4. Отправьте ветку на GitHub и создайте Pull Request в ветку `main`.
