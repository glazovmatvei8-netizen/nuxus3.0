
# NuxusChat — Quantum Update (v0.67.0)

Мессенджер полностью оптимизирован для работы как отдельное приложение на Android (.apk), Windows (.exe) и iOS.

## 🤖 Как создать APK (Android)
1. Установите Bubblewrap: `npm install -g @bubblewrap/cli`
2. В пустой папке запустите: `bubblewrap init --manifest=https://studio-5946432351-bbd5e.web.app/manifest.webmanifest`
3. На вопросы терминала отвечайте так:
   - **Domain**: `studio-5946432351-bbd5e.web.app`
   - **URL path**: `/`
   - **Display mode**: `standalone`
4. Соберите файл: `bubblewrap build`

## 🖥️ Как собрать EXE (Windows)
Выполните команду:
`npx nativefier "https://studio-5946432351-bbd5e.web.app/" --name "Nuxus" --internal-urls ".*" --single-instance --tray --window-controls`

## 🍎 Как установить на iPhone
1. Откройте Safari.
2. Перейдите по ссылке `https://studio-5946432351-bbd5e.web.app/`.
3. Нажмите **"Поделиться"** -> **"На экран «Домой»"**.

---
**Nuxus — Технологии, доступные каждому.**
