#!/bin/bash

# Nuxus Kernel Sync Utility v9.0
# Скрипт для принудительной синхронизации с репозиторием nuxus2.0

REPO_URL="https://github.com/glazovmatvei8-netizen/nuxus2.0.git"

echo "🚀 Подготовка к трансляции данных в GitHub (nuxus2.0)..."

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin "$REPO_URL"
fi

# Принудительное обновление URL (если сменился репозиторий)
git remote set-url origin "$REPO_URL"

# 1. Принудительная настройка локальной ветки
git branch -M main

# 2. Настройка стратегий (Лечит Divergent Branches)
git config pull.rebase false

# 3. Настройка удаленного отслеживания (Лечит 'no tracking information')
git branch --set-upstream-to=origin/main main || echo "⚠️ Ветка еще не связана на сервере..."

# 4. Попытка синхронизации
echo "📥 Попытка получения данных из облака..."
git pull origin main --tags --allow-unrelated-histories || echo "⚠️ Удаленная ветка не найдена или пуста, продолжаем..."

# 5. Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus Core Sync: $(date '+%Y-%m-%d %H:%M:%S') [System: DomainSplit & SecurityShield]"

# 6. Коммит
git commit -m "$COMMIT_MSG"

# 7. Отправка и принудительная привязка
echo "🛰️ Трансляция пакетов в репозиторий nuxus2.0..."
git push -u origin main

echo "✅ Успех! Ядро синхронизировано. Используйте команду: sh push.sh"
