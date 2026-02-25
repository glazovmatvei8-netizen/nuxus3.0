"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppState } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, LogOut, User, Phone, ShieldCheck, AtSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { currentUser, setCurrentUser, users, setUsers } = useAppState();
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    username: currentUser?.username || '',
    phone: currentUser?.phone || ''
  });
  const { toast } = useToast();

  const handleSave = () => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...form };
    
    // Update global users list too
    const newUsers = { ...users };
    delete newUsers[currentUser.phone];
    newUsers[form.phone] = updatedUser;

    setUsers(newUsers);
    setCurrentUser(updatedUser);
    onOpenChange(false);
    toast({ title: "Settings Saved", description: "Your profile has been updated." });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    onOpenChange(false);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-primary/5 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="w-5 h-5 text-primary" />
            Profile Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20">
                <AvatarImage src={currentUser?.avatar || ''} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold uppercase">
                  {currentUser?.name?.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-lg">
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold">{currentUser?.name}</h3>
              <p className="text-sm text-muted-foreground">{currentUser?.username}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <User className="w-3 h-3" /> FULL NAME
              </Label>
              <Input 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                className="bg-muted/30 border-muted-foreground/10 h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <AtSign className="w-3 h-3" /> USERNAME
              </Label>
              <Input 
                value={form.username} 
                onChange={e => setForm({...form, username: e.target.value})}
                className="bg-muted/30 border-muted-foreground/10 h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <Phone className="w-3 h-3" /> PHONE NUMBER
              </Label>
              <Input 
                value={form.phone} 
                onChange={e => setForm({...form, phone: e.target.value})}
                className="bg-muted/30 border-muted-foreground/10 h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <Button className="w-full h-11 rounded-xl shadow-lg shadow-primary/20" onClick={handleSave}>
              Save Changes
            </Button>
            <Button variant="ghost" className="w-full h-11 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}