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
    <div className="flex h-[100svh] w-full bg-background max-w-[1600px] mx-auto overflow-hidden shadow-2xl relative">
      <div className={cn(
        "absolute inset-0 md:relative md:flex transition-all duration-300 z-30 bg-background",
        "w-full md:w-[350px] lg:w-[400px] h-full flex-shrink-0 border-r border-border/40",
        !isSidebarOpen && "md:-ml-[350px] lg:-ml-[400px]",
        currentChatId ? "hidden md:flex" : "flex"
      )}>
        <ChatSidebar />
      </div>
      
      <div className={cn(
        "flex-1 h-full flex flex-col min-w-0 transition-all duration-300 bg-background relative z-20",
        !currentChatId ? "hidden md:flex" : "flex"
      )}>
        <ChatArea toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
      </div>
    </div>
  );
}
