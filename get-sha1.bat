
@echo off
setlocal enabledelayedexpansion

:: Nuxus Signature Utility v1.1 (Windows)
:: Автоматическое извлечение SHA-1 для VK ID.

echo.
echo 🚀 Nuxus Kernel: Извлечение цифровой подписи (SHA-1)...
echo --------------------------------------------------------

:: Путь к ключу по умолчанию
set KEYSTORE_PATH=%USERPROFILE%\.android\debug.keystore

if not exist "%KEYSTORE_PATH%" (
    echo ❌ Ошибка: Файл debug.keystore не найден.
    echo Путь: %KEYSTORE_PATH%
    echo Убедитесь, что вы хотя бы раз запускали сборку в Android Studio.
    pause
    exit /b
)

echo ✅ Файл ключа обнаружен.
echo 📡 Выполняю чтение сертификата...
echo.

:: Пытаемся найти keytool в PATH или стандартных папках Java/Android
where keytool >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ Команда keytool не найдена в PATH.
    echo Попробую найти её в стандартных папках...
    
    set "JAVA_DIR=C:\Program Files\Java"
    if exist "!JAVA_DIR!" (
        for /d %%i in ("!JAVA_DIR!\jdk*") do (
            if exist "%%i\bin\keytool.exe" (
                set "KEYTOOL=%%i\bin\keytool.exe"
            )
        )
    )
) else (
    set "KEYTOOL=keytool"
)

if "!KEYTOOL!"=="" (
    echo ❌ Ошибка: keytool не найден. Установите JDK или Android Studio.
    pause
    exit /b
)

"!KEYTOOL!" -list -v -keystore "%KEYSTORE_PATH%" -alias androiddebugkey -storepass android -keypass android | findstr /C:"SHA1"

echo.
echo --------------------------------------------------------
echo ✅ Скопируйте код выше (после SHA1:) и вставьте его в поле SHA-1 в панели VK ID.
echo Пароль хранилища (если спросит): android
echo.
pause
