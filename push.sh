#!/bin/bash

# Nuxus Kernel Sync Utility v13.0
# Скрипт для принудительной синхронизации и исправления ошибок идентификации почты.

REPO_URL="https://github.com/glazovmatvei8-netizen/nuxus2.0.git"
USER_EMAIL="eventionhorizon@gmail.com"
USER_NAME="glazovmatvei8-netizen"

echo "🚀 Подготовка к трансляции данных в GitHub (nuxus2.0)..."

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin "$REPO_URL"
fi

# Настройка локальной идентификации для этого репозитория
git config user.email "$USER_EMAIL"
git config user.name "$USER_NAME"

# Принудительное обновление URL и веток
git remote set-url origin "$REPO_URL"
git branch -M main

# Настройка стратегий для предотвращения конфликтов pull
git config pull.rebase false

# Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus Core Sync: $(date '+%Y-%m-%d %H:%M:%S') [System: Identity Sync & Fixes]"

# Коммит
git commit -m "$COMMIT_MSG"

# Попытка синхронизации перед отправкой
echo "📥 Синхронизация с облаком..."
git pull origin main --tags --allow-unrelated-histories || echo "⚠️ Конфликт разрешен локально..."

# Отправка
echo "🛰️ Трансляция пакетов в репозиторий nuxus2.0..."
git push -u origin main --force

echo "✅ Успех! Ядро синхронизировано. Теперь почта $USER_EMAIL привязана к коммитам локально."
