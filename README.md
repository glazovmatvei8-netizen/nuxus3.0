
# NuxusChat — Премиальный опыт общения (v25.0.0)

Добро пожаловать в NuxusChat! Приложение теперь полностью опубликовано и доступно по адресу: **https://studio-5946432351-bbd5e.web.app/**

## 💻 Установка на ПК (Windows App)
1. Откройте мессенджер в **Google Chrome** или **Microsoft Edge**.
2. В правой части адресной строки нажмите на иконку **«Установить NuxusChat»** (монитор со стрелкой). Это самый надежный способ.

Или используйте Nativefier (PowerShell):
```powershell
npx nativefier --name "NuxusChat" "https://studio-5946432351-bbd5e.web.app/" --internal-urls ".*" --single-instance --tray
```

## 📱 Установка на Android (Нативное PWA)
Теперь, когда ссылка публичная, установка работает мгновенно:
1. Откройте **https://studio-5946432351-bbd5e.web.app/** в Chrome на Android.
2. Нажмите **"Три точки"** в углу.
3. Выберите **"Установить приложение"**.
4. После этого мессенджер появится в меню вашего телефона с иконкой и без рамок браузера.

## 🤖 Создание Android APK (Bubblewrap)
Теперь вы можете собрать APK, так как ссылка доступна публично:
```powershell
npx @bubblewrap/cli init --manifest="https://studio-5946432351-bbd5e.web.app/manifest.json"
npx @bubblewrap/cli build
```

---

## 🛡️ Безопасность и Данные
- **2FA Protection**: Облачная двухфакторная аутентификация через секретный PIN.
- **Public Hosting**: Приложение стабильно работает на Firebase Hosting.
- **Privacy Core**: Полный контроль над видимостью номера и приглашениями.

**Nuxus — это ваша приватная территория. Никаких ботов, только реальные люди.**
