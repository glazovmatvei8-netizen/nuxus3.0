
# NuxusChat — Премиальный опыт общения (v25.1.0)

Добро пожаловать в NuxusChat! Приложение теперь полностью опубликовано и доступно по адресу: **https://studio-5946432351-bbd5e.web.app/**

## 🚀 Как убрать страницу "Firebase Hosting Setup Complete"
Если вы все еще видите страницу приветствия Firebase:
1. Нажмите **Ctrl + F5** (или очистите кэш браузера).
2. Я уже удалил файл-заглушку в коде, после следующего автоматического деплоя она исчезнет навсегда.

## 💻 Установка на ПК (Windows App)
1. Откройте мессенджер в **Google Chrome** или **Microsoft Edge**.
2. В правой части адресной строки нажмите на иконку **«Установить NuxusChat»** (монитор со стрелкой).

Или используйте Nativefier (в PowerShell):
```powershell
npx nativefier --name "NuxusChat" "https://studio-5946432351-bbd5e.web.app/" --internal-urls ".*" --single-instance --tray
```

## 📱 Установка на Android (Нативное PWA)
1. Откройте **https://studio-5946432351-bbd5e.web.app/** в Chrome на Android.
2. Нажмите **"Три точки"** в углу.
3. Выберите **"Установить приложение"**.

## 🤖 Создание Android APK (Bubblewrap)
Теперь ссылка публичная, и Bubblewrap сможет собрать APK:
```powershell
npx @bubblewrap/cli init --manifest="https://studio-5946432351-bbd5e.web.app/manifest.json"
npx @bubblewrap/cli build
```

**Nuxus — это ваша приватная территория. Никаких ботов, только реальные люди.**
