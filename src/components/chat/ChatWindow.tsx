"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { addMessage, setChatLoading, setChatError, setMessages, setActiveChatUser } from "@/lib/features/chat/chatSlice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, ArrowLeft, X } from "lucide-react";
import type { Message } from "@/types/message";
import { useSocket } from "@/context/SocketContext";
import { format } from "date-fns"; // For timestamp formatting
import { getChatHistory } from "@/services/chatService"; // Placeholder for fetching history
import { useToast } from "@/hooks/use-toast";

export default function ChatWindow() {
  const [newMessage, setNewMessage] = useState("");
  const dispatch = useDispatch<AppDispatch>();
  const { activeChatUser, messages, loading: chatLoading, error: chatError, onlineUsers } = useSelector((state: RootState) => state.chat);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const { socket } = useSocket();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Fetch chat history when active chat user changes
  useEffect(() => {
    const fetchHistory = async () => {
      if (activeChatUser && currentUser) {
        dispatch(setChatLoading(true));
        dispatch(setChatError(null));
        try {
          // Replace with actual API call to get chat history
          // For now, simulate fetching or assume it's handled by socket connection setup
          // const history = await getChatHistory(currentUser.id, activeChatUser.id);
          // dispatch(setMessages(history));

          // Simulate clearing messages for a new chat
           dispatch(setMessages([]));

        } catch (err: any) {
          dispatch(setChatError(err.message || "Failed to load chat history."));
           toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load chat history.",
          });
        } finally {
           dispatch(setChatLoading(false));
        }
      }
    };
    fetchHistory();
  }, [activeChatUser, currentUser, dispatch, toast]);


   // Handle receiving messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message: Message) => {
      // Ensure the message belongs to the currently active chat
      if (activeChatUser && (message.senderId === activeChatUser.id || message.receiverId === activeChatUser.id)) {
        dispatch(addMessage(message));
      }
    };

    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket, dispatch, activeChatUser]);


  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
       const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !currentUser || !activeChatUser) return;

    const messageData: Omit<Message, 'id' | 'timestamp'> = {
      senderId: currentUser.id,
      receiverId: activeChatUser.id,
      content: newMessage.trim(),
    };

    // Emit the message via socket
    socket.emit("send-message", messageData);

     // Optimistically add message to UI
     // A more robust solution would wait for server confirmation or use a temporary ID
     const optimisticMessage: Message = {
      ...messageData,
      id: `temp-${Date.now()}`, // Temporary ID
      timestamp: new Date().toISOString(), // Store as ISO string
     };
     dispatch(addMessage(optimisticMessage));


    setNewMessage("");
  };

  const handleCloseChat = () => {
    dispatch(setActiveChatUser(null));
  }

  if (!activeChatUser) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a user to chat</div>;
  }

  const isRecipientOnline = onlineUsers.includes(activeChatUser.id);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between bg-card shadow-sm">
         <div className="flex items-center gap-3">
            {/* Back button for mobile? Or integrate into sidebar logic */}
            {/* <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={handleCloseChat}>
              <ArrowLeft className="h-5 w-5" />
            </Button> */}
          <Avatar className="h-10 w-10">
            <AvatarImage src={activeChatUser.profilePic} alt={activeChatUser.name} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(activeChatUser.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-semibold text-card-foreground">{activeChatUser.name}</span>
             <div className={`text-xs flex items-center gap-1.5 ${isRecipientOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
                 <span className={`h-2 w-2 rounded-full ${isRecipientOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`}></span>
                 {isRecipientOnline ? 'Online' : 'Offline'}
             </div>
          </div>
        </div>
         {/* Close Chat button */}
         <Button variant="ghost" size="icon" onClick={handleCloseChat} aria-label="Close chat">
           <X className="h-5 w-5 text-muted-foreground hover:text-destructive" />
         </Button>
      </div>

      {/* Message Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {chatLoading ? (
           <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        ) : chatError ? (
           <div className="flex justify-center items-center h-full text-destructive">
             Error loading messages: {chatError}
           </div>
        ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-muted-foreground">
                Start the conversation!
            </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.senderId === currentUser?.id ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow ${
                    msg.senderId === currentUser?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border"
                  }`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                   {/* Parse timestamp string to Date object for formatting */}
                  <p className={`text-xs mt-1 ${ msg.senderId === currentUser?.id ? 'text-primary-foreground/70' : 'text-muted-foreground' }`}>
                      {format(new Date(msg.timestamp), "p")} {/* Format time */}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-card">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            aria-label="Type a message"
            disabled={!socket} // Disable input if socket is not connected
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || !socket}>
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
