#!/bin/bash

# Nuxus Signature Utility v1.0 (macOS / Linux)
# Скрипт для получения SHA-1 хеша отладочной подписи Android.

echo "🚀 Nuxus Kernel: Извлечение цифровой подписи (SHA-1)..."
echo "--------------------------------------------------------"

if [ -f ~/.android/debug.keystore ]; then
    keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
    echo "--------------------------------------------------------"
    echo "✅ Скопируйте код выше и вставьте его в поле SHA-1 в панели VK ID."
else
    echo "❌ Ошибка: debug.keystore не найден по пути ~/.android/debug.keystore"
    echo "Убедитесь, что вы хотя бы раз запускали сборку в Android Studio."
fi
