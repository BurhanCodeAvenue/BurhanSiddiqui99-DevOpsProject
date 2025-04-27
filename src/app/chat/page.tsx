"use client";

import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import ChatWindow from '@/components/chat/ChatWindow';
import { MessageSquareText } from 'lucide-react';

export default function ChatPage() {
  const { activeChatUser } = useSelector((state: RootState) => state.chat);

  return (
    <div className="flex h-full flex-col">
      {activeChatUser ? (
        <ChatWindow />
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center p-4 bg-background">
           <MessageSquareText size={64} className="text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Welcome to ChatterBox!</h2>
          <p className="text-muted-foreground mt-2">
            Search for a user on the left to start chatting.
          </p>
        </div>
      )}
    </div>
  );
}
