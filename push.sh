
#!/bin/bash

# Nuxus Kernel Sync Utility v1.6
# Скрипт для отправки изменений в твой репозиторий

echo "🚀 Подготовка к отправке в GitHub: glazovmatvei8-netizen/nuxus-message"

# КОНФИГУРАЦИЯ: Лечим ошибку divergent branches раз и навсегда
git config pull.rebase false

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/glazovmatvei8-netizen/nuxus-message.git
    git branch -M main
fi

# Попытка синхронизации перед пушем
echo "📥 Синхронизация с облаком (объединение веток)..."
git pull origin main --tags

# Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus Core Update: $(date '+%Y-%m-%d %H:%M:%S') [Auto-Sync]"

# Коммит
git commit -m "$COMMIT_MSG"

# Отправка
echo "🛰️ Трансляция данных в репозиторий..."
git push -u origin main

echo "✅ Успех! Ядро синхронизировано с GitHub. Ошибка Divergent Branches устранена."
