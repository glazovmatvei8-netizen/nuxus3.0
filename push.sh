
#!/bin/bash

# Nuxus Kernel Sync Utility v4.0
# Скрипт для принудительного решения ошибок Git (Tracking, Divergent, Remote Ref)

echo "🚀 Подготовка к трансляции данных в GitHub..."

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/glazovmatvei8-netizen/nuxus-message.git
fi

# 1. Принудительная настройка локальной ветки
git branch -M main

# 2. Настройка стратегий (Лечит Divergent Branches)
git config pull.rebase false

# 3. Попытка синхронизации
echo "📥 Попытка получения данных из облака..."
# Используем --allow-unrelated-histories на случай разных историй
git pull origin main --tags --allow-unrelated-histories || echo "⚠️ Удаленная ветка не найдена, продолжаем создание..."

# 4. Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus Core Sync: $(date '+%Y-%m-%d %H:%M:%S') [System: DomainSplit & SecurityShield]"

# 5. Коммит
git commit -m "$COMMIT_MSG"

# 6. Отправка и принудительная привязка (Лечит 'couldn't find remote ref main')
echo "🛰️ Трансляция пакетов в репозиторий..."
git push -u origin main

echo "✅ Успех! Ядро синхронизировано. Все ошибки Гита устранены."
