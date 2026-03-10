
#!/bin/bash

# Nuxus Kernel Sync Utility v1.0
# Скрипт для мгновенной отправки изменений в GitHub

echo "🚀 Nuxus Sync: Подготовка к отправке в Ядро..."

# Добавляем все изменения
git add .

# Формируем сообщение коммита
COMMIT_MSG="Nuxus Kernel Update: $(date '+%Y-%m-%d %H:%M:%S') - Hyper-Quantum Fixes"

# Делаем коммит
git commit -m "$COMMIT_MSG"

# Отправляем в репозиторий
echo "🛰️ Отправка сигнала в GitHub..."
git push origin main

echo "✅ Успех! Изменения загружены в репозиторий."
echo "🔄 Vercel начнет деплой автоматически."
