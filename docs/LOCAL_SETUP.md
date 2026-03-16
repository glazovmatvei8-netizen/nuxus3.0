
# 🚀 Локальное развертывание Nuxus Kernel

Этот документ поможет вам перенести проект из GitHub в VS Code на ваш персональный компьютер и запустить его.

## 1. Подготовка инструментов
Убедитесь, что на вашем компьютере установлены следующие программы:
- **Git**: [Скачать здесь](https://git-scm.com/) (нужен для работы с GitHub)
- **Node.js (LTS версия)**: [Скачать здесь](https://nodejs.org/) (движок для запуска проекта)
- **Visual Studio Code**: [Скачать здесь](https://code.visualstudio.com/)

## 2. Клонирование репозитория на ПК
1. Открой терминал на своем компьютере (или командную строку).
2. Перейди в папку, где хочешь хранить проект (например, `cd Documents`).
3. Введи команду (подставь свою ссылку):
   ```bash
   git clone https://github.com/glazovmatvei8-netizen/nuxus.git
   ```
4. Перейди в папку проекта:
   ```bash
   cd nuxus
   ```

## 3. Открытие в VS Code
Введи в терминале:
```bash
code .
```
Или просто перетащи папку `nuxus` в окно VS Code.

## 4. Установка зависимостей
Открой встроенный терминал в VS Code (Ctrl + `) и введи:
```bash
npm install
```
*Это загрузит все библиотеки в папку `node_modules`. Дождись завершения.*

## 5. Настройка Firebase (.env)
Тебе нужно создать файл `.env` в корне проекта (рядом с `package.json`).
Скопируй туда свои ключи из консоли Firebase:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=ваш_ключ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ваш_проект.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ваш_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ваш_бакет.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=ваш_id
NEXT_PUBLIC_FIREBASE_APP_ID=ваш_app_id
GOOGLE_GENERATIVE_AI_API_KEY=ваш_ключ_gemini
```

## 6. Запуск проекта
В терминале VS Code введи:
```bash
npm run dev
```
Проект будет доступен по адресу: [http://localhost:3000](http://localhost:3000)

## 7. Как опубликовать изменения на GitHub
Я создал файл `push.sh`. Чтобы отправить все свои изменения в репозиторий `glazovmatvei8-netizen/nuxus`, просто введи в терминале:
```bash
sh push.sh
```
*Если спросит логин/пароль — введи данные от GitHub.*

---
### 📡 Настройки AmneziaWG (Германия/Франкфурт)
Если нужно настроить VPN через Cloudflare:
- **Address**: `172.16.0.2/32`
- **Endpoint**:
  - `162.159.193.10:2408`
  - `162.159.193.5:2408`
  - `188.114.97.2:2408`
