"use client"

import React from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';

/**
 * Main application layout with improved mobile responsiveness.
 */
export default function ChatMain() {
  const { currentChatId } = useAppState();

  return (
    <div className="fixed inset-0 flex w-full bg-background overflow-hidden h-[100dvh]">
      {/* Sidebar: hidden on mobile when a chat is selected */}
      <div className={cn(
        "w-full md:w-[350px] lg:w-[400px] h-full flex-shrink-0 border-r border-white/5 transition-all duration-300 z-30 bg-card",
        currentChatId ? "hidden md:block" : "block"
      )}>
        <ChatSidebar />
      </div>
      
      {/* Chat Area: hidden on mobile when NO chat is selected */}
      <div className={cn(
        "flex-1 h-full flex flex-col min-w-0 transition-all duration-300 bg-background relative z-20",
        !currentChatId ? "hidden md:flex" : "flex"
      )}>
        <ChatArea />
      </div>
    </div>
  );
}