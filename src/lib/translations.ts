
export const translations = {
  ru: {
    app: { 
      name: "Nuxus 2.0", 
      kernel: "Ядро Nuxus", 
      signal: "Сообщение",
      chats: "Чаты",
      archive: "Архив",
      calls: "Звонки",
      music: "Музыка",
      wallet: "Кошелек",
      games: "Игры",
      profile: "Аккаунт"
    },
    sidebar: { 
      all: "Все", 
      private: "Личные", 
      groups: "Группы", 
      channels: "Каналы", 
      search: "Поиск...", 
      create: "Создать чат", 
      sync: "Синхронизация...", 
      noResults: "Ничего не найдено", 
      connecting: "Подключение..." 
    },
    chat: { 
      placeholder: "Напишите сообщение...", 
      scheduled: "Запланировано", 
      expired: "Просмотрено", 
      reply: "Ответ", 
      edit: "Изменить", 
      copy: "Копировать", 
      forward: "Переслать", 
      delete: "Удалить", 
      recording: "Запись...", 
      typing: "печатает" 
    },
    settings: { 
      title: "Настройки", 
      tabs: { 
        profile: "Профиль", 
        style: "Оформление", 
        privacy: "Безопасность", 
        language: "Язык", 
        prime: "Premium", 
        interface: "Интерфейс" 
      }, 
      labels: { 
        name: "Имя", 
        username: "Никнейм (@)", 
        bio: "О себе", 
        avatar: "Сменить аватар", 
        theme: "Тема", 
        textSize: "Размер текста", 
        save: "Сохранить изменения", 
        language: "Язык приложения" 
      } 
    },
    auth: { 
      title: "Nuxus", 
      subtitle: "Добро пожаловать", 
      login: "Вход", 
      register: "Регистрация", 
      noAccount: "Нет аккаунта? Зарегистрируйтесь", 
      hasAccount: "Уже есть аккаунт? Войдите",
      enterEmail: "Email или телефон",
      enterPass: "Пароль",
      name: "Ваше имя",
      username: "Никнейм (@)"
    },
    initializing: "Загрузка системы",
    online: "в сети"
  },
  en: {
    app: { 
      name: "Nuxus 2.0", 
      kernel: "Nuxus Core", 
      signal: "Message",
      chats: "Chats",
      archive: "Archive",
      calls: "Calls",
      music: "Music",
      wallet: "Wallet",
      games: "Games",
      profile: "Profile"
    },
    sidebar: { 
      all: "All", 
      private: "Chats", 
      groups: "Groups", 
      channels: "Channels", 
      search: "Search...", 
      create: "Create Chat", 
      sync: "Syncing...", 
      noResults: "No results", 
      connecting: "Connecting..." 
    },
    chat: { 
      placeholder: "Type a message...", 
      scheduled: "Scheduled", 
      expired: "Viewed", 
      reply: "Reply", 
      edit: "Edit", 
      copy: "Copy", 
      forward: "Forward", 
      delete: "Delete", 
      recording: "Recording...", 
      typing: "is typing" 
    },
    settings: { 
      title: "Settings", 
      tabs: { 
        profile: "Profile", 
        style: "Design", 
        privacy: "Security", 
        language: "Language", 
        prime: "Premium", 
        interface: "Interface" 
      }, 
      labels: { 
        name: "Name", 
        username: "Username (@)", 
        bio: "Bio", 
        avatar: "Change Avatar", 
        theme: "Theme", 
        textSize: "Text Size", 
        save: "Save Changes", 
        language: "App Language" 
      } 
    },
    auth: { 
      title: "Nuxus", 
      subtitle: "Welcome back", 
      login: "Log In", 
      register: "Sign Up", 
      noAccount: "No account? Register", 
      hasAccount: "Already have an account? Login",
      enterEmail: "Email or phone",
      enterPass: "Password",
      name: "Your Name",
      username: "Username (@)"
    },
    initializing: "Initializing",
    online: "online"
  }
};

export type LanguageCode = keyof typeof translations;
