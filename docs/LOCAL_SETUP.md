
# 🚀 Локальное развертывание Nuxus Kernel

Этот документ поможет вам перенести проект из GitHub в VS Code на ваш персональный компьютер.

## 1. Подготовка инструментов
Убедитесь, что на вашем компьютере установлены следующие программы:
- **Git**: [Скачать здесь](https://git-scm.com/)
- **Node.js (LTS версия)**: [Скачать здесь](https://nodejs.org/)
- **Visual Studio Code**: [Скачать здесь](https://code.visualstudio.com/)

## 2. Клонирование репозитория
1. Открой GitHub и перейди на страницу своего репозитория.
2. Нажми зеленую кнопку **Code** и скопируй ссылку (HTTPS или SSH).
3. Открой терминал (или командную строку) на своем ПК.
4. Введи команду:
   ```bash
   git clone https://github.com/твой_логин/твой_репозиторий.git
   ```
5. Перейди в папку проекта:
   ```bash
   cd твой_репозиторий
   ```

## 3. Открытие в VS Code
Введи команду `code .` или просто перетащи папку проекта в окно VS Code.

## 4. Установка зависимостей
Открой встроенный терминал в VS Code (Ctrl + `) и введи:
```bash
npm install
```
*Это загрузит все необходимые библиотеки (React, Next.js, Firebase и др.) в папку `node_modules`.*

## 5. Настройка Firebase и Окружения
Вам нужно создать файл `.env` в корне проекта и добавить туда настройки вашего Firebase проекта. 
Вы можете найти их в **Firebase Console -> Project Settings -> General -> Your apps -> Firebase SDK snippet -> Config**.

Пример содержимого `.env`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=ваш_ключ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ваш_домен.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ваш_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ваш_бакет.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=ваш_id
NEXT_PUBLIC_FIREBASE_APP_ID=ваш_app_id
GOOGLE_GENERATIVE_AI_API_KEY=ваш_ключ_для_генита
```

## 6. Запуск проекта
Для запуска в режиме разработки введи:
```bash
npm run dev
```
Проект будет доступен по адресу: [http://localhost:3000](http://localhost:3000)

## 📡 Сеть и VPN (Справка для AmneziaWG)
Если для работы Ядра вам требуется VPN с локацией в Германии через AmneziaWG (Cloudflare WARP), используйте следующие параметры:

- **Address**: `172.16.0.2/32` (Не менять!)
- **Endpoint (Германия/Франкфурт)**:
  - `162.159.193.10:2408`
  - `162.159.193.5:2408`
  - `188.114.97.2:2408`

## 7. Сборка (Production)
Если вы захотите собрать проект для деплоя:
```bash
npm run build
npm run start
```

---
**Удачи, Брат! Теперь Ядро в твоих руках.** 🦾💎🟣
