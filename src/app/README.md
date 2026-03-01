
# NuxusChat — Премиальный опыт общения (v24.0.0)

Добро пожаловать в NuxusChat! Приложение полностью оптимизировано для работы как отдельное приложение на Windows, iOS и Android.

## 💻 Установка на ПК (Windows App)
1. Откройте мессенджер в **Google Chrome** или **Microsoft Edge**.
2. В правой части адресной строки нажмите на иконку **«Установить NuxusChat»** (монитор со стрелкой).

## 📱 Установка на Android (Native APK)
Для создания настоящего **.apk** используйте Google Bubblewrap.

### Как найти путь к JDK 17:
Когда Bubblewrap спрашивает **Path to your existing JDK 17**, обычно это один из этих путей:
- `C:\Program Files\Java\jdk-17`
- `C:\Program Files\Java\jdk-17.0.x`

**ВАЖНО: Вводите путь БЕЗ КАВЫЧЕК!** 
Пример: `C:\Program Files\Java\jdk-17.0.18`

**Если вы не уверены**: 
1. Нажмите `Win + R`, введите `cmd`, затем `where java`.
2. Или просто выберите **"Yes"** на вопрос об установке JDK самим Bubblewrap — это самый простой путь.

### Команды сборки:
1. В терминале: `npx @bubblewrap/cli init --manifest="https://9000-firebase-studio-1772042875348.cluster-kizalrzg35hz6u4i7pguwgt6ss.cloudworkstations.dev/manifest.json"`
2. Ответьте на вопросы (название, цвета).
3. Выполните: `npx @bubblewrap/cli build`
4. Файл `app-release-signed.apk` будет готов к установке.

## 🍎 Установка на iPhone (iOS)
1. Откройте сайт в **Safari**.
2. Нажмите кнопку **«Поделиться»** (квадрат со стрелкой).
3. Выберите **«На экран Домой»**.

---

**Nuxus — это ваша приватная территория. Никаких ботов, только реальные люди.**
