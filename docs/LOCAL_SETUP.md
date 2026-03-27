
# 🚀 Локальное развертывание Nuxus Kernel (v0.65.8)

Этот документ поможет вам перенести проект из GitHub в VS Code на ваш персональный компьютер и собрать его как APK для Android.

## 1. Подготовка инструментов
Убедитесь, что на вашем компьютере установлены:
- **Git**: [Скачать здесь](https://git-scm.com/)
- **Node.js (LTS версия)**: [Скачать здесь](https://nodejs.org/)
- **Visual Studio Code**: [Скачать здесь](https://code.visualstudio.com/)
- **Android Studio**: (Для сборки APK) [Скачать здесь](https://developer.android.com/studio)

## 2. Клонирование репозитория
1. Откройте терминал.
2. `git clone https://github.com/glazovmatvei8-netizen/nuxus2.0.git`
3. `cd nuxus2.0`

## 3. Установка и запуск
1. Введите: `npm install`
2. Запустите в браузере: `npm run dev`

## 4. Как собрать APK (Android)
Ядро использует **Capacitor** для превращения веб-сайта в нативное приложение.

1. **Сборка проекта**:
   ```bash
   npm run build
   ```
2. **Добавление Android платформы** (только первый раз):
   ```bash
   npx cap add android
   ```
3. **Синхронизация кода**:
   ```bash
   npx cap copy
   ```
4. **Открытие в Android Studio**:
   ```bash
   npx cap open android
   ```
5. В Android Studio:
   - Дождитесь индексации (внизу полоска).
   - Нажмите в верхнем меню: **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
   - Готовый файл появится в папке проекта: `android/app/build/outputs/apk/debug/app-debug.apk`.

---
### 🛡️ Предотвращение обновления (Pull-to-Refresh)
Я уже внес изменения в `src/app/globals.css`. Теперь в APK при свайпе вверх страница **не будет** пытаться обновиться как сайт. Приложение ведет себя как нативное.

### 📡 Настройки AmneziaWG (Германия/Франкфурт)
Для обхода блокировок Copilot используйте эти Endpoint:
- `162.159.193.10:2408`
- `162.159.193.5:2408`
- `188.114.97.2:2408`
