import type { Metadata, Viewport } from "next";
import { Shippori_Mincho, Zen_Kaku_Gothic_New, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-sans",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const shipporiMincho = Shippori_Mincho({
  variable: "--font-heading",
  weight: ["600", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "めくる — 毎日めくる、記憶の相棒。",
    template: "%s | めくる",
  },
  description: "間隔反復(FSRS)でめくりながら覚える暗記プラットフォーム。オフライン対応、インポート/エクスポート対応。",
  metadataBase: new URL("https://mekuru.astro-root.com"),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://mekuru.astro-root.com",
    siteName: "めくる",
    title: "めくる — 毎日めくる、記憶の相棒。",
    description: "間隔反復(FSRS)でめくりながら覚える暗記プラットフォーム。オフライン対応、インポート/エクスポート対応。",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "めくる" }],
  },
  twitter: {
    card: "summary",
    title: "めくる — 毎日めくる、記憶の相棒。",
    description: "間隔反復(FSRS)でめくりながら覚える暗記プラットフォーム。オフライン対応、インポート/エクスポート対応。",
    images: ["/icons/icon-512.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "めくる",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F4EF" },
    { media: "(prefers-color-scheme: dark)", color: "#14171F" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${zenKaku.variable} ${shipporiMincho.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
