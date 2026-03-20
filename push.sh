
#!/bin/bash

# Nuxus Kernel Sync Utility v6.0
# Скрипт для принудительного решения ошибок Git и синхронизации с новым репозиторием nuxus

echo "🚀 Подготовка к трансляции данных в GitHub (nuxus)..."

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/glazovmatvei8-netizen/nuxus.git
fi

# Проверка и обновление удаленного URL, если он изменился
git remote set-url origin https://github.com/glazovmatvei8-netizen/nuxus.git

# 1. Принудительная настройка локальной ветки
git branch -M main

# 2. Настройка стратегий (Лечит Divergent Branches)
git config pull.rebase false

# 3. Настройка удаленного отслеживания (Лечит 'no tracking information')
git branch --set-upstream-to=origin/main main || echo "⚠️ Ветка еще не связана на сервере..."

# 4. Попытка синхронизации
echo "📥 Попытка получения данных из облака..."
# Используем --allow-unrelated-histories на случай разных историй коммитов
git pull origin main --tags --allow-unrelated-histories || echo "⚠️ Удаленная ветка не найдена или пуста, продолжаем..."

# 5. Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus Core Sync: $(date '+%Y-%m-%d %H:%M:%S') [System: DomainSplit & SecurityShield]"

# 6. Коммит
git commit -m "$COMMIT_MSG"

# 7. Отправка и принудительная привязка (Лечит 'couldn't find remote ref main')
echo "🛰️ Трансляция пакетов в репозиторий nuxus..."
git push -u origin main

echo "✅ Успех! Ядро синхронизировано с новым репозиторием. Используйте команду: sh push.sh"
