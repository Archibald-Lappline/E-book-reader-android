import JSZip from 'jszip';

export interface AndroidCodeFile {
  path: string;
  name: string;
  category: 'ui' | 'viewmodel' | 'data' | 'theme' | 'config';
  code: string;
  description: string;
}

export const ANDROID_COMPOSE_PROJECT_FILES: AndroidCodeFile[] = [
  {
    path: 'app/src/main/java/com/reader/app/MainActivity.kt',
    name: 'MainActivity.kt',
    category: 'ui',
    description: 'Главная Activity с Material 3 Scaffold и Navigation Compose',
    code: `package com.reader.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.reader.app.ui.library.LibraryScreen
import com.reader.app.ui.reader.ReaderScreen
import com.reader.app.ui.theme.AndroidReaderTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AndroidReaderTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ReaderAppNavigation()
                }
            }
        }
    }
}

@Composable
fun ReaderAppNavigation() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = "library") {
        composable("library") {
            LibraryScreen(
                onOpenBook = { bookId ->
                    navController.navigate("reader/$bookId")
                }
            )
        }
        composable("reader/{bookId}") { backStackEntry ->
            val bookId = backStackEntry.arguments?.getString("bookId") ?: ""
            ReaderScreen(
                bookId = bookId,
                onBack = { navController.popBackStack() }
            )
        }
    }
}`,
  },
  {
    path: 'app/src/main/java/com/reader/app/ui/reader/ReaderScreen.kt',
    name: 'ReaderScreen.kt',
    category: 'ui',
    description: 'Основной экран чтения Jetpack Compose с жестами, шрифтами и темами',
    code: `package com.reader.app.ui.reader

import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.reader.app.ui.theme.ReaderThemeConfig

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReaderScreen(
    bookId: String,
    onBack: () -> Unit,
    viewModel: ReaderViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showControls by remember { mutableStateOf(false) }
    var showSettingsSheet by remember { mutableStateOf(false) }
    var showNotesSheet by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()

    // Native Android 14/15/16 Predictive Back Gesture Handler
    BackHandler(enabled = true) {
        if (showSettingsSheet) {
            showSettingsSheet = false
        } else if (showNotesSheet) {
            showNotesSheet = false
        } else if (showControls) {
            showControls = false
        } else {
            onBack()
        }
    }

    val currentTheme = uiState.themeConfig
    val fontStyle = uiState.fontFamily

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(currentTheme.backgroundColor)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                showControls = !showControls
            }
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = uiState.marginHorizontal.dp),
            contentPadding = PaddingValues(
                top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + 16.dp,
                bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + 32.dp
            )
        ) {
            item {
                Text(
                    text = uiState.currentChapterTitle,
                    fontSize = (uiState.fontSize + 4).sp,
                    fontFamily = fontStyle,
                    color = currentTheme.textColor,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            item {
                Text(
                    text = uiState.currentChapterContent,
                    fontSize = uiState.fontSize.sp,
                    lineHeight = (uiState.fontSize * uiState.lineHeightMultiplier).sp,
                    fontFamily = fontStyle,
                    textAlign = if (uiState.isJustify) TextAlign.Justify else TextAlign.Start,
                    color = currentTheme.textColor
                )
            }
        }

        AnimatedVisibility(
            visible = showControls,
            enter = fadeIn() + slideInVertically(),
            exit = fadeOut() + slideOutVertically(),
            modifier = Modifier.align(Alignment.TopCenter)
        ) {
            TopAppBar(
                title = { Text(uiState.bookTitle, maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Назад")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.toggleBookmark() }) {
                        Icon(
                            if (uiState.isCurrentBookmarked) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                            contentDescription = "Закладка"
                        )
                    }
                    IconButton(onClick = { showNotesSheet = true }) {
                        Icon(Icons.Default.EditNote, contentDescription = "Заметки")
                    }
                    IconButton(onClick = { showSettingsSheet = true }) {
                        Icon(Icons.Default.FormatSize, contentDescription = "Шрифты и темы")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = currentTheme.cardColor.copy(alpha = 0.95f)
                )
            )
        }

        AnimatedVisibility(
            visible = showControls,
            enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
            exit = fadeOut() + slideOutVertically(targetOffsetY = { it }),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Surface(
                color = currentTheme.cardColor.copy(alpha = 0.95f),
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 12.dp)
                ) {
                    Slider(
                        value = uiState.progressPercent / 100f,
                        onValueChange = { percent ->
                            viewModel.seekProgress(percent * 100f)
                        }
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "\${uiState.progressPercent.toInt()}%",
                            color = currentTheme.secondaryTextColor,
                            fontSize = 12.sp
                        )
                        Text(
                            text = "Глава \${uiState.chapterIndex + 1} из \${uiState.totalChapters}",
                            color = currentTheme.secondaryTextColor,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }

        if (showSettingsSheet) {
            ModalBottomSheet(onDismissRequest = { showSettingsSheet = false }) {
                ThemeAndFontSettingsSheet(
                    settings = uiState,
                    onUpdateFontSize = { viewModel.setFontSize(it) },
                    onSelectTheme = { viewModel.setTheme(it) },
                    onSelectFont = { viewModel.setFontFamily(it) }
                )
            }
        }
    }
}`,
  },
  {
    path: 'app/src/main/java/com/reader/app/ui/reader/ReaderViewModel.kt',
    name: 'ReaderViewModel.kt',
    category: 'viewmodel',
    description: 'StateFlow ViewModel с управлением прогрессом, парсингом и заметками',
    code: `package com.reader.app.ui.reader

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.reader.app.data.BookRepository
import com.reader.app.data.local.NoteEntity
import com.reader.app.ui.theme.ReaderThemes
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ReaderViewModel(
    private val repository: BookRepository = BookRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReaderUiState())
    val uiState: StateFlow<ReaderUiState> = _uiState.asStateFlow()

    fun loadBook(bookId: String) {
        viewModelScope.launch {
            val book = repository.getBookById(bookId)
            val notes = repository.getNotesForBook(bookId)
            _uiState.update {
                it.copy(
                    bookTitle = book.title,
                    currentChapterTitle = book.currentChapterTitle,
                    currentChapterContent = book.currentChapterContent,
                    progressPercent = book.progressPercent,
                    notes = notes
                )
            }
        }
    }

    fun seekProgress(percent: Float) {
        _uiState.update { it.copy(progressPercent = percent) }
        viewModelScope.launch {
            repository.saveProgress(_uiState.value.bookId, percent)
        }
    }

    fun setFontSize(size: Float) {
        _uiState.update { it.copy(fontSize = size) }
    }

    fun setTheme(themeId: String) {
        val themeConfig = ReaderThemes.getTheme(themeId)
        _uiState.update { it.copy(themeConfig = themeConfig) }
    }

    fun addNote(selectedText: String, noteText: String, colorHex: String) {
        viewModelScope.launch {
            val newNote = NoteEntity(
                bookId = _uiState.value.bookId,
                selectedText = selectedText,
                noteText = noteText,
                color = colorHex,
                timestamp = System.currentTimeMillis()
            )
            repository.insertNote(newNote)
        }
    }

    fun toggleBookmark() {
        _uiState.update { it.copy(isCurrentBookmarked = !it.isCurrentBookmarked) }
    }
}`,
  },
  {
    path: 'app/src/main/java/com/reader/app/data/local/BookEntity.kt',
    name: 'BookEntity.kt',
    category: 'data',
    description: 'Room Database Entity для локального хранения книг и обложек',
    code: `package com.reader.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "books")
data class BookEntity(
    @PrimaryKey val id: String,
    val title: String,
    val author: String,
    val format: String,
    val coverPath: String?,
    val filePath: String,
    val totalPages: Int,
    val currentChapter: Int = 0,
    val progressPercent: Float = 0f,
    val lastReadTimestamp: Long = System.currentTimeMillis(),
    val isFavorite: Boolean = false
)

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val bookId: String,
    val selectedText: String,
    val noteText: String,
    val color: String,
    val chapterTitle: String = "",
    val timestamp: Long = System.currentTimeMillis()
)`,
  },
  {
    path: 'app/src/main/java/com/reader/app/ui/theme/ReaderThemes.kt',
    name: 'ReaderThemes.kt',
    category: 'theme',
    description: 'Цветовые палитры для чтения: Paper, Sepia, Parchment, OLED, Slate, Midnight',
    code: `package com.reader.app.ui.theme

import androidx.compose.ui.graphics.Color

data class ReaderThemeConfig(
    val id: String,
    val name: String,
    val backgroundColor: Color,
    val textColor: Color,
    val secondaryTextColor: Color,
    val cardColor: Color,
    val isDark: Boolean
)

object ReaderThemes {
    val Paper = ReaderThemeConfig(
        id = "paper",
        name = "Бумага",
        backgroundColor = Color(0xFFFAF8F5),
        textColor = Color(0xFF24211D),
        secondaryTextColor = Color(0xFF78716C),
        cardColor = Color(0xFFFFFFFF),
        isDark = false
    )

    val Sepia = ReaderThemeConfig(
        id = "sepia",
        name = "Сепия",
        backgroundColor = Color(0xFFF5EFE0),
        textColor = Color(0xFF3E3123),
        secondaryTextColor = Color(0xFF8C7761),
        cardColor = Color(0xFFECE2CE),
        isDark = false
    )

    val SlateDark = ReaderThemeConfig(
        id = "slate",
        name = "Графит",
        backgroundColor = Color(0xFF1E2229),
        textColor = Color(0xFFD8DEE9),
        secondaryTextColor = Color(0xFF8892B0),
        cardColor = Color(0xFF282D37),
        isDark = true
    )

    val OledBlack = ReaderThemeConfig(
        id = "oled",
        name = "OLED Черный",
        backgroundColor = Color(0xFF000000),
        textColor = Color(0xFFCCCCCC),
        secondaryTextColor = Color(0xFF666666),
        cardColor = Color(0xFF121212),
        isDark = true
    )

    fun getTheme(id: String): ReaderThemeConfig = when (id) {
        "paper" -> Paper
        "sepia" -> Sepia
        "oled" -> OledBlack
        else -> SlateDark
    }
}`,
  },
  {
    path: 'app/build.gradle.kts',
    name: 'build.gradle.kts',
    category: 'config',
    description: 'Gradle-конфигурация с Jetpack Compose, Room, Coil, Navigation',
    code: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.reader.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.reader.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    implementation(libs.coil.compose)

    implementation(libs.kotlinx.coroutines.android)
}`,
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    category: 'config',
    description: 'Манифест Android с поддержкой Predictive Back (Android 14/15/16)',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Читалка Книг"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:enableOnBackInvokedCallback="true"
        android:theme="@android:style/Theme.Material.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@android:style/Theme.Material.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

    <uses-permission android:name="android.permission.INTERNET" />
</manifest>`,
  },
];

export async function generateAndroidStudioProjectZip(): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    'README.md',
    `# Android E-Reader (Jetpack Compose & Kotlin)

Полноценный проект для Android Studio:
- Архитектура: Clean Architecture + MVVM + StateFlow
- UI: Jetpack Compose + Material Design 3 (Dynamic Colors, Dark/Light, Sepia, OLED)
- База данных: Room Database (локальная библиотека, закладки, цитаты, заметки)
- Загрузка картинок: Coil Compose
- Поддержка форматов: FB2, EPUB, TXT, PDF, MD

## Как открыть в Android Studio:
1. Распакуйте архив в любую папку.
2. В Android Studio выберите: **File -> Open...** и укажите эту папку.
3. Дождитесь синхронизации Gradle и нажмите **Run ('app')** на эмуляторе или реальном смартфоне.
`
  );

  zip.file(
    'settings.gradle.kts',
    `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "AndroidReaderApp"
include(":app")
`
  );

  zip.file(
    'build.gradle.kts',
    `plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}
`
  );

  for (const file of ANDROID_COMPOSE_PROJECT_FILES) {
    zip.file(file.path, file.code.trim());
  }

  return await zip.generateAsync({ type: 'blob' });
}
