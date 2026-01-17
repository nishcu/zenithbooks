import type { Metadata } from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { ClientOnly } from '@/components/client-only';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { SplashScreen } from '@/components/ui/splash-screen';

const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const fontSourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro',
});

export const metadata: Metadata = {
  title: 'ZenithBooks',
  description: 'AI-Driven. Professional-Grade.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192x192.png',
    shortcut: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ZenithBooks',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#2F3C7E" />
        {/* Prevent flash by hiding content until splash is ready */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Add splash-active class immediately to prevent flash (runs before React hydration)
                try {
                  document.documentElement.classList.add('splash-active');
                  if (document.body) {
                    document.body.classList.add('splash-active');
                  } else {
                    document.addEventListener('DOMContentLoaded', function() {
                      document.body.classList.add('splash-active');
                    });
                  }
                } catch(e) {}
                
                const originalError = console.error;
                console.error = function(...args) {
                  const errorMessage = args[0]?.toString() || '';
                  if (errorMessage.includes("Cannot assign to read only property 'params'")) {
                    return; // Suppress this specific error
                  }
                  originalError.apply(console, args);
                };
                
                const originalWindowError = window.onerror;
                window.onerror = function(msg, source, lineno, colno, error) {
                  if (msg && msg.toString().includes("Cannot assign to read only property 'params'")) {
                    return true; // Suppress error
                  }
                  if (originalWindowError) {
                    return originalWindowError.call(this, msg, source, lineno, colno, error);
                  }
                  return false;
                };
                
                // Also suppress unhandled promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                  const errorMsg = event.reason?.message || event.reason?.toString() || '';
                  if (errorMsg.includes("Cannot assign to read only property 'params'")) {
                    event.preventDefault(); // Suppress the error
                    return;
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          fontInter.variable,
          fontSourceCodePro.variable
        )}
        suppressHydrationWarning
      >
        {/* Google Tag (gtag.js) - Supports GA4 (G-*) and Google Ads (AW-*) */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
        {/* Cashfree SDK - Loaded dynamically in checkout component for CSP safety */}
        {/* Script removed from here - using dynamic loader instead */}
        <ClientOnly>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="splash-screen-container">
              <SplashScreen />
            </div>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Toaster />
          </ThemeProvider>
        </ClientOnly>
      </body>
    </html>
  );
}

    
