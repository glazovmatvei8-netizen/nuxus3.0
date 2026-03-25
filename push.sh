#!/bin/bash

# Nuxus Kernel Sync Utility v10.0
# Скрипт для принудительной синхронизации с репозиторием nuxus2.0

REPO_URL="https://github.com/glazovmatvei8-netizen/nuxus2.0.git"

echo "🚀 Подготовка к трансляции данных в GitHub (nuxus2.0)..."

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin "$REPO_URL"
fi

# Принудительное обновление URL
git remote set-url origin "$REPO_URL"

# 1. Принудительная настройка локальной ветки
git branch -M main

# 2. Настройка стратегий
git config pull.rebase false

# 3. Настройка удаленного отслеживания
git branch --set-upstream-to=origin/main main || echo "⚠️ Ветка еще не связана..."

# 4. Попытка синхронизации с разрешением несвязанных историй
echo "📥 Попытка получения данных из облака..."
git pull origin main --tags --allow-unrelated-histories || echo "⚠️ Конфликт или пустая ветка, продолжаем..."

# 5. Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus Core Sync: $(date '+%Y-%m-%d %H:%M:%S') [System: BotManager & Protection]"

# 6. Коммит
git commit -m "$COMMIT_MSG"

# 7. Отправка
echo "🛰️ Трансляция пакетов в репозиторий nuxus2.0..."
git push -u origin main

echo "✅ Успех! Ядро синхронизировано. Используйте команду: sh push.sh"
