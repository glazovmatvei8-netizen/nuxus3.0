"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    username: ''
  });

  const handleAuth = async (type: 'login' | 'register') => {
    if (!form.email || !form.password) {
      toast({ title: "Error", description: "Email and password are required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      if (type === 'register') {
        if (!form.name || !form.username) {
          toast({ title: "Error", description: "Name and username are required", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
        const user = userCredential.user;
        const username = form.username.startsWith('@') ? form.username : '@' + form.username;

        const userProfile = {
          id: user.uid,
          name: form.name,
          username: username,
          email: form.email,
          createdAt: new Date().toISOString(),
        };

        // Create user profile in Firestore
        const userRef = doc(db, 'users', user.uid);
        setDocumentNonBlocking(userRef, userProfile, { merge: true });

        toast({ title: "Welcome!", description: `Account created for ${form.name}` });
      } else {
        await signInWithEmailAndPassword(auth, form.email, form.password);
        toast({ title: "Welcome back!", description: `Signed in successfully` });
      }
    } catch (error: any) {
      toast({ 
        title: "Auth Error", 
        description: error.message || "Something went wrong", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
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
                  type="email"
                  placeholder="Email" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})}
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
              <Button 
                onClick={() => handleAuth('login')} 
                disabled={isLoading}
                className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Sign In"}
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
                type="email"
                placeholder="Email" 
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})}
                className="bg-muted/30 border-muted-foreground/20 h-11"
              />
              <Input 
                type="password" 
                placeholder="Password" 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})}
                className="bg-muted/30 border-muted-foreground/20 h-11"
              />
              <Button 
                onClick={() => handleAuth('register')} 
                disabled={isLoading}
                className="w-full h-11 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Create Account"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
