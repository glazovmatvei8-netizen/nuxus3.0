
"use client"

import React, { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, Zap } from 'lucide-react';

const CURRENT_VERSION = '0.59.0';

/**
 * Система уведомления об обновлениях Nuxus.
 * Следит за документом /system/config в Firestore.
 */
export function UpdateNotifier() {
  const db = useFirestore();
  const [isOpen, setIsOpen] = useState(false);

  const configRef = useMemoFirebase(() => (!db ? null : doc(db, 'system', 'config')), [db]);
  const { data: config } = useDoc<{ version: string }>(configRef);

  useEffect(() => {
    if (config?.version && config.version !== CURRENT_VERSION) {
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [config?.version]);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[320px] bg-card/90 backdrop-blur-3xl border-primary/20 rounded-[2.5rem] p-8 shadow-2xl shadow-primary/10">
        <DialogHeader className="space-y-4">
          <DialogTitle className="sr-only">Обновление Ядра Nuxus</DialogTitle>
          <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
            <Zap className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div className="space-y-1 text-center">
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
              Обновление Ядра
            </h3>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 leading-relaxed">
              Вышла версия {config?.version || 'новая'}.<br />Перезапуститься для активации?
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-6">
          <Button 
            onClick={handleReload}
            className="h-12 bg-primary rounded-2xl font-black uppercase italic tracking-widest shadow-lg shadow-primary/20 group overflow-hidden relative"
          >
            <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
            Перезапустить
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setIsOpen(false)}
            className="h-10 text-[10px] font-bold uppercase opacity-40 hover:opacity-100 hover:bg-transparent"
          >
            <Clock className="w-3.5 h-3.5 mr-2" /> Позже
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
