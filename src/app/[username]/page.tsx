
"use client"

import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Квантовый Редиректор для коротких ссылок (VK Style).
 * Перехватывает пути вида /username и перенаправляет на главную с параметром поиска.
 * Исправлено: расширенный список зарезервированных путей для предотвращения конфликтов.
 */
export default function UsernameRedirect() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  useEffect(() => {
    if (!username) return;

    // Список зарезервированных системных путей, которые не являются юзернеймами
    const reserved = [
      'login', 'register', 'api', '_next', 'favicon.ico', 
      'manifest.json', 'sw.js', 'wallet', 'music', 'games', 
      'calls', 'profile', 'archive', 'discovery', 'static'
    ];
    
    if (!reserved.includes(username.toLowerCase())) {
      // Сохраняем цель в sessionStorage для восстановления после логина, если нужно
      sessionStorage.setItem('nuxus_pending_target', username);
      router.push(`/?u=${username}`);
    }
  }, [username, router]);

  return (
    <div className="h-screen w-full bg-[#020203] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60">Neural Link Routing...</p>
      </div>
    </div>
  );
}
