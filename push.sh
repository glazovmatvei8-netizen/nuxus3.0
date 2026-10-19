#!/bin/bash

<<<<<<< HEAD
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
=======
# Nuxus Kernel Sync Utility v13.0
# Скрипт для принудительной синхронизации и исправления ошибок идентификации почты.

REPO_URL="https://github.com/glazovmatvei8-netizen/nuxus2.0.git"
USER_EMAIL="eventionhorizon@gmail.com"
USER_NAME="glazovmatvei8-netizen"

echo "🚀 Подготовка к трансляции данных в GitHub (nuxus2.0)..."
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin "$REPO_URL"
<<<<<<< HEAD
else
    # Если репозиторий уже инициализирован, обновляем URL на лету
    git remote set-url origin "$REPO_URL"
=======
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
fi

# Настройка локальной идентификации для этого репозитория
git config user.email "$USER_EMAIL"
git config user.name "$USER_NAME"

<<<<<<< HEAD
# Принудительное обновление веток
=======
# Принудительное обновление URL и веток
git remote set-url origin "$REPO_URL"
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
git branch -M main

# Настройка стратегий для предотвращения конфликтов pull
git config pull.rebase false

# Добавляем все файлы
git add .

# Формируем сообщение
<<<<<<< HEAD
COMMIT_MSG="Nuxus 3.0 Genesis Sync: $(date '+%Y-%m-%d %H:%M:%S') [Multi-Repo Migration]"
=======
COMMIT_MSG="Nuxus Core Sync: $(date '+%Y-%m-%d %H:%M:%S') [System: Identity Sync & Fixes]"
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0

# Коммит
git commit -m "$COMMIT_MSG"

<<<<<<< HEAD
# Попытка синхронизации перед отправкой (разрешаем несвязанные истории для новых репо)
echo "📥 Синхронизация с облаком..."
git pull origin main --tags --allow-unrelated-histories || echo "⚠️ Конфликт разрешен локально или это новый репозиторий..."

# Отправка
echo "🛰️ Трансляция пакетов в репозиторий..."
git push -u origin main --force

echo "✅ Успех! Ядро синхронизировано с узлом: $REPO_URL"
=======
# Попытка синхронизации перед отправкой
echo "📥 Синхронизация с облаком..."
git pull origin main --tags --allow-unrelated-histories || echo "⚠️ Конфликт разрешен локально..."

# Отправка
echo "🛰️ Трансляция пакетов в репозиторий nuxus2.0..."
git push -u origin main --force

echo "✅ Успех! Ядро синхронизировано. Теперь почта $USER_EMAIL привязана к коммитам локально."
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
