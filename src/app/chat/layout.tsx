"use client";

import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { RootState, AppDispatch } from "@/lib/store";
import { hydrateAuth, logoutUser } from "@/lib/features/auth/authSlice";
import { clearChatState } from "@/lib/features/chat/chatSlice";
import Sidebar from "@/components/chat/Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import { SocketProvider } from "@/context/SocketContext"; // Import SocketProvider

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  const [isHydrated, setIsHydrated] = useState(false);

   useEffect(() => {
    // Attempt to hydrate auth state from localStorage on mount
    dispatch(hydrateAuth());
    setIsHydrated(true); // Mark hydration as attempted
  }, [dispatch]);


  useEffect(() => {
    // Only perform redirect checks after hydration attempt
    if (isHydrated && !isAuthenticated) {
        // If still not authenticated after hydration, redirect to signin
        router.replace("/signin");
    }
  }, [isAuthenticated, router, isHydrated]);


  const handleLogout = () => {
    dispatch(logoutUser());
    dispatch(clearChatState()); // Clear chat state on logout
    router.push("/signin");
  };

  // Show loading indicator while hydrating or if not authenticated yet
  if (!isHydrated || !isAuthenticated || !user || !token) {
    return (
      <div className="flex h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    // Wrap with SocketProvider only when authenticated
    <SocketProvider userId={user.id} token={token}>
        <div className="flex h-screen overflow-hidden bg-secondary">
          <Sidebar user={user} onLogout={handleLogout} />
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
          <Toaster />
        </div>
     </SocketProvider>
  );
}
