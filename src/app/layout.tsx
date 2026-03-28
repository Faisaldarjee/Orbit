import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orbit",
  description: "Connecting the Cosmos | Next-Gen Cosmic Chat",
};

import { Toaster } from "sonner";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full overflow-x-hidden antialiased">
      <body className={`${inter.variable} ${outfit.variable} font-sans min-h-full flex flex-col`}>
        {/* Animated Background Overlay */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-[10%] left-[20%] w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] right-[20%] w-[35rem] h-[35rem] bg-secondary/10 rounded-full blur-[100px] animate-pulse delay-700" />
        </div>
        
        <RealtimeProvider>
          <main className="flex-1 relative z-0">
            {children}
          </main>
        </RealtimeProvider>
        
        <Toaster 
          theme="dark" 
          position="top-right"
          expand={false}
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'rgba(10, 11, 13, 0.8)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '1.25rem',
            }
          }}
        />
      </body>
    </html>
  );
}
