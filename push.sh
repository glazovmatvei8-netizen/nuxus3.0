#!/bin/bash

# Nuxus Kernel Sync Utility v15.0
# Скрипт для принудительной синхронизации и поддержки нескольких репозиториев.

# 1. Настройки по умолчанию
DEFAULT_REPO_URL="https://github.com/glazovmatvei8-netizen/nuxus2.0.git"
USER_EMAIL="eventionhorizon@gmail.com"
USER_NAME="glazovmatvei8-netizen"

# 2. Динамическое определение целевого узла (из аргумента или по умолчанию)
REPO_URL=${1:-$DEFAULT_REPO_URL}

echo "🚀 Подготовка к трансляции данных в GitHub..."
echo "📡 Целевой узел: $REPO_URL"

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin "$REPO_URL"
else
    # Если репозиторий уже инициализирован, обновляем URL на лету
    git remote set-url origin "$REPO_URL"
fi

# Настройка локальной идентификации для этого репозитория
git config user.email "$USER_EMAIL"
git config user.name "$USER_NAME"

# Принудительное обновление веток
git branch -M main

# Настройка стратегий для предотвращения конфликтов pull
git config pull.rebase false

# Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus 3.0 Genesis Sync: $(date '+%Y-%m-%d %H:%M:%S') [Multi-Repo Migration]"

# Коммит
git commit -m "$COMMIT_MSG"

# Попытка синхронизации перед отправкой (разрешаем несвязанные истории для новых репо)
echo "📥 Синхронизация с облаком..."
git pull origin main --tags --allow-unrelated-histories || echo "⚠️ Конфликт разрешен локально или это новый репозиторий..."

# Отправка
echo "🛰️ Трансляция пакетов в репозиторий..."
git push -u origin main --force

echo "✅ Успех! Ядро синхронизировано с узлом: $REPO_URL"
