import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Caliber AI — Technical Assessment Platform",
  description:
    "Enterprise-grade AI-powered technical assessment platform. Conduct rigorous, adaptive technical evaluations with real-time competency analytics and intent-aware candidate memory.",
  keywords: ["AI interview", "technical assessment", "engineering evaluation", "candidate analysis"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-text overflow-x-hidden selection:bg-accent/20 selection:text-text">
        {/* Ambient Liquid Refraction Orbs (Global Backdrop Layer) */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[15%] w-[600px] h-[600px] rounded-full bg-accent/15 blur-[140px] animate-orb-1" />
          <div className="absolute top-[45%] right-[-10%] w-[700px] h-[700px] rounded-full bg-blue-600/10 blur-[160px] animate-orb-2" />
          <div className="absolute bottom-[-10%] left-[5%] w-[650px] h-[650px] rounded-full bg-emerald-500/10 blur-[150px] animate-liquid-pulse" />
        </div>

        <AuthProvider>
          <div className="relative z-10 flex flex-col min-h-full">{children}</div>
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
