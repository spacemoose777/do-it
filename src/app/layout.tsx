import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { PWAInstallProvider } from "@/contexts/PWAInstallContext";
import UpdatePrompt from "@/components/layout/UpdatePrompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "Do It",
  description: "Voice-first task management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Do It",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f13",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen overflow-x-hidden">
        <FontSizeProvider>
          <PWAInstallProvider>
            <AuthProvider>
              <ToastProvider>
                {children}
                <UpdatePrompt />
              </ToastProvider>
            </AuthProvider>
          </PWAInstallProvider>
        </FontSizeProvider>
      </body>
    </html>
  );
}
