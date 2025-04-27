// src/components/chat/Sidebar.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { setActiveChatUser } from "@/lib/features/chat/chatSlice";
import { logoutUser } from "@/lib/features/auth/authSlice"; // Import logoutUser
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Search, Loader2, User as UserIcon } from "lucide-react";
import type { User } from "@/types/user";
import { searchUsersApi } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; // Import useRouter for redirection
import axios, { AxiosError } from 'axios'; // Import axios and AxiosError type

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { activeChatUser, onlineUsers } = useSelector((state: RootState) => state.chat);
  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth); // Add isAuthenticated
  const { toast } = useToast();
  const router = useRouter(); // Keep router for potential future use, though interceptor handles redirect now

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Check if authenticated before making the API call
    if (!isAuthenticated || !token) {
      console.warn("[Sidebar Search] Not authenticated. Aborting search.");
      // The interceptor should handle the actual logout/redirect if a request is made without a valid token
      // No need to dispatch logout here directly unless the state is known to be inconsistent.
      return; // Stop the search
    }
    console.log("[Sidebar Search] Authenticated. Proceeding with search for:", query);

    setIsSearching(true);
    try {
      const results = await searchUsersApi(query); // API call might throw an error caught by the interceptor
      setSearchResults(results.filter(u => u.id !== user.id));
      console.log("[Sidebar Search] Search successful, results:", results.length);
    } catch (error: any) {
       // Log the raw error for debugging
       console.error("[Sidebar Search] API Error Raw:", error);

       // Axios interceptor handles 401 errors (logout + redirect).
       // This catch block now focuses on non-401 errors or provides a generic message.
       if (axios.isAxiosError(error)) {
           const axiosError = error as AxiosError<{ message?: string }>;
           // Avoid duplicating 401 handling here; the interceptor should manage it.
           if (axiosError.response?.status !== 401) {
                console.error(`[Sidebar Search] Non-401 Axios error status: ${axiosError.response?.status}`);
                console.error(`[Sidebar Search] Non-401 Axios error message: ${axiosError.response?.data?.message || axiosError.message}`);
                toast({
                    variant: "destructive",
                    title: "Search Failed",
                    description: axiosError.response?.data?.message || axiosError.message || "Could not fetch users due to a server or network issue.",
                });
           }
       } else {
           // Handle non-Axios errors
            console.error("[Sidebar Search] Non-Axios error:", error.message);
            toast({
                variant: "destructive",
                title: "Search Error",
                description: "An unexpected error occurred during search.",
            });
       }
       setSearchResults([]); // Clear results on any error
    } finally {
      setIsSearching(false);
    }
  // Depend on user.id and isAuthenticated/token to ensure correct context
  }, [user.id, dispatch, toast, token, isAuthenticated]); // Removed router from deps as redirect is handled by interceptor

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Only search if the query is not empty
      if (searchQuery.trim()) {
          handleSearch(searchQuery);
      } else {
          // Clear results immediately if the query is cleared
          setSearchResults([]);
          setIsSearching(false); // Ensure loading state is reset
      }
    }, 300); // Adjust debounce delay as needed

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, handleSearch]); // handleSearch is memoized

  const handleSelectUser = (selectedUser: User) => {
    dispatch(setActiveChatUser(selectedUser));
    setSearchQuery(""); // Clear search input on selection
    setSearchResults([]); // Clear results on selection
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col border-r bg-card h-full">
      {/* User Profile Section */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.profilePic} alt={user.name} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-card-foreground">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Logout">
          <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 py-2 w-full" // Added pr-10 to avoid overlap with loader
            aria-label="Search users"
            disabled={!isAuthenticated} // Disable search if not authenticated
          />
          {isSearching && (
             <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
           )}
        </div>
      </div>

      {/* User List / Search Results */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {searchResults.length > 0 ? (
            searchResults.map((resultUser) => (
              <Button
                key={resultUser.id}
                variant={activeChatUser?.id === resultUser.id ? "secondary" : "ghost"}
                className="w-full justify-start h-auto py-2 px-3"
                onClick={() => handleSelectUser(resultUser)}
              >
                <Avatar className="h-9 w-9 mr-3">
                  <AvatarImage src={resultUser.profilePic} alt={resultUser.name} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {getInitials(resultUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left truncate">
                  <p className="font-medium text-sm text-card-foreground truncate">{resultUser.name}</p>
                  <span className={`text-xs ${onlineUsers.includes(resultUser.id) ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {onlineUsers.includes(resultUser.id) ? 'Online' : 'Offline'}
                  </span>
                </div>
              </Button>
            ))
          ) : searchQuery && !isSearching ? (
             <p className="text-center text-sm text-muted-foreground py-4">No users found matching "{searchQuery}".</p>
          ) : !searchQuery && !isSearching ? (
            <p className="text-center text-sm text-muted-foreground py-4">Search for users to start a chat.</p>
          ) : null /* Don't show anything while searching */ }
        </div>
      </ScrollArea>
    </aside>
  );
}
