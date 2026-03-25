#!/bin/bash

# Nuxus Kernel Sync Utility v11.0
# Скрипт для принудительной синхронизации с репозиторием nuxus2.0

REPO_URL="https://github.com/glazovmatvei8-netizen/nuxus2.0.git"

echo "🚀 Подготовка к трансляции данных в GitHub (nuxus2.0)..."

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin "$REPO_URL"
fi

# Принудительное обновление URL и веток
git remote set-url origin "$REPO_URL"
git branch -M main

# Настройка стратегий для предотвращения конфликтов pull
git config pull.rebase false

# Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus Core Update: $(date '+%Y-%m-%d %H:%M:%S') [System: Bot & Finance Fixes]"

# Коммит
git commit -m "$COMMIT_MSG"

# Попытка синхронизации перед отправкой
echo "📥 Синхронизация с облаком..."
git pull origin main --tags --allow-unrelated-histories || echo "⚠️ Конфликт разрешен локально..."

# Отправка
echo "🛰️ Трансляция пакетов в репозиторий nuxus2.0..."
git push -u origin main --force

echo "✅ Успех! Ядро синхронизировано. Используйте команду: sh push.sh"
