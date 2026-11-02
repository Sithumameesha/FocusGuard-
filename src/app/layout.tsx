import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#070a12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "FocusGuard | Guardrail & Single-Focus OS",
  description: "Mobile-first PWA for strict salary guardrails and single-focus work queue.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FocusGuard",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark antialiased`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FocusGuard" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body 
        className="min-h-full bg-[#070a12] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden"
        suppressHydrationWarning
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  if (window.location.protocol === 'https:' && window.location.hostname !== 'localhost') {
                    navigator.serviceWorker.register('/sw.js').catch(function() {});
                  } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      for (var i = 0; i < regs.length; i++) {
                        regs[i].unregister();
                      }
                    });
                    if ('caches' in window) {
                      caches.keys().then(function(keys) {
                        for (var j = 0; j < keys.length; j++) {
                          caches.delete(keys[j]);
                        }
                      });
                    }
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
