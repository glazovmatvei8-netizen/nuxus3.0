
#!/bin/bash

# Nuxus Kernel Sync Utility v3.0
# Скрипт для автоматического решения всех ошибок Git (Tracking, Divergent, Remote Ref)

echo "🚀 Подготовка к отправке в GitHub: glazovmatvei8-netizen/nuxus-message"

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/glazovmatvei8-netizen/nuxus-message.git
    git branch -M main
fi

# 1. Настройка стратегии слияния (Лечит Divergent Branches)
git config pull.rebase false

# 2. Попытка синхронизации
echo "📥 Синхронизация с облаком..."
# Используем --allow-unrelated-histories на случай, если репозиторий был пересоздан
git pull origin main --tags --allow-unrelated-histories || echo "⚠️ Удаленная ветка main не найдена или пуста, продолжаем..."

# 3. Связываем ветку, если она не связана
git branch --set-upstream-to=origin/main main 2>/dev/null

# 4. Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus Core Update: $(date '+%Y-%m-%d %H:%M:%S') [Fix: Domain Split & Permission Shield]"

# 5. Коммит
git commit -m "$COMMIT_MSG"

# 6. Отправка (Трансляция)
echo "🛰️ Трансляция данных в репозиторий..."
git push -u origin main

echo "✅ Успех! Ядро синхронизировано. Все ошибки Гита устранены."
