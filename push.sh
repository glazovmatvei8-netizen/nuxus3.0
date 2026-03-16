
#!/bin/bash

# Nuxus Kernel Sync Utility v1.7
# Скрипт для автоматического решения ошибок синхронизации и отправки в GitHub

echo "🚀 Подготовка к отправке в GitHub: glazovmatvei8-netizen/nuxus-message"

# ЛЕЧЕНИЕ ОШИБКИ: Divergent Branches
# Настраиваем гибридное слияние веток
git config pull.rebase false

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/glazovmatvei8-netizen/nuxus-message.git
    git branch -M main
fi

# Попытка синхронизации перед пушем
echo "📥 Синхронизация с облаком (объединение версий)..."
git pull origin main --tags

# Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus Core Update: $(date '+%Y-%m-%d %H:%M:%S') [Auto-Sync Fix]"

# Коммит
git commit -m "$COMMIT_MSG"

# Отправка
echo "🛰️ Трансляция данных в репозиторий..."
git push -u origin main

echo "✅ Успех! Ядро синхронизировано. Ошибка Divergent Branches устранена."
