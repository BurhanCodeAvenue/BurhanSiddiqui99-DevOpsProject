import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils"; // Import cn utility

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChatterBox",
  description: "Real-time chat application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Added bg-background, text-foreground and suppressHydrationWarning */}
      <body
        className={cn(inter.className, "antialiased bg-background text-foreground")}
        suppressHydrationWarning={true}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
