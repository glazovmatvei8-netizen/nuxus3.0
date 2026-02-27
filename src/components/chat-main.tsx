
"use client"

import React from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';

/**
 * Основной макет приложения.
 * Обеспечивает адаптивность: на мобильных переключается между сайдбаром и чатом.
 */
export default function ChatMain() {
  const { currentChatId } = useAppState();

  return (
    <div className="fixed inset-0 flex w-full bg-background max-w-[1600px] mx-auto overflow-hidden shadow-2xl h-[100dvh]">
      {/* Сайдбар: на мобильных виден только если чат НЕ выбран */}
      <div className={cn(
        "w-full md:w-[350px] lg:w-[400px] h-full flex-shrink-0 border-r border-white/5 transition-all duration-300 z-30 bg-background",
        currentChatId ? "hidden md:block" : "block"
      )}>
        <ChatSidebar />
      </div>
      
      {/* Область чата: на мобильных видна только если чат ВЫБРАН */}
      <div className={cn(
        "flex-1 h-full flex flex-col min-w-0 transition-all duration-300 bg-background relative z-20",
        !currentChatId ? "hidden md:flex" : "flex"
      )}>
        <ChatArea />
      </div>
    </div>
  );
}
