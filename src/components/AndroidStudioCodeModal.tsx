import React, { useState, useMemo } from 'react';
import { 
  X, 
  Code2, 
  Download, 
  Copy, 
  Check, 
  FolderTree, 
  Search,
  Layers,
  FileCode,
  Smartphone,
  Github,
  Terminal,
  Cpu,
  ExternalLink,
  Sparkles,
  BookOpen,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { 
  PROJECT_CODE_FILES, 
  ProjectCodeFile, 
  generateProjectCodeZip 
} from '../services/projectCodeService';
import { exportFile } from '../utils/fileExport';

interface AndroidStudioCodeModalProps {
  onClose: () => void;
  isDark?: boolean;
}

export const AndroidStudioCodeModal: React.FC<AndroidStudioCodeModalProps> = ({
  onClose,
  isDark = true,
}) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'github' | 'files'>('apk');
  const [selectedFile, setSelectedFile] = useState<ProjectCodeFile>(PROJECT_CODE_FILES[0]);
  const [activeSection, setActiveSection] = useState<'all' | 'github' | 'apk' | 'ui' | 'services' | 'config'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mobileFileView, setMobileFileView] = useState<'list' | 'code'>('list');

  const filteredFiles = useMemo(() => {
    return PROJECT_CODE_FILES.filter((file) => {
      const matchesSection = activeSection === 'all' || file.section === activeSection;
      const matchesSearch =
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.path.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSection && matchesSearch;
    });
  }, [activeSection, searchQuery]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const blob = await generateProjectCodeZip();
      await exportFile({
        filename: 'material-ereader-github-release.zip',
        content: blob,
        mimeType: 'application/zip',
        title: 'Исходный код Android-читалки',
      });
    } catch (err) {
      console.error('Failed to download project zip', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      id="project-code-modal-backdrop"
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2.5 sm:p-5 select-none"
      onClick={onClose}
    >
      <div
        id="project-code-modal"
        className={`w-full max-w-5xl h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-all ${
          isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-100' : 'bg-white border-stone-200 text-stone-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-4 sm:px-6 py-3.5 border-b border-inherit/40 flex items-center justify-between shrink-0 ${
          isDark ? 'bg-black/20' : 'bg-stone-50'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${
              isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-300'
            }`}>
              <Github className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base truncate">Релиз на GitHub & Сборка APK</h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}>
                  Capacitor 8.5
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border hidden sm:inline ${
                  isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}>
                  MIT Open Source
                </span>
              </div>
              <p className="text-xs opacity-65 truncate">
                Подготовка к публикации репозитория, автоматическая сборка APK и исходный код (электронные книги и аудиокниги)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-download-project-zip"
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              title="Скачать полный исходный код со всеми файлами"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{isDownloading ? 'Сборка архива...' : 'Скачать репозиторий (.ZIP)'}</span>
            </button>
            <button
              id="btn-close-code-modal"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className={`px-4 sm:px-6 py-2.5 border-b border-inherit/30 flex items-center gap-2 shrink-0 overflow-x-auto text-xs font-semibold ${
          isDark ? 'bg-black/20' : 'bg-stone-100/70'
        }`}>
          <button
            onClick={() => setActiveTab('apk')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'apk'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                : isDark
                ? 'text-neutral-400 hover:text-white hover:bg-white/5'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Сборка APK файла</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'github'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                : isDark
                ? 'text-neutral-400 hover:text-white hover:bg-white/5'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>Публикация на GitHub (Open Source)</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'files'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                : isDark
                ? 'text-neutral-400 hover:text-white hover:bg-white/5'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Файлы проекта & CI/CD ({PROJECT_CODE_FILES.length})</span>
          </button>
        </div>

        {activeTab === 'apk' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
              isDark ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-50 border-amber-200'
            }`}>
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                  Проект полностью подготовлен для генерации APK
                </h3>
                <p className="text-xs opacity-85 mt-1 leading-relaxed">
                  Мы подключили <strong>@capacitor/core</strong> и <strong>@capacitor/android</strong>, реализовали полноценную читалку книг и аудиоплеер с поддержкой аудиокниг, настроили нативную структуру в папке <code>android/</code>, добавили постоянный ключ подписи <code>release-key.jks</code> для бесшовных обновлений и создали автоматический GitHub Actions воркфлоу.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-stone-50 border-stone-200 shadow-xs'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                      isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      Рекомендуется • Без Android Studio
                    </span>
                    <span className="text-xs font-mono opacity-50">Способ №1</span>
                  </div>
                  <h4 className="font-bold text-base flex items-center gap-2">
                    <Github className={`w-4.5 h-4.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    Автосборка в GitHub Actions
                  </h4>
                  <p className="text-xs opacity-75 mt-2 leading-relaxed">
                    Вам не нужно устанавливать тяжёлые гигабайты Android SDK на свой компьютер. Облачный сервер GitHub скомпилирует APK файл сам!
                  </p>
                  <ol className="text-xs opacity-90 mt-3 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Запушьте репозиторий на GitHub.</li>
                    <li>Откройте вкладку <strong>Actions</strong> в вашем репозитории.</li>
                    <li>Выберите воркфлоу <strong>«Build Android APK»</strong> и нажмите <strong>«Run workflow»</strong>.</li>
                    <li>Через 2–3 минуты скачайте готовый <code>app-debug.apk</code> из раздела <strong>Artifacts</strong>.</li>
                  </ol>
                </div>

                <div className={`pt-3 border-t text-xs font-medium ${
                  isDark ? 'border-inherit/20 text-amber-400/90' : 'border-stone-200 text-amber-800'
                }`}>
                  💡 При создании тега <code>v1.0.0</code> GitHub сам прикрепит APK к официальному релизу!
                </div>
              </div>

              <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-stone-50 border-stone-200 shadow-xs'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                      isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      Локально • 1 команда
                    </span>
                    <span className="text-xs font-mono opacity-50">Способ №2</span>
                  </div>
                  <h4 className="font-bold text-base flex items-center gap-2">
                    <Terminal className={`w-4.5 h-4.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    Сборка через CLI терминал
                  </h4>
                  <p className="text-xs opacity-75 mt-2 leading-relaxed">
                    Если у вас установлен JDK 17+ и Android SDK / Gradle:
                  </p>
                  <div className={`mt-3 p-3 rounded-xl border font-mono text-xs flex items-center justify-between gap-2 ${
                    isDark ? 'bg-black/50 border-neutral-800 text-amber-300' : 'bg-white border-stone-300 text-amber-900 shadow-xs'
                  }`}>
                    <span>npm run build:apk</span>
                    <button
                      onClick={() => copyToClipboard('npm run build:apk', 'cmd-apk')}
                      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0"
                      title="Копировать"
                    >
                      {copiedText === 'cmd-apk' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] opacity-60 mt-2">
                    Скрипт соберёт веб-версию, синхронизирует Capacitor и скомпилирует APK в: <br />
                    <code>android/app/build/outputs/apk/debug/app-debug.apk</code>
                  </p>
                </div>

                <div className="pt-3 border-t border-inherit/20 text-xs opacity-70">
                  Требуется настроенная переменная окружения <code>ANDROID_HOME</code>.
                </div>
              </div>

              <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-stone-50 border-stone-200 shadow-xs'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                      isDark ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-sky-100 text-sky-800 border-sky-300'
                    }`}>
                      Visual IDE
                    </span>
                    <span className="text-xs font-mono opacity-50">Способ №3</span>
                  </div>
                  <h4 className="font-bold text-base flex items-center gap-2">
                    <Cpu className={`w-4.5 h-4.5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                    В среде Android Studio
                  </h4>
                  <p className="text-xs opacity-75 mt-2 leading-relaxed">
                    Открытие нативного Android-проекта в официальной среде разработки:
                  </p>
                  <div className={`mt-3 p-3 rounded-xl border font-mono text-xs flex items-center justify-between gap-2 ${
                    isDark ? 'bg-black/50 border-neutral-800 text-sky-300' : 'bg-white border-stone-300 text-sky-900 shadow-xs'
                  }`}>
                    <span>npm run cap:open</span>
                    <button
                      onClick={() => copyToClipboard('npm run cap:open', 'cmd-open')}
                      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0"
                    >
                      {copiedText === 'cmd-open' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] opacity-75 mt-2 leading-relaxed">
                    В меню Android Studio выберите: <strong>Build ➔ Build Bundle(s) / APK(s) ➔ Build APK(s)</strong>.
                  </p>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-stone-50 border-stone-200 shadow-xs'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                      isDark ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-300'
                    }`}>
                      Без компиляции
                    </span>
                    <span className="text-xs font-mono opacity-50">Способ №4</span>
                  </div>
                  <h4 className="font-bold text-base flex items-center gap-2">
                    <Smartphone className={`w-4.5 h-4.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    Установка как PWA на смартфон
                  </h4>
                  <p className="text-xs opacity-75 mt-2 leading-relaxed">
                    В приложении настроен <code>manifest.json</code> и мобильные мета-теги.
                  </p>
                  <p className="text-xs opacity-80 mt-2 leading-relaxed">
                    Откройте сайт в Chrome на смартфоне, нажмите три точки <code>⋮</code> и выберите <strong>«Добавить на главный экран»</strong>. Приложение установится как автономное приложение без рамок браузера и будет работать офлайн.
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
              isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50/80 border-amber-300/80'
            }`}>
              <h5 className={`font-bold text-xs sm:text-sm flex items-center gap-2 ${
                isDark ? 'text-amber-400' : 'text-amber-900'
              }`}>
                <Smartphone className="w-4 h-4 shrink-0" />
                Решение частых вопросов при скачивании, установке и обновлении APK:
              </h5>
              <div className="space-y-2.5 text-xs opacity-90 leading-relaxed">
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-black/30 border-neutral-800' : 'bg-white border-stone-200 shadow-xs'
                }`}>
                  <span className={`font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                    1. Браузер Chrome пишет: «Файл может быть вредоносным»
                  </span>
                  <p className="opacity-80 mt-1">
                    Это стандартное системное уведомление безопасности Android и браузера Chrome для <strong>абсолютно любых APK файлов</strong>, скачиваемых напрямую из интернета (вне Google Play). Нажмите кнопку <strong>«Всё равно скачать»</strong>. Проект 100% безопасен, открыт под лицензией MIT и не содержит скрытых модулей.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-black/30 border-neutral-800' : 'bg-white border-stone-200 shadow-xs'
                }`}>
                  <span className={`font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                    2. Google Play Защита: «Play Защита не распознает разработчика»
                  </span>
                  <p className="opacity-80 mt-1">
                    Google выводит это предупреждение для всех независимых приложений без платного сертификата Google Play Console. Чтобы продолжить установку: нажмите <strong>«Подробнее»</strong> в окне диалога и затем выберите <strong>«Всё равно установить»</strong>.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-black/30 border-neutral-800' : 'bg-white border-stone-200 shadow-xs'
                }`}>
                  <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                    3. Установка обновления поверх существующей версии приложения
                  </span>
                  <p className="opacity-80 mt-1">
                    В проект добавлен постоянный ключ подписи <code>android/app/release-key.jks</code> и автоматическое инкрементирование <code>versionCode</code>. Теперь при выходе новой версии приложения вы можете <strong>устанавливать свежий APK поверх старого</strong> без удаления, сохраняя все ваши загруженные книги, аудиокниги, закладки и прогресс чтения!
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-black/30 border-neutral-800' : 'bg-white border-stone-200 shadow-xs'
                }`}>
                  <span className={`font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                    4. Фоновое прослушивание аудиокниг (Android WakeLock)
                  </span>
                  <p className="opacity-80 mt-1">
                    В нативном коде <code>MainActivity.java</code> реализован <code>PowerManager.PARTIAL_WAKE_LOCK</code> и сохранение активности WebView-таймеров при <code>onPause()</code> и <code>onStop()</code>. Воспроизведение аудиокниги продолжается непрерывно при сворачивании приложения, выключении экрана или переключении на другие задачи.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-black/30 border-neutral-800' : 'bg-white border-stone-200 shadow-xs'
                }`}>
                  <span className={`font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                    5. Выделение долгим нажатием (Long-Press) и эргономичные кнопки
                  </span>
                  <p className="opacity-80 mt-1">
                    Для максимального удобства на Android выделение карточек книг и аудиозаписей осуществляется долгим удержанием (~450 мс) с тактильной виброотдачей — без лишних кнопок выбора на карточках. А кнопки «Добавить аудиокнигу» и «Создать сборник» вынесены в правый нижний угол под палец одной руки.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'github' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
              isDark ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-900'}`}>
                  Всё готово для публичного репозитория
                </h3>
                <p className="text-xs opacity-80 mt-1 leading-relaxed">
                  Проект укомплектован файлами <strong>README.md</strong> (с подробным описанием возможностей и бейджами), <strong>LICENSE</strong> (свободная лицензия MIT), <strong>CONTRIBUTING.md</strong>, шаблонами баг-репортов <strong>.github/ISSUE_TEMPLATE/</strong> и воркфлоу CI/CD.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Terminal className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                Пошаговые команды для публикации нового репозитория:
              </h4>

              <div className={`p-4 rounded-2xl border space-y-2 ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-stone-50 border-stone-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                    Шаг 1: Инициализация Git и первый коммит
                  </span>
                  <button
                    onClick={() => copyToClipboard(`git init\ngit add .\ngit commit -m "feat: initial open source release of Material E-Reader v1.0.0"`, 'step1')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedText === 'step1' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    Копировать блок
                  </button>
                </div>
                <pre className={`p-3 rounded-xl text-xs font-mono overflow-x-auto border ${
                  isDark ? 'bg-black/60 border-neutral-800 text-neutral-200' : 'bg-white border-stone-200 text-stone-900 shadow-xs'
                }`}>
git init
git add .
git commit -m "feat: initial open source release of Material E-Reader v1.0.0"
                </pre>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-stone-50 border-stone-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                    Шаг 2: Создание публичного репозитория на GitHub и привязка remote
                  </span>
                  <button
                    onClick={() => copyToClipboard(`git branch -M main\ngit remote add origin https://github.com/YOUR_USERNAME/material-ereader.git\ngit push -u origin main`, 'step2')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedText === 'step2' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    Копировать блок
                  </button>
                </div>
                <p className="text-xs opacity-75">
                  Создайте новый публичный репозиторий на <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-amber-600 dark:text-amber-400 underline inline-flex items-center gap-0.5">github.com/new <ExternalLink className="w-3 h-3" /></a> и выполните:
                </p>
                <pre className={`p-3 rounded-xl text-xs font-mono overflow-x-auto border ${
                  isDark ? 'bg-black/60 border-neutral-800 text-neutral-200' : 'bg-white border-stone-200 text-stone-900 shadow-xs'
                }`}>
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/material-ereader.git
git push -u origin main
                </pre>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-stone-50 border-stone-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                    Шаг 3: Выпуск первого релиза (автоматически создаст APK)
                  </span>
                  <button
                    onClick={() => copyToClipboard(`git tag v1.0.0\ngit push origin v1.0.0`, 'step3')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedText === 'step3' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    Копировать блок
                  </button>
                </div>
                <p className="text-xs opacity-75">
                  Пуш тега активирует GitHub Actions, который скомпилирует APK и прикрепит файл к странице Releases:
                </p>
                <pre className={`p-3 rounded-xl text-xs font-mono overflow-x-auto border ${
                  isDark ? 'bg-black/60 border-neutral-800 text-neutral-200' : 'bg-white border-stone-200 text-stone-900 shadow-xs'
                }`}>
git tag v1.0.0
git push origin v1.0.0
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* Mobile Tab Switcher */}
            <div className={`md:hidden flex items-center border-b p-1.5 gap-1 shrink-0 ${
              isDark ? 'bg-black/30 border-neutral-800' : 'bg-stone-100 border-stone-200'
            }`}>
              <button
                type="button"
                onClick={() => setMobileFileView('list')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  mobileFileView === 'list'
                    ? 'bg-amber-500 text-neutral-950 shadow-xs font-bold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Список файлов ({filteredFiles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileFileView('code')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  mobileFileView === 'code'
                    ? 'bg-amber-500 text-neutral-950 shadow-xs font-bold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Код ({selectedFile.name})</span>
              </button>
            </div>

            {/* File List Panel */}
            <div
              className={`w-full md:w-80 border-r flex-col p-3 shrink-0 min-h-0 ${
                isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-stone-50 border-stone-200'
              } ${
                mobileFileView === 'list' ? 'flex flex-1 overflow-hidden' : 'hidden md:flex'
              }`}
            >
              <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 text-[11px] shrink-0">
                <button
                  onClick={() => setActiveSection('all')}
                  className={`px-2 py-1 rounded-lg font-medium shrink-0 cursor-pointer ${
                    activeSection === 'all'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : isDark ? 'text-neutral-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Все
                </button>
                <button
                  onClick={() => setActiveSection('apk')}
                  className={`px-2 py-1 rounded-lg font-medium shrink-0 cursor-pointer ${
                    activeSection === 'apk'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : isDark ? 'text-neutral-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  APK & Android
                </button>
                <button
                  onClick={() => setActiveSection('github')}
                  className={`px-2 py-1 rounded-lg font-medium shrink-0 cursor-pointer ${
                    activeSection === 'github'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : isDark ? 'text-neutral-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  GitHub & CI
                </button>
                <button
                  onClick={() => setActiveSection('ui')}
                  className={`px-2 py-1 rounded-lg font-medium shrink-0 cursor-pointer ${
                    activeSection === 'ui'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : isDark ? 'text-neutral-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  UI
                </button>
              </div>

              <div className="relative mb-2 shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 opacity-40" />
                <input
                  type="text"
                  placeholder="Поиск по файлам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-hidden focus:border-amber-500 ${
                    isDark ? 'bg-black/30 border-neutral-800 text-neutral-100' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>

              <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold opacity-60 uppercase tracking-wider mb-1 shrink-0">
                <FolderTree className="w-3.5 h-3.5" />
                Файлы репозитория ({filteredFiles.length})
              </div>

              <div className="space-y-1 overflow-y-auto flex-1 pr-1 min-h-0">
                {filteredFiles.map((file) => {
                  const isSelected = selectedFile.path === file.path;
                  return (
                    <button
                      key={file.path}
                      onClick={() => {
                        setSelectedFile(file);
                        setMobileFileView('code');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex flex-col gap-0.5 transition-all cursor-pointer ${
                        isSelected
                          ? isDark
                            ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30'
                            : 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                          : isDark
                          ? 'text-neutral-300 hover:bg-white/5'
                          : 'text-stone-700 hover:bg-stone-200/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs flex items-center gap-1.5 truncate">
                          <FileCode className="w-3.5 h-3.5 opacity-70 shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </span>
                        <span className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded-sm shrink-0 ${
                          isDark ? 'bg-black/30 opacity-70' : 'bg-stone-200 text-stone-700'
                        }`}>
                          {file.language}
                        </span>
                      </div>
                      <span className="text-[10px] opacity-65 font-sans truncate">{file.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Viewer Panel */}
            <div
              className={`flex-1 flex-col overflow-hidden min-h-0 ${
                isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-900 text-neutral-100'
              } ${
                mobileFileView === 'code' ? 'flex flex-1' : 'hidden md:flex'
              }`}
            >
              <div className="px-3 sm:px-4 py-2 border-b border-neutral-800 flex items-center justify-between text-xs bg-neutral-900/90 gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setMobileFileView('list')}
                    className="md:hidden px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] flex items-center gap-1 shrink-0 text-neutral-300"
                    title="Вернуться к списку файлов"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Файлы</span>
                  </button>
                  <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-mono text-neutral-300 truncate text-[11px] sm:text-xs">
                    {selectedFile.path}
                  </span>
                </div>
                <button
                  id="btn-copy-code"
                  onClick={() => copyToClipboard(selectedFile.code, 'code')}
                  className="px-2.5 sm:px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer active:scale-95"
                >
                  {copiedText === 'code' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Скопировано!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Копировать код</span><span className="sm:hidden">Копия</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-auto p-3 sm:p-4 font-mono text-xs leading-relaxed text-amber-200/95 selection:bg-amber-500/30 min-h-0 bg-neutral-950">
                <pre className="whitespace-pre select-text pb-6">{selectedFile.code}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
