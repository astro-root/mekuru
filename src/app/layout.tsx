import type { Metadata } from "next";
import { Shippori_Mincho, Zen_Kaku_Gothic_New, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
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
        </ThemeProvider>
      </body>
    </html>
  );
}
