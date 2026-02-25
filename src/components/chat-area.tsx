
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, Paperclip, Smile, MoreVertical, ChevronLeft, 
  Sparkles, MessageSquare, Info, Mic, Camera, X, StopCircle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { suggestMessageDraft } from '@/ai/flows/ai-message-drafting-flow';
import { useToast } from '@/hooks/use-toast';
import { ChatInfoModal } from './modals/chat-info-modal';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ChatAreaProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export default function ChatArea({ toggleSidebar, isSidebarOpen }: ChatAreaProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { currentChatId, setCurrentChatId } = useAppState();
  const [inputText, setInputText] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  
  // Media Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const chatRef = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return doc(db, 'chats', currentChatId);
  }, [db, currentChatId]);
  const { data: chat } = useDoc(chatRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !currentChatId) return null;
    return query(
      collection(db, 'chats', currentChatId, 'messages'),
      orderBy('sentAt', 'asc')
    );
  }, [db, currentChatId]);
  const { data: messages } = useCollection(messagesQuery);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  // Timer for recording
  useEffect(() => {
    let interval: any;
    if (isRecordingAudio || isRecordingVideo) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 180) { // 3 minutes limit
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingAudio, isRecordingVideo]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecordingAudio(false);
    setIsRecordingVideo(false);
    setVideoModalOpen(false);
  };

  const handleSendMessage = (content: string = inputText, type: string = 'text') => {
    if (!content.trim() || !currentChatId || !user) return;
    
    const messageData = {
      chatId: currentChatId,
      senderId: user.uid,
      senderName: userProfile?.name || 'User',
      content: content,
      contentType: type,
      sentAt: new Date().toISOString(),
    };

    const messagesCol = collection(db, 'chats', currentChatId, 'messages');
    addDocumentNonBlocking(messagesCol, messageData);
    if (type === 'text') setInputText('');
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          handleSendMessage(reader.result as string, 'audio');
        };
      };

      mediaRecorderRef.current.start();
      setIsRecordingAudio(true);
    } catch (err) {
      toast({ title: "Error", description: "Could not access microphone", variant: "destructive" });
    }
  };

  const startVideoRecording = async () => {
    try {
      setVideoModalOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      videoChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(videoBlob);
        reader.onloadend = () => {
          handleSendMessage(reader.result as string, 'video');
        };
      };

      mediaRecorderRef.current.start();
      setIsRecordingVideo(true);
    } catch (err) {
      setVideoModalOpen(false);
      toast({ title: "Error", description: "Could not access camera/microphone", variant: "destructive" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        handleSendMessage(reader.result as string, 'image');
      };
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 to-background">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <MessageSquare className="w-16 h-16 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Welcome to NuxusChat</h2>
        <p className="text-muted-foreground max-w-sm">Select a conversation from the sidebar to start messaging in real-time.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative">
      <header className="h-16 flex items-center justify-between px-4 border-b border-border/40 bg-card/20 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCurrentChatId(null)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsChatInfoOpen(true)}>
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={chat?.avatarUrl || ''} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">{chat?.name?.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight">{chat?.name}</span>
              <span className="text-xs text-green-500 font-medium">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" onClick={() => setIsChatInfoOpen(true)}>
            <Info className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4 relative z-10 bg-gradient-to-b from-card/10 via-background to-background">
        <div className="flex flex-col gap-4 max-w-4xl mx-auto min-h-full">
          {messages?.map((msg) => (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              isMe={msg.senderId === user?.uid}
              chatId={currentChatId}
            />
          ))}
        </div>
      </ScrollArea>

      <footer className="p-4 bg-card/20 backdrop-blur-xl border-t border-border/40 z-20">
        <div className="flex flex-col gap-2 max-w-4xl mx-auto">
          {isRecordingAudio && (
            <div className="flex items-center justify-between bg-primary/10 p-3 rounded-2xl animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3 text-primary">
                <Mic className="w-5 h-5 animate-pulse" />
                <span className="font-mono font-bold">{formatTime(recordingTime)}</span>
                <span className="text-sm">Recording voice...</span>
              </div>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={stopRecording}>
                <StopCircle className="w-6 h-6" />
              </Button>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex items-center gap-1 mb-1">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
              <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary" onClick={startVideoRecording}>
                <Camera className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-10 w-10 text-muted-foreground hover:text-primary ${isRecordingAudio ? 'text-primary' : ''}`}
                onClick={isRecordingAudio ? stopRecording : startAudioRecording}
              >
                <Mic className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 relative group">
              <Input 
                placeholder="Write a message..." 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="bg-muted/40 border-muted-foreground/10 rounded-2xl h-11 pr-12 focus:ring-1 focus:ring-primary/40 group-hover:bg-muted/60 transition-colors"
                disabled={isRecordingAudio}
              />
              <Button 
                size="icon" 
                className={`absolute right-1 top-1 w-9 h-9 rounded-xl shadow-lg shadow-primary/20 transition-all ${inputText.trim() ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                onClick={() => handleSendMessage()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Recording Modal */}
      <Dialog open={videoModalOpen} onOpenChange={(val) => !val && stopRecording()}>
        <DialogContent className="sm:max-w-md bg-black border-none p-0 overflow-hidden">
          <DialogHeader className="p-4 absolute top-0 w-full z-10 bg-gradient-to-b from-black/60 to-transparent">
            <DialogTitle className="text-white flex items-center justify-between">
              Recording Video...
              <span className="font-mono text-red-500">{formatTime(recordingTime)} / 3:00</span>
            </DialogTitle>
          </DialogHeader>
          <video ref={videoPreviewRef} autoPlay muted className="w-full aspect-video bg-black" />
          <div className="p-6 flex justify-center bg-gradient-to-t from-black/60 to-transparent absolute bottom-0 w-full">
            <Button size="lg" variant="destructive" className="rounded-full w-16 h-16 p-0" onClick={stopRecording}>
              <StopCircle className="w-8 h-8" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {chat && <ChatInfoModal open={isChatInfoOpen} onOpenChange={setIsChatInfoOpen} chat={chat as any} />}
    </div>
  );
}
