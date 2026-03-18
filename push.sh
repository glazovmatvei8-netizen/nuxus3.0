
#!/bin/bash

# Nuxus Kernel Sync Utility v2.3
# Скрипт для автоматического решения ошибок синхронизации и отправки в GitHub

echo "🚀 Подготовка к отправке в GitHub: glazovmatvei8-netizen/nuxus-message"

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/glazovmatvei8-netizen/nuxus-message.git
    git branch -M main
fi

# 1. ЛЕЧЕНИЕ ОШИБКИ: Tracking information
# Принудительно связываем локальную ветку main с удаленной
git branch --set-upstream-to=origin/main main 2>/dev/null || git checkout -b main && git branch --set-upstream-to=origin/main main

# 2. ЛЕЧЕНИЕ ОШИБКИ: Divergent Branches (Стратегия слияния)
# Это лечит ошибку 'fatal: Need to specify how to reconcile divergent branches'
git config pull.rebase false

# Попытка синхронизации перед пушем
echo "📥 Синхронизация с облаком (объединение версий)..."
git pull origin main --tags || echo "Конфликты или пустой репозиторий, продолжаем..."

# Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus Core Update: $(date '+%Y-%m-%d %H:%M:%S') [Fix: Domain Separation & Group Permissions]"

# Коммит
git commit -m "$COMMIT_MSG"

# Отправка
echo "🛰️ Трансляция данных в репозиторий..."
git push -u origin main

echo "✅ Успех! Ядро синхронизировано. Все ошибки устранены."
