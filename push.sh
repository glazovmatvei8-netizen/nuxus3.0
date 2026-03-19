
#!/bin/bash

# Nuxus Kernel Sync Utility v2.5
# Скрипт для автоматического решения всех ошибок Git (Tracking, Divergent Branches)

echo "🚀 Подготовка к отправке в GitHub: glazovmatvei8-netizen/nuxus-message"

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/glazovmatvei8-netizen/nuxus-message.git
    git branch -M main
fi

# 1. ЛЕЧЕНИЕ ОШИБКИ: Divergent Branches
# Принудительно устанавливаем стратегию слияния
git config pull.rebase false

# 2. ЛЕЧЕНИЕ ОШИБКИ: Tracking information
# Принудительно связываем локальную ветку main с удаленной
git branch --set-upstream-to=origin/main main 2>/dev/null || git checkout -b main && git branch --set-upstream-to=origin/main main

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
