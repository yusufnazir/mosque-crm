import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { AuthProvider } from "@/lib/auth/AuthContext";
import PWARegister from "@/components/PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mosque CRM",
  description: "Mosque member management system — manage members, family trees, fees, and contributions",
  manifest: "/manifest.json",
  themeColor: "#047857",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mosque CRM",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: "/icons/icon-192x192.svg",
    apple: "/icons/icon-192x192.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <AuthProvider>
            <PWARegister />
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
