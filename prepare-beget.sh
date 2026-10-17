
#!/bin/bash

# Nuxus Beget Packager v1.3
# Скрипт для генерации папки out и создания архива с сохранением структуры папки.

echo "🚀 Запуск процесса сборки Ядра..."

# Очистка старых данных
rm -rf .next
rm -rf out
rm -f nuxus-beget-deploy.zip

# Выполнение сборки
echo "⚙️ Выполняю команду npm run build..."
npm run build

# Проверка результата
if [ -d "out" ]; then
    echo "✅ Папка 'out' успешно создана!"
    echo "📦 Упаковываю содержимое в nuxus-beget-deploy.zip..."
    # Упаковываем так, чтобы папка out была корневой в архиве
    zip -r nuxus-beget-deploy.zip out/
    echo "--------------------------------------------------------"
    echo "🎉 ГОТОВО! Скачай файл nuxus-beget-deploy.zip и"
    echo "🚀 загрузи его в public_html на Beget."
    echo "--------------------------------------------------------"
else
    echo "❌ Ошибка: Папка 'out' не появилась. Проверь логи выше."
    exit 1
fi
