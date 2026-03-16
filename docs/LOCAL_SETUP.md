
# 🚀 Локальное развертывание Nuxus Kernel (v0.65.8)

Этот документ поможет вам перенести проект из GitHub в VS Code на ваш персональный компьютер и запустить его.

## 1. Подготовка инструментов
Убедитесь, что на вашем компьютере установлены следующие программы:
- **Git**: [Скачать здесь](https://git-scm.com/)
- **Node.js (LTS версия)**: [Скачать здесь](https://nodejs.org/)
- **Visual Studio Code**: [Скачать здесь](https://code.visualstudio.com/)

## 2. Клонирование репозитория на ПК
1. Откройте терминал на своем компьютере.
2. Перейдите в папку проекта:
   ```bash
   git clone https://github.com/glazovmatvei8-netizen/nuxus-message.git
   ```
3. Зайдите в папку:
   ```bash
   cd nuxus-message
   ```

## 3. Решение ошибок Git
Если при попытке `pull` или `push` возникают ошибки:

**Ошибка "Divergent branches":**
```bash
git config pull.rebase false
```

**Ошибка "No tracking information":**
```bash
git branch --set-upstream-to=origin/main main
```

**Универсальное решение:** Просто запустите созданный мной скрипт:
```bash
sh push.sh
```

## 4. Установка и запуск
1. Откройте папку в VS Code.
2. В терминале введите:
   ```bash
   npm install
   ```
3. Запустите проект:
   ```bash
   npm run dev
   ```

## 5. Настройка Firebase (.env)
Создайте файл `.env` в корне проекта и добавьте туда свои ключи из Firebase Console.

---
### 📡 Настройки AmneziaWG (Германия/Франкфурт)
Для обхода блокировок Copilot используйте эти Endpoint:
- `162.159.193.10:2408`
- `162.159.193.5:2408`
- `188.114.97.2:2408`
