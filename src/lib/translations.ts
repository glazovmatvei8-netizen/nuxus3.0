
export const translations = {
  ru: {
    app: { 
      name: "Nuxus", 
      kernel: "Система Nuxus", 
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
      all: "Все чаты", 
      private: "Личные", 
      groups: "Группы", 
      channels: "Каналы", 
      search: "Поиск...", 
      create: "Создать", 
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
        profile: "Аккаунт", 
        style: "Стиль", 
        privacy: "Защита", 
        language: "Язык", 
        prime: "Premium", 
        interface: "Интерфейс" 
      }, 
      labels: { 
        name: "Ваше имя", 
        username: "Никнейм (@)", 
        bio: "О себе", 
        avatar: "Изменить фото", 
        theme: "Тема оформления", 
        textSize: "Размер текста", 
        save: "Сохранить", 
        language: "Язык приложения" 
      } 
    },
    auth: { 
      title: "Вход в аккаунт", 
      subtitle: "Ваш безопасный мессенджер", 
      login: "Войти", 
      register: "Регистрация", 
      noAccount: "Еще нет аккаунта?", 
      hasAccount: "Уже зарегистрированы?",
      enterEmail: "Электронная почта",
      enterPhone: "Номер телефона",
      enterPass: "Пароль",
      name: "Ваше имя",
      username: "Ваш никнейм (@)",
      selectCountry: "Выберите страну"
    },
    initializing: "Загрузка системы...",
    online: "в сети",
    offline: "не в сети"
  },
  en: {
    app: { 
      name: "Nuxus", 
      kernel: "Nuxus Core", 
      signal: "Message",
      chats: "Chats",
      archive: "Archive",
      calls: "Calls",
      music: "Music",
      wallet: "Wallet",
      games: "Games",
      profile: "Account"
    },
    sidebar: { 
      all: "All Chats", 
      private: "Private", 
      groups: "Groups", 
      channels: "Channels", 
      search: "Search...", 
      create: "Create", 
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
        profile: "Account", 
        style: "Style", 
        privacy: "Security", 
        language: "Language", 
        prime: "Premium", 
        interface: "Interface" 
      }, 
      labels: { 
        name: "Full Name", 
        username: "Username (@)", 
        bio: "Bio", 
        avatar: "Change Photo", 
        theme: "Theme", 
        textSize: "Text Size", 
        save: "Save Changes", 
        language: "App Language" 
      } 
    },
    auth: { 
      title: "Sign In", 
      subtitle: "Secure messaging starts here", 
      login: "Log In", 
      register: "Sign Up", 
      noAccount: "New to Nuxus?", 
      hasAccount: "Already have an account?",
      enterEmail: "Email Address",
      enterPhone: "Phone Number",
      enterPass: "Password",
      name: "Your Name",
      username: "Username (@)",
      selectCountry: "Select Country"
    },
    initializing: "Initializing...",
    online: "online",
    offline: "offline"
  }
};

export type LanguageCode = keyof typeof translations;
