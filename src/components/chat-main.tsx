"use client"

import React, { useState } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function ChatMain() {
  const { currentChatId } = useAppState();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-background max-w-[1600px] mx-auto overflow-hidden shadow-2xl">
      <div className={cn(
        "w-full md:w-[350px] lg:w-[400px] h-full flex-shrink-0 border-r border-border/40 transition-all duration-300",
        !isSidebarOpen && "md:-ml-[350px] lg:-ml-[400px]",
        currentChatId && "hidden md:flex"
      )}>
        <ChatSidebar />
      </div>
      
      <div className={cn(
        "flex-1 h-full flex flex-col min-w-0 transition-all duration-300",
        !currentChatId && "hidden md:flex"
      )}>
        <ChatArea toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
      </div>
    </div>
  );
}