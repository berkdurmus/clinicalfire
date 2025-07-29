import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { Navigation } from '@/components/layout/Navigation';
import { AuthProvider } from '@/lib/auth.context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Clinical FIRE - Healthcare Workflow Automation',
  description: 'Fast Interoperable Rules Engine for healthcare workflows',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen`}
      >
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <Navigation />
              <main className="flex-1 container mx-auto px-6 py-8 max-w-7xl">
                {children}
              </main>
              <footer className="border-t bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                <div className="container mx-auto px-6 py-4 text-center text-sm text-muted-foreground">
                  © 2024 Clinical FIRE. All rights reserved.
                </div>
              </footer>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
