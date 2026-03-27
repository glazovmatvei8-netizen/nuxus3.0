
export const translations = {
  ru: {
    app: { 
      name: "Nuxus 2.0", 
      kernel: "Nuxus Kernel", 
      signal: "Nuxus Signal",
      chats: "чаты 🐱",
      archive: "архив 🐱",
      calls: "звонки",
      music: "музыка",
      wallet: "кошелек",
      games: "игры",
      profile: "профиль"
    },
    sidebar: { 
      all: "Все", 
      private: "Чаты", 
      groups: "Группы", 
      channels: "Каналы", 
      search: "Поиск...", 
      create: "Создать сообщество", 
      sync: "Синхронизация...", 
      noResults: "Никто не найден", 
      connecting: "соединение..." 
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
      title: "Профиль", 
      tabs: { 
        profile: "Профиль", 
        style: "Стиль", 
        privacy: "Защита", 
        language: "Язык", 
        prime: "Prime", 
        interface: "Интерфейс" 
      }, 
      labels: { 
        name: "Имя", 
        username: "Никнейм", 
        bio: "О себе", 
        avatar: "Генерировать ИИ-аватар", 
        theme: "Тема оформления", 
        textSize: "Размер текста", 
        save: "Сохранить", 
        language: "Язык интерфейса" 
      } 
    },
    auth: { 
      title: "Nuxus", 
      subtitle: "Ядро Авторизации", 
      login: "Войти в Ядро", 
      register: "Загрузить профиль", 
      noAccount: "Нет аккаунта? Регистрация", 
      hasAccount: "Уже есть аккаунт? Вход" 
    },
    initializing: "Initializing",
    online: "в сети"
  },
  en: {
    app: { 
      name: "Nuxus 2.0", 
      kernel: "Nuxus Kernel", 
      signal: "Nuxus Signal",
      chats: "chats 🐱",
      archive: "archive 🐱",
      calls: "calls",
      music: "music",
      wallet: "wallet",
      games: "games",
      profile: "profile"
    },
    sidebar: { 
      all: "All", 
      private: "Chats", 
      groups: "Groups", 
      channels: "Channels", 
      search: "Search...", 
      create: "Create Community", 
      sync: "Syncing...", 
      noResults: "No one found", 
      connecting: "connecting..." 
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
        style: "Style", 
        privacy: "Privacy", 
        language: "Language", 
        prime: "Prime", 
        interface: "Interface" 
      }, 
      labels: { 
        name: "Name", 
        username: "Username", 
        bio: "Bio", 
        avatar: "Generate AI Avatar", 
        theme: "Theme", 
        textSize: "Text Size", 
        save: "Save", 
        language: "Interface Language" 
      } 
    },
    auth: { 
      title: "Nuxus", 
      subtitle: "Authorization Kernel", 
      login: "Enter Kernel", 
      register: "Load Profile", 
      noAccount: "No account? Register", 
      hasAccount: "Already have an account? Login" 
    },
    initializing: "Initializing",
    online: "online"
  }
};

export type LanguageCode = keyof typeof translations;
