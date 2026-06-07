import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'zh'];
const DEFAULT_LOCALE = 'en';

export const metadata: Metadata = {
  title: 'rejira',
  description: 'A precise, opinionated redesign of Jira — keyboard-first, real-time, AI-augmented.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1a1a1f',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const locale =
    localeCookie && SUPPORTED_LOCALES.includes(localeCookie)
      ? localeCookie
      : DEFAULT_LOCALE;

  return (
    <html lang={locale} data-density="default" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
