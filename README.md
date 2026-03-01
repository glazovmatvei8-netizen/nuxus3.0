
# NuxusChat — Премиальный опыт общения (v24.0.0)

Добро пожаловать в NuxusChat! Приложение полностью оптимизировано для работы как отдельное приложение на Windows, iOS и Android.

## 💻 Установка на ПК (Windows App)
1. Откройте мессенджер в **Google Chrome** или **Microsoft Edge**.
2. В правой части адресной строки нажмите на иконку **«Установить NuxusChat»** (монитор со стрелкой).
3. **Хакерский способ (PowerShell)**:
   ```powershell
   # Перейдите на рабочий стол
   cd $env:USERPROFILE\Desktop
   # Создайте приложение (БЕЗ иконки в параметрах, чтобы избежать ошибок конвертации)
   npx nativefier --name "NuxusChat" "https://9000-firebase-studio-1772042875348.cluster-kizalrzg35hz6u4i7pguwgt6ss.cloudworkstations.dev" --internal-urls ".*" --single-instance --tray
   ```

## 📱 Установка на Android (Native APK)
Чтобы создать настоящий установочный файл **.apk**, используйте Google Bubblewrap:
1. Установите Node.js на ПК.
2. В терминале (не в System32!) выполните:
   ```bash
   npx @bubblewrap/cli init --manifest="https://9000-firebase-studio-1772042875348.cluster-kizalrzg35hz6u4i7pguwgt6ss.cloudworkstations.dev/manifest.json"
   ```
3. **Настройка JDK (ВАЖНО)**:
   - Если Bubblewrap спрашивает путь к JDK 17, вводите его **БЕЗ КАВЫЧЕК**.
   - **Правильно**: `C:\Program Files\Java\jdk-17.0.18`
   - **Неправильно**: `"C:\Program Files\Java\jdk-17.0.18"` (кавычки вызывают ошибку lstat).
   - Если вы не уверены, просто выберите **"Yes"**, чтобы Bubblewrap установил JDK автоматически.
4. После инициализации выполните:
   ```bash
   npx @bubblewrap/cli build
   ```
5. Полученный файл `app-release-signed.apk` можно скинуть на телефон и установить.

## 🍎 Установка на iPhone (iOS)
1. Откройте сайт в **Safari**.
2. Нажмите кнопку **«Поделиться»** (квадрат со стрелкой).
3. Выберите **«На экран Домой»**.
4. Запустите с иконки. Только в этом режиме доступны PUSH-уведомления.

---

## 🛡️ Безопасность и Данные
- **2FA Protection**: Облачная двухфакторная аутентификация через секретный PIN.
- **Master-Access**: Секретный вход через 5 кликов по логотипу Ядра.
- **Privacy Core**: Полный контроль над видимостью номера и приглашениями.

**Nuxus — это ваша приватная территория. Никаких ботов, только реальные люди по номерам телефонов.**
