"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Chat, Message } from './types';

interface AppState {
  currentUser: User | null;
  users: Record<string, User>;
  chats: Chat[];
  currentChatId: string | null;
  setCurrentUser: (user: User | null) => void;
  setUsers: (users: Record<string, User>) => void;
  setChats: (chats: Chat[]) => void;
  setCurrentChatId: (id: string | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  addReaction: (chatId: string, messageId: string, emoji: string, userId: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Initialize from LocalStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('nuxus_user');
    const savedUsers = localStorage.getItem('nuxus_users');
    const savedChats = localStorage.getItem('nuxus_chats');

    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (savedUsers) setUsers(JSON.parse(savedUsers));
    if (savedChats) setChats(JSON.parse(savedChats));
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (currentUser) localStorage.setItem('nuxus_user', JSON.stringify(currentUser));
    else localStorage.removeItem('nuxus_user');
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('nuxus_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('nuxus_chats', JSON.stringify(chats));
  }, [chats]);

  const addMessage = (chatId: string, message: Message) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return { ...chat, messages: [...chat.messages, message] };
      }
      return chat;
    }));
  };

  const addReaction = (chatId: string, messageId: string, emoji: string, userId: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: chat.messages.map(msg => {
            if (msg.id === messageId) {
              const reactions = { ...(msg.reactions || {}) };
              if (!reactions[emoji]) reactions[emoji] = [];
              const userIdx = reactions[emoji].indexOf(userId);
              if (userIdx === -1) {
                reactions[emoji].push(userId);
              } else {
                reactions[emoji].splice(userIdx, 1);
                if (reactions[emoji].length === 0) delete reactions[emoji];
              }
              return { ...msg, reactions };
            }
            return msg;
          })
        };
      }
      return chat;
    }));
  };

  return (
    <AppContext.Provider value={{
      currentUser, users, chats, currentChatId,
      setCurrentUser, setUsers, setChats, setCurrentChatId,
      addMessage, addReaction
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState must be used within AppProvider');
  return context;
};
