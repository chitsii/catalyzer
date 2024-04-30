import type { Metadata } from "next";
import { ThemeProvider } from 'next-themes'
import { M_PLUS_1_Code, Noto_Sans_Mono } from "next/font/google";;
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const m_plus_1_code = M_PLUS_1_Code({
  subsets: ["latin"]
});
export const noto_sans_mono = Noto_Sans_Mono({
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Cataclysm Launcher",
  description: "Cataclysm: Dark Days Ahead Launcher",
};

export default function RootLayout(
  { children, }: Readonly<{ children: React.ReactNode; }>
) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={noto_sans_mono.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
