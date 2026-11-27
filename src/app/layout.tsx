import type { ReactNode } from "react";
import { Suspense } from "react";
import "./globals.css";
import Providers from "@/components/Providers";
import TopProgressBar from "@/components/TopProgressBar";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "KravyPOS — Smart Billing System",
  description: "Modern point-of-sale and billing system for businesses across retail, service, and food sectors",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",          // resolves apple-touch-icon 404
    shortcut: "/favicon.ico",
  },
  applicationName: "KravyPOS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KravyPOS",
  },
};

export const viewport = {
  themeColor: "#FF6B35",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        <Providers>
          <Suspense fallback={null}>
            <TopProgressBar />
          </Suspense>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}