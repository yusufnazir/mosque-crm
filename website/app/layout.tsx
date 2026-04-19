import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MemberFlow — Modern Membership Management for Organizations',
  description:
    'MemberFlow helps community organizations manage members, families, contributions, events, and more — all in one place.',
  keywords: ['member management', 'community CRM', 'organization software', 'membership platform', 'community management'],
  icons: {
    icon: [
      { url: "/memberflow-icon.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/memberflow-icon-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/memberflow-icon.svg",
  },
  openGraph: {
    title: 'MemberFlow — Modern Membership Management',
    description: 'All-in-one platform for community organizations.',

    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        {children}
      </body>
    </html>
  );
}
