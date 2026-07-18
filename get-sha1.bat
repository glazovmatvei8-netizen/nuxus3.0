@echo off
:: Nuxus Signature Utility v1.0 (Windows)
:: Скрипт для получения SHA-1 хеша отладочной подписи Android.

echo Nuxus Kernel: Извлечение цифровой подписи (SHA-1)...
echo --------------------------------------------------------

set KEYSTORE_PATH=%USERPROFILE%\.android\debug.keystore

if exist "%KEYSTORE_PATH%" (
    keytool -list -v -keystore "%KEYSTORE_PATH%" -alias androiddebugkey -storepass android -keypass android | findstr SHA1
    echo --------------------------------------------------------
    echo Успех! Скопируйте код выше и вставьте его в поле SHA-1 в панели VK ID.
) else (
    echo Ошибка: debug.keystore не найден по пути %KEYSTORE_PATH%
    echo Убедитесь, что вы хотя бы раз запускали сборку в Android Studio.
)

pause
