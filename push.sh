#!/bin/bash

# Nuxus Kernel Sync Utility v16.0
# Скрипт для принудительной синхронизации и миграции (Genesis 3.0).

# 1. Настройки по умолчанию
DEFAULT_REPO_URL="https://github.com/glazovmatvei8-netizen/nuxus2.0.git"
USER_EMAIL="eventionhorizon@gmail.com"
USER_NAME="glazovmatvei8-netizen"

# 2. Динамическое определение целевого узла
REPO_URL=${1:-$DEFAULT_REPO_URL}

echo "🚀 Подготовка к принудительной трансляции данных..."
echo "📡 Целевой узел: $REPO_URL"

# 3. ЛИКВИДАЦИЯ ЗАСТРЯВШИХ МЕРДЖЕЙ (Исправление ошибки unmerged files)
git merge --abort 2>/dev/null || true

# 4. Инициализация или перенастройка
if [ ! -d ".git" ]; then
    git init
    git remote add origin "$REPO_URL"
else
    git remote set-url origin "$REPO_URL"
fi

# Настройка идентификации
git config user.email "$USER_EMAIL"
git config user.name "$USER_NAME"

# Установка главной ветки
git branch -M main

# Добавляем все файлы и фиксируем состояние
git add .
COMMIT_MSG="Nuxus 3.0 Genesis Sync: $(date '+%Y-%m-%d %H:%M:%S') [Forced Migration]"
git commit -m "$COMMIT_MSG" || echo "⚠️ Состояние уже зафиксировано."

# 5. ПРИНУДИТЕЛЬНАЯ ТРАНСЛЯЦИЯ (FORCE PUSH)
echo "🛰️ Трансляция пакетов в репозиторий (Quantum Force)..."
git push -u origin main --force

echo "✅ Успех! Ядро принудительно синхронизировано с узлом: $REPO_URL"
