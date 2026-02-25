"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/store';
import AuthScreen from '@/components/auth-screen';
import ChatMain from '@/components/chat-main';

export default function Home() {
  const { currentUser } = useAppState();

  if (!currentUser) {
    return <AuthScreen />;
  }

  return <ChatMain />;
}