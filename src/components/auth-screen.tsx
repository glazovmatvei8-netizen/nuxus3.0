"use client"

import React, { useState } from 'react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText } from 'lucide-react';

export default function AuthScreen() {
  const { setCurrentUser, users, setUsers } = useAppState();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('login');

  const [form, setForm] = useState({
    phone: '+7',
    password: 'password123',
    name: '',
    username: ''
  });

  const handleAuth = (type: 'login' | 'register') => {
    if (type === 'register') {
      if (!form.phone || !form.name || !form.username || !form.password) {
        toast({ title: "Error", description: "All fields are required", variant: "destructive" });
        return;
      }
      const username = form.username.startsWith('@') ? form.username : '@' + form.username;
      
      const userExists = Object.values(users).some(u => u.phone === form.phone || u.username === username);
      if (userExists) {
        toast({ title: "Error", description: "User already exists", variant: "destructive" });
        return;
      }

      const newUser = {
        phone: form.phone,
        name: form.name,
        username,
        password: form.password,
        avatar: null,
        createdAt: Date.now()
      };

      setUsers({ ...users, [form.phone]: newUser });
      setCurrentUser(newUser);
      toast({ title: "Welcome!", description: `Account created for ${form.name}` });
    } else {
      const user = users[form.phone];
      if (user && user.password === form.password) {
        setCurrentUser(user);
        toast({ title: "Welcome back!", description: `Signed in as ${user.name}` });
      } else {
        toast({ title: "Auth Failed", description: "Invalid credentials", variant: "destructive" });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      <Card className="w-full max-w-md border-primary/20 bg-card/50 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
              <MessageSquareText className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">NuxusChat</CardTitle>
          <CardDescription>Stay connected with your world</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1">
              <TabsTrigger value="login" className="rounded-md">Login</TabsTrigger>
              <TabsTrigger value="register" className="rounded-md">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Input 
                  placeholder="Phone number" 
                  value={form.phone} 
                  onChange={e => setForm({...form, phone: e.target.value})}
                  className="bg-muted/30 border-muted-foreground/20 h-12"
                />
              </div>
              <div className="space-y-2">
                <Input 
                  type="password" 
                  placeholder="Password" 
                  value={form.password} 
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="bg-muted/30 border-muted-foreground/20 h-12"
                />
              </div>
              <Button onClick={() => handleAuth('login')} className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                Sign In
              </Button>
            </TabsContent>
            <TabsContent value="register" className="space-y-4">
              <Input 
                placeholder="Full Name" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                className="bg-muted/30 border-muted-foreground/20 h-11"
              />
              <Input 
                placeholder="Username (e.g. @john)" 
                value={form.username} 
                onChange={e => setForm({...form, username: e.target.value})}
                className="bg-muted/30 border-muted-foreground/20 h-11"
              />
              <Input 
                placeholder="Phone number" 
                value={form.phone} 
                onChange={e => setForm({...form, phone: e.target.value})}
                className="bg-muted/30 border-muted-foreground/20 h-11"
              />
              <Input 
                type="password" 
                placeholder="Password" 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})}
                className="bg-muted/30 border-muted-foreground/20 h-11"
              />
              <Button onClick={() => handleAuth('register')} className="w-full h-11 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                Create Account
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}