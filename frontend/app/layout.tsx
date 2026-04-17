import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { AppNameProvider } from "@/lib/AppNameContext";
import { DateFormatProvider } from "@/lib/DateFormatContext";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "MemberFlow",
  description: "Member management system — manage members, family trees, and contributions",
  manifest: "/manifest.json",
  themeColor: "#047857",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MemberFlow",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: "/memberflow-icon.svg",
    apple: "/memberflow-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cream text-charcoal font-sans antialiased">
        <LanguageProvider>
          <AppNameProvider>
            <DateFormatProvider>
            <AuthProvider>
              <PWARegister />
              {children}
            </AuthProvider>
            </DateFormatProvider>
          </AppNameProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
