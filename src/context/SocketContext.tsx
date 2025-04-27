
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { setOnlineUsers } from '@/lib/features/chat/chatSlice';
import { useToast } from "@/hooks/use-toast";

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

interface SocketProviderProps {
  children: ReactNode;
  userId: string;
  token: string;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';
const SOCKET_PATH = '/api/socket/io';

if (!SOCKET_URL) {
    console.warn("SocketContext: NEXT_PUBLIC_SOCKET_URL environment variable is not set. Socket connection might fail.");
}

export const SocketProvider = ({ children, userId, token }: SocketProviderProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();
  const connectAttemptRef = useRef<number>(0); // Track connection attempts

  const connectSocket = useCallback(() => {
    connectAttemptRef.current += 1;
    console.log(`SocketProvider: Connect attempt #${connectAttemptRef.current}`);

    // Check if socket is already connected or trying to connect
    if (socketRef.current?.connected || socketRef.current?.active) {
      console.log(`SocketProvider: Socket already connected or active (State: ${socketRef.current.connected ? 'connected' : 'active'}). Aborting new connection attempt.`);
      return;
    }

    if (socketRef.current) {
      console.log("SocketProvider: Disconnecting previous socket instance before reconnecting...");
      socketRef.current.disconnect();
      socketRef.current.removeAllListeners();
      socketRef.current = null;
      setIsConnected(false); // Ensure state reflects disconnection
    }

    if (!SOCKET_URL) {
        console.error("SocketProvider: Cannot connect socket: NEXT_PUBLIC_SOCKET_URL is not defined.");
        toast({ variant: "destructive", title: "Configuration Error", description: "Socket server URL is missing." });
        return;
    }

    console.log(`SocketProvider: Attempting to connect socket to URL: ${SOCKET_URL} with path: ${SOCKET_PATH}, UserID: ${userId}, Token present: ${!!token}`);
    const newSocket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      query: { userId },
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000, // Slightly increase delay
      timeout: 20000, // Increase connection timeout (ms)
      transports: ['websocket', 'polling'],
      forceNew: true, // Force new connection instance each time connectSocket is called
    });

    newSocket.on('connect', () => {
      console.log('SocketProvider: Socket connected successfully:', newSocket.id);
      if (socketRef.current === newSocket) { // Ensure it's the current socket
        setIsConnected(true);
        toast({ title: "Connected", description: "Real-time chat enabled." });
        connectAttemptRef.current = 0; // Reset attempts on success
      } else {
         console.log("SocketProvider: Ignoring connect event from an old socket instance.");
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('SocketProvider: Socket disconnected:', reason, 'Socket ID:', newSocket.id);
       if (socketRef.current === newSocket) { // Check if it's the active socket reference
        setIsConnected(false);
        dispatch(setOnlineUsers([]));
        if (reason !== 'io client disconnect' && reason !== 'io server disconnect') { // Avoid toast on manual disconnect
             toast({ variant: "destructive", title: "Disconnected", description: `Chat disconnected: ${reason}. Attempting to reconnect...` });
        }
      } else {
          console.log("SocketProvider: Ignoring disconnect event from an old socket instance.");
      }
    });

    newSocket.on('connect_error', (error) => {
       // Log the detailed error object
       console.error(`SocketProvider: Socket connection error: ${error.message}`, error);
       if (socketRef.current === newSocket) {
           setIsConnected(false); // Update state if it's the current socket causing the error
           // Provide more context in the toast
           toast({
             variant: "destructive",
             title: "Connection Error",
             description: `Failed to connect: ${error.message}. Retrying...`
           });
       } else {
            console.log("SocketProvider: Ignoring connect_error event from an old socket instance.");
       }
    });

     newSocket.on('reconnect_attempt', (attempt) => {
        console.log(`SocketProvider: Socket reconnect attempt ${attempt}...`);
    });

    newSocket.on('reconnect_failed', () => {
        console.error('SocketProvider: Socket reconnection failed after multiple attempts.');
        if (socketRef.current === newSocket) {
            setIsConnected(false);
            toast({ variant: "destructive", title: "Reconnection Failed", description: "Could not reconnect to chat server." });
        }
    });

    newSocket.on('update-online-users', (onlineUserIds: string[]) => {
      console.log("SocketProvider: Received online users update:", onlineUserIds);
      dispatch(setOnlineUsers(onlineUserIds));
    });

    // Assign the newly created socket to the ref
    socketRef.current = newSocket;

  }, [userId, token, dispatch, toast]); // Removed socket from dependencies


  useEffect(() => {
    let isMounted = true;

    if (userId && token) {
      console.log("SocketProvider Effect: userId and token present, calling connectSocket.");
      connectSocket();
    } else {
      console.log("SocketProvider Effect: userId or token missing.");
      if (socketRef.current) {
        console.log('SocketProvider Effect: Disconnecting existing socket due to missing auth details...');
        socketRef.current.disconnect();
        socketRef.current.removeAllListeners();
        socketRef.current = null;
        if (isMounted) setIsConnected(false);
      }
    }

    return () => {
      isMounted = false;
      console.log("SocketProvider Effect: Cleanup running.");
      if (socketRef.current) {
          console.log('SocketProvider Effect: Disconnecting socket in cleanup...', socketRef.current.id);
          // Use io server disconnect to signify intentional disconnect on unmount/re-render
          socketRef.current.disconnect();
          socketRef.current.removeAllListeners();
          socketRef.current = null;
      }
       connectAttemptRef.current = 0; // Reset attempts on cleanup
    };
  }, [userId, token, connectSocket]); // connectSocket is memoized

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
