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
  title: "Orbit | Next-Gen Cosmic Chat",
  description: "A premium, engaging platform for global cosmic connectivity.",
  icons: {
    icon: "/favicon.ico",
  }
};

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
        
        <main className="flex-1 relative z-0">
          {children}
        </main>
      </body>
    </html>
  );
}
