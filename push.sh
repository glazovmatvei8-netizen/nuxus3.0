
#!/bin/bash

# Nuxus Kernel Sync Utility v1.2
# Скрипт для отправки изменений в твой репозиторий

echo "🚀 Подготовка к отправке в GitHub: glazovmatvei8-netizen/nuxus"

# Конфигурация для решения проблем с расхождением веток
git config pull.rebase false

# Инициализация гит, если нужно
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/glazovmatvei8-netizen/nuxus.git
    git branch -M main
fi

# Попытка синхронизации перед пушем
echo "📥 Синхронизация с облаком..."
git pull origin main --tags

# Добавляем все файлы
git add .

# Формируем сообщение
COMMIT_MSG="Nuxus Update: $(date '+%Y-%m-%d %H:%M:%S')"

# Коммит
git commit -m "$COMMIT_MSG"

# Отправка
echo "🛰️ Трансляция данных в репозиторий..."
git push -u origin main

echo "✅ Успех! Ядро синхронизировано с GitHub."
