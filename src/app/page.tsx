"use client";

import React, { useState, useEffect } from "react"; // Import React and useState
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store";
import { hydrateAuth } from "@/lib/features/auth/authSlice";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
  // Use useState directly now
  const [isHydrated, setIsHydrated] = useState(false);


  useEffect(() => {
    dispatch(hydrateAuth());
    setIsHydrated(true);
  }, [dispatch]);

  useEffect(() => {
    // Only redirect after hydration is complete
    if (isHydrated) {
      if (isAuthenticated) {
        router.replace("/chat");
      } else {
        router.replace("/signin");
      }
    }
  }, [isAuthenticated, router, isHydrated]);

  // Show loading indicator while checking auth status or hydrating
  if (loading || !isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // This part should ideally not be reached due to redirects
  // but acts as a fallback.
  return (
     <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
  );
}
